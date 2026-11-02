// 楼层交付包 .h2z 的显示（wallPad 地图区）：用 @h2z/viewer（和 BuildingOS 主前端同一个三维解释器）。
// .h2z = h2z.3d 编译的楼层地图（manifest.json / semantics.json / scene.glb）+ IOC 点位（points.json）等，
// 格式见 buildingos docs/3D地图和点位规划设计.md §3。这里只用地图部分：俯视平面、房间名、高亮本 pad 所在房间。
//
// 生命周期由 mapViewer.ts 管（单例、看门狗、降级）；这里只负责：建 viewer、装模型、换容器、暂停、释放。
// viewer 挂在我们自己的 wrapper 上（不是 MapCanvas 的宿主），换容器时整个 wrapper 搬过去，
// viewer 内部的 ResizeObserver 盯的是 wrapper，搬家后自动按新尺寸重算。
import * as THREE from 'three'
import { Viewer, loadMap } from '@h2z/viewer'

const BASE_URL = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`
const DECODER_PATH = `${BASE_URL}static/vendor/draco/`

/** 背景色和旧 2.5D 地图一致（#090909） */
const BG = 0x090909
const HIGHLIGHT = { color: 0xed8733, opacity: 0.35 }

export interface H2zHandle {
  /** 搬到新容器（MapCanvas 换了宿主） */
  attach(container: HTMLElement): void
  /** 看不见时停渲染，省 pad 的 GPU */
  pause(paused: boolean): void
  dispose(): void
  /** 本 pad 房间是否在地图上找到并高亮了 */
  highlighted: string | null
}

/** 是不是 .h2z / .buildingosmap（zip，里面有 manifest.json）；旧 .acmap 不是 zip */
export function isH2zBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false
  // 中央目录里会出现文件名；只扫前 64KB 和最后 64KB 足够
  const probe = (from: number, to: number) =>
    new TextDecoder('latin1').decode(bytes.subarray(Math.max(0, from), Math.min(bytes.length, to)))
  const head = probe(0, 65536)
  const tail = probe(bytes.length - 65536, bytes.length)
  return head.includes('manifest.json') || tail.includes('manifest.json')
}

/** 房间名比对：去空格、全角转半角、忽略大小写 */
function norm(s: string): string {
  return String(s || '')
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
    .toLowerCase()
}

/** 在地图房间锚点里找本 pad 的房间：先精确，再互相包含（「2604会议室」↔「2604」） */
function findRoom(semantics: any, names: string[]): any | null {
  const rooms = (semantics?.anchors || []).filter((a: any) => a?.kind === 'room' && a.text)
  for (const raw of names) {
    const n = norm(raw)
    if (!n) continue
    const exact = rooms.find((a: any) => norm(a.text) === n)
    if (exact) return exact
  }
  for (const raw of names) {
    const n = norm(raw)
    if (n.length < 2) continue
    const part = rooms.find((a: any) => norm(a.text).includes(n) || n.includes(norm(a.text)))
    if (part) return part
  }
  return null
}

/**
 * 俯视取景：把整层放进面板。楼层常常是斜的、面板常常是竖的——
 * 按楼层平面的最小外接矩形把长边转到面板的长边方向，再按视角算高度，四周留 6% 边。
 */
/** 平面点集（x,z）的最小面积外接矩形方向：凸包每条边试一遍（旋转卡壳的简化版） */
function minAreaAngle(pts: number[], n: number): number {
  const p2: [number, number][] = []
  for (let i = 0; i < n; i++) p2.push([pts[i * 3], pts[i * 3 + 2]])
  p2.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = [], upper: [number, number][] = []
  for (const q of p2) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q) }
  for (let i = p2.length - 1; i >= 0; i--) { const q = p2[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q) }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1))
  let best = 0, bestArea = Infinity, bestLongIsA = true
  for (let i = 0; i < hull.length; i++) {
    const [x1, z1] = hull[i], [x2, z2] = hull[(i + 1) % hull.length]
    const a = Math.atan2(z2 - z1, x2 - x1), ax = Math.cos(a), az = Math.sin(a)
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity
    for (const [x, z] of hull) { const u = x * ax + z * az, v = -x * az + z * ax; minA = Math.min(minA, u); maxA = Math.max(maxA, u); minB = Math.min(minB, v); maxB = Math.max(maxB, v) }
    const area = (maxA - minA) * (maxB - minB)
    if (area < bestArea) { bestArea = area; best = a; bestLongIsA = maxA - minA >= maxB - minB }
  }
  return bestLongIsA ? best : best + Math.PI / 2 // 返回长边方向
}

function footprint(root: THREE.Object3D) {
  const pts: number[] = []
  const v = new THREE.Vector3()
  root.updateMatrixWorld(true)
  root.traverse((o: any) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry?.attributes?.position) return
    const a = o.geometry.attributes.position
    const step = Math.max(1, Math.floor(a.count / 400))
    for (let i = 0; i < a.count; i += step) {
      v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld)
      pts.push(v.x, v.y, v.z)
    }
  })
  const n = pts.length / 3
  if (!n) return null
  let cx = 0, cz = 0, maxY = -Infinity
  for (let i = 0; i < n; i++) { cx += pts[i * 3]; cz += pts[i * 3 + 2]; maxY = Math.max(maxY, pts[i * 3 + 1]) }
  cx /= n; cz /= n
  const ang = minAreaAngle(pts, n) // 外接矩形面积最小的方向（规则楼层就是墙的方向）
  const ax = Math.cos(ang), az = Math.sin(ang)
  let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity
  for (let i = 0; i < n; i++) {
    const dx = pts[i * 3] - cx, dz = pts[i * 3 + 2] - cz
    const a = dx * ax + dz * az, b = -dx * az + dz * ax
    minA = Math.min(minA, a); maxA = Math.max(maxA, a); minB = Math.min(minB, b); maxB = Math.max(maxB, b)
  }
  const midA = (minA + maxA) / 2, midB = (minB + maxB) / 2
  return {
    center: new THREE.Vector3(cx + midA * ax - midB * az, 0, cz + midA * az + midB * ax),
    long: new THREE.Vector3(ax, 0, az), // 单位向量
    lenLong: maxA - minA,
    lenShort: maxB - minB,
    top: maxY,
  }
}

function fitTop(viewer: any, fp: NonNullable<ReturnType<typeof footprint>>, w: number, h: number) {
  if (!w || !h) return
  const portrait = h >= w
  // 屏幕「上」= 机位水平偏移的反方向：竖屏让长轴竖着放，横屏让长轴横着放
  const up = portrait ? fp.long.clone() : new THREE.Vector3(-fp.long.z, 0, fp.long.x)
  const spanV = portrait ? fp.lenLong : fp.lenShort
  const spanH = portrait ? fp.lenShort : fp.lenLong
  const t = Math.tan(THREE.MathUtils.degToRad(viewer.camera.fov / 2))
  const dist = Math.max(spanV / 2 / t, spanH / 2 / (t * (w / h))) * 1.12
  const target = fp.center.clone().setY(0)
  const pos = target.clone().add(up.multiplyScalar(-0.01 * dist)).setY(fp.top + dist)
  viewer.fly = null
  viewer.controls.autoRotate = false
  viewer.camera.position.copy(pos)
  viewer.controls.target.copy(target)
  viewer.camera.far = Math.max(viewer.camera.far, dist * 3)
  viewer.camera.updateProjectionMatrix()
  viewer.controls.update()
}

export async function startH2z(
  container: HTMLElement,
  bytes: Uint8Array,
  opts: { roomNames: string[]; onReady: () => void; onError: (e: unknown) => void },
): Promise<H2zHandle> {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#090909'
  const labelLayer = document.createElement('div')
  labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1'
  container.appendChild(wrap)

  let highlightId: string | null = null
  let fitObserver: ResizeObserver | null = null
  const viewer: any = new Viewer(wrap, {
    palette: { skyDay: BG, skyNight: BG, studioSky: BG },
    emit: (type: string, payload: any) => {
      if (type === 'labels') drawLabels(payload)
      else if (type === 'error') opts.onError(payload)
    },
  })
  wrap.appendChild(labelLayer)

  // 房间名：只画房间锚点（设备点位太密，pad 上不画）；本 pad 房间加粗加底色
  const pool = new Map<string, HTMLDivElement>()
  function drawLabels(list: any[]) {
    const seen = new Set<string>()
    for (const l of list || []) {
      if (l.kind !== 'room' || !l.visible || !l.text) continue
      seen.add(l.id)
      let el = pool.get(l.id)
      if (!el) {
        el = document.createElement('div')
        el.textContent = l.text
        const mine = l.id === highlightId
        el.style.cssText =
          'position:absolute;transform:translate(-50%,-50%);white-space:nowrap;font-family:"Microsoft YaHei",sans-serif;' +
          (mine
            ? 'font-size:15px;font-weight:700;color:#fff;background:rgba(237,135,51,.85);padding:2px 8px;border-radius:10px;z-index:2'
            : 'font-size:12px;color:rgba(255,255,255,.78);text-shadow:0 0 3px #000,0 0 2px #000')
        labelLayer.appendChild(el)
        pool.set(l.id, el)
      }
      el.style.left = `${l.x}px`
      el.style.top = `${l.y}px`
      el.style.display = ''
    }
    for (const [id, el] of pool) if (!seen.has(id)) el.style.display = 'none'
  }

  const handle: H2zHandle = {
    highlighted: null,
    attach(next: HTMLElement) {
      if (wrap.parentNode !== next) next.appendChild(wrap)
    },
    pause(p: boolean) {
      try {
        viewer.pause(p)
      } catch {}
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
    // 「平面」模式 = 俯视（旧 2.5D 地图默认也是 2D 视角）；没有这个模式的地图用默认模式 + 俯视机位
    const modes: any[] = viewer.model?.semantics?.modes || []
    if (modes.some((m) => m.id === 'plan')) viewer.mode('plan')
    else viewer.top?.()
    const fp = footprint(loaded.root)
    if (fp) {
      // 面板尺寸变了（换容器 / 横竖比例不同）重新取景
      let last = ''
      const refit = () => {
        const w = wrap.clientWidth, h = wrap.clientHeight, k = `${w}x${h}`
        if (!w || !h || k === last) return
        last = k
        fitTop(viewer, fp, w, h)
      }
      fitObserver = new ResizeObserver(refit)
      fitObserver.observe(wrap)
      refit()
    }
    const room = findRoom(viewer.model?.semantics, opts.roomNames)
    if (room) {
      highlightId = room.target // 标签 id = 锚点指向的语义 id
      handle.highlighted = room.text
      viewer.highlight([room.target], HIGHLIGHT)
    }
    opts.onReady()
  } catch (e) {
    handle.dispose()
    throw e
  }
  return handle
}
