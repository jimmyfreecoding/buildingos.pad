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
 * - 厕位状态: /iot/status/wcsensor/{space}/{floorarea}/{floor}/# 楼层通配（topic: …/{floor}/{room}/{stall}，每厕位一条或整间一条均可）
 * - 空气传感器: /iot/status/airsensor/{space}/{floorarea}/{floor}/{room}/#
 * - 保洁打卡: /iot/status/cleaning/{space}/{floorarea}/{floor}/{room}/#
 * - 天气 → 背景视频: /wallpad/outside
 * - 附近卫生间: 当前楼层同性卫生间（可能多个）+ 邻层最近一个，按各自 code 订阅 wcinfo 与设备配置，wcsensor 按楼层通配
 * - 设备配置: 先 publish /iot/setting/get/device 后端才下发数据；响应订阅 /iot/setting/device/{...}/{room} 与 /iot/status/wcinfo/{...}/{room} 精确主题
 */
export function useToliteData() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()
  const ctx = computed(() => spaceStore.spaceContext)

  const init = readInitData()
  const floorName = String(init.floorName || init.floor || '')
  const initRoomName = String(init.roomName || init.name || '')
  const roomCode = String(init.roomCode || init.roomId || '')

  // 显示名称：结构数据（绑定页同源，原文）→ initData → 后端设备配置响应里的名称
  const configName = ref('')
  const structureName = computed(() => {
    if (!roomCode || !ctx.value) return ''
    const c = ctx.value
    for (const space of spaceStore.structure) {
      const area = (space.floorArea ?? []).find((fa) => String(fa.code ?? '') === String(c.floorAreaCode))
      if (!area) continue
      const floor = (area.floor ?? []).find((f) => String(f.code ?? '') === String(c.floorCode))
      if (!floor) continue
      const t = (floor.toilet ?? []).find((tt) => tt.code !== undefined && String(tt.code) === roomCode)
      if (t) return t.name
    }
    return ''
  })
  const roomName = computed(() => initRoomName || structureName.value || configName.value)

  // TMAN/TWOMAN 惯例建筑直接用 code；其他建筑（如 SMART 楼 code 为真实结构编码）用绑定 code，
  // 不再强制替换成 TMAN/TWOMAN，否则订阅和请求的主题都不对
  const isTConvention = /^T(MAN|WOMAN)\d*$/i.test(roomCode)
  const boundRoom = roomCode || (initRoomName.includes('女') ? 'TWOMAN' : 'TMAN')
  const fallbackRoom = initRoomName.includes('女') ? 'TWOMAN' : 'TMAN'
  // 参与订阅/请求的房间：非 T 惯例建筑只针对绑定卫生间
  const rooms = isTConvention || !roomCode
    ? Array.from(new Set([boundRoom, 'TMAN', 'TWOMAN']))
    : [boundRoom]

  console.log('[tolitePad] binding:', { floorName, roomName: roomName.value, roomCode, boundRoom, rooms })

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
  // --- 设备配置返回的厕位传感器列表：房间 → { 设备code → 厕位编号 }，wcsensor 消息按 payload.code 直接对齐 ---
  const sensorIndexMap = ref<Record<string, Record<string, string>>>({})
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

  // 从设备配置/wcinfo 响应提取厕位传感器列表，建立 设备code → 厕位编号 映射（编号优先取名称末尾数字）
  const buildSensorIndex = (room: string, data: Record<string, any>) => {
    const map = sensorIndexMap.value[room] ?? (sensorIndexMap.value[room] = {})
    const collect = (arr: unknown) => {
      if (!Array.isArray(arr)) return
      let idx = Object.keys(map).length
      for (const item of arr) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, any>
        const code = o?.code
        const name = o?.name
        if (typeof code !== 'string' || !code) continue
        if (!/厕位|传感器|WC/i.test(`${String(name ?? '')}${code}`)) continue
        const key = stallNumOf(name) ?? String(idx + 1)
        map[code] = key
        idx++
      }
    }
    for (const k of ['wcsensor', 'wc', 'toilet', 'sensor', 'sensors', 'stalls', 'list', 'devices', 'device']) collect(data[k])
  }

  // payload 首项的设备 code（wcsensor 消息按它对齐设备配置里的传感器）
  const firstItemCode = (payload: unknown): string | null => {
    const arr = Array.isArray(payload) ? payload : null
    const item = arr?.[0]
    if (item && typeof item === 'object') {
      const c = (item as Record<string, any>)?.code
      if (typeof c === 'string' && c) return c
    }
    return null
  }

  // 厕位编号：P→vip；纯数字原样；否则取末尾数字（如 "厕位传感器12"→12、"00202607014007F-WC-11"→11）
  const stallNumOf = (v: unknown): string | null => {
    const s = String(v ?? '')
    if (!s) return null
    if (s === 'P') return 'vip'
    if (/^\d+$/.test(s)) return s
    const m = s.match(/(\d+)$/)
    return m ? m[1] : null
  }

  // 解析厕位状态 payload：整间数组 [{code,status:{status}}] / 单条 / status 对象映射 {1:0,2:1} 均支持
  const parseStallItems = (payload: unknown): Array<{ key: string; status: number }> => {
    const out: Array<{ key: string; status: number }> = []
    if (Array.isArray(payload)) {
      for (const item of payload) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, any>
        const s = toStatusNum(o?.status?.status ?? o?.status)
        if (s === null) continue
        const code = o?.code ?? o?.id ?? o?.key
        if (code === undefined) continue
        const key = stallNumOf(code)
        if (!key) continue
        out.push({ key, status: s })
      }
      return out
    }
    if (payload && typeof payload === 'object') {
      const st = (payload as Record<string, any>).status
      if (st && typeof st === 'object' && !Array.isArray(st)) {
        for (const [k, v] of Object.entries(st)) {
          const key = stallNumOf(k)
          if (!key) continue
          const s = toStatusNum(v)
          if (s !== null) out.push({ key, status: s })
        }
      }
    }
    return out
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
    buildSensorIndex(room, data)
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
    const name = data.name ?? data.roomName ?? data.toiletName
    if (typeof name === 'string' && name && room === boundRoom) configName.value = name
    const total = findTotal(data)
    if (total !== undefined) {
      totalMap.value[room] = total
      console.log('[tolitePad] config total:', room, total)
    }
    buildSensorIndex(room, data)
    applyStallStatuses(data, stallTarget(room))
  }

  // wcsensor 楼层通配消息：/iot/status/wcsensor/{space}/{area}/{floor}/{room}/{stall?}
  const handleWcSensorMessage = (payload: unknown, topic: string) => {
    const segs = topic.split('/')
    const room = segs[7] ?? ''
    const stallSeg = segs[8] ?? ''
    if (!room) return

    // 聚合计数（{occupied,total}）只定数量，状态以逐厕位消息为准
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const t = toNum((payload as Record<string, any>)?.total)
      if (t !== undefined && t > 0) totalMap.value[room] = Math.floor(t)
    }

    const target = stallTarget(room)

    // 每厕位一条：优先 payload.code 对齐设备配置的传感器编号，其次 topic 末段编号
    const code = firstItemCode(payload)
    const stallKey = (code && sensorIndexMap.value[room]?.[code]) || stallNumOf(stallSeg)
    if (stallKey) {
      const item = parseStallItems(payload)[0]
      if (item) {
        target[stallKey] = item.status
        return
      }
      let raw: unknown = payload
      if (Array.isArray(raw)) raw = (raw[0] ?? null) as unknown
      if (raw && typeof raw === 'object') raw = (raw as any)?.status?.status ?? (raw as any)?.status
      const s = toStatusNum(raw)
      if (s !== null) target[stallKey] = s
      return
    }

    // 整间一条：按 code 逐项应用
    for (const { key, status } of parseStallItems(payload)) target[key] = status
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
  const isWomen = computed(() => roomName.value.includes('女'))
  const sameGender = (name: string) => (isWomen.value ? name.includes('女') : name.includes('男'))

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

    // 附近卫生间所在楼层各订阅一次 wcsensor 通配（当前楼层已由 setup 订阅）
    const floors = Array.from(new Set(list.map((t) => t.floorCode).filter((f) => f && f !== c.floorCode)))
    for (const floorCode of floors) {
      const fTopic = topics.wcSensorFloor({ ...c, floorCode })
      mqtt.subscribe(fTopic)
      neighborUnsubs.push(() => mqtt.unsubscribe(fTopic))
      neighborUnsubs.push(mqtt.onMessage(fTopic, (payload, topic) => handleWcSensorMessage(payload, topic)))
    }

    for (const t of list) {
      const sc = { ...c, floorCode: t.floorCode }
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

    // 当前楼层 wcsensor 通配：一次订阅覆盖本层所有卫生间（每厕位一条/整间一条均可路由）
    const wcFloorTopic = topics.wcSensorFloor(c)
    mqtt.subscribe(wcFloorTopic)
    unsubs.push(() => mqtt.unsubscribe(wcFloorTopic))
    unsubs.push(mqtt.onMessage(wcFloorTopic, (payload, topic) => handleWcSensorMessage(payload, topic)))

    for (const room of rooms) {
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
