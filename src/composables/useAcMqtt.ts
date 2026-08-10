import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import type { AcState, AcMode, FanSpeed } from '@/types/device'

function parseDeviceStatus(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw
}

// Map original numeric mode/fan to new string enums
const MODE_MAP: Record<number, AcMode> = { 1: 'auto', 2: 'vent', 3: 'cool', 4: 'heat', 5: 'vent' as AcMode }
const FAN_MAP: Record<number, FanSpeed> = { 15: 'low', 45: 'mid', 75: 'high' }

export function useAcMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'ac') : '')
  const ac = computed(() => deviceStore.getAc(key.value).value)

  let unsubs: Array<() => void> = []

  const setup = () => {
    console.log('[AcMqtt] setup() called, ctx:', ctx.value, 'key:', key.value)
    if (!ctx.value || !key.value) {
      console.log('[AcMqtt] setup() ABORTED: no ctx or key')
      return
    }
    deviceStore.acquire(key.value)
    if (!deviceStore.isAcquired(key.value)) {
      console.log('[AcMqtt] setup() ABORTED: isAcquired returned false')
      return
    }
    if (unsubs.length > 0) {
      console.log('[AcMqtt] setup() SKIPPED: already set up')
      return
    }

    const c = ctx.value
    console.log('[AcMqtt] Setting up with ctx:', JSON.stringify(c))

    // 1) Subscribe to real-time AC status
    const statusTopic = topics.acStatus(c)
    console.log('[AcMqtt] Subscribing to status topic:', statusTopic)
    mqtt.subscribe(statusTopic)
    unsubs.push(() => mqtt.unsubscribe(statusTopic))

    unsubs.push(mqtt.onMessage(statusTopic, (payload: unknown) => {
      const raw = payload as any
      console.log('[AcMqtt] <<< status:', raw)

      // Handle [{code, name, status}] array format (original backend)
      if (Array.isArray(raw) && raw.length > 0) {
        const st = parseDeviceStatus(raw[0].status)
        const mode = MODE_MAP[st.mode] || 'cool'
        const speed = FAN_MAP[st.fan] || 'mid'
        deviceStore.applyAcState(key.value, {
          power: st.status === 'on' || st.status === true,
          temp: st.pretemperature ?? st.temperature ?? 24,
          mode,
          speed,
          currentTemp: st.temperature ?? st.pretemperature ?? undefined,
        })
      }
      // Handle {power, temp, mode, speed} direct format (new protocol)
      else if (raw && (raw.power !== undefined || raw.temp !== undefined)) {
        deviceStore.applyAcState(key.value, raw as Partial<AcState>)
      }
    }))

    // 2) Request device config for AC devices
    const configResponseTopic = topics.deviceConfigResponse(c)
    mqtt.subscribe(configResponseTopic)
    unsubs.push(() => mqtt.unsubscribe(configResponseTopic))
    console.log('[AcMqtt] Subscribing to config response topic:', configResponseTopic)
    unsubs.push(mqtt.onMessage(configResponseTopic, (payload: unknown) => {
      const raw = payload as any
      console.log('[AcMqtt] <<< device config response:', raw)
      if (raw?.airconditioning) {
        const acList = raw.airconditioning
        if (acList.length > 0) {
          const st = parseDeviceStatus(acList[0].status)
          const mode = MODE_MAP[st.mode] || 'cool'
          const speed = FAN_MAP[st.fan] || 'mid'
          deviceStore.applyAcState(key.value, {
            power: st.status === 'on' || st.status === true,
            temp: st.pretemperature ?? 24,
            mode,
            speed,
            currentTemp: st.temperature ?? undefined,
          })
        }
      }
    }))

    // Publish device config request
    const configPayload = {
      spaceCode: c.spaceCode,
      floorAreaCode: c.floorAreaCode,
      floorCode: c.floorCode,
      areaCode: c.deviceCode,
    }
    console.log('[AcMqtt] Publishing device config request:', configPayload)
    mqtt.publish(topics.deviceConfigGet(), configPayload)

    // Also fallback status query
    mqtt.publish(topics.acAction(c), { action: 'status' })
  }

  setup()

  onScopeDispose(() => {
    for (const unsub of unsubs) unsub()
    unsubs.length = 0
    if (key.value) deviceStore.release(key.value)
  })

  const togglePower = () => {
    if (!ctx.value) return
    mqtt.publish(topics.acAction(ctx.value), { action: 'power', value: !ac.value.power })
  }

  const setTemp = (delta: number) => {
    if (!ctx.value) return
    const newTemp = ac.value.temp + delta
    mqtt.publish(topics.acAction(ctx.value), { action: 'setTemp', value: newTemp })
  }

  const setMode = (mode: AcMode) => {
    if (!ctx.value) return
    mqtt.publish(topics.acAction(ctx.value), { action: 'setMode', value: mode })
  }

  const setSpeed = (speed: FanSpeed) => {
    if (!ctx.value) return
    mqtt.publish(topics.acAction(ctx.value), { action: 'setSpeed', value: speed })
  }

  return {
    ac,
    ctx,
    togglePower,
    setTemp,
    setMode,
    setSpeed,
  }
}
