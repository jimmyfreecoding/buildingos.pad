import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import type { AirSensorData } from '@/types/device'

function normalizeAirData(raw: Record<string, any>): Record<string, any> {
  // MQTT backend uses "temperature", AirSensorData expects "temp"
  if (raw.temperature !== undefined && raw.temp === undefined) {
    raw.temp = Number(raw.temperature)
  }
  return raw
}

function extractAirData(payload: unknown): Record<string, any> | null {
  if (!payload) return null
  if (Array.isArray(payload)) {
    return normalizeAirData(payload[0]?.status || {})
  }
  if (typeof payload === 'object') {
    return normalizeAirData(payload as Record<string, any>)
  }
  return null
}

export function useAirSensorMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'airsensor') : '')
  const airQuality = computed(() => deviceStore.getAirSensor(key.value).value)

  let unsubscribeTopic: (() => void) | null = null
  let unsubscribeHandler: (() => void) | null = null

  const setup = () => {
    if (!ctx.value || !key.value) return
    deviceStore.acquire(key.value)
    if (deviceStore.isAcquired(key.value) && !unsubscribeTopic) {
      // Only subscribe to areaairsensor (matching original project).
      // The airsensor topic delivers per-device data that differs from
      // the area-level aggregated data the original backend publishes.
      const areaTopic = topics.areaAirSensor(ctx.value)

      mqtt.subscribe(areaTopic)

      unsubscribeTopic = () => {
        mqtt.unsubscribe(areaTopic)
      }

      unsubscribeHandler = mqtt.onMessage(areaTopic, (payload: unknown) => {
        const data = extractAirData(payload)
        if (data && (data.temp !== undefined || data.humidity !== undefined)) {
          deviceStore.applyAirSensor(key.value, data as Partial<AirSensorData>)
        }
      })
    }
  }

  setup()

  onScopeDispose(() => {
    unsubscribeTopic?.()
    unsubscribeHandler?.()
    unsubscribeTopic = null
    unsubscribeHandler = null
    if (key.value) deviceStore.release(key.value)
  })

  return {
    airQuality,
    ctx,
  }
}
