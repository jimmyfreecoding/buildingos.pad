import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics, type SpaceContext } from '@/utils/mqtt'
import type { LightDevice, LightState } from '@/types/device'

function parseDeviceStatus(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw
}

export function useLightMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'light') : '')
  const lights = computed(() => deviceStore.getLights(key.value).value)

  let unsubs: Array<() => void> = []

  const setup = () => {
    console.log('[LightMqtt] setup() called, ctx:', ctx.value, 'key:', key.value)
    if (!ctx.value || !key.value) {
      console.log('[LightMqtt] setup() ABORTED: no ctx or key')
      return
    }
    deviceStore.acquire(key.value)
    if (!deviceStore.isAcquired(key.value)) {
      console.log('[LightMqtt] setup() ABORTED: isAcquired returned false')
      return
    }

    // Only set up once
    if (unsubs.length > 0) {
      console.log('[LightMqtt] setup() SKIPPED: already set up')
      return
    }

    const c = ctx.value
    console.log('[LightMqtt] Setting up with ctx:', JSON.stringify(c))

    // 1) Subscribe to real-time light status updates
    const statusTopic = topics.lightStatus(c)
    console.log('[LightMqtt] Subscribing to status topic:', statusTopic)
    mqtt.subscribe(statusTopic)
    unsubs.push(() => mqtt.unsubscribe(statusTopic))

    unsubs.push(mqtt.onMessage(statusTopic, (payload: unknown) => {
      const raw = payload as any
      // Handle [{code, status}] array format from original backend
      if (Array.isArray(raw)) {
        const current = lights.value
        let updated = [...current.devices]
        for (const item of raw) {
          if (item?.code) {
            const st = parseDeviceStatus(item.status)
            const idx = updated.findIndex((d) => d.id === item.code)
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], isOn: st.status === 'on' || st.status === 1 }
            } else {
              updated.push({ id: item.code, name: item.name || item.code, isOn: st.status === 'on' || st.status === 1, type: 'light' })
            }
          }
        }
        const allOn = updated.every((d) => d.isOn)
        deviceStore.applyLightState(key.value, { devices: updated, allOn })
      }
      // Handle {devices, allOn} format (new protocol)
      else if (raw?.devices) {
        deviceStore.applyLightState(key.value, { devices: raw.devices, allOn: raw.allOn })
      }
      // Handle {action: 'on'|'off', id} format
      else if (raw?.action === 'on' || raw?.action === 'off') {
        const isOn = raw.action === 'on'
        if (raw.id) {
          const current = lights.value
          const updated = current.devices.map((d) =>
            d.id === raw.id ? { ...d, isOn } : d
          )
          deviceStore.applyLightState(key.value, { devices: updated, allOn: updated.every((d) => d.isOn) })
        }
      }
      console.log('[LightMqtt] <<< status update:', raw)
    }))

    // 2) Request device config (original protocol)
    const configResponseTopic = topics.deviceConfigResponse(c)
    mqtt.subscribe(configResponseTopic)
    unsubs.push(() => mqtt.unsubscribe(configResponseTopic))

    console.log('[LightMqtt] Subscribing to config response topic:', configResponseTopic)
    unsubs.push(mqtt.onMessage(configResponseTopic, (payload: unknown) => {
      const raw = payload as any
      console.log('[LightMqtt] <<< device config response:', raw)
      if (raw?.devices?.light) {
        const lightDevices: LightDevice[] = raw.devices.light.map((d: any) => {
          const st = parseDeviceStatus(d.status)
          return {
            id: d.code || d.name,
            name: d.name,
            isOn: st.status === 'on' || st.status === 1,
            type: d.type || 'light',
          }
        })
        const allOn = lightDevices.every((d) => d.isOn)
        deviceStore.applyLightState(key.value, { devices: lightDevices, allOn })
      }
    }))

    // Publish device config request
    const configPayload = {
      spaceCode: c.spaceCode,
      floorAreaCode: c.floorAreaCode,
      floorCode: c.floorCode,
      areaCode: c.deviceCode,
    }
    console.log('[LightMqtt] Publishing device config request:', configPayload)
    mqtt.publish(topics.deviceConfigGet(), configPayload)

    // Also send getDevice as fallback
    mqtt.publish(topics.lightAction(c), { action: 'getDevice' })
  }

  setup()

  onScopeDispose(() => {
    for (const unsub of unsubs) unsub()
    unsubs.length = 0
    if (key.value) deviceStore.release(key.value)
  })

  const toggleLight = (id: string) => {
    const device = lights.value.devices.find((d) => d.id === id)
    if (!device || !ctx.value) return
    const action = device.isOn ? 'off' : 'on'
    mqtt.publish(topics.lightAction(ctx.value), { action, id })
  }

  const setAll = (on: boolean) => {
    if (!ctx.value) return
    mqtt.publish(topics.lightAction(ctx.value), { action: on ? 'on' : 'off', all: true })
  }

  const toggleAll = () => setAll(!lights.value.allOn)

  return {
    lights,
    ctx,
    toggleLight,
    setAll,
    toggleAll,
  }
}
