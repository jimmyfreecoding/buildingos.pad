import { computed, onScopeDispose, ref } from 'vue'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'

/**
 * 会议室门牌数据层（原项目 buildingos_meetingpad/src/App.vue 的界面状态逻辑）。
 *
 * MQTT 全部改为当前项目的标准模式（topics 工厂 + useMqtt 生命周期 + MqttRouter 分发）：
 * - 会议列表     订阅 topics.meetingMroom(c)（原 /iot/meeting/mroom/...），payload 与原来完全一致
 * - 人体传感器   订阅 topics.humanSensorRoom(c)（原 /iot/status/humensensor/...）
 * - 保洁信息     订阅 topics.cleaningStatus(c, deviceCode)（原 /iot/status/cleaning/...）
 * - 最近10分钟有无人 /iot/mroom/busystatus   → topics.meetingBusyStatus(c)
 * - 最近占用时间     /iot/mroom/lastbusytime → topics.meetingLastBusyTime(c)
 * - pad 心跳     由 TemplateLoader 的 usePadHeartbeat('meetingPad') 统一处理（标准模式）
 * - 刷新指令     由 TemplateLoader 的 usePadCommand() 统一处理（标准模式）
 * - 设备配置     由 usePadHeartbeat 与 usePadPublishedContent 各自订阅/请求，此处不重复
 *
 * 门牌端不做开门：二维码仅展示（保洁人员用手机扫码打卡），因此不再发布 topics.doorAction。
 *
 * 背景图 / logo / 二维码都不在此处：统一走 edge 的「云端发布内容」链路
 * （usePadPublishedContent.ts：display_json → 素材直链或 materialId ↔ /api/space/getSpaceFiles）。
 * 卫生打卡仍走 GET /setCleanTime?spaceCode=&time=（见 @/api/cleaning cleanCheckIn）。
 */

export type MeetingStatus = 'in' | 'free' | 'freeAndHasPerson' | 'special'

export interface MeetingStatusBlock {
  data?: string
  txt?: string
  status?: string
  desc?: string
  startTime?: number
  endTime?: number
}

export interface MeetingItem {
  name?: string
  dept?: string
  startTime?: string
  endTime?: string
  status?: number
}

export interface BaojieInfo {
  empName?: string
  endTime?: string | number
  updateTime?: string
  spaceCode?: string
}

interface SensorState {
  online?: number | string
  status?: string
  pushTime?: number
}

const HEARTBEAT_BOOK_INTERVAL_MS = 3000
const BOOK_TIME_LIMIT_MIN = 15
const BOOK_START_HOUR = 8
const BOOK_STOP_HOUR = 23

function readInitData(): Record<string, any> {
  try {
    const raw = localStorage.getItem('initData')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function hhmmToSec(v: string | undefined): number {
  if (!v) return NaN
  const [h, m] = String(v).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
  return h * 3600 + m * 60
}

function secToHHmm(sec: number): string {
  return `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor((sec % 3600) / 60))}`
}

function nowSecOfDay(): number {
  const d = new Date()
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}

function todayAt(secOfDay: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime() + secOfDay * 1000
}

function toMillis(v: unknown): number {
  if (v === undefined || v === null || v === '') return NaN
  if (typeof v === 'number') return v
  const s = String(v)
  if (/^\d+$/.test(s)) return Number(s)
  const d = new Date(s.replace(' ', 'T'))
  return d.getTime()
}

export function useMeetingPadData() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()
  const ctx = computed(() => spaceStore.spaceContext)

  const init = readInitData()
  // 会议室门牌：绑定的是会议室（InitPage 限制 type=meetingRoom）
  const roomName = computed(() => String(init.roomName || init.roomCode || ''))

  // 背景图 / logo / 二维码统一走 edge 的「云端发布内容」链路（usePadPublishedContent.ts）：
  //   display_json（/api/pad/display，同源 7828）→ 素材直链或 materialId ↔ /api/space/getSpaceFiles
  // 因此本 composable 不再调用 /pad/getPadInfoByCode（那是老的云端 Node-RED 端点，
  // 边端部署里 1880 没有实现，且与 pad 页面跨源被 CORS 拦）。

  // --- 会议 / 房间状态 ---
  const statusObj = ref<Record<string, SensorState>>({})
  const status = ref(0) // 0 无人 1 有人
  const flag = ref(0) // 0 无会议 1 正在开会
  const next = ref('') // 下一场会议开始时间
  const lastTime = ref('空闲') // 最近有人时间
  const currentStatus = ref<MeetingStatus>('free')
  const meetingList = ref<MeetingItem[]>([])
  const bookList = ref<MeetingItem[]>([])
  const isDown = ref('')

  const obj = ref<Record<MeetingStatus, MeetingStatusBlock>>({
    in: { data: '', txt: '', status: '会议中', startTime: 0, endTime: 0 },
    free: { data: '', txt: '', status: '空闲', desc: '当前无会议' },
    freeAndHasPerson: { data: '', txt: '', status: '使用中', desc: '' },
    special: { data: '项目使用', txt: '', status: '全天', desc: '' },
  })

  const baojie = ref<BaojieInfo>({ empName: '', endTime: '', updateTime: '', spaceCode: '' })

  // 会议室容量（老项目：会议推送 item.capacity → localStorage 'capacity' → meetRoom 显示「可容纳 N 人」）
  const capacity = ref(0)
  const cachedCapacity = Number(localStorage.getItem('capacity') || 0)
  if (Number.isFinite(cachedCapacity) && cachedCapacity > 0) capacity.value = cachedCapacity

  // ===== 状态推导（原 App.vue 的 check_mroom_sensor_status + 整体界面状态逻辑） =====
  const recomputePerson = () => {
    let s = -1
    let f = 0
    for (const item of Object.values(statusObj.value)) {
      if (item.online != 1) continue // eslint-disable-line eqeqeq
      if (item.status === 'busy') { f = 1; s = 1; break }
      if (item.status === 'free') { f = 1; s = 0 }
    }
    if (f === 1) status.value = s
  }

  const applyOverallStatus = () => {
    if (status.value === 0 && flag.value === 0) {
      currentStatus.value = 'free'
      obj.value.free.data = ''
      obj.value.free.txt = `下一场会议：${next.value === '' ? '无' : next.value}`
      obj.value.free.status = '空闲'
      obj.value.free.desc = lastTime.value
    } else if (status.value === 1 && flag.value === 0) {
      currentStatus.value = 'freeAndHasPerson'
      obj.value.freeAndHasPerson.txt = `下一场会议：${next.value === '' ? '无' : next.value}`
      obj.value.freeAndHasPerson.status = '使用中'
      obj.value.freeAndHasPerson.desc = ''
    } else if (status.value === 0 && flag.value === 1) {
      currentStatus.value = 'in'
    }
  }

  // ===== 会议时间轴（原 App.vue booksCheck：15 分钟切片 + 空闲段合并） =====
  const booksCheck = () => {
    const pushBooks = meetingList.value
    const now = nowSecOfDay()
    const limit = BOOK_TIME_LIMIT_MIN * 60
    const startSec = BOOK_START_HOUR * 3600
    const stopSec = BOOK_STOP_HOUR * 3600

    const books = pushBooks.filter((b) => {
      const e = hhmmToSec(b.endTime)
      return Number.isFinite(e) && e > now
    })

    next.value = books.length ? String(books[0].startTime ?? '') : '无'

    const cells: Array<{ cStart: string; cStop: string; status: number }> = []
    for (let t = startSec; t < stopSec; t += limit) {
      if (now > t) continue
      let st = 0
      for (const b of books) {
        const bs = hhmmToSec(b.startTime)
        const be = hhmmToSec(b.endTime)
        if (!Number.isFinite(bs) || !Number.isFinite(be)) continue
        if ((bs <= t && be >= t + limit) || (bs >= t && bs < t + limit) || (be > t && be <= t + limit)) {
          st = 1
          break
        }
      }
      cells.push({ cStart: secToHHmm(t), cStop: secToHHmm(t + limit), status: st })
    }

    const validBooks: MeetingItem[] = []
    const freeSquare: MeetingItem = { name: '', dept: '', status: 2, startTime: '', endTime: '' }
    for (const cell of cells) {
      if (cell.status === 0) {
        if (!freeSquare.startTime) {
          freeSquare.startTime = cell.cStart
          freeSquare.endTime = cell.cStop
        } else {
          freeSquare.endTime = cell.cStop
        }
      } else if (freeSquare.endTime && freeSquare.startTime !== freeSquare.endTime) {
        validBooks.push({ ...freeSquare })
        freeSquare.startTime = ''
        freeSquare.endTime = ''
      }
    }
    if (freeSquare.endTime && freeSquare.startTime !== freeSquare.endTime) {
      validBooks.push({ ...freeSquare })
    }

    bookList.value = books
      .concat(validBooks)
      .sort((a, b) => (hhmmToSec(a.startTime) || 0) - (hhmmToSec(b.startTime) || 0))
  }

  // ===== 消息处理 =====
  const handleMeetingMessage = (payload: unknown) => {
    const c = ctx.value
    if (!c || !Array.isArray(payload)) return
    // 生产 payload（Node-RED 实际下发）：
    // [{ roomId, roomCode:"M803", roomName:"803", capacity:"6",
    //    meetingList:[{ name, dept, status, startTime:"HH:mm", endTime:"HH:mm" }] }]
    // 注意：payload 里的 status 是后端预约状态（非「进行中」），进行中一律由本地按时间判定，与老项目一致
    const list = payload as Array<{
      roomId?: number | string
      roomCode?: string
      roomName?: string
      capacity?: number | string
      meetingList?: MeetingItem[]
      downType?: string
    }>
    if (list.length) isDown.value = list[0]?.downType ?? ''

    meetingList.value = []
    flag.value = 0

    const room = list.find((r) => r?.roomCode === c.deviceCode)
    if (room) {
      // 容量：对齐老项目（payload 里是字符串，如 "6"）
      const cap = Number(room.capacity)
      if (Number.isFinite(cap) && cap > 0) {
        capacity.value = cap
        localStorage.setItem('capacity', String(cap))
      }
      const now = Date.now()
      for (const it of room.meetingList ?? []) {
        const startSec = hhmmToSec(it.startTime)
        const endSec = hhmmToSec(it.endTime)
        if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) continue
        const startMs = todayAt(startSec)
        const endMs = todayAt(endSec)
        const row: MeetingItem = { ...it }
        if (startMs <= now && now < endMs) {
          row.status = 1
          flag.value = 1
          currentStatus.value = 'in'
          obj.value.in.data = `${it.startTime}-${it.endTime}`
          obj.value.in.startTime = Math.floor(startMs / 1000)
          obj.value.in.endTime = Math.floor(endMs / 1000)
          obj.value.in.txt = '使用者：' + (it.name || '')
          obj.value.in.status = '会议中'
        } else {
          row.status = 0
        }
        meetingList.value.push(row)
      }
    }

    booksCheck()
    applyOverallStatus()
  }

  const handleHumanSensorMessage = (payload: unknown) => {
    if (!Array.isArray(payload)) return
    for (const s of payload as Array<{ code?: string; status?: SensorState; pushTime?: number }>) {
      if (s?.code && s?.status) {
        statusObj.value[s.code] = { ...s.status, pushTime: s.pushTime }
      }
    }
    recomputePerson()
    applyOverallStatus()
  }

  const handleBusyStatusMessage = (payload: unknown) => {
    // 最近 10 分钟有无人：原项目仅打印日志，界面状态由 lastbusytime + 人体传感器决定
    console.log('[meetingPad] mroom busystatus:', payload)
  }

  const handleLastBusyTimeMessage = (payload: unknown) => {
    const msg = payload as { current_time?: unknown; push_time?: unknown }
    const cur = toMillis(msg?.current_time)
    const push = toMillis(msg?.push_time)
    if (!Number.isFinite(cur) || !Number.isFinite(push) || cur < push) return
    const mins = Math.floor((cur - push) / 60000)
    if (mins < 60) {
      lastTime.value = mins === 0 ? '' : `${mins}分钟前有人`
    } else {
      const h = Math.floor(mins / 60)
      lastTime.value = `${h}小时${mins - h * 60}分钟前有人`
    }
    applyOverallStatus()
  }

  const handleCleaningMessage = (payload: unknown) => {
    const c = ctx.value
    if (!c) return
    const msg = payload as { empName?: string; endTime?: string | number; updateTime?: string }
    const cached = Number(localStorage.getItem('BAOJIE_TIME') || 0)
    const incoming = Number(msg?.endTime) || 0
    baojie.value.empName = msg?.empName ?? ''
    baojie.value.endTime = cached > incoming - 1 ? cached : (msg?.endTime ?? '')
    baojie.value.updateTime = msg?.updateTime ?? ''
    baojie.value.spaceCode = `${c.spaceCode}_${c.floorAreaCode}_${c.floorCode}_${c.deviceCode}`
  }

  // ===== 订阅装配 =====
  const unsubs: Array<() => void> = []
  let bookTimer: ReturnType<typeof setInterval> | null = null

  const setup = () => {
    const c = ctx.value
    if (!c || !isCompleteSpaceContext(c) || unsubs.length > 0) return

    const bind = (topic: string, handler: (payload: unknown, topic: string, raw: string) => void) => {
      mqtt.subscribe(topic)
      unsubs.push(() => mqtt.unsubscribe(topic))
      unsubs.push(mqtt.onMessage(topic, handler))
    }

    bind(topics.meetingMroom(c), (payload) => handleMeetingMessage(payload))
    bind(topics.humanSensorRoom(c), (payload) => handleHumanSensorMessage(payload))
    bind(topics.meetingBusyStatus(c), (payload) => handleBusyStatusMessage(payload))
    bind(topics.meetingLastBusyTime(c), (payload) => handleLastBusyTimeMessage(payload))
    bind(topics.cleaningStatus(c, c.deviceCode), (payload) => handleCleaningMessage(payload))
    // 设备配置（pad code → 云端素材）由 usePadHeartbeat 与 usePadPublishedContent 各自订阅/请求，此处不再重复

    baojie.value.spaceCode = `${c.spaceCode}_${c.floorAreaCode}_${c.floorCode}_${c.deviceCode}`
    booksCheck()
    bookTimer = setInterval(booksCheck, HEARTBEAT_BOOK_INTERVAL_MS)
  }

  setup()

  onScopeDispose(() => {
    if (bookTimer) { clearInterval(bookTimer); bookTimer = null }
    for (const fn of unsubs) fn()
    unsubs.length = 0
  })

  // ===== 动作 =====
  const onCheckedIn = (timestamp: number) => {
    if (Number.isFinite(timestamp)) baojie.value.endTime = timestamp
  }

  // 现场诊断（仅开发构建）：F12 执行 copy(window.__meetingPad) 可查看当前会议/房间状态
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    ;(window as any).__meetingPad = { obj, currentStatus, isDown, next, lastTime, meetingList, bookList, statusObj, capacity }
  }

  return {
    ctx,
    roomName,
    capacity,
    obj,
    currentStatus,
    isDown,
    bookList,
    baojie,
    next,
    lastTime,
    statusObj,
    onCheckedIn,
  }
}
