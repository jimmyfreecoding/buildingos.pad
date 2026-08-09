import { computed, onScopeDispose } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import type { FreshAirState, FreshAirMode } from '@/types/device'

export function useFreshAirMqtt() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const key = computed(() => ctx.value ? deviceStore.makeKey(ctx.value, 'freshair') : '')
  const freshAir = computed(() => deviceStore.getFreshAir(key.value).value)

  let unsubscribeTopic: (() => void) | null = null
  let unsubscribeHandler: (() => void) | null = null

  const setup = () => {
    if (!ctx.value || !key.value) return
    deviceStore.acquire(key.value)
    if (deviceStore.isAcquired(key.value) && !unsubscribeTopic) {
      const statusTopic = topics.freshAirStatus(ctx.value)
      mqtt.subscribe(statusTopic)
      unsubscribeTopic = () => mqtt.unsubscribe(statusTopic)

      unsubscribeHandler = mqtt.onMessage(statusTopic, (payload) => {
        const msg = payload as Record<string, any>
        if (msg && (msg.power !== undefined || msg.mode !== undefined)) {
          deviceStore.applyFreshAirState(key.value, msg as Partial<FreshAirState>)
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

  const togglePower = () => {
    if (!ctx.value) return
    mqtt.publish(topics.freshAirAction(ctx.value), { action: 'power', value: !freshAir.value.power })
  }

  const setMode = (mode: FreshAirMode) => {
    if (!ctx.value) return
    mqtt.publish(topics.freshAirAction(ctx.value), { action: 'setMode', value: mode })
  }

  return { freshAir, ctx, togglePower, setMode }
}
