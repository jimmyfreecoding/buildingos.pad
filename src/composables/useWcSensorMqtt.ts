import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import type { WcSensorData } from '@/types/device'

const WC_ROOMS = ['TMAN', 'TWOMAN', 'TMAN1', 'TWOMAN1', 'TMAN2', 'TWOMAN2']

export function useWcSensorMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'wcsensor') : '')
  const sensors = computed(() => deviceStore.getWcSensors(key.value).value)

  const unsubscribers: (() => void)[] = []

  const setup = () => {
    if (!ctx.value || !key.value) return
    deviceStore.acquire(key.value)
    if (deviceStore.isAcquired(key.value) && unsubscribers.length === 0) {
      const dataMap = new Map<string, WcSensorData>()

      for (const room of WC_ROOMS) {
        const topic = topics.wcSensor(ctx.value, room)
        mqtt.subscribe(topic)
        unsubscribers.push(() => mqtt.unsubscribe(topic))

        const off = mqtt.onMessage(topic, (payload) => {
          const msg = payload as Record<string, any>
          const sensor: WcSensorData = {
            room,
            occupied: msg?.occupied ?? msg?.count ?? 0,
            total: msg?.total ?? 1,
          }
          dataMap.set(room, sensor)
          deviceStore.applyWcSensor(key.value, Array.from(dataMap.values()))
        })
        if (off) unsubscribers.push(off)
      }
    }
  }

  setup()

  onScopeDispose(() => {
    for (const fn of unsubscribers) fn()
    unsubscribers.length = 0
    if (key.value) deviceStore.release(key.value)
  })

  return {
    sensors,
    ctx,
  }
}
