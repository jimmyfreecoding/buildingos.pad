import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'
import { logClk } from '@/utils/logClk'
import type { BlindDevice, BlindState } from '@/types/device'

function parseDeviceStatus(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw
}

function aggregate(devices: BlindDevice[]): Partial<BlindState> {
  if (devices.length === 0) return {}
  const positions = devices
    .map((d) => Number(d.status?.position))
    .filter((p) => !isNaN(p))
  const position = positions.length > 0
    ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)
    : 50
  return { position }
}

export function useBlindMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'blind') : '')
  const blind = computed(() => deviceStore.getBlind(key.value).value)

  let unsubs: Array<() => void> = []
  let configTimer: ReturnType<typeof setInterval> | null = null

  const requestConfig = () => {
    if (!ctx.value) return
    if (blind.value.devices.length > 0) {
      if (configTimer) { clearInterval(configTimer); configTimer = null }
      return
    }
    mqtt.publish(topics.deviceConfigGet(), {
      spaceCode: ctx.value.spaceCode,
      floorAreaCode: ctx.value.floorAreaCode,
      floorCode: ctx.value.floorCode,
      areaCode: ctx.value.deviceCode,
    })
  }

  const setup = () => {
    if (!ctx.value || !key.value) return
    deviceStore.acquire(key.value)
    if (!deviceStore.isAcquired(key.value)) return
    if (unsubs.length > 0) return

    const c = ctx.value

    // 1) Subscribe to device config response
    const configResponseTopic = topics.deviceConfigResponse(c)
    mqtt.subscribe(configResponseTopic)
    unsubs.push(() => mqtt.unsubscribe(configResponseTopic))

    unsubs.push(mqtt.onMessage(configResponseTopic, (payload: unknown) => {
      const raw = payload as any
      // 空数组视为无效响应（通信异常/配置未就绪），不清空已有设备；仅非空才更新（含真实增删改）
      if (Array.isArray(raw?.blind) && raw.blind.length > 0) {
        const devices: BlindDevice[] = raw.blind.map((d: any) => ({
          id: d.code || d.name,
          name: d.name,
          status: parseDeviceStatus(d.status),
        }))
        deviceStore.applyBlindState(key.value, { devices, ...aggregate(devices) })
        if (configTimer) { clearInterval(configTimer); configTimer = null }
      }
    }))

    // 2) Subscribe to real-time blind status
    const statusTopic = topics.blindStatus(c)
    mqtt.subscribe(statusTopic)
    unsubs.push(() => mqtt.unsubscribe(statusTopic))

    unsubs.push(mqtt.onMessage(statusTopic, (payload: unknown) => {
      const raw = payload as any
      if (Array.isArray(raw)) {
        const current = blind.value
        if (current.devices.length === 0) return
        let updated = [...current.devices]
        for (const item of raw) {
          if (item?.code) {
            const idx = updated.findIndex((d) => d.id === item.code)
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                status: { ...updated[idx].status, ...parseDeviceStatus(item.status) },
              }
            }
          }
        }
        deviceStore.applyBlindState(key.value, { devices: updated, ...aggregate(updated) })
      }
    }))

    // 3) Start polling config every 30s
    requestConfig()
    configTimer = setInterval(requestConfig, 30000)
  }

  setup()

  onScopeDispose(() => {
    if (configTimer) { clearInterval(configTimer); configTimer = null }
    for (const unsub of unsubs) unsub()
    unsubs.length = 0
    if (key.value) deviceStore.release(key.value)
  })

  const move = (direction: 'up' | 'down' | 'pause') => {
    if (!ctx.value) { console.warn('[BlindMqtt] move: no ctx'); return }
    const topic = topics.blindAction(ctx.value)
    console.log('[BlindMqtt] move:', direction, 'topic:', topic)
    mqtt.publish(topic, { action: direction })
    if (isCompleteSpaceContext(ctx.value)) {
      const c = ctx.value!
      logClk({
        ctrl: '单控',
        deviceType: 'blind',
        actionTopic: topic,
        actionData: JSON.stringify({ action: direction }),
        spaceCode: c.spaceCode,
        floorCode: c.floorCode,
        floorAreaCode: c.floorAreaCode,
        areaCode: c.deviceCode,
      })
    }
  }

  return { blind, ctx, move }
}
