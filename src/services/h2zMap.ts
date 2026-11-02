// 楼层交付包 .h2z 的显示（wallPad 地图区）：用 @h2z/viewer（和 BuildingOS 主前端同一个三维解释器）。
// .h2z = h2z.3d 编译的楼层地图（manifest.json / semantics.json / scene.glb）+ IOC 点位（points.json）等，
// 格式见 buildingos docs/3D地图和点位规划设计.md §3。
//
// Pad 上的样子（2026-11-02 定）：
//  - 暗色楼层（模型原色压暗、略带蓝灰，和 pad 深色界面一致），画面按屏幕实际像素渲染（不糊）；
//  - 所有房间名都显示：本 pad 房间橙底白字最醒目，会议室按占用 / 空闲着色，其他房间深底浅字；
//    标签跟着缩放 / 转动走，字号随缩放变化，互相挡住时按「本房间 > 会议室 > 其他」留一个；
//  - 打开时自动飞到本 pad 的房间（对不上房间再找区域），都对不上看整层；
//  - 状态层：灯（开 / 关）、会议室（占用 / 空闲），由页面喂进来（setStates），和左边的照明 / 会议室实时对应。
//
// 生命周期由 mapViewer.ts 管（单例、看门狗、降级）；这里只负责：建 viewer、装模型、换容器、暂停、释放。
// viewer 挂在我们自己的 wrapper 上，换容器时整个 wrapper 搬过去，viewer 内部的 ResizeObserver 盯的是 wrapper。
import * as THREE from 'three'
import { unzipSync, strFromU8 } from 'fflate'
import { Viewer, loadMap } from '@h2z/viewer'

const BASE_URL = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`
const DECODER_PATH = `${BASE_URL}static/vendor/draco/`

/** 背景色和旧 2.5D 地图一致（#090909） */
const BG = 0x090909
/** 楼层压暗：原色 × DIM，再往 TINT 靠一点（蓝灰，和 pad 卡片底色同一色系） */
const DIM = 0.55
/** 曝光（viewer 默认 0.85）：模型灯光按旧版 ×π，光靠改材质压不下去 */
const EXPOSURE = 0.18
const TINT = new THREE.Color(0x1c2536)
const TINT_MIX = 0.25
const HIGHLIGHT = { color: 0xff8a3d, opacity: 0.45 }
/** 自动飞到房间时，画面里至少看到这么大的范围（米），带上周边好认位置 */
const FOCUS_MIN_SPAN = 26

export type RoomState = 'busy' | 'free'
export interface MapStates {
  /** 灯：key = 点位编号 / 绑定设备编号 / 设备 id，值 = 开（true）关（false） */
  lights?: Record<string, boolean>
  /** 会议室：key = 房间名（和地图房间名比对，规则同本房间），值 = 占用 / 空闲 */
  rooms?: Record<string, RoomState>
}

export interface H2zHandle {
  /** 搬到新容器（MapCanvas 换了宿主） */
  attach(container: HTMLElement): void
  /** 看不见时停渲染，省 pad 的 GPU */
  pause(paused: boolean): void
  /** 实时状态（灯、会议室）；可以反复调 */
  setStates(states: MapStates): void
  dispose(): void
  /** 本 pad 房间 / 区域在地图上的名字（空 = 没对上，看整层） */
  highlighted: string | null
}

/** 是不是 .h2z / .buildingosmap（zip，里面有 manifest.json）；旧 .acmap 不是 zip */
export function isH2zBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false
  const probe = (from: number, to: number) =>
    new TextDecoder('latin1').decode(bytes.subarray(Math.max(0, from), Math.min(bytes.length, to)))
  return probe(0, 65536).includes('manifest.json') || probe(bytes.length - 65536, bytes.length).includes('manifest.json')
}

/** 房间名比对：去空格、全角转半角、忽略大小写 */
function norm(s: string): string {
  return String(s || '')
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .toLowerCase()
}

/** 按名字在房间锚点里找：先精确，再互相包含（「2604会议室」↔「2604」） */
function findAnchor(rooms: any[], names: string[]): any | null {
  for (const raw of names) {
    const n = norm(raw)
    if (!n) continue
    const exact = rooms.find((a) => norm(a.text) === n)
    if (exact) return exact
  }
  for (const raw of names) {
    const n = norm(raw)
    if (n.length < 2) continue
    const part = rooms.find((a) => norm(a.text).includes(n) || n.includes(norm(a.text)))
    if (part) return part
  }
  return null
}

const isMeetingRoom = (text: string) => /会议|洽谈|meeting/i.test(text)

// ---------------------------------------------------------------- 取景

/** 平面点集（x,z）的最小面积外接矩形，返回长边方向（凸包每条边试一遍） */
function minAreaAngle(p2: [number, number][]): number {
  p2.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = [], upper: [number, number][] = []
  for (const q of p2) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q) }
  for (let i = p2.length - 1; i >= 0; i--) { const q = p2[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q) }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1))
  let best = 0, bestArea = Infinity, longIsA = true
  for (let i = 0; i < hull.length; i++) {
    const [x1, z1] = hull[i], [x2, z2] = hull[(i + 1) % hull.length]
    const a = Math.atan2(z2 - z1, x2 - x1), ax = Math.cos(a), az = Math.sin(a)
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity
    for (const [x, z] of hull) { const u = x * ax + z * az, v = -x * az + z * ax; minA = Math.min(minA, u); maxA = Math.max(maxA, u); minB = Math.min(minB, v); maxB = Math.max(maxB, v) }
    const area = (maxA - minA) * (maxB - minB)
    if (area < bestArea) { bestArea = area; best = a; longIsA = maxA - minA >= maxB - minB }
  }
  return longIsA ? best : best + Math.PI / 2
}

interface Rect { center: THREE.Vector3; long: THREE.Vector3; lenLong: number; lenShort: number; top: number }

/** 点集在给定方向上的外接矩形 */
function rectOf(pts: number[], long: THREE.Vector3): Rect {
  const ax = long.x, az = long.z
  let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity, top = -Infinity
  for (let i = 0; i < pts.length; i += 3) {
    const x = pts[i], z = pts[i + 2]
    const a = x * ax + z * az, b = -x * az + z * ax
    minA = Math.min(minA, a); maxA = Math.max(maxA, a); minB = Math.min(minB, b); maxB = Math.max(maxB, b); top = Math.max(top, pts[i + 1])
  }
  const ma = (minA + maxA) / 2, mb = (minB + maxB) / 2
  return { center: new THREE.Vector3(ma * ax - mb * az, 0, ma * az + mb * ax), long: long.clone(), lenLong: maxA - minA, lenShort: maxB - minB, top }
}

/** 物体的世界坐标顶点（抽样） */
function samplePoints(root: THREE.Object3D, perMesh = 400): number[] {
  const pts: number[] = []
  const v = new THREE.Vector3()
  root.updateMatrixWorld(true)
  root.traverse((o: any) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry?.attributes?.position) return
    const a = o.geometry.attributes.position
    const step = Math.max(1, Math.floor(a.count / perMesh))
    for (let i = 0; i < a.count; i += step) {
      v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld)
      pts.push(v.x, v.y, v.z)
    }
  })
  return pts
}

/** 俯视取景：rect 放进 w×h 的画面，竖屏长边竖放、横屏长边横放，四周留边；返回机位到目标的距离 */
function fitTop(viewer: any, r: Rect, w: number, h: number, margin = 1.12): number {
  const portrait = h >= w
  const up = portrait ? r.long.clone() : new THREE.Vector3(-r.long.z, 0, r.long.x)
  const spanV = portrait ? r.lenLong : r.lenShort
  const spanH = portrait ? r.lenShort : r.lenLong
  const t = Math.tan(THREE.MathUtils.degToRad(viewer.camera.fov / 2))
  const dist = Math.max(spanV / 2 / t, spanH / 2 / (t * (w / h))) * margin
  const target = r.center.clone().setY(0)
  const pos = target.clone().add(up.multiplyScalar(-0.01 * dist)).setY(r.top + dist)
  viewer.fly = null
  viewer.controls.autoRotate = false
  viewer.camera.position.copy(pos)
  viewer.controls.target.copy(target)
  viewer.camera.near = Math.max(0.1, dist / 200)
  viewer.camera.far = Math.max(viewer.camera.far, dist * 4)
  viewer.camera.updateProjectionMatrix()
  viewer.controls.update()
  return dist
}

// ---------------------------------------------------------------- 主流程

export async function startH2z(
  container: HTMLElement,
  bytes: Uint8Array,
  opts: { roomNames: string[]; onReady: () => void; onError: (e: unknown) => void },
): Promise<H2zHandle> {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#090909'
  const layer = document.createElement('div')
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;font-family:"PingFang SC","Microsoft YaHei",sans-serif'
  container.appendChild(wrap)

  let mineTarget: string | null = null
  const mineGroup = new THREE.Group()
  let fitDist = 1
  let fitObserver: ResizeObserver | null = null
  let states: MapStates = {}
  let roomState = new Map<string, RoomState>() // 锚点 target → 状态
  let lights: { id: string; pos: THREE.Vector3; name: string; keys: string[]; room: string }[] = []

  const viewer: any = new Viewer(wrap, {
    palette: { skyDay: BG, skyNight: BG, studioSky: BG },
    emit: (type: string, payload: any) => {
      if (type === 'labels') draw(payload)
      else if (type === 'error') opts.onError(payload)
    },
  })
  wrap.appendChild(layer)
  ;(window as any).__h2zViewer = viewer // 现场诊断用（F12）

  // 画面清晰度：按屏幕实际像素渲染。v-scale-screen 会把整页 CSS 缩放，canvas 要乘上这个缩放；上限 2 保 pad 的 GPU
  const sharpen = () => {
    const css = wrap.getBoundingClientRect().width / Math.max(1, wrap.clientWidth)
    const ratio = Math.min(2, Math.max(1.5, (window.devicePixelRatio || 1) * (css || 1)))
    if (Math.abs(viewer.renderer.getPixelRatio() - ratio) > 0.01) {
      viewer.renderer.setPixelRatio(ratio)
      viewer._resize?.()
    }
  }

  // ---------------- 标签和状态点（HTML，跟着机位每 60ms 重排）
  const pool = new Map<string, HTMLDivElement>()
  const v3 = new THREE.Vector3()
  function el(id: string, make: () => HTMLDivElement) {
    let e = pool.get(id)
    if (!e) { e = make(); layer.appendChild(e); pool.set(id, e) }
    return e
  }
  function roomLabel(text: string, kind: 'mine' | 'busy' | 'free' | 'room', mineState?: RoomState) {
    const e = document.createElement('div')
    e.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;border-radius:999px;line-height:1;will-change:transform;'
    const dot = kind === 'busy' ? '#ff5a5a' : kind === 'free' ? '#3ddc84' : ''
    const tag = kind === 'busy' ? '占用' : kind === 'free' ? '空闲' : kind === 'mine' ? '当前' : ''
    e.dataset.kind = kind
    if (kind === 'mine') {
      e.style.cssText += 'background:#ff8a3d;color:#fff;font-weight:700;padding:6px 12px;box-shadow:0 0 0 2px rgba(255,138,61,.35),0 4px 12px rgba(0,0,0,.5);z-index:3'
      const st = mineState === 'busy' ? '<span style="margin-left:8px;font-size:.8em;padding:1px 6px;border-radius:999px;background:#d93838">占用</span>' : mineState === 'free' ? '<span style="margin-left:8px;font-size:.8em;padding:1px 6px;border-radius:999px;background:#1f9d5a">空闲</span>' : ''
      e.innerHTML = `<span style="font-size:.78em;opacity:.9;margin-right:6px;padding:1px 6px;border-radius:999px;background:rgba(0,0,0,.18)">${tag}</span>${text}${st}`
    } else if (dot) {
      e.style.cssText += `background:rgba(12,17,26,.86);color:#fff;font-weight:600;padding:5px 10px;border:1px solid ${dot}66;z-index:2`
      e.innerHTML = `<span style="display:inline-block;width:.6em;height:.6em;border-radius:50%;background:${dot};margin-right:6px;vertical-align:.05em;box-shadow:0 0 6px ${dot}"></span>${text}<span style="margin-left:6px;color:${dot};font-size:.82em">${tag}</span>`
    } else {
      e.style.cssText += 'background:rgba(12,17,26,.72);color:#c9d3e0;font-weight:500;padding:4px 8px;border:1px solid rgba(255,255,255,.08);z-index:1'
      e.textContent = text
    }
    return e
  }
  function lightDot(on: boolean | undefined) {
    const e = document.createElement('div')
    e.style.cssText = 'position:absolute;left:0;top:0;border-radius:50%;will-change:transform;z-index:2;'
    return paintLight(e, on)
  }
  function paintLight(e: HTMLDivElement, on: boolean | undefined) {
    e.dataset.on = String(on)
    e.style.background = on ? 'radial-gradient(circle,#fff6c8 0%,#ffd23f 45%,rgba(255,210,63,0) 72%)' : on === false ? 'rgba(20,26,36,.9)' : '#262d38'
    e.style.border = on ? 'none' : on === false ? '2px solid #a7b0bd' : '1px dashed #59626f'
    e.style.boxShadow = on ? '0 0 14px 6px rgba(255,210,63,.55)' : 'none'
    return e
  }

  function draw(list: any[]) {
    const w = wrap.clientWidth, h = wrap.clientHeight
    const dist = viewer.camera.position.distanceTo(viewer.controls.target)
    // 字号随缩放：看整层 13px，拉近逐步放大到 20px
    const scale = Math.min(1.55, Math.max(1, Math.pow(fitDist / Math.max(dist, 0.01), 0.35)))
    const base = 13 * scale
    const seen = new Set<string>()
    // 先排优先级：本房间 > 会议室（有状态）> 其他；互相挡住时后面的隐藏
    const rooms = (list || []).filter((l) => l.kind === 'room' && l.visible && l.text && l.x > -50 && l.y > -50 && l.x < w + 50 && l.y < h + 50)
    const rank = (l: any) => (l.id === mineTarget ? 0 : roomState.has(l.id) ? 1 : 2)
    rooms.sort((a, b) => rank(a) - rank(b))
    const boxes: number[][] = []
    for (const l of rooms) {
      const kind = l.id === mineTarget ? 'mine' : roomState.get(l.id) || 'room'
      const look = kind === 'mine' ? `mine:${roomState.get(l.id) || ''}` : kind
      const key = `r:${l.id}`
      let e = pool.get(key)
      if (e && e.dataset.look !== look) { e.remove(); pool.delete(key); e = undefined }
      e = el(key, () => { const x = roomLabel(l.text, kind as any, roomState.get(l.id)); x.dataset.look = look; return x })
      const fs = kind === 'mine' ? base * 1.25 : kind === 'room' ? base : base * 1.08
      e.style.fontSize = `${fs.toFixed(1)}px`
      const bw = e.offsetWidth || l.text.length * fs + 24, bh = e.offsetHeight || fs + 12
      const box = [l.x - bw / 2, l.y - bh / 2, l.x + bw / 2, l.y + bh / 2]
      const hits = (bx: number[]) => boxes.some((b) => bx[0] < b[2] + 3 && bx[2] > b[0] - 3 && bx[1] < b[3] + 3 && bx[3] > b[1] - 3)
      let dy = 0
      if (hits(box)) {
        if (kind === 'room') { e.style.display = 'none'; seen.add(key); continue }
        // 本房间 / 会议室不隐藏：上下错开找空位
        for (const t of [1, -1, 2, -2, 3, -3]) {
          const b2 = [box[0], box[1] + t * (bh + 4), box[2], box[3] + t * (bh + 4)]
          if (!hits(b2)) { dy = t * (bh + 4); break }
        }
      }
      boxes.push([box[0], box[1] + dy, box[2], box[3] + dy])
      e.style.display = ''
      e.style.transform = `translate(${(l.x - bw / 2).toFixed(1)}px,${(l.y - bh / 2 + dy).toFixed(1)}px)`
      seen.add(key)
    }
    // 灯：有状态的才画；拉近时点变大
    const lightMap = states.lights || {}
    const size = Math.round(10 * scale)
    for (const p of lights) {
      const k = p.keys.find((x) => x in lightMap)
      if (k === undefined) continue
      v3.copy(p.pos).project(viewer.camera)
      if (v3.z < -1 || v3.z > 1) continue
      const x = (v3.x * 0.5 + 0.5) * w, y = (-v3.y * 0.5 + 0.5) * h
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue
      const key = `l:${p.id}`
      const on = lightMap[k]
      const e = el(key, () => lightDot(on))
      if (e.dataset.on !== String(on)) paintLight(e, on)
      const s = on ? size * 2.2 : size * 1.3
      e.style.width = e.style.height = `${s}px`
      e.style.transform = `translate(${(x - s / 2).toFixed(1)}px,${(y - s / 2).toFixed(1)}px)`
      e.style.display = ''
      seen.add(key)
    }
    for (const [id, e] of pool) if (!seen.has(id)) e.style.display = 'none'
  }

  const handle: H2zHandle = {
    highlighted: null,
    attach(next: HTMLElement) {
      if (wrap.parentNode !== next) next.appendChild(wrap)
      sharpen()
    },
    pause(p: boolean) {
      try { viewer.pause(p) } catch {}
    },
    setStates(next: MapStates) {
      states = { lights: { ...(states.lights || {}), ...(next.lights || {}) }, rooms: { ...(states.rooms || {}), ...(next.rooms || {}) } }
      const anchors = (viewer.model?.semantics?.anchors || []).filter((a: any) => a?.kind === 'room' && a.text)
      roomState = new Map()
      for (const [name, st] of Object.entries(states.rooms || {})) {
        const a = findAnchor(anchors, [name])
        if (a) roomState.set(a.target, st)
      }
      try { draw(viewer.labels()) } catch {}
    },
    dispose() {
      fitObserver?.disconnect()
      try {
        viewer.dispose()
        viewer.renderer?.forceContextLoss?.()
      } catch {}
      wrap.remove()
      pool.clear()
    },
  }

  try {
    const loaded = await loadMap(bytes, viewer, { decoderPath: DECODER_PATH })
    viewer.setModel(loaded)
    viewer.environment?.('sunny', 14)
    // 压暗楼层（材质是这次加载新建的，直接改）
    const done = new Set<any>()
    loaded.root.traverse((o: any) => {
      if (!o.isMesh) return
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m || done.has(m) || !m.color) continue
        done.add(m)
        m.color.multiplyScalar(DIM).lerp(TINT, TINT_MIX)
        if (m.emissive) m.emissive.multiplyScalar(DIM)
      }
    })
    viewer.renderer.toneMappingExposure = EXPOSURE
    // 「平面」模式 = 俯视（旧地图默认也是 2D）；房间名由我们自己画，关掉模型里的标签图层
    const modes: any[] = viewer.model?.semantics?.modes || []
    if (modes.some((m) => m.id === 'plan')) viewer.mode('plan')
    else viewer.top?.()
    for (const id of ['deviceLabels']) viewer.layer?.(id, false)

    // 点位（灯）：points.json 里 lighting / light 类；key = 点位编号、绑定设备编号 / id、名字
    try {
      const files = unzipSync(bytes, { filter: (f) => f.name === 'points.json' })
      if (files['points.json']) {
        const pj = JSON.parse(strFromU8(files['points.json']))
        lights = (pj.points || [])
          .filter((p: any) => !p.deleted && /light/i.test(p.kind) && !/box/i.test(p.kind) && Array.isArray(p.pos))
          .map((p: any) => ({
            id: p.id,
            pos: new THREE.Vector3(p.pos[0], p.pos[1] + 0.3, p.pos[2]),
            name: p.name,
            room: p.room || '',
            keys: [p.id, p.device?.code, p.device?.id, p.device?.name].filter((x) => x !== undefined && x !== null && x !== '').map(String),
          }))
      }
    } catch (e) {
      console.warn('[h2zMap] points.json 读不出来，不画灯：', e)
    }

    // 取景：整层（对不上房间时用）和本房间（对上时用）
    const floorPts = samplePoints(loaded.root)
    const p2: [number, number][] = []
    for (let i = 0; i < floorPts.length; i += 3) p2.push([floorPts[i], floorPts[i + 2]])
    const ang = p2.length ? minAreaAngle(p2) : 0
    const long = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang))
    const floorRect = floorPts.length ? rectOf(floorPts, long) : null

    const anchors = (viewer.model?.semantics?.anchors || []).filter((a: any) => a?.kind === 'room' && a.text)
    const mine = findAnchor(anchors, opts.roomNames)
    let focusRect: Rect | null = null
    if (mine) {
      mineTarget = mine.target
      handle.highlighted = mine.text
      const ok = viewer.highlight([mine.target], HIGHLIGHT)
      // 本房间填色 + 描边：自己加到场景里（不受压暗影响、不被地面挡住），viewer 的高亮层只用来拿房间几何
      viewer.overlay?.updateMatrixWorld(true)
      viewer.overlay?.traverse((o: any) => {
        if (!o.isMesh) return
        const fill = new THREE.Mesh(o.geometry, new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false, toneMapped: false }))
        fill.matrixAutoUpdate = false
        fill.matrix.copy(o.matrixWorld)
        fill.renderOrder = 30
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), new THREE.LineBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.95, depthTest: false, toneMapped: false }))
        edges.matrixAutoUpdate = false
        edges.matrix.copy(o.matrixWorld)
        edges.renderOrder = 31
        mineGroup.add(fill, edges)
      })
      viewer.scene.add(mineGroup)
      // 房间范围：高亮出来的几何；开敞区域没有单独几何 → 以锚点为中心
      const roomPts = ok ? samplePoints(viewer.overlay, 200) : []
      viewer.highlight([]) // 几何拿到了，viewer 自己的高亮层不要了（用上面自己画的）
      const r = roomPts.length ? rectOf(roomPts, long) : { center: new THREE.Vector3(mine.position[0], 0, mine.position[2]), long, lenLong: 0, lenShort: 0, top: floorRect?.top ?? 3 }
      r.lenLong = Math.max(r.lenLong * 1.8, FOCUS_MIN_SPAN)
      r.lenShort = Math.max(r.lenShort * 1.8, FOCUS_MIN_SPAN * 0.6)
      r.top = floorRect?.top ?? r.top
      // 取景框不出楼层：在楼层的长 / 短方向上把中心收回来（取景框比楼层还大时居中）
      if (floorRect) {
        const sh = new THREE.Vector3(-long.z, 0, long.x)
        const rel = r.center.clone().sub(floorRect.center)
        const clamp = (v: number, span: number, full: number) => (span >= full ? 0 : Math.max(-(full - span) / 2, Math.min((full - span) / 2, v)))
        const a = clamp(rel.dot(long), r.lenLong, floorRect.lenLong)
        const b = clamp(rel.dot(sh), r.lenShort, floorRect.lenShort)
        r.center = floorRect.center.clone().add(long.clone().multiplyScalar(a)).add(sh.clone().multiplyScalar(b))
      }
      focusRect = r
    }

    let last = ''
    const refit = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight, k = `${w}x${h}`
      if (!w || !h || k === last) return
      last = k
      sharpen()
      if (floorRect) fitDist = fitTop(viewer, floorRect, w, h) // 整层的距离 = 字号基准
      if (focusRect) fitTop(viewer, focusRect, w, h, 1.0)
    }
    fitObserver = new ResizeObserver(refit)
    fitObserver.observe(wrap)
    refit()
    opts.onReady()
  } catch (e) {
    handle.dispose()
    throw e
  }
  return handle
}
