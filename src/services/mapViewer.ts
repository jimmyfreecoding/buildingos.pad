import { reactive } from 'vue'
import { getSpaceFiles, type SpaceFile } from '@/api/spaceFile'
import { getServerConfig } from '@/config/servers'
import type { SpaceContext } from '@/utils/mqttTopics'
import { getPadCode } from '@/utils/logClk'
import { getPadDisplay } from '@/api/pad'

// wallPad 地图区显示服务：2.5D 地图单例（懒加载 + 模板生命周期内单实例常驻）
//
// 显示规则：地图区由「本 pad 的 display_json（= 云端 content_config 级联物化结果）」驱动
//   ① 配了 map(.acmap)      → 优先 2.5D，下载/初始化失败或 20s 超时自动降级到图片
//   ② 只配了 mapImage(图片) → 优先图片
//   ③ 没配（display_json 里没有 map/mapImage）或配置取不到 → 模板内置默认图（MapCanvas 的 slot 兜底）
// 兜底链固定为：map(.acmap) → mapimage(图片) → 静态默认图。
//
// 素材定位（关键）：不再靠「文件名里带楼层码」猜楼层——同一园区可能有多栋楼都叫 3F，文件名无法区分。
//   优先用 display_json 里配置的 materialId ↔ 边端素材清单 files[].id（边端 id = `f_{file_asset.id}`，
//   与云端 content_config 的 materialId 同源）精确命中本 pad 配置的那一个素材；
//   配置里没有 materialId（旧数据）时才退回「文件名含本 pad 楼层码 token」定位。
// 素材清单请求**不带 floorCode**（边端会按文件名里必须正好是楼层码来过滤，会把合法素材筛掉）。
//
// 显示总开关（需求确认）：地图区只在「本 pad 配置了地图素材」时才加载。
// 配置来源 = 边端 /api/pad/display 的 display_json（云端 content_config 级联物化到 iot_device 的结果）。
// 未配置（display_json 里没有 map/mapImage）或配置暂时取不到（pad code 未到 / 接口失败）→ 显示默认图，
// 不拉素材清单、也不去猜素材库里的其他素材（避免同名楼层串图）。
// 置 false 时退化为「按素材清单兜底」的宽松模式。
const REQUIRE_ASSIGNED = true

// 素材清单/display_json 缓存有效期：壁挂屏长期不刷新，新上传的素材要能自愈生效
const CACHE_TTL_MS = 60 * 1000
const LOAD_TIMEOUT = 20000

export type MapStatus = 'idle' | 'loading' | 'ready' | 'image' | 'fallback'

// 显示原因（现场诊断用）：一眼看出卡在哪一环，不再只有一张默认图
export type MapReason =
  | 'idle'
  | 'no-space-context' // initData 无空间绑定
  | 'display-gate' // display_json 明确未配置 map/mapImage → 默认图
  | 'display-unknown' // 取不到 display_json（pad code 未到 / 接口失败）→ 默认图，下次打开子页重试
  | 'no-asset' // 已配置，但边端素材清单里没有对应文件
  | 'map-init-failed' // 2.5D 下载/初始化失败且没有图片可降级
  | 'map-timeout' // 2.5D 20s 看门狗超时且没有图片可降级
  | 'image-load-failed' // 图片 URL 打不开（404/CORS/网络）
  | 'error' // 未预期异常
  | 'map-asset' // 2.5D 就绪
  | 'image-asset' // 图片就绪

export interface MapDetail {
  /** 边端素材清单条数（未配置时不会去拉，为 undefined） */
  files?: number
  /** display_json 里地图素材的分配情况：map / mapImage / none / unknown(取不到) */
  assign?: 'map' | 'mapImage' | 'none' | 'unknown'
  /** display_json 来源：iot_device(云端已物化) / content_config(边端现场级联) / none */
  displaySource?: string
  /** 素材定位方式：materialId(精确) / materialId-miss(配了但边端没有) / floor-token(按楼层码兜底) / single-asset(全空间唯一) / none */
  matched?: 'materialId' | 'materialId-miss' | 'floor-token' | 'single-asset' | 'none'
  /** 失败原因细节（错误信息 / 打不开的图片地址） */
  error?: string
}

export const mapState = reactive({
  status: 'idle' as MapStatus,
  imageUrl: null as string | null,
  reason: 'idle' as MapReason,
  detail: {} as MapDetail,
})

// 现场诊断入口：pad 页面上 F12 执行 copy(window.__wallpadMap) 即可看到决策结果（不含任何业务数据）
if (typeof window !== 'undefined') {
  ;(window as any).__wallpadMap = mapState
}

const BASE_URL = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`
const SDK_URL = `${BASE_URL}static/js/AirocovMap2.js`
const THEME_URL = `${BASE_URL}static/theme/theme.json`
const MAP_KEY = 'KMED1W0N50YIWIYJCUNLYPMJ49JDLASE'

let _map: any = null
let _blobUrl: string | null = null
let _sdkPromise: Promise<void> | null = null
let _loadPromise: Promise<void> | null = null
let _watchdog: number | null = null
let _filesCache: { key: string; files: SpaceFile[]; at: number } | null = null
let _contextKey: string | null = null
let _displayCache: { key: string; hint: MapAssignHint; at: number } | null = null

// 本 pad 是否已分配地图素材（map/mapImage）。走边端 /api/pad/display 的 display_json：
//  - known=true + map/mapImage：明确分配 → 决定优先显示 2.5D 还是图片，并用 materialId 精确定位素材
//  - known=true + 都没有：明确未配置（content_config 已清）→ 默认图
//  - known=false：取不到（缺 pad code / 请求失败）→ 不拦截，以素材清单为准
interface MapAssignHint {
  known: boolean
  map: boolean
  mapImage: boolean
  /** content_config 里的素材 id，对应云端 file_asset.id（边端清单里 id 为 `f_{id}`） */
  mapMaterialId: string | null
  imageMaterialId: string | null
  /** display_json 来源（边端返回 displaySource）：iot_device / content_config / none / unknown */
  source: string
}

const UNKNOWN_HINT: MapAssignHint = {
  known: false,
  map: false,
  mapImage: false,
  mapMaterialId: null,
  imageMaterialId: null,
  source: 'unknown',
}

function cacheFresh<T extends { key: string; at: number }>(c: T | null, key: string): c is T {
  return !!c && c.key === key && Date.now() - c.at < CACHE_TTL_MS
}

function materialIdOf(entry: any): string | null {
  if (!entry) return null
  const id = entry.materialId ?? entry.material_id ?? entry.id
  return id === undefined || id === null || id === '' ? null : String(id)
}

async function resolveMapHint(ctx: SpaceContext): Promise<MapAssignHint> {
  const key = contextKey(ctx)
  if (cacheFresh(_displayCache, key)) return _displayCache.hint
  const padCode = getPadCode()
  // 设备配置（pad[0].code）还没经 MQTT 到达时不拦截也不缓存，下次打开子页再判定
  if (!padCode) return UNKNOWN_HINT
  try {
    const res: any = await getPadDisplay(ctx.spaceCode, padCode)
    const d = res?.data || res
    const dj: any = d?.displayJson
    const hint: MapAssignHint = {
      known: true,
      map: !!dj?.map,
      mapImage: !!dj?.mapImage,
      mapMaterialId: materialIdOf(dj?.map),
      imageMaterialId: materialIdOf(dj?.mapImage),
      source: String(d?.displaySource || 'iot_device'),
    }
    _displayCache = { key, hint, at: Date.now() }
    return hint
  } catch (e) {
    console.warn('[mapViewer] resolveMapHint failed:', e)
    return UNKNOWN_HINT
  }
}

function readBoundSpace(): Record<string, any> {
  try {
    const raw = localStorage.getItem('initData')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// 与 src/stores/space.ts spaceContext 同构：四段绑定
function buildContext(): SpaceContext | null {
  const b = readBoundSpace()
  if (!b?.code && !b?.spaceId) return null
  return {
    spaceCode: b.code || String(b.spaceId),
    floorAreaCode: b.floorAreaCode || '',
    floorCode: b.floorCode || '',
    deviceCode: b.roomCode || String(b.roomId || ''),
  }
}

function contextKey(ctx: SpaceContext): string {
  return [ctx.spaceCode, ctx.floorAreaCode, ctx.floorCode, ctx.deviceCode].join('|')
}

function ensureSdk(): Promise<void> {
  if (window.AirocovMap) return Promise.resolve()
  if (!_sdkPromise) {
    _sdkPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SDK_URL
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        _sdkPromise = null
        reject(new Error('AirocovMap SDK load failed'))
      }
      document.head.appendChild(s)
    })
  }
  return _sdkPromise
}

// 相对路径补全为边缘端绝对地址
function resolveUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  const base = getServerConfig().edgeBaseUrl || getServerConfig().apiBaseUrl
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

async function fetchFiles(ctx: SpaceContext): Promise<SpaceFile[]> {
  const key = contextKey(ctx)
  if (cacheFresh(_filesCache, key)) return _filesCache.files
  try {
    // 不带 floorCode：边端会按「文件名必须正好是楼层码」过滤（`^(?:\d+_)?3F\.[^.]+$`），
    // 云端上传会把文件重命名为 `{时间戳}_{清洗后的原名}{扩展名}`（如 1758..._3F-平面图.png），
    // 一旦清洗结果不等于楼层码就被筛掉 → 清单为空 → 误显示默认图。
    // 这里取本空间全量地图素材，由 pad 侧用 materialId / 楼层码 token 两级规则定位。
    const res = await getSpaceFiles({ ...ctx, floorCode: '' })
    const files: SpaceFile[] = res?.code === 0 && Array.isArray(res?.data?.files) ? res.data.files : []
    // 空清单不缓存：云端刚上传 / 边端刚同步完成时，下次打开子页立即重新拉取（每次打开最多 1 次请求）
    _filesCache = files.length ? { key, files, at: Date.now() } : null
    return files
  } catch (e) {
    // 失败不缓存：下次打开子页重试一次（单次请求，无风暴）
    console.warn('[mapViewer] getSpaceFiles failed:', e)
    _filesCache = null
    return []
  }
}

// 精确匹配：display_json 的 materialId ↔ 边端 files[].id（边端 id 形如 `f_12`，12 即云端 file_asset.id）
function pickByMaterialId(files: SpaceFile[], materialId: string | null): SpaceFile | undefined {
  if (!materialId) return undefined
  return files.find((f) => String(f.id).replace(/^f_/, '') === materialId)
}

// 兜底匹配：文件名里带本 pad 楼层码 token（3F.png / 1758_3F.png / 3F-平面图.png / map_3F.png 均可），
// 前后必须是分隔符或边界，避免 1F 命中 11F / B1F 之类
function floorTokenRe(floorCode: string): RegExp | null {
  const fc = String(floorCode || '').trim()
  if (!fc) return null
  const esc = fc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^0-9A-Za-z])${esc}(?![0-9A-Za-z])`, 'i')
}

// 未配置（没有 materialId）时的候选：同一楼层码可能有多次上传的多个文件（文件名带时间戳），取最新的一条
// （边端清单按 file_asset.id 升序返回，最后一个即最新上传）
function pickLatest(files: SpaceFile[], type: SpaceFile['type']): SpaceFile | undefined {
  const hits = files.filter((f) => f.type === type)
  return hits.length ? hits[hits.length - 1] : undefined
}

async function downloadBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(resolveUrl(url))
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  return res.arrayBuffer()
}

function highlightRoom(map: any, name?: string) {
  if (!name) return
  const children = map?.currentBuilding?.children?.[0]?.getLayer('roomGroup')?.children
  if (Array.isArray(children)) {
    children.forEach((v: any) => {
      if (v.name === name) v.highLight('rgba(237,135,51,.2)')
    })
  }
}

function clearWatchdog() {
  if (_watchdog !== null) {
    clearTimeout(_watchdog)
    _watchdog = null
  }
}

// SDK 无公开 destroy()；释放 = 停渲染循环 + renderer.dispose(forceContextLoss) + 移除 DOM + 回收 blob
function cleanupMap() {
  if (_map) {
    try {
      _map.enabled = false
    } catch {}
    try {
      _map.render?.clearAnimate?.()
    } catch {}
    try {
      _map.render?.renderer?.dispose?.()
    } catch {}
    try {
      _map.render?.labelRenderer?.domElement?.remove?.()
      _map.render?.label2DRenderer?.domElement?.remove?.()
    } catch {}
    _map = null
  }
  if (_blobUrl) {
    URL.revokeObjectURL(_blobUrl)
    _blobUrl = null
  }
}

function setFallback(reason: MapReason, detail?: MapDetail) {
  clearWatchdog()
  mapState.status = 'fallback'
  mapState.imageUrl = null
  mapState.reason = reason
  if (detail) mapState.detail = { ...mapState.detail, ...detail }
  console.info('[mapViewer] fallback → 默认图:', reason, mapState.detail)
}

function showImage(file: SpaceFile) {
  clearWatchdog()
  mapState.imageUrl = resolveUrl(file.url)
  mapState.status = 'image'
  mapState.reason = 'image-asset'
  console.info('[mapViewer] image asset:', file.name, mapState.imageUrl)
}

// 图片（mapimage）本身打不开（404 / CORS / 网络）时兜底到默认图，不留白屏
export function reportImageError() {
  if (mapState.status !== 'image') return
  setFallback('image-load-failed', { error: `image load failed: ${mapState.imageUrl || ''}` })
}

// 2.5D 初始化：SDK 只在真正要用 2.5D 时加载（SDK 挂了不能连累图片兜底）
async function startMap(
  container: HTMLElement,
  file: SpaceFile,
  onTimeout: () => void,
): Promise<boolean> {
  try {
    await ensureSdk()
    clearWatchdog()
    // 看门狗：SDK 无 error 回调，下载/初始化卡死时兜底
    _watchdog = window.setTimeout(() => {
      console.warn('[mapViewer] map load timeout, fallback')
      cleanupMap()
      onTimeout()
    }, LOAD_TIMEOUT)
    const bytes = await downloadBytes(file.url)
    const blob = new Blob([bytes])
    _blobUrl = URL.createObjectURL(blob)
    const bound = readBoundSpace()
    const highlightName = bound.roomName || bound.floorAreaName || undefined
    _map = new window.AirocovMap.Map({
      container,
      mapUrl: _blobUrl,
      themeUrl: THEME_URL,
      floorSwitch: { show: false },
      opacity: 0.6,
      mergeModels: ['floor', 'plane', 'area', 'logo'],
      clickModels: ['floor', 'plane', 'room', 'area', 'wall', 'logo'],
      key: MAP_KEY,
      zoom: 0.8,
      showViewMode: '2D',
      bgColor: '#090909',
      defaultFloorIndex: 0,
      showAllFloor: false,
      minPolarAngle: 0,
      maxPolarAngle: 90,
      pointScale: 1.4,
      clickIntoBuilding: false,
      name: 'ZeekrMap',
      font: {
        fontScale: 2,
        fontFamily: '"Microsoft YaHei",微软雅黑,"Microsoft YaHei",sans-serif',
        color: '#000',
        strokecolor: '#FFF',
      },
      onReady: () => {
        // 看门狗已触发（超时兜底）后迟到的 onReady 忽略
        if (!_map || mapState.status !== 'loading') return
        clearWatchdog()
        try {
          highlightRoom(_map, highlightName)
        } catch (e) {
          console.warn('[mapViewer] highlightRoom failed:', e)
        }
        mapState.status = 'ready'
        mapState.reason = 'map-asset'
        console.info('[mapViewer] 2.5D map ready:', file.name)
      },
    })
    return true
  } catch (e) {
    console.warn('[mapViewer] map init failed, try image fallback:', e)
    clearWatchdog()
    cleanupMap()
    return false
  }
}

export async function ensureMap(container: HTMLElement): Promise<void> {
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    try {
      const ctx = buildContext()
      const key = ctx ? contextKey(ctx) : ''

      // 终态复用：loading 进行中不重复拉起；ready/image 直接复用；
      // fallback 不跳过（云边可能刚补上素材，重开子页重新判定一次）
      if (_contextKey === key && ['loading', 'ready', 'image'].includes(mapState.status)) return

      // 绑定空间变化：重建实例
      if (_map && key && _contextKey !== key) {
        cleanupMap()
      }
      _contextKey = key
      mapState.status = 'loading'
      mapState.imageUrl = null
      mapState.reason = 'idle'
      mapState.detail = {}

      if (!ctx) {
        setFallback('no-space-context')
        return
      }

      // 先取本 pad 的 display_json（云端 content_config 级联物化到 iot_device 的结果，经边端 /api/pad/display 读出）
      const hint = await resolveMapHint(ctx)
      const assigned = hint.known && (hint.map || hint.mapImage)

      // 没配置这台 pad（或配置暂时取不到）→ 默认图，不拉素材清单
      if (!assigned && REQUIRE_ASSIGNED) {
        mapState.detail = { assign: hint.known ? 'none' : 'unknown' }
        setFallback(hint.known ? 'display-gate' : 'display-unknown')
        return
      }

      // 只有配置了才去取素材清单（边端已同步的素材文件）
      const files = await fetchFiles(ctx)
      mapState.detail = {
        files: files.length,
        assign: hint.known ? (hint.map ? 'map' : hint.mapImage ? 'mapImage' : 'none') : 'unknown',
        displaySource: hint.source,
      }

      // 该楼层可见的素材集合（按文件名楼层码 token 匹配，前后须为分隔符/边界）
      const re = floorTokenRe(ctx.floorCode)
      const floorFiles = re ? files.filter((f) => re.test(f.name)) : files

      // 定位素材：配了 materialId → 只认那一个（同名楼层的唯一可靠区分手段，也避免回落到残留素材）；
      // 配置里没有 materialId（旧数据）→ 按楼层码 token 定位。
      let mapFile: SpaceFile | undefined
      let imageFile: SpaceFile | undefined
      let matched: MapDetail['matched']
      const hasIds = !!(hint.mapMaterialId || hint.imageMaterialId)
      if (hasIds) {
        mapFile = pickByMaterialId(files, hint.mapMaterialId)
        imageFile = pickByMaterialId(files, hint.imageMaterialId)
        matched = mapFile || imageFile ? 'materialId' : 'materialId-miss' // miss = 配置的素材还没同步到边端
      } else {
        mapFile = pickLatest(floorFiles, 'map')
        imageFile = pickLatest(floorFiles, 'mapimage')
        matched = mapFile || imageFile ? 'floor-token' : 'none'
        if (!mapFile && !imageFile && files.length === 1) {
          // 命名不含楼层码时的兜底：全空间只有一个地图素材，用它
          if (files[0].type === 'map') mapFile = files[0]
          else imageFile = files[0]
          matched = 'single-asset'
        }
      }
      mapState.detail.matched = matched

      if (!mapFile && !imageFile) {
        setFallback('no-asset')
        return
      }

      // 优先 2.5D：清单里有 acmap，且 display_json 没特别指定「只要图片」
      const mapFirst = !!mapFile && (!hint.known || hint.map || !hint.mapImage)

      if (mapFirst && mapFile) {
        const started = await startMap(container, mapFile, () => {
          if (imageFile) showImage(imageFile)
          else setFallback('map-timeout')
        })
        // 初始化成功：状态由 onReady 异步置为 ready
        if (started) return
      }

      if (imageFile) {
        showImage(imageFile)
        return
      }

      setFallback('map-init-failed')
    } catch (e: any) {
      console.warn('[mapViewer] ensureMap failed:', e)
      cleanupMap()
      setFallback('error', { error: String(e?.message || e) })
    } finally {
      _loadPromise = null
    }
  })()
  return _loadPromise
}

// canvas 迁移到新容器：SDK 每帧 resize() 读 config.container 尺寸，改指后自愈
export function attachMap(container: HTMLElement) {
  if (!_map || mapState.status !== 'ready') return
  try {
    const canvas = _map.render?.renderer?.domElement
    if (canvas && canvas.parentNode !== container) {
      container.appendChild(canvas)
    }
    const renderer = _map.render?.renderer
    if (renderer) {
      renderer.config.container = container
      renderer.resize()
    }
    const labelEl = _map.render?.labelRenderer?.domElement
    if (labelEl && labelEl.parentNode !== container) {
      container.appendChild(labelEl)
    }
  } catch (e) {
    console.warn('[mapViewer] attachMap failed:', e)
  }
}

// no-op：容器 display:none 后渲染循环自动缩至 0×0，重显自愈
export function detachMap() {}

export function destroyMap() {
  clearWatchdog()
  cleanupMap()
  mapState.status = 'idle'
  mapState.imageUrl = null
  mapState.reason = 'idle'
  mapState.detail = {}
  _contextKey = null
  _displayCache = null
  _filesCache = null
}
