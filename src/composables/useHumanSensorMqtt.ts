import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import type { HumanSensorData } from '@/types/device'

export function useHumanSensorMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'humansensor') : '')
  const sensors = computed(() => deviceStore.getHumanSensors(key.value).value)

  const unsubscribers: (() => void)[] = []

  const setup = () => {
    if (!ctx.value || !key.value) return
    deviceStore.acquire(key.value)
    if (deviceStore.isAcquired(key.value) && unsubscribers.length === 0) {
      const dataMap = new Map<string, HumanSensorData>()

      const topic = topics.humanSensorStatus(ctx.value)
      mqtt.subscribe(topic)
      unsubscribers.push(() => mqtt.unsubscribe(topic))

      const off = mqtt.onMessage(topic, (payload, msgTopic) => {
        const mcode = msgTopic.split('/')[7]
        if (!mcode) return

        const items = Array.isArray(payload) ? payload : [payload]
        const online: number[] = []
        const status: string[] = []
        for (const item of items) {
          const st = (item as Record<string, any>)?.status
          if (st?.online !== undefined) online.push(st.online)
          if (st?.online && st?.status) status.push(st.status)
        }
        dataMap.set(mcode, { room: mcode, online, status })
        deviceStore.applyHumanSensors(key.value, Array.from(dataMap.values()))
      })
      if (off) unsubscribers.push(off)
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
