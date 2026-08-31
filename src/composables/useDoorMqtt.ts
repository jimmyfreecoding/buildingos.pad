import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'
import { logClk } from '@/utils/logClk'
import type { DoorState } from '@/types/device'

export function useDoorMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'door') : '')
  const doors = computed(() => deviceStore.getDoors(key.value).value)

  let unsubscribeTopic: (() => void) | null = null
  let unsubscribeHandler: (() => void) | null = null

  const setup = () => {
    if (!ctx.value || !key.value) return
    deviceStore.acquire(key.value)
    if (deviceStore.isAcquired(key.value) && !unsubscribeTopic) {
      const statusTopic = topics.doorStatus(ctx.value)
      mqtt.subscribe(statusTopic)
      unsubscribeTopic = () => mqtt.unsubscribe(statusTopic)

      unsubscribeHandler = mqtt.onMessage(statusTopic, (payload) => {
        const msg = payload as Record<string, any>
        if (Array.isArray(msg?.doors)) {
          deviceStore.applyDoors(key.value, msg.doors)
        }
      })

      mqtt.publish(topics.doorAction(ctx.value), { action: 'getDevice' })
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

  const unlock = (id: string) => {
    if (!ctx.value) return
    const topic = topics.doorAction(ctx.value)
    const payload = { action: 'unlock', id }
    mqtt.publish(topic, payload)
    if (isCompleteSpaceContext(ctx.value)) {
      const c = ctx.value!
      logClk({
        ctrl: '单控',
        deviceType: 'door',
        actionTopic: topic,
        actionData: JSON.stringify(payload),
        spaceCode: c.spaceCode,
        floorCode: c.floorCode,
        floorAreaCode: c.floorAreaCode,
        areaCode: c.deviceCode,
      })
    }
  }

  return { doors, ctx, unlock }
}
