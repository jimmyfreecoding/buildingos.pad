import { computed } from 'vue'
import { useSpaceStore } from '@/stores/space'
import {
  subscribe,
  unsubscribe,
  publish,
  onMessage,
  isConnected,
} from '@/utils/mqtt'

export function usePadContext() {
  const spaceStore = useSpaceStore()

  return {
    spaceContext: computed(() => spaceStore.spaceContext),

    mqtt: {
      subscribe,
      unsubscribe,
      publish,
      onMessage,
      isConnected,
    },
  }
}
