import { reactive } from 'vue'
import { getSpaceFiles, type SpaceFile } from '@/api/spaceFile'
import { getServerConfig } from '@/config/servers'
import type { SpaceContext } from '@/utils/mqttTopics'
import { getPadCode } from '@/utils/logClk'
import { getPadDisplay } from '@/api/pad'

// 2.5D 地图单例服务：懒加载 + 模板生命周期内单实例常驻（详见计划：wallPad 2.5D 地图重新实现）
// 兜底链：edge type=map(.acmap) → type=mapimage(图片) → 静态兜底（MapCanvas slot）

export type MapStatus = 'idle' | 'loading' | 'ready' | 'image' | 'fallback'

export const mapState = reactive({
  status: 'idle' as MapStatus,
  imageUrl: null as string | null,
})

const BASE_URL = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`
const SDK_URL = `${BASE_URL}static/js/AirocovMap2.js`
const THEME_URL = `${BASE_URL}static/theme/theme.json`
const MAP_KEY = 'KMED1W0N50YIWIYJCUNLYPMJ49JDLASE'
const LOAD_TIMEOUT = 20000

let _map: any = null
let _blobUrl: string | null = null
let _sdkPromise: Promise<void> | null = null
let _loadPromise: Promise<void> | null = null
let _watchdog: number | null = null
let _filesCache: { key: string; files: SpaceFile[] } | null = null
let _contextKey: string | null = null
let _displayCache: { key: string; assigned: boolean | undefined } | null = null

// 判断本 pad 是否已分配地图素材（map/mapImage）。走边端 /api/pad/display 的 display_json：
//  - true：分配了（map 或 mapImage）→ 按现状加载地图/图
//  - false：明确未分配（display_json 为空/无 map/mapImage）→ 走默认图（fallback）
//  - undefined：取不到（缺 pad code / 请求失败）→ 不拦截，维持原行为，避免误伤
async function resolveMapAssigned(ctx: SpaceContext): Promise<boolean | undefined> {
  const key = contextKey(ctx)
  if (_displayCache && _displayCache.key === key) return _displayCache.assigned
  const padCode = getPadCode()
  if (!padCode) return undefined
  try {
    const res: any = await getPadDisplay(ctx.spaceCode, padCode)
    const d = res?.data || res
    const dj: any = d?.displayJson
    const has = !!(dj && (dj.map || dj.mapImage))
    _displayCache = { key, assigned: has }
    return has
  } catch (e) {
    console.warn('[mapViewer] resolveMapAssigned failed:', e)
    return undefined
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
  if (_filesCache && _filesCache.key === key) return _filesCache.files
  try {
    const res = await getSpaceFiles(ctx)
    const files: SpaceFile[] = res?.code === 0 && Array.isArray(res?.data?.files) ? res.data.files : []
    _filesCache = { key, files }
    return files
  } catch (e) {
    // 失败不缓存：下次打开页面时重试一次（单次请求，无风暴）
    console.warn('[mapViewer] getSpaceFiles failed:', e)
    return []
  }
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

export async function ensureMap(container: HTMLElement): Promise<void> {
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    try {
      const ctx = buildContext()
      const key = ctx ? contextKey(ctx) : ''

      // 终态复用：loading 进行中不重复拉起；ready/image 直接复用；
      // fallback 不跳过（清单失败未缓存，重开页面重试一次）
      if (_contextKey === key && ['loading', 'ready', 'image'].includes(mapState.status)) return

      // 绑定空间变化：重建实例
      if (_map && key && _contextKey !== key) {
        cleanupMap()
      }
      _contextKey = key
      mapState.status = 'loading'
      mapState.imageUrl = null

      if (!ctx) {
        mapState.status = 'fallback'
        return
      }

      // 地图区按本 pad 的 display_json 决定显示：配了 map/mapImage 才加载空间地图/图，
      // 未配置（云端/边端 content_config 已清）走默认图兜底，不再扫描素材库里残留的 .acmap
      const assigned = await resolveMapAssigned(ctx)
      if (assigned === false) {
        mapState.status = 'fallback'
        mapState.imageUrl = null
        return
      }

      await ensureSdk()

      const files = await fetchFiles(ctx)
      const mapFile = files.find((f) => f.type === 'map')
      const imageFile = files.find((f) => f.type === 'mapimage')

      if (mapFile) {
        clearWatchdog()
        // 看门狗：SDK 无 error 回调，下载/初始化卡死时兜底
        _watchdog = window.setTimeout(() => {
          console.warn('[mapViewer] map load timeout, fallback to static')
          cleanupMap()
          mapState.status = 'fallback'
        }, LOAD_TIMEOUT)
        try {
          const bytes = await downloadBytes(mapFile.url)
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
            },
          })
          return
        } catch (e) {
          console.warn('[mapViewer] map init failed, fall through to image:', e)
          clearWatchdog()
          cleanupMap()
          // 落到下一级：mapimage
        }
      }

      if (imageFile) {
        mapState.imageUrl = resolveUrl(imageFile.url)
        mapState.status = 'image'
        return
      }

      mapState.status = 'fallback'
    } catch (e) {
      console.warn('[mapViewer] ensureMap failed:', e)
      clearWatchdog()
      cleanupMap()
      mapState.status = 'fallback'
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
  _contextKey = null
  _displayCache = null
}
