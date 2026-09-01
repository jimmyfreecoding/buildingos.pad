import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'
import { logClk } from '@/utils/logClk'
import type { LightDevice } from '@/types/device'

function parseDeviceStatus(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw
}

function isDeviceOn(device: LightDevice): boolean {
  return device.status?.status === 'on' || device.status?.status === 1
}

export function useLightMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'light') : '')
  const lights = computed(() => deviceStore.getLights(key.value).value)

  let unsubs: Array<() => void> = []
  let configTimer: ReturnType<typeof setInterval> | null = null
  let lastToggleTime = 0
  let lastToggleId = ''

  const requestConfig = () => {
    if (!ctx.value) return
    if (lights.value.devices.length > 0) {
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

    // 1) Subscribe to device config response (has Chinese names)
    const configResponseTopic = topics.deviceConfigResponse(c)
    mqtt.subscribe(configResponseTopic)
    unsubs.push(() => mqtt.unsubscribe(configResponseTopic))

    unsubs.push(mqtt.onMessage(configResponseTopic, (payload: unknown) => {
      const raw = payload as any
      // 空数组视为无效响应（通信异常/配置未就绪），不清空已有设备；仅非空才更新（含真实增删改）
      if (Array.isArray(raw?.light) && raw.light.length > 0) {
        const lightDevices: LightDevice[] = raw.light.map((d: any) => ({
          id: d.code || d.name,
          name: d.name,
          status: parseDeviceStatus(d.status),
          type: d.type || 'light',
        }))
        const allOn = lightDevices.every(isDeviceOn)
        deviceStore.applyLightState(key.value, { devices: lightDevices, allOn })
        if (configTimer) { clearInterval(configTimer); configTimer = null }
      }
    }))

    // 2) Subscribe to real-time light status updates
    const statusTopic = topics.lightStatus(c)
    mqtt.subscribe(statusTopic)
    unsubs.push(() => mqtt.unsubscribe(statusTopic))

    unsubs.push(mqtt.onMessage(statusTopic, (payload: unknown) => {
      const raw = payload as any
      if (Array.isArray(raw)) {
        const current = lights.value
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
        const allOn = updated.every(isDeviceOn)
        deviceStore.applyLightState(key.value, { devices: updated, allOn })
      }
    }))

    // 3) Start polling config request every 30s
    requestConfig()
    configTimer = setInterval(requestConfig, 30000)

    // 4) Request current status
    mqtt.publish(topics.lightAction(c), { action: 'getDevice' })
  }

  setup()

  onScopeDispose(() => {
    if (configTimer) { clearInterval(configTimer); configTimer = null }
    for (const unsub of unsubs) unsub()
    unsubs.length = 0
    if (key.value) deviceStore.release(key.value)
  })

  const toggleLight = (id: string) => {
    const now = Date.now()
    if (id === lastToggleId && now - lastToggleTime < 1000) {
      console.warn('[LightMqtt] toggleLight: ignored duplicate for', id)
      return
    }
    lastToggleTime = now
    lastToggleId = id

    const device = lights.value.devices.find((d) => d.id === id)
    if (!device) { console.warn('[LightMqtt] toggleLight: device not found for id:', id); return }
    if (!ctx.value) { console.warn('[LightMqtt] toggleLight: no ctx'); return }
    const action = isDeviceOn(device) ? 'off' : 'on'
    const topic = topics.lightAction(ctx.value) + '/' + device.name
    console.log('[LightMqtt] toggleLight:', device.name, '->', action, 'topic:', topic)
    mqtt.publish(topic, { action })
    if (isCompleteSpaceContext(ctx.value)) {
      const c = ctx.value!
      logClk({
        ctrl: '单控',
        deviceType: 'light',
        actionTopic: topic,
        actionData: JSON.stringify({ action }),
        spaceCode: c.spaceCode,
        floorCode: c.floorCode,
        floorAreaCode: c.floorAreaCode,
        areaCode: c.deviceCode,
      })
    }
    setTimeout(() => {
      if (ctx.value) mqtt.publish(topics.lightAction(ctx.value) + '/' + device.name, { action: 'status' })
    }, 500)
  }

  const setAll = (on: boolean) => {
    if (!ctx.value) { console.warn('[LightMqtt] setAll: no ctx'); return }
    const action = on ? 'on' : 'off'
    const names = lights.value.devices.map((d) => d.name).join(',')
    // 设备列表为空时不发整组指令，防止空 deviceName 段被平台按整楼/整区匹配
    if (!names) { console.warn('[LightMqtt] setAll: no devices — skip publish'); return }
    const topic = topics.lightAction(ctx.value) + '/' + names
    console.log('[LightMqtt] setAll:', action, 'topic:', topic)
    mqtt.publish(topic, { action })
    // 群控：整组指令只发 1 条日志，actionTopic 为实际群控主题（含逗号拼接的 names 段）
    if (isCompleteSpaceContext(ctx.value)) {
      const c = ctx.value!
      logClk({
        ctrl: '群控',
        deviceType: 'light',
        actionTopic: topic,
        actionData: JSON.stringify({ action }),
        spaceCode: c.spaceCode,
        floorCode: c.floorCode,
        floorAreaCode: c.floorAreaCode,
        areaCode: c.deviceCode,
      })
    }
    setTimeout(() => {
      if (ctx.value) mqtt.publish(topics.lightAction(ctx.value), { action: 'status' })
    }, 4000)
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
