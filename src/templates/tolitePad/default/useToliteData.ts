import { computed, onScopeDispose, ref } from 'vue'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'

export interface ToiletAir {
  temperature?: number
  humidity?: number
  h2s?: number
  pm25?: number
  nh3?: number
}

export interface CleaningInfo {
  endTime?: string
  empName?: string
}

function readInitData(): Record<string, any> {
  try {
    const raw = localStorage.getItem('initData')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function toNum(v: unknown): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * 卫生间中控 MQTT 数据（参考原项目 zeekrpad 协议）：
 * - 厕位状态: /iot/status/wcsensor/{space}/{floorarea}/{floor}/{room}/#  （每条消息 topic 末段为厕位编号）
 * - 空气传感器: /iot/status/airsensor/{space}/{floorarea}/{floor}/{room}/#
 * - 保洁打卡: /iot/status/cleaning/{space}/{floorarea}/{floor}/{room}/#
 * - 天气 → 背景视频: /wallpad/outside
 */
export function useToliteData() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()
  const ctx = computed(() => spaceStore.spaceContext)

  const init = readInitData()
  const floorName = String(init.floorName || init.floor || '')
  const roomName = String(init.roomName || init.name || '')
  const roomCode = String(init.roomCode || init.roomId || '')

  // 绑定 code 形如 TMAN/TWOMAN/TMAN1… 时直接使用，否则按名称男女推断
  const boundRoom = /^T(MAN|WOMAN)\d*$/i.test(roomCode)
    ? roomCode
    : (roomName.includes('女') ? 'TWOMAN' : 'TMAN')
  const fallbackRoom = roomName.includes('女') ? 'TWOMAN' : 'TMAN'

  // --- 厕位状态（key: 房间 → { 厕位编号: 0空闲/1占用 }） ---
  const stallMap = ref<Record<string, Record<string, number>>>({})
  // --- 卫生间空气 ---
  const airMap = ref<Record<string, ToiletAir>>({})
  // --- 保洁信息 ---
  const cleaningMap = ref<Record<string, CleaningInfo>>({})

  // --- 外部天气 → 背景视频（与 wallPad zeekr / switchPad 相同） ---
  const outside = ref<{ today?: string }>({})
  const bgVideo = ref<string>('')

  const setInitBg = () => {
    const today = outside.value.today
    if (!today) return
    let file = 'sun.mp4'
    if (today === '多云') {
      file = 'cloud.mp4'
    } else if (today === '阴' || today.indexOf('雾') !== -1 || today.indexOf('霾') !== -1) {
      file = 'overcast.mp4'
    } else if (today === '晴') {
      file = 'sun.mp4'
    } else if (today.indexOf('雨') !== -1) {
      file = 'rain.mp4'
    } else if (today.indexOf('雪') !== -1) {
      file = 'snow.mp4'
    }
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
    bgVideo.value = `${base}video/${file}`
  }

  const handleWcMessage = (room: string, payload: unknown, topic: string) => {
    const stalls = stallMap.value[room] ?? (stallMap.value[room] = {})

    if (Array.isArray(payload)) {
      // 原项目协议：每个厕位一条消息，topic 末段为厕位编号（1/2/…/P=vip）
      const item = (payload[0] ?? {}) as Record<string, any>
      const raw = item?.status?.status
      if (raw === undefined || raw === null) return
      const seg = topic.slice(topic.lastIndexOf('/') + 1)
      const key = seg === 'P' ? 'vip' : seg
      if (key !== 'vip' && !/^\d+$/.test(key)) return
      stalls[key] = raw === 1 || raw === true || raw === 'on' || raw === '1' ? 1 : 0
    } else if (payload && typeof payload === 'object') {
      // 聚合格式：{ occupied, total }
      const msg = payload as Record<string, any>
      const total = Number(msg?.total ?? 0)
      if (total <= 0) return
      const occupied = Number(msg?.occupied ?? msg?.count ?? 0)
      for (let i = 1; i <= total; i++) {
        stalls[String(i)] = i <= occupied ? 1 : 0
      }
    }
  }

  const handleAirMessage = (room: string, payload: unknown) => {
    let status: Record<string, any> | null = null
    if (Array.isArray(payload)) {
      const first = (payload[0] ?? null) as Record<string, any> | null
      status = (first?.status && typeof first.status === 'object' ? first.status : first) as Record<string, any> | null
    } else if (payload && typeof payload === 'object') {
      status = payload as Record<string, any>
    }
    if (!status) return

    const air: ToiletAir = {
      temperature: toNum(status.temperature ?? status.temp),
      humidity: toNum(status.humidity),
      h2s: toNum(status.h2s),
      pm25: toNum(status.pm25),
      nh3: toNum(status.nh3),
    }
    if (Object.values(air).every((v) => v === undefined)) return
    airMap.value[room] = air
  }

  const handleCleaningMessage = (room: string, payload: unknown) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return
    const msg = payload as Record<string, any>
    const endTime = msg?.endTime ?? msg?.updateTime
    if (endTime === undefined || endTime === null) return
    cleaningMap.value[room] = {
      endTime: String(endTime),
      empName: msg.empName ? String(msg.empName) : '',
    }
  }

  const unsubs: Array<() => void> = []
  const setup = () => {
    if (!ctx.value || unsubs.length > 0) return
    const c = ctx.value
    const rooms = Array.from(new Set([boundRoom, 'TMAN', 'TWOMAN']))

    for (const room of rooms) {
      const wcTopic = topics.wcSensor(c, room)
      mqtt.subscribe(wcTopic)
      unsubs.push(() => mqtt.unsubscribe(wcTopic))
      unsubs.push(mqtt.onMessage(wcTopic, (payload, topic) => handleWcMessage(room, payload, topic)))

      const airTopic = topics.toiletAirSensor(c, room)
      mqtt.subscribe(airTopic)
      unsubs.push(() => mqtt.unsubscribe(airTopic))
      unsubs.push(mqtt.onMessage(airTopic, (payload) => handleAirMessage(room, payload)))

      const cleanTopic = topics.cleaningStatus(c, room)
      mqtt.subscribe(cleanTopic)
      unsubs.push(() => mqtt.unsubscribe(cleanTopic))
      unsubs.push(mqtt.onMessage(cleanTopic, (payload) => handleCleaningMessage(room, payload)))
    }

    const outsideTopic = topics.outdoorWeather()
    mqtt.subscribe(outsideTopic)
    unsubs.push(() => mqtt.unsubscribe(outsideTopic))
    unsubs.push(mqtt.onMessage(outsideTopic, (payload) => {
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        outside.value = payload as { today?: string }
        setInitBg()
      }
    }))
  }

  setup()

  onScopeDispose(() => {
    for (const fn of unsubs) fn()
    unsubs.length = 0
  })

  // --- 当前展示房间（优先绑定房间，其次按男女，最后谁有数据用谁） ---
  const activeRoom = computed(() => {
    const hasData = (r: string) =>
      Object.keys(stallMap.value[r] ?? {}).length > 0 ||
      airMap.value[r] !== undefined ||
      cleaningMap.value[r] !== undefined
    if (hasData(boundRoom)) return boundRoom
    if (hasData(fallbackRoom)) return fallbackRoom
    const other = fallbackRoom === 'TMAN' ? 'TWOMAN' : 'TMAN'
    if (hasData(other)) return other
    return fallbackRoom
  })

  // --- 厕位（固定 5 个，无数据为 null） ---
  const STALL_COUNT = 5
  const stalls = computed(() => {
    const map = stallMap.value[activeRoom.value] ?? {}
    return Array.from({ length: STALL_COUNT }, (_, i) => {
      const v = map[String(i + 1)]
      return v === undefined ? null : v
    })
  })

  // --- 空气显示值（参考原项目单位换算：h2s×1.391、nh3×0.695 → mg/m³） ---
  const airDisplay = computed(() => {
    const air = airMap.value[activeRoom.value]
    if (!air) return null
    return {
      temperature: air.temperature,
      humidity: air.humidity,
      h2s: air.h2s !== undefined ? Number((air.h2s * 1.391).toFixed(3)) : undefined,
      pm25: air.pm25,
      nh3: air.nh3 !== undefined ? Number((air.nh3 * 0.695).toFixed(3)) : undefined,
    }
  })

  // --- 保洁显示（endTime 可能是 "YYYY-MM-DD HH:mm" 或时间戳） ---
  const cleaningDisplay = computed(() => {
    const c = cleaningMap.value[activeRoom.value]
    if (!c?.endTime) return null
    let s = c.endTime
    if (/^\d+$/.test(s)) {
      const d = new Date(Number(s))
      if (!Number.isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, '0')
        s = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
      }
    }
    const [date = '', time = ''] = s.split(' ')
    return { date, time, empName: c.empName }
  })

  return {
    floorName,
    roomName,
    activeRoom,
    stalls,
    airDisplay,
    cleaningDisplay,
    bgVideo,
    outside,
    isConnected: mqtt.isConnected,
  }
}
