import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import type { AcDevice, AcState, AcMode, FanSpeed } from '@/types/device'

function parseDeviceStatus(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw
}

const MODE_MAP: Record<number, AcMode> = { 1: 'auto', 2: 'vent', 3: 'cool', 4: 'heat', 5: 'vent' as AcMode }
const FAN_MAP: Record<number, FanSpeed> = { 15: 'low', 45: 'mid', 75: 'high' }

function isDeviceOn(d: AcDevice): boolean {
  return d.status?.status === 'on' || d.status?.status === true || d.status?.status === 1
}

function aggregate(devices: AcDevice[]): Partial<AcState> {
  if (devices.length === 0) return {}
  const online = devices.filter((d) => {
    const o = d.status?.online
    return o !== 0 && o !== '0' && o !== false && o !== undefined
  })
  const pool = online.length > 0 ? online : devices

  const power = pool.some(isDeviceOn)

  const temps = pool
    .map((d) => Number(d.status?.pretemperature ?? d.status?.temperature))
    .filter((t) => !isNaN(t))
  const temp = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : 24

  const currentTemps = pool
    .map((d) => Number(d.status?.temperature))
    .filter((t) => !isNaN(t))
  const currentTemp = currentTemps.length > 0
    ? Math.round(currentTemps.reduce((a, b) => a + b, 0) / currentTemps.length)
    : undefined

  const modes = pool.map((d) => MODE_MAP[Number(d.status?.mode)]).filter(Boolean) as AcMode[]
  const modeCounts: Record<string, number> = {}
  modes.forEach((m) => { modeCounts[m] = (modeCounts[m] || 0) + 1 })
  const mode = (Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as AcMode) || 'cool'

  const speeds = pool.map((d) => FAN_MAP[Number(d.status?.fan)]).filter(Boolean) as FanSpeed[]
  const speedCounts: Record<string, number> = {}
  speeds.forEach((s) => { speedCounts[s] = (speedCounts[s] || 0) + 1 })
  const speed = (Object.entries(speedCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as FanSpeed) || 'mid'

  return { power, temp, mode, speed, currentTemp }
}

export function useAcMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'ac') : '')
  const ac = computed(() => deviceStore.getAc(key.value).value)

  let unsubs: Array<() => void> = []
  let configTimer: ReturnType<typeof setInterval> | null = null

  const requestConfig = () => {
    if (!ctx.value) return
    if (ac.value.devices.length > 0) {
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
      if (raw?.airconditioning && Array.isArray(raw.airconditioning)) {
        const devices: AcDevice[] = raw.airconditioning.map((d: any) => ({
          id: d.code || d.name,
          name: d.name,
          status: parseDeviceStatus(d.status),
        }))
        deviceStore.applyAcState(key.value, { devices, ...aggregate(devices) })
        if (configTimer) { clearInterval(configTimer); configTimer = null }
      }
    }))

    // 2) Subscribe to real-time AC status
    const statusTopic = topics.acStatus(c)
    mqtt.subscribe(statusTopic)
    unsubs.push(() => mqtt.unsubscribe(statusTopic))

    unsubs.push(mqtt.onMessage(statusTopic, (payload: unknown) => {
      const raw = payload as any
      if (Array.isArray(raw)) {
        const current = ac.value
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
        deviceStore.applyAcState(key.value, { devices: updated, ...aggregate(updated) })
      }
    }))

    // 3) Start polling config every 30s
    requestConfig()
    configTimer = setInterval(requestConfig, 30000)

    // 4) Request current status
    mqtt.publish(topics.acAction(c), { action: 'status' })
  }

  setup()

  onScopeDispose(() => {
    if (configTimer) { clearInterval(configTimer); configTimer = null }
    for (const unsub of unsubs) unsub()
    unsubs.length = 0
    if (key.value) deviceStore.release(key.value)
  })

  const togglePower = () => {
    if (!ctx.value) { console.warn('[AcMqtt] togglePower: no ctx'); return }
    const action = ac.value.power ? 'off' : 'on'
    const topic = topics.acAction(ctx.value)
    console.log('[AcMqtt] togglePower:', action, 'topic:', topic)
    mqtt.publish(topic, { action })
  }

  const setTemp = (delta: number) => {
    if (!ctx.value) { console.warn('[AcMqtt] setTemp: no ctx'); return }
    const newTemp = ac.value.temp + delta
    const topic = topics.acAction(ctx.value)
    console.log('[AcMqtt] setTemp:', delta, '→', newTemp, 'topic:', topic)
    mqtt.publish(topic, { action: 'setTemp', value: newTemp })
  }

  const setMode = (mode: AcMode) => {
    if (!ctx.value) { console.warn('[AcMqtt] setMode: no ctx'); return }
    const topic = topics.acAction(ctx.value)
    console.log('[AcMqtt] setMode:', mode, 'topic:', topic)
    mqtt.publish(topic, { action: 'setMode', value: mode })
  }

  const setSpeed = (speed: FanSpeed) => {
    if (!ctx.value) { console.warn('[AcMqtt] setSpeed: no ctx'); return }
    const topic = topics.acAction(ctx.value)
    console.log('[AcMqtt] setSpeed:', speed, 'topic:', topic)
    mqtt.publish(topic, { action: 'setSpeed', value: speed })
  }

  const toggleDevicePower = (deviceId: string) => {
    if (!ctx.value) { console.warn('[AcMqtt] toggleDevicePower: no ctx'); return }
    const device = ac.value.devices.find((d) => d.id === deviceId)
    if (!device) { console.warn('[AcMqtt] toggleDevicePower: device not found:', deviceId); return }
    const on = isDeviceOn(device)
    const topic = topics.acAction(ctx.value) + '/' + device.name
    if (on) {
      console.log('[AcMqtt] toggleDevicePower:', device.name, '-> off', 'topic:', topic)
      mqtt.publish(topic, { action: 'off' })
    } else {
      publishOn(device, {})
    }
  }

  const MODE_REV: Record<string, number> = { auto: 1, vent: 2, cool: 3, heat: 4 }
  const FAN_REV: Record<string, number> = { low: 15, mid: 45, high: 75 }

  const readDeviceNums = (device: AcDevice) => ({
    temp: Number(device.status?.pretemperature ?? device.status?.temperature) || 16,
    mode: Number(device.status?.mode) || 3,
    fan: Number(device.status?.fan) || 45,
  })

  const publishOn = (device: AcDevice, overrides: { temp?: number; mode?: number; fan?: number }) => {
    if (!ctx.value) return
    const nums = readDeviceNums(device)
    const topic = topics.acAction(ctx.value) + '/' + device.name
    const payload = { action: 'on', temperature: overrides.temp ?? nums.temp, mode: overrides.mode ?? nums.mode, fan: overrides.fan ?? nums.fan }
    console.log('[AcMqtt] publishOn:', device.name, 'topic:', topic, 'payload:', JSON.stringify(payload))
    mqtt.publish(topic, payload)
  }

  const setDeviceTemp = (deviceId: string, temp: number) => {
    const device = ac.value.devices.find((d) => d.id === deviceId)
    if (!device) { console.warn('[AcMqtt] setDeviceTemp: device not found:', deviceId); return }
    if (!isDeviceOn(device)) return
    publishOn(device, { temp })
  }

  const setDeviceMode = (deviceId: string, mode: AcMode) => {
    const device = ac.value.devices.find((d) => d.id === deviceId)
    if (!device) { console.warn('[AcMqtt] setDeviceMode: device not found:', deviceId); return }
    if (!isDeviceOn(device)) return
    publishOn(device, { mode: MODE_REV[mode] || 3 })
  }

  const setDeviceSpeed = (deviceId: string, speed: FanSpeed) => {
    const device = ac.value.devices.find((d) => d.id === deviceId)
    if (!device) { console.warn('[AcMqtt] setDeviceSpeed: device not found:', deviceId); return }
    if (!isDeviceOn(device)) return
    publishOn(device, { fan: FAN_REV[speed] || 45 })
  }

  return {
    ac,
    ctx,
    togglePower,
    setTemp,
    setMode,
    setSpeed,
    toggleDevicePower,
    setDeviceTemp,
    setDeviceMode,
    setDeviceSpeed,
  }
}
