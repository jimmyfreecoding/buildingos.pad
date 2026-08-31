import { computed, ref, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'
import { setPadName } from '@/utils/logClk'

export type PadHeartbeatKind =
  | 'wallPad'
  | 'tolitePad'
  | 'roomControl'
  | 'meetingControl'
  | 'doorPad'
  | 'twins'
  | 'switchPad'

export interface PadIdentity {
  name: string
  code: string
  gateway: string
  layer: string
  status: { online: number; status: string; padStatus?: number }
}

interface MeetingItem {
  startTime?: string
  endTime?: string
  name?: string
}

interface SensorState {
  online?: number | string
  status?: string
}

const HEARTBEAT_INTERVAL_MS = 30000

// 对齐老项目 bxbuildingmeetingpad/src/App.vue 的心跳逻辑
// padStatus 语义：0 无会无人 1 有会有人 2 无会有人 3 有会无人
// 老项目此处有字符串/数字比较 bug（有会时恒为 0），这里按语义修正
export function usePadHeartbeat(kind: PadHeartbeatKind) {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'pad') : '')

  const padObj = ref<PadIdentity | null>(null)

  let unsubs: Array<() => void> = []
  let timer: ReturnType<typeof setInterval> | null = null

  // --- meetingControl 状态输入 ---
  const meetingFlag = ref(0) // 0 无会 1 正在开会
  const personPresent = ref<number | null>(null) // 1 有人 0 无人 null 未知（保持上次）
  const sensorMap = new Map<string, SensorState>()

  const requestConfig = () => {
    if (!ctx.value || !isCompleteSpaceContext(ctx.value)) return
    mqtt.publish(topics.deviceConfigGet(), {
      spaceCode: ctx.value.spaceCode,
      floorAreaCode: ctx.value.floorAreaCode,
      floorCode: ctx.value.floorCode,
      areaCode: ctx.value.deviceCode,
    })
  }

  const recomputePerson = () => {
    let s: number | null = null
    for (const st of sensorMap.values()) {
      if (st.online !== 1 && st.online !== '1') continue
      if (st.status === 'busy') { s = 1; break }
      if (st.status === 'free') { s = 0 }
    }
    // 全部离线时保持上次值（对齐老项目 check_mroom_sensor_status）
    if (s !== null) personPresent.value = s
  }

  const toMs = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return NaN
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d.getTime()
  }

  const recomputeMeeting = (payload: unknown) => {
    if (!ctx.value || !Array.isArray(payload)) return
    let inProgress = 0
    const now = Date.now()
    const rooms = payload as Array<{ roomCode?: string; meetingList?: MeetingItem[] }>
    for (const room of rooms) {
      if (!room || room.roomCode !== ctx.value.deviceCode) continue
      for (const it of room.meetingList ?? []) {
        const start = it.startTime ? toMs(it.startTime) : NaN
        const end = it.endTime ? toMs(it.endTime) : NaN
        if (isNaN(start) || isNaN(end)) continue
        if (start <= now && now < end) { inProgress = 1; break }
      }
      break
    }
    meetingFlag.value = inProgress
  }

  const computePadStatus = (): number => {
    if (meetingFlag.value === 1) {
      return personPresent.value === 1 ? 1 : 3
    }
    return personPresent.value === 1 ? 2 : 0
  }

  const setup = () => {
    if (!ctx.value || !isCompleteSpaceContext(ctx.value) || !key.value) return
    deviceStore.acquire(key.value)
    if (!deviceStore.isAcquired(key.value)) return
    if (unsubs.length > 0) return

    const c = ctx.value

    // 1) 设备配置响应 → pad 身份（对齐老项目 devices.pad[0] 提取）
    const configTopic = topics.deviceConfigResponse(c)
    mqtt.subscribe(configTopic)
    unsubs.push(() => mqtt.unsubscribe(configTopic))
    unsubs.push(mqtt.onMessage(configTopic, (payload: unknown) => {
      const raw = payload as any
      const p = raw?.pad?.[0]
      if (p?.name && p?.code) {
        padObj.value = {
          name: p.name,
          code: p.code,
          gateway: p.gatewayMac ?? '',
          layer: p.layer ?? '',
          status: { online: 1, status: 'busy' },
        }
        setPadName(p.name)
      }
    }))

    if (kind === 'meetingControl') {
      // 2) 会议列表（后端推送）
      const meetingTopic = topics.meetingMroom(c)
      mqtt.subscribe(meetingTopic)
      unsubs.push(() => mqtt.unsubscribe(meetingTopic))
      unsubs.push(mqtt.onMessage(meetingTopic, (payload: unknown) => {
        recomputeMeeting(payload)
      }))

      // 3) 人体传感器（房间级）
      const sensorTopic = topics.humanSensorRoom(c)
      mqtt.subscribe(sensorTopic)
      unsubs.push(() => mqtt.unsubscribe(sensorTopic))
      unsubs.push(mqtt.onMessage(sensorTopic, (payload: unknown) => {
        if (!Array.isArray(payload)) return
        for (const s of payload as Array<{ code?: string; status?: SensorState }>) {
          if (s?.code && s?.status) sensorMap.set(s.code, s.status)
        }
        recomputePerson()
      }))
    }

    // 4) 心跳循环：身份未就绪时改为请求配置
    requestConfig()
    timer = setInterval(() => {
      if (!ctx.value || !isCompleteSpaceContext(ctx.value)) return
      if (!padObj.value) { requestConfig(); return }
      const pad = padObj.value
      if (kind === 'meetingControl') {
        pad.status.padStatus = computePadStatus()
      }
      mqtt.publish(topics.padHeartbeat(ctx.value, pad.name), [pad])
    }, HEARTBEAT_INTERVAL_MS)
  }

  setup()

  onScopeDispose(() => {
    if (timer) { clearInterval(timer); timer = null }
    for (const unsub of unsubs) unsub()
    unsubs.length = 0
    if (key.value) deviceStore.release(key.value)
  })

  return { padObj, meetingFlag, personPresent }
}
