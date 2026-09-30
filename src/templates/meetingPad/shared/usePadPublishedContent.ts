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
 * 会议室门牌「云端下发素材」：背景图 / logo / 二维码，全部走 edge（与 wallPad 取发布内容同一链路）
 *
 *   MQTT 设备配置响应 pad[0].code（usePadHeartbeat 写入 getPadCode）
 *     → 边端 GET /api/pad/display?spaceCode=&deviceCode=（display_json = 云端 content_config 级联物化结果）
 *     → displayJson 里的素材：
 *          ① materialId → 用 /api/space/getSpaceFiles 清单里 id = f_{materialId} 的素材 url
 *             （edge 自己生成 /api/asset/file?...，nginx /api/ → 后端 sendFile，一定可取）
 *          ② 清单里没有 → 退回素材自带的 imageUrl / url（可能是云端路径，仅作兜底）
 *     （与 services/mapViewer.ts 的 pickByMaterialId 同构：两套 pad 用同一套素材定位机制）
 *
 * 用途分配：logo → 左上角（兜底 geely）；二维码 → 保洁打卡（兜底内置「扫码无效」图）；
 *          背景图 → PadBg 轮播（支持多张，兜底主题内置图）。
 * 任一环节缺失 / 失败 → 对应项为空，由各组件兜底。
 *
 * 说明：/pad/getPadInfoByCode（老云端 Node-RED 端点）已不再使用 —— 边端部署里 1880 没有实现该端点，
 * 且 pad 页面（7828）请求它属于跨源会被 CORS 拦；素材统一由 /api/pad/display 提供（同源）。
 */

// 壁挂/门牌长期开机，配置结果缓存一段时间，避免每次进出子页都打接口
const CACHE_TTL_MS = 10 * 60 * 1000

interface MaterialCache {
  key: string
  logo: string
  qr: string
  bgs: string[]
  at: number
}

let _cache: MaterialCache | null = null
let _filesCache: { key: string; files: SpaceFile[]; at: number } | null = null

// 相对路径补全为边缘端绝对地址（与 mapViewer.resolveUrl 同规则）；data:/blob: 视为已是绝对地址
function resolveUrl(url: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  const cfg = getServerConfig()
  const base = cfg.edgeBaseUrl || cfg.apiBaseUrl
  if (!base) return url
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

// 素材键名不固定：显式优先键 → 任意匹配正则的键。键名取自边端 materialTypes（filesync.controller typeMap）：
//   logo / bookingqrcode / serviceqrcode / qqjqrcode / housekeeperqrcode / map / mapImage /
//   buildingImg（楼宇图片）/ homeImage（首页图片）/ homeVideo / exceptionfeedback
const LOGO_KEYS = ['logo', 'logoImage', 'logoimage', 'logoImg', 'logoimg', 'padLogo']
const LOGO_RE = /logo/i
const QR_KEYS = ['qrCode', 'qrcode', 'qr', 'qrImage', 'erweima', 'ewm']
const QR_RE = /qr|erweima|ewm/i
// 背景图：显式 bg/background/imgs 之外，也接受边端的 buildingImg（楼宇图片）/ homeImage（首页图片）
const BG_KEYS = [
  'background', 'backgroundImage', 'bg', 'bgImage', 'imgs', 'images', 'carousel',
  'buildingImg', 'buildingImage', 'homeImage', 'homeImg',
]
const BG_RE = /^(bg|background|backdrop|imgs?|images?|carousel|buildingimg|buildingimage|homeimg|homeimage)/i
// 明确排除：壁挂屏地图素材（map/mapImage）不能被当成背景图；homeVideo 是视频，PadBg 只渲染图片
const EXCLUDE_RE = /^(map|mapimage|map_image|mapimage2|homevideo|video)$/i

function matchKeys(displayJson: unknown, preferred: string[], re: RegExp): string[] {
  if (!displayJson || typeof displayJson !== 'object') return []
  const dj = displayJson as Record<string, any>
  const keys = Object.keys(dj).filter((k) => !EXCLUDE_RE.test(k) && dj[k] && typeof dj[k] === 'object')
  return [
    ...preferred.filter((k) => keys.includes(k)),
    ...keys.filter((k) => re.test(k) && !preferred.includes(k)),
  ]
}

function pickEntry(displayJson: unknown, preferred: string[], re: RegExp): any | null {
  const [k] = matchKeys(displayJson, preferred, re)
  return k ? (displayJson as Record<string, any>)[k] : null
}

function collectEntries(displayJson: unknown, preferred: string[], re: RegExp): any[] {
  const dj = (displayJson || {}) as Record<string, any>
  return matchKeys(displayJson, preferred, re).map((k) => dj[k])
}

// 单条素材可能带一张图（imageUrl/url/image）或多张（urls/images/imgs/files，元素为字符串或对象）
function inlineUrls(entry: any): string[] {
  const out: string[] = []
  const push = (v: any) => {
    if (typeof v === 'string' && v) { out.push(v); return }
    if (v && typeof v === 'object') {
      const u = v.imageUrl ?? v.url ?? v.image ?? ''
      if (typeof u === 'string' && u) out.push(u)
    }
  }
  const many = entry?.urls ?? entry?.images ?? entry?.imgs ?? entry?.files
  if (Array.isArray(many)) many.forEach(push)
  else push(entry?.imageUrl ?? entry?.url ?? entry?.image)
  return out
}

function materialIdsOf(entry: any): string[] {
  const raw = entry?.materialId ?? entry?.material_id ?? entry?.id
  if (raw === undefined || raw === null || raw === '') return []
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean)
}

export function usePadPublishedContent() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()
  const ctx = computed(() => spaceStore.spaceContext)

  const logoUrl = ref('')
  const qrUrl = ref('')
  const bgs = ref<string[]>([])
  const source = ref<'display' | 'fallback'>('fallback')

  let disposed = false
  let inflight = false
  let lastKey = ''

  // 素材清单（边端 /api/space/getSpaceFiles）：materialId 定位用，空清单不缓存
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

  // 与 wallpad（services/mapViewer.pickByMaterialId）一致：**materialId → edge 素材清单优先**。
  // 原因：display_json 里的 imageUrl/url 是云端自己的路径（如 /pad/material/image/13），
  // 在 edge 上 /pad/ 是 pad 静态 SPA（try_files → index.html，200+HTML），<img> 必然解码失败；
  // 而清单里的 url 是 edge 自己生成的 /api/asset/file?...（nginx /api/ → 后端 sendFile），一定可取。
  // 清单里查不到（素材尚未同步到边端 / 没配 materialId）才退回 display_json 带的直链。
  const resolveEntryUrls = async (entry: any, key: string): Promise<string[]> => {
    const ids = materialIdsOf(entry)
    if (ids.length) {
      const files = await loadFiles(key)
      const out: string[] = []
      for (const id of ids) {
        const hit = files.find((f) => String(f.id).replace(/^f_/, '') === id)
        if (hit?.url) out.push(resolveUrl(hit.url))
      }
      if (out.length) return out
    }
    const direct = inlineUrls(entry)
    return direct.map(resolveUrl)
  }

  function apply(logo: string, qr: string, nextBgs: string[]) {
    if (disposed) return
    logoUrl.value = logo
    qrUrl.value = qr
    bgs.value = nextBgs
    source.value = logo || qr || nextBgs.length ? 'display' : 'fallback'
  }

  const load = async (padCode: string, force = false) => {
    const c = ctx.value
    if (!c || !isCompleteSpaceContext(c)) return
    if (!padCode) { apply('', '', []); return }
    if (inflight) return

    const key = `${c.spaceCode}|${c.deviceCode}|${padCode}`
    if (!force && _cache && _cache.key === key && Date.now() - _cache.at < CACHE_TTL_MS) {
      apply(_cache.logo, _cache.qr, _cache.bgs)
      lastKey = key
      return
    }
    if (!force && lastKey === key && (logoUrl.value || qrUrl.value || bgs.value.length)) return

    inflight = true
    try {
      const res: any = await getPadDisplay(c.spaceCode, padCode)
      const data = res?.data || res
      const dj = data?.displayJson ?? data?.display_json ?? {}

      const logoEntry = pickEntry(dj, LOGO_KEYS, LOGO_RE)
      const qrEntry = pickEntry(dj, QR_KEYS, QR_RE)
      const bgEntries = collectEntries(dj, BG_KEYS, BG_RE)

      const logo = logoEntry ? ((await resolveEntryUrls(logoEntry, key))[0] ?? '') : ''
      const qr = qrEntry ? ((await resolveEntryUrls(qrEntry, key))[0] ?? '') : ''
      const bgLists = await Promise.all(bgEntries.map((e) => resolveEntryUrls(e, key)))
      const nextBgs = Array.from(new Set(bgLists.flat().filter(Boolean)))

      _cache = { key, logo, qr, bgs: nextBgs, at: Date.now() }
      lastKey = key
      apply(logo, qr, nextBgs)
      console.log('[meetingPad] 云端素材 →', {
        logo: logo || '(无 → geely 兜底)',
        qr: qr || '(无 → 扫码无效兜底)',
        bgs: nextBgs.length ? nextBgs : '(无 → 主题内置兜底)',
        source: data?.displaySource,
      })
    } catch (e) {
      console.warn('[meetingPad] getPadDisplay failed → 全部使用兜底素材:', e)
      lastKey = key
      apply('', '', [])
    } finally {
      inflight = false
    }
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

  // 现场诊断 / 联调：F12 执行 copy(window.__meetingPadDisplay)，或 __meetingPadRefreshContent()
  // 强制重拉云端素材（可传 pad code 覆盖，配置未到达时也能手动看效果）
  if (typeof window !== 'undefined') {
    ;(window as any).__meetingPadDisplay = { logoUrl, qrUrl, bgs, source }
    ;(window as any).__meetingPadRefreshContent = (padCodeOverride?: string) =>
      load(padCodeOverride || getPadCode(), true)
  }

  return { publishedLogoUrl: logoUrl, publishedQrUrl: qrUrl, publishedBgs: bgs, materialSource: source }
}
