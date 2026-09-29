import { computed, onScopeDispose, ref } from 'vue'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'
import { getPadDisplay } from '@/api/pad'
import { getSpaceFiles, type SpaceFile } from '@/api/spaceFile'
import { getServerConfig } from '@/config/servers'
import { getPadCode } from '@/utils/logClk'

/**
 * 会议室门牌「云端下发素材」（logo / 二维码）：与 wallPad 取发布内容的链路完全一致
 *
 *   MQTT 设备配置响应 pad[0].code（usePadHeartbeat 写入 getPadCode）
 *     → 边端 GET /api/pad/display?spaceCode=&deviceCode=（display_json = 云端 content_config 级联物化结果）
 *     → displayJson 里的素材：
 *          ① 直接带 imageUrl / url → 用该地址（相对路径按 mapViewer.resolveUrl 规则补全）
 *          ② 只带 materialId → 用 /api/space/getSpaceFiles 清单里 id = f_{materialId} 的素材 url
 *     （与 services/mapViewer.ts 的素材定位两级规则一致）
 * 任一环节缺失 / 失败 → 返回 ''，由调用方兜底（logo → geely；二维码 → 内置「扫码无效」图）
 */

// 壁挂/门牌长期开机，配置结果缓存一段时间，避免每次进出子页都打接口
const CACHE_TTL_MS = 10 * 60 * 1000

interface MaterialCache {
  key: string
  logo: string
  qr: string
  at: number
}

let _cache: MaterialCache | null = null
let _filesCache: { key: string; files: SpaceFile[]; at: number } | null = null

// 相对路径补全为边缘端绝对地址（与 mapViewer.resolveUrl 同规则）
function resolveUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  const cfg = getServerConfig()
  const base = cfg.edgeBaseUrl || cfg.apiBaseUrl
  if (!base) return url
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

// 素材键名不固定：显式优先键 → 任意匹配正则的键
const LOGO_KEYS = ['logo', 'logoImage', 'logoimage', 'logoImg', 'logoimg', 'padLogo']
const LOGO_RE = /logo/i
const QR_KEYS = ['qrCode', 'qrcode', 'qr', 'qrImage', 'erweima', 'ewm']
const QR_RE = /qr|erweima|ewm/i

function pickEntry(displayJson: unknown, preferred: string[], re: RegExp): any | null {
  if (!displayJson || typeof displayJson !== 'object') return null
  const dj = displayJson as Record<string, any>
  const keys = Object.keys(dj)
  const ordered = [
    ...preferred.filter((k) => k in dj),
    ...keys.filter((k) => re.test(k) && !preferred.includes(k)),
  ]
  for (const k of ordered) {
    const entry = dj[k]
    if (entry && typeof entry === 'object') return entry
  }
  return null
}

function inlineUrl(entry: any): string {
  const raw = entry?.imageUrl ?? entry?.url ?? entry?.image ?? ''
  return typeof raw === 'string' ? raw : ''
}

function materialIdOf(entry: any): string {
  const id = entry?.materialId ?? entry?.material_id ?? entry?.id
  return id === undefined || id === null || id === '' ? '' : String(id)
}

export function usePadPublishedContent() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()
  const ctx = computed(() => spaceStore.spaceContext)

  const logoUrl = ref('')
  const qrUrl = ref('')
  const source = ref<'display' | 'fallback'>('fallback')

  let disposed = false
  let inflight = false
  let lastKey = ''

  // 素材清单（边端 /api/space/getSpaceFiles）：materialId 定位用，60s TTL，空清单不缓存
  const loadFiles = async (key: string): Promise<SpaceFile[]> => {
    const c = ctx.value
    if (!c) return []
    if (_filesCache && _filesCache.key === key && Date.now() - _filesCache.at < CACHE_TTL_MS) {
      return _filesCache.files
    }
    try {
      const res: any = await getSpaceFiles({ ...c, floorCode: '' })
      const files: SpaceFile[] = res?.code === 0 && Array.isArray(res?.data?.files) ? res.data.files : []
      _filesCache = files.length ? { key, files, at: Date.now() } : null
      return files
    } catch (e) {
      console.warn('[meetingPad] getSpaceFiles failed:', e)
      _filesCache = null
      return []
    }
  }

  const resolveEntry = async (entry: any, key: string): Promise<string> => {
    const direct = inlineUrl(entry)
    if (direct) return resolveUrl(direct)
    const mid = materialIdOf(entry)
    if (!mid) return ''
    const files = await loadFiles(key)
    const hit = files.find((f) => String(f.id).replace(/^f_/, '') === mid)
    return hit?.url ? resolveUrl(hit.url) : ''
  }

  const load = async (padCode: string) => {
    const c = ctx.value
    if (!c || !isCompleteSpaceContext(c)) return
    if (!padCode) { apply('', ''); return }
    if (inflight) return

    const key = `${c.spaceCode}|${c.deviceCode}|${padCode}`
    if (_cache && _cache.key === key && Date.now() - _cache.at < CACHE_TTL_MS) {
      apply(_cache.logo, _cache.qr)
      lastKey = key
      return
    }
    if (lastKey === key && (logoUrl.value || qrUrl.value)) return

    inflight = true
    try {
      const res: any = await getPadDisplay(c.spaceCode, padCode)
      const data = res?.data || res
      const dj = data?.displayJson ?? data?.display_json ?? {}
      const logoEntry = pickEntry(dj, LOGO_KEYS, LOGO_RE)
      const qrEntry = pickEntry(dj, QR_KEYS, QR_RE)
      const logo = logoEntry ? await resolveEntry(logoEntry, key) : ''
      const qr = qrEntry ? await resolveEntry(qrEntry, key) : ''
      _cache = { key, logo, qr, at: Date.now() }
      lastKey = key
      apply(logo, qr)
      console.log('[meetingPad] published materials →', { logo: logo || '(none)', qr: qr || '(none)', source: data?.displaySource })
    } catch (e) {
      console.warn('[meetingPad] getPadDisplay failed → 使用兜底素材:', e)
      lastKey = key
      apply('', '')
    } finally {
      inflight = false
    }
  }

  function apply(logo: string, qr: string) {
    if (disposed) return
    logoUrl.value = logo
    qrUrl.value = qr
    source.value = logo || qr ? 'display' : 'fallback'
  }

  const unsubs: Array<() => void> = []

  const setup = () => {
    const c = ctx.value
    if (!c || !isCompleteSpaceContext(c)) return

    // pad 设备 code 来自 MQTT 设备配置响应（与 pad 心跳同源）
    const cfgTopic = topics.deviceConfigResponse(c)
    mqtt.subscribe(cfgTopic)
    unsubs.push(() => mqtt.unsubscribe(cfgTopic))
    unsubs.push(mqtt.onMessage(cfgTopic, (payload) => {
      const pad = (payload as { pad?: Array<{ code?: string }> })?.pad?.[0]
      if (pad?.code) void load(String(pad.code))
    }))

    // 配置响应可能早于本组件到达（心跳已缓存 pad code），先用缓存值请求一次
    const cached = getPadCode()
    if (cached) {
      void load(cached)
    } else {
      mqtt.publish(topics.deviceConfigGet(), {
        spaceCode: c.spaceCode,
        floorAreaCode: c.floorAreaCode,
        floorCode: c.floorCode,
        areaCode: c.deviceCode,
      })
    }
  }

  setup()

  onScopeDispose(() => {
    disposed = true
    for (const fn of unsubs) fn()
    unsubs.length = 0
  })

  // 现场诊断：F12 执行 copy(window.__meetingPadDisplay)
  if (typeof window !== 'undefined') {
    ;(window as any).__meetingPadDisplay = { logoUrl, qrUrl, source }
  }

  return { publishedLogoUrl: logoUrl, publishedQrUrl: qrUrl, materialSource: source }
}
