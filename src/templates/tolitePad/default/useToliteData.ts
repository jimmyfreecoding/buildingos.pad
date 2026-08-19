import { computed, onScopeDispose, ref } from 'vue'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics, onConnect } from '@/utils/mqtt'

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
 * - 附近卫生间: 当前楼层同性卫生间（可能多个）+ 邻层最近一个，按各自 code 订阅
 * - 设备配置: 先 publish /iot/setting/get/device 后端才下发数据；响应订阅 /iot/setting/device/{...}/{room} 与 /iot/status/wcinfo/{...}/{room} 精确主题
 */
export function useToliteData() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()
  const ctx = computed(() => spaceStore.spaceContext)

  const init = readInitData()
  const floorName = String(init.floorName || init.floor || '')
  const roomName = String(init.roomName || init.name || '')
  const roomCode = String(init.roomCode || init.roomId || '')

  // TMAN/TWOMAN 惯例建筑直接用 code；其他建筑（如 SMART 楼 code 为真实结构编码）用绑定 code，
  // 不再强制替换成 TMAN/TWOMAN，否则订阅和请求的主题都不对
  const isTConvention = /^T(MAN|WOMAN)\d*$/i.test(roomCode)
  const boundRoom = roomCode || (roomName.includes('女') ? 'TWOMAN' : 'TMAN')
  const fallbackRoom = roomName.includes('女') ? 'TWOMAN' : 'TMAN'
  // 参与订阅/请求的房间：非 T 惯例建筑只针对绑定卫生间
  const rooms = isTConvention || !roomCode
    ? Array.from(new Set([boundRoom, 'TMAN', 'TWOMAN']))
    : [boundRoom]

  console.log('[tolitePad] binding:', { floorName, roomName, roomCode, boundRoom, rooms })

  // --- 厕位状态（key: 房间 → { 厕位编号: 0空闲/1占用 }） ---
  const stallMap = ref<Record<string, Record<string, number>>>({})
  // --- 厕位总数（聚合消息 {occupied, total} 只取 total，用于确定显示数量） ---
  const totalMap = ref<Record<string, number>>({})
  // --- 卫生间空气 ---
  const airMap = ref<Record<string, ToiletAir>>({})
  // --- 保洁信息 ---
  const cleaningMap = ref<Record<string, CleaningInfo>>({})
  // --- 附近卫生间厕位（key: 卫生间 code → { 厕位编号: 0/1 }） ---
  const otherStallMap = ref<Record<string, Record<string, number>>>({})
  // --- 附近卫生间列表：当前楼层同性卫生间（排除绑定）+ 邻层最近的一个 ---
  const nearbyToilets = ref<Array<{ name: string; code: string; floorCode: string; floorLabel: string }>>([])
  const neighborUnsubs: Array<() => void> = []
  let disposed = false

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

  // 原项目协议：每个厕位一条消息，topic 末段为厕位编号（1/2/…/P=vip）
  const parseStallMessage = (payload: unknown, topic: string): { key: string; status: number } | null => {
    if (!Array.isArray(payload)) return null
    const item = (payload[0] ?? {}) as Record<string, any>
    const raw = item?.status?.status
    if (raw === undefined || raw === null) return null
    const seg = topic.slice(topic.lastIndexOf('/') + 1)
    const key = seg === 'P' ? 'vip' : seg
    if (key !== 'vip' && !/^\d+$/.test(key)) return null
    return { key, status: raw === 1 || raw === true || raw === 'on' || raw === '1' ? 1 : 0 }
  }

  // --- 设备配置/wcinfo 响应（后端形状未定，防御式提取厕位总数与状态） ---
  const unwrapPayload = (payload: unknown): Record<string, any> | null => {
    let v: any = payload
    if (typeof v === 'string') {
      try { v = JSON.parse(v) } catch { return null }
    }
    if (Array.isArray(v)) v = v[0] ?? null
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  }

  const toStatusNum = (v: unknown): number | null => {
    if (v === 1 || v === true || v === '1' || v === 'on') return 1
    if (v === 0 || v === false || v === '0' || v === 'off') return 0
    return null
  }

  const findTotal = (o: Record<string, any>): number | undefined => {
    for (const k of ['total', 'stallTotal', 'wcTotal', 'num', 'stallCount', 'wcCount']) {
      const n = toNum(o?.[k])
      if (n !== undefined && n > 0) return Math.floor(n)
    }
    for (const k of ['wc', 'wcsensor', 'toilet', 'stalls', 'list']) {
      if (Array.isArray(o?.[k]) && o[k].length > 0) return o[k].length
    }
    for (const k of ['status', 'wc', 'wcsensor', 'toilet', 'data']) {
      const nested = o?.[k]
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const n = findTotal(nested)
        if (n !== undefined) return n
      }
    }
    return undefined
  }

  const applyStallStatuses = (o: Record<string, any>, target: Record<string, number>) => {
    const seen = new Set(Object.keys(target))
    const set = (k: string, v: unknown) => {
      const s = toStatusNum(v)
      if (s === null) return
      const key = k === 'P' ? 'vip' : k
      if (key !== 'vip' && !/^\d+$/.test(key)) return
      if (seen.has(key)) return
      seen.add(key)
      target[key] = s
    }
    const st = o?.status && typeof o.status === 'object' && !Array.isArray(o.status) ? o.status : null
    if (st) for (const [k, v] of Object.entries(st)) set(k, v)
    for (const k of ['wc', 'wcsensor', 'toilet', 'stalls', 'list']) {
      const arr = Array.isArray(o?.[k]) ? o[k] : null
      if (!arr) continue
      for (const item of arr) {
        if (!item || typeof item !== 'object') continue
        const code = item.code ?? item.name ?? item.id ?? item.key
        if (code === undefined) continue
        set(String(code), item.status?.status ?? item.status ?? item.occupied)
      }
    }
  }

  const roomFromTopic = (topic: string) => topic.slice(topic.lastIndexOf('/') + 1)

  const stallTarget = (room: string): Record<string, number> => {
    if (rooms.includes(room)) return stallMap.value[room] ?? (stallMap.value[room] = {})
    return otherStallMap.value[room] ?? (otherStallMap.value[room] = {})
  }

  const handleWcInfoMessage = (payload: unknown, topic: string) => {
    const room = roomFromTopic(topic)
    if (!rooms.includes(room) && !nearbyToilets.value.some((t) => t.code === room)) return
    const data = unwrapPayload(payload)
    if (!data) return
    const total = findTotal(data)
    if (total !== undefined) {
      totalMap.value[room] = total
      console.log('[tolitePad] wcinfo total:', room, total)
    }
    applyStallStatuses(data, stallTarget(room))
  }

  const handleConfigMessage = (payload: unknown, topic: string) => {
    const room = roomFromTopic(topic)
    if (!rooms.includes(room) && !nearbyToilets.value.some((t) => t.code === room)) return
    // 后端已响应即不再重复请求（进入页面只请求一次）
    configAnswered.add(room)
    const data = unwrapPayload(payload)
    if (!data) return
    console.log('[tolitePad] device config:', topic, data)
    const total = findTotal(data)
    if (total !== undefined) {
      totalMap.value[room] = total
      console.log('[tolitePad] config total:', room, total)
    }
    applyStallStatuses(data, stallTarget(room))
  }

  const handleWcMessage = (room: string, payload: unknown, topic: string) => {
    const stalls = stallMap.value[room] ?? (stallMap.value[room] = {})

    const parsed = parseStallMessage(payload, topic)
    if (parsed) {
      stalls[parsed.key] = parsed.status
      return
    }
    // 聚合格式：{ occupied, total } —— 只用于确定厕位数量，状态以逐厕位消息为准
    if (payload && typeof payload === 'object') {
      const msg = payload as Record<string, any>
      const total = Number(msg?.total ?? 0)
      if (total > 0) totalMap.value[room] = total
    }
  }

  const handleOtherWcMessage = (code: string, payload: unknown, topic: string) => {
    const parsed = parseStallMessage(payload, topic)
    if (!parsed) return
    const map = otherStallMap.value[code] ?? (otherStallMap.value[code] = {})
    map[parsed.key] = parsed.status
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

  // --- 附近卫生间：优先当前楼层同性卫生间，再取邻层最近的一个同性卫生间 ---
  const parseFloorNum = (v: unknown) => {
    const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10)
    return Number.isFinite(n) ? n : NaN
  }
  const floorSeg = (n: number) => `${n}F`
  const isWomen = roomName.includes('女')
  const sameGender = (name: string) => (isWomen ? name.includes('女') : name.includes('男'))

  const findNearbyToilets = (): Array<{ name: string; code: string; floorCode: string; floorLabel: string }> => {
    const c = ctx.value
    if (!c) return []
    const list: Array<{ name: string; code: string; floorCode: string; floorLabel: string }> = []
    for (const space of spaceStore.structure) {
      const area = (space.floorArea ?? []).find((fa) => String(fa.code ?? '') === String(c.floorAreaCode))
      if (!area) continue
      const floors = area.floor ?? []
      const curIdx = floors.findIndex((f) => String(f.code ?? '') === String(c.floorCode))
      if (curIdx < 0) continue
      const cur = floors[curIdx]
      // 当前楼层同性卫生间（排除绑定房间本身）
      for (const t of cur.toilet ?? []) {
        if (!t.code || !sameGender(t.name) || String(t.code) === boundRoom) continue
        list.push({ name: t.name, code: String(t.code), floorCode: String(c.floorCode), floorLabel: '' })
      }
      // 邻层最近的一个同性卫生间（同距离优先上层）
      const byDist = floors
        .map((f, i) => ({ f, i, n: parseFloorNum(f.code ?? f.name) }))
        .filter((x) => x.i !== curIdx)
        .sort((a, b) => {
          const da = Math.abs(a.i - curIdx)
          const db = Math.abs(b.i - curIdx)
          if (da !== db) return da - db
          return (b.i - curIdx) - (a.i - curIdx)
        })
      for (const x of byDist) {
        const t = (x.f.toilet ?? []).find((tt) => tt.code && sameGender(tt.name))
        if (!t) continue
        const fl = /^\d+F$/i.test(String(x.f.code ?? '')) ? String(x.f.code) : floorSeg(x.n)
        list.push({ name: t.name, code: String(t.code), floorCode: String(x.f.code ?? fl), floorLabel: fl })
        break
      }
      break
    }
    return list
  }

  const applyNeighbors = () => {
    for (const fn of neighborUnsubs) fn()
    neighborUnsubs.length = 0
    if (disposed) return
    const c = ctx.value
    if (!c) return
    const list = findNearbyToilets()
    nearbyToilets.value = list
    for (const t of list) {
      const sc = { ...c, floorCode: t.floorCode }
      const wcTopic = topics.wcSensor(sc, t.code)
      mqtt.subscribe(wcTopic)
      neighborUnsubs.push(() => mqtt.unsubscribe(wcTopic))
      neighborUnsubs.push(mqtt.onMessage(wcTopic, (payload, topic) => handleOtherWcMessage(t.code, payload, topic)))

      const cfgTopic = topics.deviceConfigResponse({ ...sc, deviceCode: t.code })
      mqtt.subscribe(cfgTopic)
      neighborUnsubs.push(() => mqtt.unsubscribe(cfgTopic))
      neighborUnsubs.push(mqtt.onMessage(cfgTopic, (payload, topic) => handleConfigMessage(payload, topic)))

      const infoTopic = topics.wcInfo(sc, t.code)
      mqtt.subscribe(infoTopic)
      neighborUnsubs.push(() => mqtt.unsubscribe(infoTopic))
      neighborUnsubs.push(mqtt.onMessage(infoTopic, (payload, topic) => handleWcInfoMessage(payload, topic)))
    }
    requestConfig()
  }

  // 原项目协议：挂载后先 publish /iot/setting/get/device，后端才下发设备数据。
  // 每个房间只在进入页面时请求一次（后端响应过就不再重发）
  const configAnswered = new Set<string>()
  const requestConfig = () => {
    if (disposed || !ctx.value) return
    const c = ctx.value
    const targets = [
      ...rooms.map((r) => ({ code: r, floorCode: c.floorCode })),
      ...nearbyToilets.value.map((t) => ({ code: t.code, floorCode: t.floorCode })),
    ]
    for (const t of targets) {
      if (configAnswered.has(t.code)) continue
      mqtt.publish(topics.deviceConfigGet(), {
        spaceCode: c.spaceCode,
        floorAreaCode: c.floorAreaCode,
        floorCode: t.floorCode,
        areaCode: t.code,
      })
    }
  }

  const unsubs: Array<() => void> = []
  const setup = () => {
    if (!ctx.value || unsubs.length > 0) return
    const c = ctx.value

    // 设备配置响应与厕位信息 wcinfo：只订阅精确主题，避免收到其他 pad 请求的响应刷屏
    for (const room of rooms) {
      const cfgTopic = topics.deviceConfigResponse({ ...c, deviceCode: room })
      mqtt.subscribe(cfgTopic)
      unsubs.push(() => mqtt.unsubscribe(cfgTopic))
      unsubs.push(mqtt.onMessage(cfgTopic, (payload, topic) => handleConfigMessage(payload, topic)))

      const wcInfoTopic = topics.wcInfo(c, room)
      mqtt.subscribe(wcInfoTopic)
      unsubs.push(() => mqtt.unsubscribe(wcInfoTopic))
      unsubs.push(mqtt.onMessage(wcInfoTopic, (payload, topic) => handleWcInfoMessage(payload, topic)))
    }

    // 未连接时 publish 会被丢弃，重连后重新请求（已响应的房间跳过）
    requestConfig()
    unsubs.push(onConnect(() => { if (!disposed) requestConfig() }))

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

    applyNeighbors()
    if (spaceStore.structure.length === 0) {
      spaceStore.loadStructure().finally(applyNeighbors)
    }
  }

  setup()

  onScopeDispose(() => {
    disposed = true
    for (const fn of unsubs) fn()
    unsubs.length = 0
    for (const fn of neighborUnsubs) fn()
    neighborUnsubs.length = 0
  })

  // --- 当前展示房间（优先绑定房间，其次按男女，最后谁有数据用谁） ---
  const activeRoom = computed(() => {
    // 非 T 惯例建筑固定显示绑定卫生间
    if (!isTConvention && roomCode) return boundRoom
    const hasData = (r: string) =>
      Object.keys(stallMap.value[r] ?? {}).length > 0 ||
      (totalMap.value[r] ?? 0) > 0 ||
      airMap.value[r] !== undefined ||
      cleaningMap.value[r] !== undefined
    if (hasData(boundRoom)) return boundRoom
    if (hasData(fallbackRoom)) return fallbackRoom
    const other = fallbackRoom === 'TMAN' ? 'TWOMAN' : 'TMAN'
    if (hasData(other)) return other
    return fallbackRoom
  })

  // --- 厕位（数量由 total 决定、缺失时按已收到最大编号推断；状态未到显示未知 null，vip 最后） ---
  const stalls = computed<(number | null)[]>(() => {
    const map = stallMap.value[activeRoom.value] ?? {}
    const nums = Object.keys(map)
      .filter((k) => k !== 'vip' && /^\d+$/.test(k))
      .map(Number)
      .sort((a, b) => a - b)
    const count = Math.max(
      totalMap.value[activeRoom.value] ?? 0,
      nums.length > 0 ? nums[nums.length - 1] : 0,
    )
    const list: (number | null)[] = []
    for (let i = 1; i <= count; i++) {
      const v = map[String(i)]
      list.push(v === 0 || v === 1 ? v : null)
    }
    const vip = map['vip']
    if (vip === 0 || vip === 1) list.push(vip)
    return list
  })

  // --- 厕位布局：6 个以内一行；超过分两行，列对齐 ---
  const stallRows = computed(() => {
    const n = stalls.value.length
    if (n === 0) return []
    if (n <= 6) return [{ cols: n, offset: 0, stalls: stalls.value }]
    const first = Math.ceil(n / 2)
    const row1 = stalls.value.slice(0, first)
    const row2 = stalls.value.slice(first)
    const cols = Math.max(row1.length, row2.length)
    const offset = Math.round((cols - row2.length) / 2)
    return [
      { cols, offset: 0, stalls: row1 },
      { cols, offset, stalls: row2 },
    ]
  })

  // --- 附近卫生间展示（状态未到显示灰色未知 null，vip 计入空闲数） ---
  const nearbyList = computed(() =>
    nearbyToilets.value.map((t) => {
      const map = otherStallMap.value[t.code] ?? {}
      const nums = Object.keys(map)
        .filter((k) => k !== 'vip' && /^\d+$/.test(k))
        .map(Number)
        .sort((a, b) => a - b)
      const count = Math.max(
        totalMap.value[t.code] ?? 0,
        nums.length > 0 ? nums[nums.length - 1] : 0,
      )
      const statuses: (number | null)[] = []
      for (let i = 1; i <= count; i++) {
        const v = map[String(i)]
        statuses.push(v === 0 || v === 1 ? v : null)
      }
      const vip = map['vip']
      const vipStatus = vip === 0 || vip === 1 ? vip : null
      const free = statuses.filter((v) => v === 0).length + (vipStatus === 0 ? 1 : 0)
      const label = t.floorLabel && !t.name.includes(t.floorLabel) ? `${t.floorLabel}-${t.name}` : t.name
      return { label, free, statuses, vip: vipStatus }
    })
  )

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
    stallRows,
    nearbyList,
    airDisplay,
    cleaningDisplay,
    bgVideo,
    outside,
    isConnected: mqtt.isConnected,
  }
}
