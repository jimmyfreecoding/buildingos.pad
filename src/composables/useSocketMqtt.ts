import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import type { SocketState } from '@/types/device'

export function useSocketMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'socket') : '')
  const sockets = computed(() => deviceStore.getSockets(key.value).value)

  let unsubscribeTopic: (() => void) | null = null
  let unsubscribeHandler: (() => void) | null = null

  const setup = () => {
    if (!ctx.value || !key.value) return
    deviceStore.acquire(key.value)
    if (deviceStore.isAcquired(key.value) && !unsubscribeTopic) {
      const statusTopic = topics.socketStatus(ctx.value)
      mqtt.subscribe(statusTopic)
      unsubscribeTopic = () => mqtt.unsubscribe(statusTopic)

      unsubscribeHandler = mqtt.onMessage(statusTopic, (payload) => {
        const msg = payload as Record<string, any>
        if (Array.isArray(msg?.sockets)) {
          deviceStore.applySockets(key.value, msg.sockets)
        }
      })

      mqtt.publish(topics.socketAction(ctx.value), { action: 'getDevice' })
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

  const toggleSocket = (id: string) => {
    if (!ctx.value) return
    const socket = sockets.value.find((s) => s.id === id)
    if (socket) {
      mqtt.publish(topics.socketAction(ctx.value), { action: socket.active ? 'off' : 'on', id })
    }
  }

  return { sockets, ctx, toggleSocket }
}
