import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import type { BlindState } from '@/types/device'

function parseDeviceStatus(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw
}

export function useBlindMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'blind') : '')
  const blind = computed(() => deviceStore.getBlind(key.value).value)

  let unsubs: Array<() => void> = []

  const setup = () => {
    console.log('[BlindMqtt] setup() called, ctx:', ctx.value, 'key:', key.value)
    if (!ctx.value || !key.value) {
      console.log('[BlindMqtt] setup() ABORTED: no ctx or key')
      return
    }
    deviceStore.acquire(key.value)
    if (!deviceStore.isAcquired(key.value)) {
      console.log('[BlindMqtt] setup() ABORTED: isAcquired returned false')
      return
    }
    if (unsubs.length > 0) {
      console.log('[BlindMqtt] setup() SKIPPED: already set up')
      return
    }

    const c = ctx.value
    console.log('[BlindMqtt] Setting up with ctx:', JSON.stringify(c))

    // 1) Subscribe to real-time blind status
    const statusTopic = topics.blindStatus(c)
    console.log('[BlindMqtt] Subscribing to status topic:', statusTopic)
    mqtt.subscribe(statusTopic)
    unsubs.push(() => mqtt.unsubscribe(statusTopic))

    unsubs.push(mqtt.onMessage(statusTopic, (payload: unknown) => {
      const raw = payload as any
      console.log('[BlindMqtt] <<< status:', raw)

      // Handle [{code, name, status}] array format (original backend)
      if (Array.isArray(raw) && raw.length > 0) {
        const st = parseDeviceStatus(raw[0].status)
        if (st.position !== undefined) {
          deviceStore.applyBlindState(key.value, { position: Number(st.position) })
        }
      }
      // Handle {position} direct format (new protocol)
      else if (raw && raw.position !== undefined) {
        deviceStore.applyBlindState(key.value, raw as Partial<BlindState>)
      }
    }))

    // 2) Request device config for blind devices
    const configResponseTopic = topics.deviceConfigResponse(c)
    mqtt.subscribe(configResponseTopic)
    unsubs.push(() => mqtt.unsubscribe(configResponseTopic))
    console.log('[BlindMqtt] Subscribing to config response topic:', configResponseTopic)
    unsubs.push(mqtt.onMessage(configResponseTopic, (payload: unknown) => {
      const raw = payload as any
      console.log('[BlindMqtt] <<< device config response:', raw)
      if (raw?.blind) {
        const blindList = raw.blind
        if (blindList.length > 0) {
          const st = parseDeviceStatus(blindList[0].status)
          if (st.position !== undefined) {
            deviceStore.applyBlindState(key.value, { position: Number(st.position) })
          }
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
    console.log('[BlindMqtt] Publishing device config request:', configPayload)
    mqtt.publish(topics.deviceConfigGet(), configPayload)
  }

  setup()

  onScopeDispose(() => {
    for (const unsub of unsubs) unsub()
    unsubs.length = 0
    if (key.value) deviceStore.release(key.value)
  })

  const move = (direction: 'up' | 'down' | 'stop') => {
    if (!ctx.value) return
    mqtt.publish(topics.blindAction(ctx.value), { action: direction })
  }

  return { blind, ctx, move }
}
