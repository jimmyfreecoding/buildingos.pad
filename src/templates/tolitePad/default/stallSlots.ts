/**
 * 卫生间厕位（dot）槽位与状态计算 —— 纯逻辑，便于复现与自测
 *
 * 现场教训（本次 bug）：
 *  1. 厕位序号不能直接取「设备名称 / 设备 code / 主题末段」末尾的数字。这些字符串里的数字
 *     常常是全楼层甚至全楼的设备流水号（例如 …-WC-03 / …-WC-04），2 个厕位的房间会被当成
 *     4 个点：1、2 号点永远是灰色「未知」，3、4 号点才是有状态的真厕位。
 *  2. 旧实现每收到一条设备配置/厕位信息消息都会用 `String(Object.keys(map).length + 1)`
 *     给传感器重新编号，第二条配置响应把同两个传感器从 1、2 号改成 3、4 号，
 *     加上 `count = max(total, 最大编号)`，点数直接翻倍。
 *
 * 因此本模块的规则：
 *  1. 点数只认「本房间设备配置里列出的厕位传感器个数」（total）；
 *  2. 设备 code → 槽位 的映射幂等：同一 code 永远落在同一槽位，重复消息不再漂移；
 *  3. 名称末尾编号只在落在 1..N 且不冲突时用于还原物理顺序；
 *  4. 编号超出 1..N（全楼流水号）时按空槽落座，绝不撑大点数；槽位已满则丢弃并告警；
 *  5. 没有设备配置时退回旧行为（按已收到的编号推断），不丢数据。
 */

export interface StallRoomState {
  /** 设备 code / 原始编号 → 槽位（'1'..'N' 或 'vip'） */
  slots: Record<string, string>
  /** 设备 code / 原始编号 → 占用状态 0/1 */
  statuses: Record<string, number>
  /** 设备配置给出的本房间厕位数（0 = 未知，此时才退回编号推断） */
  total: number
  /** 聚合消息 {occupied,total} 给出的厕位数（0 = 未知，仅在没有设备配置时使用） */
  totalHint: number
}

export type StallState = Record<string, StallRoomState>

export interface StallDeviceRef {
  code: string
  name: string
  status: number | null
}

const DEVICE_LIST_KEYS = ['wcsensor', 'wc', 'toilet', 'sensors', 'sensor', 'stalls', 'list', 'devices', 'device']
const TOTAL_HINT_KEYS = ['total', 'stallTotal', 'wcTotal', 'num', 'stallCount', 'wcCount']
const NESTED_KEYS = ['status', 'wc', 'wcsensor', 'toilet', 'data', 'device']
const SMOKE_RE = /烟雾|SMOKE/i
const STALL_LABEL_RE = /厕位|传感器|WC/i

const asString = (v: unknown): string =>
  typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v)

/** 占用状态归一化：1/true/'1'/'on' → 1，0/false/'0'/'off' → 0，其余 null */
const statusNum = (v: unknown): number | null => {
  if (v === 1 || v === true || v === '1' || v === 'on') return 1
  if (v === 0 || v === false || v === '0' || v === 'off') return 0
  return null
}

/** 取设备项自身的状态（status.status / status / occupied 均兼容） */
const itemStatusNum = (o: Record<string, any>): number | null => {
  const st = o?.status
  if (st && typeof st === 'object' && !Array.isArray(st)) {
    return statusNum((st as Record<string, any>).status ?? st)
  }
  return statusNum(st ?? o?.occupied)
}

const isStallDevice = (o: Record<string, any>): boolean => {
  const label = `${asString(o.name)}${asString(o.code)}`
  if (SMOKE_RE.test(label)) return false
  // 原项目协议里 vip 厕位设备名就是 "P"（code 可能不含 WC/传感器 字样）
  if (asString(o.name).trim() === 'P') return true
  if (asString(o.type).toLowerCase() === 'wcsensor') return true
  return STALL_LABEL_RE.test(label)
}

/** 按 code 去重收集响应里的厕位传感器（保持响应顺序） */
export function collectStallDevices(data: Record<string, any> | null | undefined): StallDeviceRef[] {
  if (!data) return []
  const out: StallDeviceRef[] = []
  const seen = new Set<string>()
  for (const key of DEVICE_LIST_KEYS) {
    const arr = data[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, any>
      const code = asString(o.code)
      if (!code || seen.has(code) || !isStallDevice(o)) continue
      seen.add(code)
      out.push({ code, name: asString(o.name), status: itemStatusNum(o) })
    }
  }
  return out
}

const isVipDevice = (d: StallDeviceRef): boolean => d.name.trim() === 'P'

const trailingNumber = (name: string): number | null => {
  const m = name.match(/(\d+)\s*$/)
  return m ? Number(m[1]) : null
}

const numericSlots = (slots: Record<string, string>): Set<number> => {
  const used = new Set<number>()
  for (const v of Object.values(slots)) if (/^\d+$/.test(v)) used.add(Number(v))
  return used
}

/** 房间的厕位点数（不含 vip）：设备配置给出的个数优先，其次聚合 total，最后才按编号推断 */
export function roomCount(state: StallState, room: string): number {
  const st = state[room]
  if (!st) return 0
  if (st.total > 0) return st.total
  if (st.totalHint > 0) return st.totalHint
  let max = 0
  for (const slot of Object.values(st.slots)) if (/^\d+$/.test(slot)) max = Math.max(max, Number(slot))
  for (const raw of Object.keys(st.statuses)) if (/^\d+$/.test(raw)) max = Math.max(max, Number(raw))
  return max
}

export function roomState(state: StallState, room: string): StallRoomState {
  const cur = state[room]
  if (cur) return cur
  const fresh: StallRoomState = { slots: {}, statuses: {}, total: 0, totalHint: 0 }
  state[room] = fresh
  return fresh
}

export interface StallSlotAssignment {
  slots: Record<string, string>
  /** 本房间厕位数量（不含 vip），即 dot 个数 */
  count: number
}

/** 设备清单 → code/槽位映射（幂等：同一 code 同一槽位，绝不因重复消息漂移） */
export function assignStallSlots(
  devices: StallDeviceRef[],
  prev: Record<string, string> = {},
): StallSlotAssignment {
  const regular = devices.filter((d) => !isVipDevice(d))
  const vip = devices.filter(isVipDevice)
  const n = regular.length
  const slots: Record<string, string> = {}
  const used = new Set<number>()
  const pending: StallDeviceRef[] = []

  // 1) 沿用上一轮槽位（幂等：重复消息不改变已有映射）
  for (const d of regular) {
    const p = prev[d.code]
    const num = p !== undefined && /^\d+$/.test(p) ? Number(p) : NaN
    if (Number.isFinite(num) && num >= 1 && num <= n && !used.has(num)) {
      slots[d.code] = String(num)
      used.add(num)
    } else {
      pending.push(d)
    }
  }
  // 2) 名称末尾编号：仅当落在 1..N 且未被占用时用于还原物理顺序
  const rest: StallDeviceRef[] = []
  for (const d of pending) {
    const num = trailingNumber(d.name)
    if (num !== null && num >= 1 && num <= n && !used.has(num)) {
      slots[d.code] = String(num)
      used.add(num)
    } else {
      rest.push(d)
    }
  }
  // 3) 其余按设备清单顺序补空位
  let cursor = 1
  for (const d of rest) {
    while (cursor <= n && used.has(cursor)) cursor++
    if (cursor > n) break
    slots[d.code] = String(cursor)
    used.add(cursor)
  }
  for (const d of vip) slots[d.code] = 'vip'

  // 4) 保留「状态消息先到、设备配置后到」时懒分配的槽位；若该槽位超出本房间厕位数
  //    （现场设备编号常是全楼流水号），改分到空槽，保证这些厕位仍然可见
  let vipTaken = Object.values(slots).includes('vip')
  for (const [code, slot] of Object.entries(prev)) {
    if (slots[code]) continue
    if (slot === 'vip') {
      if (!vipTaken) {
        slots[code] = 'vip'
        vipTaken = true
      }
      continue
    }
    if (!/^\d+$/.test(slot)) continue
    const num = Number(slot)
    if (num >= 1 && num <= n && !used.has(num)) {
      slots[code] = slot
      used.add(num)
      continue
    }
    let free = 1
    while (free <= n && used.has(free)) free++
    if (free <= n) {
      slots[code] = String(free)
      used.add(free)
    }
  }
  return { slots, count: n }
}

/**
 * 一条厕位消息落到哪个槽位：
 * - 已知 code → 原槽位；
 * - 未知 code → 优先用它给出的编号（须在 1..count 内且空闲），否则补最小空槽；
 * - 槽位已满（编号超出本房间厕位数）→ null：宁可不画，也不画幽灵厕位；
 * - count 未知（没有设备配置）→ 退回旧行为，按编号原样落位。
 */
export function takeStallSlot(
  slots: Record<string, string>,
  count: number | null,
  code: string,
  prefer: string | null,
): string | null {
  const existing = slots[code]
  if (existing) return existing
  const used = numericSlots(slots)
  const want = prefer !== null && /^\d+$/.test(prefer) ? Number(prefer) : null
  if (count !== null && count > 0) {
    if (want !== null && want >= 1 && want <= count && !used.has(want)) {
      slots[code] = String(want)
      return slots[code]
    }
    for (let i = 1; i <= count; i++) {
      if (!used.has(i)) {
        slots[code] = String(i)
        return slots[code]
      }
    }
    return null
  }
  const fallback = prefer === 'vip' ? 'vip' : want !== null ? String(want) : null
  if (!fallback) return null
  slots[code] = fallback
  return fallback
}

/** 后端响应里明确的厕位总数（只认明确字段，不再拿任意数组长度当总数） */
export function stallTotalHint(
  data: Record<string, any> | null | undefined,
  depth = 0,
): number | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data) || depth > 3) return undefined
  for (const k of TOTAL_HINT_KEYS) {
    const n = Number(data[k])
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }
  for (const k of NESTED_KEYS) {
    const nested = data[k]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const n = stallTotalHint(nested as Record<string, any>, depth + 1)
      if (n !== undefined) return n
    }
  }
  return undefined
}

export interface StallStatusItem {
  /** 设备 code / 厕位编号；无则为 null（用主题末段兜底） */
  raw: string | null
  status: number
  /** true = raw 是「厕位号」（{status:{1:0}} 映射 / 裸值），false = raw 是设备 code */
  positional: boolean
}

/**
 * 解析厕位状态消息，兼容现场三种格式：
 * - 每厕位一条：[{ code, name, status: { status: 0|1 } }]（原项目协议）
 * - 整间一条：  [{…}, {…}]
 * - 状态映射：  { status: { "1": 0, "2": 1, "P": 0 } }（键即厕位号）
 */
export function stallStatusItems(payload: unknown): StallStatusItem[] {
  const out: StallStatusItem[] = []
  const push = (raw: string | null, status: number | null, positional: boolean) => {
    if (status !== null) out.push({ raw, status, positional })
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === 'object') {
        const o = item as Record<string, any>
        const code = o.code ?? o.id ?? o.key
        push(code === undefined || code === null ? null : asString(code), itemStatusNum(o), false)
      } else {
        push(null, statusNum(item), true)
      }
    }
    return out
  }
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, any>
    const st = o.status
    if (st && typeof st === 'object' && !Array.isArray(st)) {
      for (const [k, v] of Object.entries(st as Record<string, any>)) push(asString(k), statusNum(v), true)
      return out
    }
    if (st !== undefined || o.occupied !== undefined) {
      push(o.code === undefined || o.code === null ? null : asString(o.code), itemStatusNum(o), false)
    }
    return out
  }
  push(null, statusNum(payload), true)
  return out
}

/** 厕位号字符串 → 槽位：'P' → vip，纯数字 → 数字，其它 null */
const slotOfKey = (v: unknown): string | null => {
  const s = asString(v).trim()
  if (!s) return null
  if (s === 'P') return 'vip'
  return /^\d+$/.test(s) ? s : null
}

/**
 * 把一个「厕位号」上的状态写到槽位：
 * - 该槽位已有设备占用 → 直接写到该设备（实时消息与设备配置共用同一个点）；
 * - 编号超出本房间厕位数（现场多为全楼流水号）→ 落空槽，绝不撑大点数；
 * - 槽位空着 → 用合成 key 占位，保证这个点仍然显示状态。
 */
function assignSlotStatus(st: StallRoomState, slot: string, status: number): boolean {
  const count = st.total > 0 ? st.total : null
  if (slot !== 'vip' && count !== null) {
    const num = Number(slot)
    if (num < 1 || num > count) {
      const raw = `#pos:${slot}`
      const got = takeStallSlot(st.slots, count, raw, null)
      if (got === null) return false
      st.statuses[raw] = status
      return true
    }
  }
  for (const [raw, s] of Object.entries(st.slots)) {
    if (s === slot) {
      st.statuses[raw] = status
      return true
    }
  }
  const synthetic = slot === 'vip' ? '#vip' : `#slot:${slot}`
  st.slots[synthetic] = slot
  st.statuses[synthetic] = status
  return true
}

export interface StallApplyResult {
  applied: number
  dropped: number
}

function applyStatusItems(
  st: StallRoomState,
  items: StallStatusItem[],
  segSlot: string | null,
  /** 可选：把「厕位号」解析成设备 code（用于全楼流水号的状态映射与设备自身编号对齐） */
  resolveKey?: (key: string) => string | null,
): StallApplyResult {
  const count = st.total > 0 ? st.total : null
  const result: StallApplyResult = { applied: 0, dropped: 0 }
  for (const item of items) {
    if (item.raw && SMOKE_RE.test(item.raw)) continue
    // 厕位号形式：按槽位写
    if (item.positional) {
      const slot = item.raw !== null ? slotOfKey(item.raw) : segSlot
      if (slot === null) continue
      const alias = resolveKey?.(slot)
      if (alias) {
        st.statuses[alias] = item.status
        result.applied++
        continue
      }
      if (assignSlotStatus(st, slot, item.status)) result.applied++
      else result.dropped++
      continue
    }
    // 设备 code 形式：未知 code 退到主题末段编号，再退到空槽
    const raw = item.raw ?? (segSlot !== null ? `#${segSlot}` : null)
    if (raw === null) continue
    if (segSlot === 'vip' && !item.raw) {
      if (assignSlotStatus(st, 'vip', item.status)) result.applied++
      else result.dropped++
      continue
    }
    const slot = takeStallSlot(st.slots, count, raw, item.raw ? segSlot : null)
    if (slot === null) {
      result.dropped++
      continue
    }
    st.statuses[raw] = item.status
    result.applied++
  }
  return result
}

export interface StallConfigResult {
  room: string
  count: number
  slots: Record<string, string>
}

/** 设备配置 / wcinfo 响应：先定槽位与点数，再吸收响应里自带的状态 */
export function applyDeviceConfig(
  state: StallState,
  room: string,
  data: Record<string, any> | null | undefined,
): StallConfigResult | null {
  if (!data) return null
  const st = roomState(state, room)
  const devices = collectStallDevices(data)
  let result: StallConfigResult | null = null

  if (devices.length > 0) {
    const { slots, count } = assignStallSlots(devices, st.slots)
    st.slots = slots
    st.total = count
    result = { room, count, slots }
    for (const d of devices) {
      if (d.status !== null) st.statuses[d.code] = d.status
    }
  } else {
    const hint = stallTotalHint(data)
    if (hint !== undefined) st.totalHint = Math.max(st.totalHint, hint)
  }

  // 响应里的「厕位号 → 状态」映射（没有设备清单时它就是唯一线索）。
  // 现场该映射可能用全楼流水号（如 3、4），此时按设备自身编号对齐到对应设备
  const byExplicitNumber = (key: string): string | null => {
    if (key === 'vip') return null
    const num = Number(key)
    const hit = devices.find((d) => trailingNumber(d.name) === num || trailingNumber(d.code) === num)
    return hit ? hit.code : null
  }
  applyStatusItems(st, stallStatusItems(data), null, byExplicitNumber)
  return result
}

/** 聚合计数消息 {occupied,total}：只当作点数提示，且只在没有设备配置时生效 */
export function applyTotalHint(state: StallState, room: string, payload: unknown): number | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const total = Number((payload as Record<string, any>).total)
  if (!Number.isFinite(total) || total <= 0) return null
  const st = roomState(state, room)
  st.totalHint = Math.floor(total)
  return st.totalHint
}

/** wcsensor 实时消息：设备 code（或主题末段编号）→ 槽位 → 状态 */
export function applyStatusMessage(
  state: StallState,
  room: string,
  payload: unknown,
  stallSeg = '',
): StallApplyResult {
  const st = roomState(state, room)
  return applyStatusItems(st, stallStatusItems(payload), slotOfKey(stallSeg))
}

/** 房间 vip 厕位状态（'P' 设备）：未收到状态返回 null */
export function roomVip(state: StallState, room: string): number | null {
  const st = state[room]
  if (!st) return null
  for (const [raw, slot] of Object.entries(st.slots)) {
    if (slot !== 'vip') continue
    const v = st.statuses[raw]
    if (v === 0 || v === 1) return v
  }
  return null
}

/** 房间厕位 dot 列表：序号 1..N，未收到状态的点显示 null（灰色未知），vip 追加在最后 */
export function roomDots(state: StallState, room: string): Array<number | null> {
  const st = state[room]
  if (!st) return []
  const count = roomCount(state, room)
  const bySlot = new Map<string, string[]>()
  for (const [raw, slot] of Object.entries(st.slots)) {
    const list = bySlot.get(slot)
    if (list) list.push(raw)
    else bySlot.set(slot, [raw])
  }
  const statusAt = (slot: string): number | null => {
    for (const raw of bySlot.get(slot) ?? []) {
      const v = st.statuses[raw]
      if (v === 0 || v === 1) return v
    }
    return null
  }
  const out: Array<number | null> = []
  for (let i = 1; i <= count; i++) out.push(statusAt(String(i)))
  const vip = statusAt('vip')
  if (vip !== null) out.push(vip)
  return out
}
