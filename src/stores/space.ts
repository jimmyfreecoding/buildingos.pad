import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSpaceData } from '@/api/space'
import type { Space } from '@/types/space'
import type { SpaceContext } from '@/utils/mqttTopics'

export const useSpaceStore = defineStore('space', () => {
  const structure = ref<Space[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadStructure(): Promise<void> {
    if (structure.value.length > 0) return
    loading.value = true
    error.value = null
    try {
      structure.value = await getSpaceData()
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load structure'
      console.error('[SpaceStore] loadStructure failed:', e)
    } finally {
      loading.value = false
    }
  }

  const boundSpace = computed(() => {
    try {
      const raw = localStorage.getItem('initData')
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  })

  const hasBinding = computed(() => {
    return !!(boundSpace.value?.spaceName && boundSpace.value?.padType)
  })

  const spaceContext = computed<SpaceContext | null>(() => {
    const b = boundSpace.value
    if (!b?.code && !b?.spaceId) return null
    return {
      spaceCode: b.code || String(b.spaceId),
      floorAreaCode: b.floorAreaCode || '',
      floorCode: b.floorCode || '',
      deviceCode: b.roomCode || String(b.roomId || ''),
    }
  })

  function bindSpace(config: Record<string, unknown>): void {
    const raw = localStorage.getItem('initData')
    const existing = raw ? JSON.parse(raw) : {}
    const merged = { ...existing, ...config }
    localStorage.setItem('initData', JSON.stringify(merged))
  }

  function clearBinding(): void {
    localStorage.removeItem('initData')
  }

  return {
    structure,
    loading,
    error,
    boundSpace,
    hasBinding,
    spaceContext,
    loadStructure,
    bindSpace,
    clearBinding,
  }
})
