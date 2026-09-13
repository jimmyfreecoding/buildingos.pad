import { computed, onScopeDispose, ref } from 'vue'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics, onConnect } from '@/utils/mqtt'
import {
  applyDeviceConfig,
  applyStatusMessage,
  applyTotalHint,
  roomDots,
  roomVip,
  type StallState,
} from './stallSlots'

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

export interface ToiletRowBlock {
  cols: number
  offset: number
  stalls: Array<number | null>
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
 * - 空气传感器: /iot/status/airsensor/{space}/{floorarea}/{floor}/{room}/#（每间各订一条）
 * - 保洁打卡: /iot/status/cleaning/{space}/{floorarea}/{floor}/{room}/#（每间各订一条）
 * - 天气 → 背景视频: /wallpad/outside
 * - 多卫生间绑定: InitPage 多选后 initData.roomCodes 为数组，本页对每间订阅（订阅翻倍），
 *   厕位按房间分多行展示（粉色=女卫 / 绿红=男卫），空气指标取多间有效值平均并去抖
 * - 厕位序号/点数：一律以「本房间设备配置列出的传感器清单」为准（stallSlots.ts）。
 *   现场 topic/code/名称末尾的数字常是全楼流水号，直接当序号会让 2 厕位房间显示 4 个点
 *   （1、2 号点永远灰、3、4 号点才是真厕位），因此不再用末尾数字定序号，也不再用
 *   max(total, 最大编号) 推点数。
 * - 附近卫生间: 当前楼层未绑定的匹配卫生间（绑定含两性时显示全部）+ 邻层最近一个，按各自 code 订阅 wcinfo 与设备配置，wcsensor 按楼层通配
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
  // 卫生间性别 type：man/woman（InitPage 保存绑定卫生间时写入）
  const initRoomType = String(init.roomType || '')

  // --- 多卫生间绑定：InitPage 多选后写入 roomCodes/roomNames/roomTypes 数组；兼容旧单绑定 ---
  const initRoomCodes = Array.isArray(init.roomCodes) ? init.roomCodes.map(String).filter(Boolean) : []
  const initRoomNames = Array.isArray(init.roomNames) ? init.roomNames.map(String) : []
  const initRoomTypes = Array.isArray(init.roomTypes) ? init.roomTypes.map(String) : []

  // 一律以绑定卫生间的结构 code 为准（结构数据必然正确，不做 TMAN/TWOMAN 退化）
  const rooms = initRoomCodes.length > 0
    ? Array.from(new Set(initRoomCodes))
    : roomCode
      ? [roomCode]
      : []
  // 主绑定（第一间）：向后兼容 deviceCode/spaceContext/MQTT clientId 使用
  const boundRoom = rooms[0] ?? ''

  console.log('[tolitePad] binding:', { floorName, rooms, roomNames: initRoomNames, roomTypes: initRoomTypes })
  if (rooms.length === 0) {
    console.warn(
      '[tolitePad] ⚠ initData 未绑定具体卫生间（无结构 code），页面将无数据 —— ' +
      '请重新进入 /init（logo 三击）选择「绑定类型=卫生间」并选择具体卫生间',
    )
  }

  // --- 厕位状态：房间 → { slots: 设备/编号→槽位, statuses: 设备/编号→0/1, total: 本房间厕位数, totalHint }
  // 槽位与点数计算全部收敛在 stallSlots.ts（序号/点数不再由字符串末尾数字决定，避免翻倍） ---
  const stallState = ref<StallState>({})
  // --- 卫生间空气（key: 房间） ---
  const airMap = ref<Record<string, ToiletAir>>({})
  // --- 保洁信息 ---
  const cleaningMap = ref<Record<string, CleaningInfo>>({})
  // --- 附近卫生间列表：当前楼层未绑定的匹配卫生间 + 邻层最近的一个 ---
  const nearbyToilets = ref<Array<{ name: string; code: string; floorCode: string; floorLabel: string; gender: 'man' | 'woman' }>>([])
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

  // --- 结构数据中绑定楼层所有卫生间（code → { name, type }）：名称与性别 type 的权威来源 ---
  const structureToiletMap = computed<Record<string, { name: string; type?: string }>>(() => {
    const map: Record<string, { name: string; type?: string }> = {}
    const c = ctx.value
    if (!c) return map
    for (const space of spaceStore.structure) {
      const area = (space.floorArea ?? []).find((fa) => String(fa.code ?? '') === String(c.floorAreaCode))
      if (!area) continue
      const floor = (area.floor ?? []).find((f) => String(f.code ?? '') === String(c.floorCode))
      if (!floor) continue
      for (const t of floor.toilet ?? []) {
        if (t.code !== undefined) map[String(t.code)] = { name: t.name, type: t.type }
      }
    }
    return map
  })

  // 后端设备配置响应返回的卫生间名称（兜底）
  const configNameMap = ref<Record<string, string>>({})

  // 单间卫生间名称：initData.roomNames（绑定页同源，原文）→ 结构数据 → 设备配置响应
  const roomNameOf = (code: string): string => {
    const idx = rooms.indexOf(code)
    if (idx >= 0 && initRoomNames[idx]) return initRoomNames[idx]
    return structureToiletMap.value[code]?.name ?? configNameMap.value[code] ?? ''
  }

  // 单间性别：结构数据 toilet.type → initData.roomTypes → 名字，逐级兜底
  const isWomenRoom = (code: string): boolean => {
    const st = structureToiletMap.value[code]
    if (st?.type) return String(st.type) === 'woman'
    const idx = rooms.indexOf(code)
    if (idx >= 0 && initRoomTypes[idx]) return initRoomTypes[idx] === 'woman'
    return roomNameOf(code).includes('女')
  }

  // 绑定卫生间展示列表（含每间名称/性别）
  const toiletInfoList = computed(() =>
    rooms.map((code) => ({
      code,
      name: roomNameOf(code),
      isWomen: isWomenRoom(code),
    })),
  )

  // 标题性别标签：全部同性别时显示 男/女卫生间，混绑时中性
  const genderLabel = computed(() => {
    const set = new Set(toiletInfoList.value.map((t) => (t.isWomen ? 'woman' : 'man')))
    if (set.size === 0) return '卫生间'
    if (set.size === 1) return set.has('woman') ? '女卫生间' : '男卫生间'
    return '卫生间'
  })

  // 标题：多间用 “ / ” 拼接；未绑定显示楼层+性别
  const title = computed(() => {
    const names = toiletInfoList.value.map((t) => t.name).filter(Boolean)
    if (names.length > 0) return names.join(' / ')
    return `${floorName || '—'} ${genderLabel.value}`
  })
  // 主房间名称（兼容旧用法）
  const roomName = computed(() => (rooms.length > 0 ? roomNameOf(rooms[0]) : initRoomName))

  // --- 设备配置/wcinfo 响应（后端形状未定，防御式提取；槽位/点数解析见 stallSlots.ts） ---
  const unwrapPayload = (payload: unknown): Record<string, any> | null => {
    let v: any = payload
    if (typeof v === 'string') {
      try { v = JSON.parse(v) } catch { return null }
    }
    if (Array.isArray(v)) v = v[0] ?? null
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null
  }

  // 应用设备配置/wcinfo：先按「本房间传感器清单」定槽位与点数，再吸收响应自带的状态
  const applyRoomConfig = (room: string, data: Record<string, any>) => {
    const applied = applyDeviceConfig(stallState.value, room, data)
    if (applied) console.log(`[tolitePad] 厕位槽位 ${room}: count=${applied.count}`, applied.slots)
  }

  const roomFromTopic = (topic: string) => topic.slice(topic.lastIndexOf('/') + 1)

  const handleWcInfoMessage = (payload: unknown, topic: string) => {
    const room = roomFromTopic(topic)
    if (!rooms.includes(room) && !nearbyToilets.value.some((t) => t.code === room)) return
    const data = unwrapPayload(payload)
    if (!data) return
    applyRoomConfig(room, data)
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
    if (typeof name === 'string' && name && rooms.includes(room)) configNameMap.value[room] = name
    applyRoomConfig(room, data)
  }

  // wcsensor 楼层通配消息：/iot/status/wcsensor/{space}/{area}/{floor}/{room}/{stall?}
  // 每厕位一条 / 整间一条 / {status:{…}} 映射统一由 stallSlots.ts 解析后落到本房间槽位
  const handleWcSensorMessage = (payload: unknown, topic: string) => {
    const segs = topic.split('/')
    const room = segs[7] ?? ''
    const stallSeg = segs[8] ?? ''
    if (!room) return
    // 烟雾传感器消息不算厕位状态（部分房间 SMOKE 设备被错标 type=wcsensor）
    if (/烟雾|SMOKE/i.test(stallSeg)) return

    // 聚合计数（{occupied,total}）只当点数提示，且仅在没有设备配置时生效
    const hint = applyTotalHint(stallState.value, room, payload)
    if (hint !== null) console.log('[tolitePad] 厕位总数提示:', room, hint)

    const { dropped } = applyStatusMessage(stallState.value, room, payload, stallSeg)
    if (dropped > 0) {
      console.warn(`[tolitePad] 厕位消息编号超出 ${room} 的厕位数，已忽略以免出现幽灵厕位:`, topic, payload)
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
    recalcAir()
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

  // --- 空气显示值：多间同类型指标取有效值平均，坏传感器（无数据/0/非有限）剔除；EMA 平滑去抖 ---
  const AIR_KEYS: (keyof ToiletAir)[] = ['temperature', 'humidity', 'h2s', 'pm25', 'nh3']
  const airSmooth = ref<ToiletAir | null>(null)

  const recalcAir = () => {
    const raw: ToiletAir = {}
    for (const key of AIR_KEYS) {
      const values: number[] = []
      for (const room of rooms) {
        const v = airMap.value[room]?.[key]
        // 去掉抖动：传感器坏了（无数据 / 0 / 非有限值）不参与平均
        if (v === undefined || v === 0 || !Number.isFinite(v)) continue
        values.push(v)
      }
      if (values.length > 0) {
        raw[key] = values.reduce((a, b) => a + b, 0) / values.length
      }
    }
    if (Object.values(raw).every((v) => v === undefined)) {
      airSmooth.value = null
      return
    }
    // 轻量 EMA：吸收传感器瞬时抖动，alpha 越大响应越快
    const prev = airSmooth.value
    const alpha = 0.4
    const out: ToiletAir = {}
    for (const key of AIR_KEYS) {
      const v = raw[key]
      if (v === undefined) continue
      out[key] = prev?.[key] !== undefined ? prev[key] * (1 - alpha) + v * alpha : v
    }
    airSmooth.value = out
  }

  // --- 附近卫生间：优先当前楼层未绑定的匹配性别卫生间，再取邻层最近的一个 ---
  const parseFloorNum = (v: unknown) => {
    const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10)
    return Number.isFinite(n) ? n : NaN
  }
  const floorSeg = (n: number) => `${n}F`

  // 绑定性别集合：绑定同时含男/女两性时，附近显示全部未绑定卫生间；否则只显示同性别
  const boundGenderSet = computed(() => {
    const set = new Set<string>()
    for (const t of toiletInfoList.value) set.add(t.isWomen ? 'woman' : 'man')
    return set
  })

  const genderOf = (t: { name: string; type?: string }): 'man' | 'woman' => {
    if (t.type) return String(t.type) === 'woman' ? 'woman' : 'man'
    return t.name.includes('女') ? 'woman' : 'man'
  }

  const genderMatch = (t: { name: string; type?: string }): boolean => {
    if (boundGenderSet.value.size === 0) return true
    if (boundGenderSet.value.size >= 2) return true
    return boundGenderSet.value.has(genderOf(t))
  }

  const findNearbyToilets = (): Array<{ name: string; code: string; floorCode: string; floorLabel: string; gender: 'man' | 'woman' }> => {
    const c = ctx.value
    if (!c) return []
    const list: Array<{ name: string; code: string; floorCode: string; floorLabel: string; gender: 'man' | 'woman' }> = []
    for (const space of spaceStore.structure) {
      const area = (space.floorArea ?? []).find((fa) => String(fa.code ?? '') === String(c.floorAreaCode))
      if (!area) continue
      const floors = area.floor ?? []
      const curIdx = floors.findIndex((f) => String(f.code ?? '') === String(c.floorCode))
      if (curIdx < 0) continue
      const cur = floors[curIdx]
      // 当前楼层未绑定的匹配卫生间（排除全部绑定房间）
      for (const t of cur.toilet ?? []) {
        if (!t.code || !genderMatch(t) || rooms.includes(String(t.code))) continue
        list.push({ name: t.name, code: String(t.code), floorCode: String(c.floorCode), floorLabel: '', gender: genderOf(t) })
      }
      // 邻层最近的一个匹配卫生间（同距离优先上层）
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
        const t = (x.f.toilet ?? []).find((tt) => tt.code && genderMatch(tt) && !rooms.includes(String(tt.code)))
        if (!t) continue
        const fl = /^\d+F$/i.test(String(x.f.code ?? '')) ? String(x.f.code) : floorSeg(x.n)
        list.push({ name: t.name, code: String(t.code), floorCode: String(x.f.code ?? fl), floorLabel: fl, gender: genderOf(t) })
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
  // 每个房间进入页面只请求一次：configRequested 拦截重复 publish（setup 与 applyNeighbors 都会触发），
  // 否则后端会响应两次，旧实现每次响应都会给传感器重新编号（1、2 → 3、4），点数直接翻倍
  const configRequested = new Set<string>()
  const configAnswered = new Set<string>()
  const requestConfig = () => {
    if (disposed || !ctx.value) return
    const c = ctx.value
    const targets = [
      ...rooms.map((r) => ({ code: r, floorCode: c.floorCode })),
      ...nearbyToilets.value.map((t) => ({ code: t.code, floorCode: t.floorCode })),
    ]
    for (const t of targets) {
      if (configAnswered.has(t.code) || configRequested.has(t.code)) continue
      configRequested.add(t.code)
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

    // 设备配置响应与厕位信息 wcinfo：每个绑定房间各订精确主题，避免收到其他 pad 请求的响应刷屏
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

    // 未连接时 publish 会被丢弃：重连后清掉「已请求」标记，只对「未响应」的房间重发
    requestConfig()
    unsubs.push(onConnect(() => {
      if (disposed) return
      configRequested.clear()
      requestConfig()
    }))

    // 当前楼层 wcsensor 通配：一次订阅覆盖本层所有卫生间（每厕位一条/整间一条均可路由）
    const wcFloorTopic = topics.wcSensorFloor(c)
    mqtt.subscribe(wcFloorTopic)
    unsubs.push(() => mqtt.unsubscribe(wcFloorTopic))
    unsubs.push(mqtt.onMessage(wcFloorTopic, (payload, topic) => handleWcSensorMessage(payload, topic)))

    // 每个绑定房间各订空气传感器与保洁主题（多间订阅翻倍）
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

  // --- 厕位（点数=本房间设备配置的厕位数；状态未到显示未知 null，vip 最后） ---
  // 不得再使用 max(total, 最大编号)：现场编号常是全楼流水号，会把 2 厕位房间撑成 4 个点
  const stallsOf = (room: string): Array<number | null> => roomDots(stallState.value, room)

  // --- 单间厕位布局：6 个以内一行；超过分两行，列对齐 ---
  const stallRowsOf = (room: string): ToiletRowBlock[] => {
    const stalls = stallsOf(room)
    const n = stalls.length
    if (n === 0) return []
    if (n <= 6) return [{ cols: n, offset: 0, stalls }]
    const first = Math.ceil(n / 2)
    const row1 = stalls.slice(0, first)
    const row2 = stalls.slice(first)
    const cols = Math.max(row1.length, row2.length)
    const offset = Math.round((cols - row2.length) / 2)
    return [
      { cols, offset: 0, stalls: row1 },
      { cols, offset, stalls: row2 },
    ]
  }

  // --- 多卫生间：每个卫生间一块（名称 + 性别 + 厕位行），一个卫生间占一行区域 ---
  const toiletRows = computed(() =>
    toiletInfoList.value.map((t) => ({
      code: t.code,
      name: t.name,
      isWomen: t.isWomen,
      rows: stallRowsOf(t.code),
    })),
  )

  // --- 附近卫生间展示（状态未到显示灰色未知 null，vip 单独一点并计入空闲数） ---
  const nearbyList = computed(() =>
    nearbyToilets.value.map((t) => {
      const dots = roomDots(stallState.value, t.code)
      const vipStatus = roomVip(stallState.value, t.code)
      const statuses: Array<number | null> = vipStatus === null ? dots : dots.slice(0, -1)
      const free = statuses.filter((v) => v === 0).length + (vipStatus === 0 ? 1 : 0)
      const label = t.floorLabel && !t.name.includes(t.floorLabel) ? `${t.floorLabel}-${t.name}` : t.name
      return { label, free, statuses, vip: vipStatus, isWomen: t.gender === 'woman' }
    })
  )

  // --- 空气显示值（多间平均后统一换算：h2s×1.391、nh3×0.695 → mg/m³） ---
  const airDisplay = computed(() => {
    const air = airSmooth.value
    if (!air) return null
    return {
      temperature: air.temperature,
      humidity: air.humidity,
      h2s: air.h2s !== undefined ? Number((air.h2s * 1.391).toFixed(3)) : undefined,
      pm25: air.pm25,
      nh3: air.nh3 !== undefined ? Number((air.nh3 * 0.695).toFixed(3)) : undefined,
    }
  })

  // --- 保洁显示：多间取最近一次保洁（endTime 可能是 "YYYY-MM-DD HH:mm" 或时间戳） ---
  const cleaningDisplay = computed(() => {
    const toTime = (s: string): number => {
      if (/^\d+$/.test(s)) return Number(s)
      const d = new Date(s.replace(' ', 'T'))
      return Number.isNaN(d.getTime()) ? 0 : d.getTime()
    }
    let best: { room: string; endTime: string; empName: string } | null = null
    for (const room of rooms) {
      const c = cleaningMap.value[room]
      if (!c?.endTime) continue
      if (!best || toTime(c.endTime) > toTime(best.endTime)) {
        best = { room, endTime: c.endTime, empName: c.empName ?? '' }
      }
    }
    if (!best) return null
    let s = best.endTime
    if (/^\d+$/.test(s)) {
      const d = new Date(Number(s))
      if (!Number.isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, '0')
        s = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
      }
    }
    const [date = '', time = ''] = s.split(' ')
    // 多间绑定时标注是哪一间
    const cleaningRoomName = rooms.length > 1 ? roomNameOf(best.room) : ''
    return { date, time, empName: best.empName, roomName: cleaningRoomName }
  })

  return {
    floorName,
    roomName,
    title,
    genderLabel,
    toiletRows,
    nearbyList,
    airDisplay,
    cleaningDisplay,
    bgVideo,
    outside,
    isConnected: mqtt.isConnected,
  }
}
