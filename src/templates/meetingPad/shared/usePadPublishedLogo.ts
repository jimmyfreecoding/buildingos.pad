import { computed, onScopeDispose, ref } from 'vue'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'
import { getPadDisplay } from '@/api/pad'
import { getServerConfig } from '@/config/servers'
import { getPadCode } from '@/utils/logClk'

/**
 * 左上角 logo：与 wallPad 获取「云端发布内容」完全一致的链路
 *
 *   MQTT 设备配置响应 pad[0].code（usePadHeartbeat 写入 getPadCode）
 *     → 边端 GET /api/pad/display?spaceCode=&deviceCode=（display_json = 云端 content_config 级联物化结果）
 *     → displayJson 里的 logo 素材 imageUrl / url
 *     → 相对路径以 edgeBaseUrl（缺省回退 apiBaseUrl）补全，规则同 services/mapViewer.ts resolveUrl
 *
 * 任一环节缺失 / 失败（无 pad code、接口失败、未配置 logo）→ 返回 ''，
 * 由 PadLogo 回退到 geely.png（与 wallPad zeekr 模板的兜底一致）。
 */

// 壁挂/门牌长期开机，配置结果缓存一段时间，避免每次进出子页都打接口
const CACHE_TTL_MS = 10 * 60 * 1000

interface LogoCache {
  key: string
  url: string
  at: number
}

let _cache: LogoCache | null = null

// 相对路径补全为边缘端绝对地址（与 mapViewer.resolveUrl 同规则）
function resolveUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  const cfg = getServerConfig()
  const base = cfg.edgeBaseUrl || cfg.apiBaseUrl
  if (!base) return url
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

// display_json 的素材键名不固定，按「显式 logo 键 → 任意含 logo 的键」顺序取第一个有 url 的素材
const PREFERRED_KEYS = ['logo', 'logoImage', 'logoimage', 'logoImg', 'logoimg', 'padLogo']

function pickLogoUrl(displayJson: unknown): string {
  if (!displayJson || typeof displayJson !== 'object') return ''
  const dj = displayJson as Record<string, any>
  const keys = Object.keys(dj)
  const ordered = [
    ...PREFERRED_KEYS.filter((k) => k in dj),
    ...keys.filter((k) => /logo/i.test(k) && !PREFERRED_KEYS.includes(k)),
  ]
  for (const k of ordered) {
    const entry = dj[k]
    const raw = entry?.imageUrl ?? entry?.url ?? entry?.image ?? ''
    if (typeof raw === 'string' && raw) return raw
  }
  return ''
}

export function usePadPublishedLogo() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()
  const ctx = computed(() => spaceStore.spaceContext)

  const publishedLogoUrl = ref('')
  const source = ref<'display' | 'fallback'>('fallback')

  let disposed = false
  let inflight = false
  let lastKey = ''

  const apply = (url: string) => {
    if (disposed) return
    publishedLogoUrl.value = url
    source.value = url ? 'display' : 'fallback'
  }

  const load = async (padCode: string) => {
    const c = ctx.value
    if (!c || !isCompleteSpaceContext(c)) return
    if (!padCode) { apply(''); return }
    if (inflight) return

    const key = `${c.spaceCode}|${c.deviceCode}|${padCode}`
    if (_cache && _cache.key === key && Date.now() - _cache.at < CACHE_TTL_MS) {
      apply(_cache.url)
      lastKey = key
      return
    }
    if (lastKey === key && publishedLogoUrl.value) return

    inflight = true
    try {
      const res: any = await getPadDisplay(c.spaceCode, padCode)
      const data = res?.data || res
      const raw = pickLogoUrl(data?.displayJson ?? data?.display_json)
      const url = raw ? resolveUrl(raw) : ''
      _cache = { key, url, at: Date.now() }
      lastKey = key
      apply(url)
      console.log('[meetingPad] published logo:', url || '(none → geely fallback)', 'source:', data?.displaySource)
    } catch (e) {
      // 边端不可达 / 未配置 → geely 兜底；不重试风暴，下次设备配置刷新再试
      console.warn('[meetingPad] getPadDisplay(logo) failed → geely fallback:', e)
      lastKey = key
      apply('')
    } finally {
      inflight = false
    }
  }

  const unsubs: Array<() => void> = []

  const setup = () => {
    const c = ctx.value
    if (!c || !isCompleteSpaceContext(c)) return

    // pad 设备 code 来自 MQTT 设备配置响应（与 pad 心跳同源）；订阅同一主题以拿到（重新配置后的）最新 code
    const cfgTopic = topics.deviceConfigResponse(c)
    mqtt.subscribe(cfgTopic)
    unsubs.push(() => mqtt.unsubscribe(cfgTopic))
    unsubs.push(mqtt.onMessage(cfgTopic, (payload) => {
      const pad = (payload as { pad?: Array<{ code?: string }> })?.pad?.[0]
      if (pad?.code) void load(String(pad.code))
    }))

    // 设备配置响应可能早于本组件到达（心跳已缓存 pad code），先用缓存值请求一次；
    // 仍没有 pad code 时主动请求一次设备配置（与心跳发布的主题/载荷一致）
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

  // 现场诊断：F12 执行 copy(window.__meetingPadLogo)
  if (typeof window !== 'undefined') {
    ;(window as any).__meetingPadLogo = { url: publishedLogoUrl, source }
  }

  return { publishedLogoUrl, logoSource: source }
}
