<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ensureMap, attachMap, detachMap, mapState } from '@/services/mapViewer'

// 2.5D 地图挂载包装：IntersectionObserver 感知可见性，
// 可见时 ensure+attach（单例复用），不可见时 detach（no-op，实例常驻）
const root = ref<HTMLElement | null>(null)
const host = ref<HTMLElement | null>(null)

let io: IntersectionObserver | null = null
let attaching = false

const onVisibleChange = async (visible: boolean) => {
  if (visible) {
    if (attaching || !host.value) return
    attaching = true
    try {
      await ensureMap(host.value)
      attachMap(host.value)
    } finally {
      attaching = false
    }
  } else {
    detachMap()
  }
}

onMounted(() => {
  if (!root.value) return
  io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => onVisibleChange(e.isIntersecting))
    },
    { threshold: 0.01 },
  )
  io.observe(root.value)
})

onBeforeUnmount(() => {
  io?.disconnect()
  io = null
  detachMap()
})
</script>

<template>
  <div ref="root" class="relative w-full h-full overflow-hidden">
    <!-- 常驻宿主：SDK canvas 挂载点（始终渲染，不可 v-if） -->
    <div ref="host" class="absolute inset-0"></div>

    <!-- loading -->
    <div v-if="mapState.status === 'loading'" class="absolute inset-0 z-10 flex items-center justify-center">
      <div class="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
    </div>
    <!-- image -->
    <img
      v-else-if="mapState.status === 'image' && mapState.imageUrl"
      :src="mapState.imageUrl"
      class="absolute inset-0 z-10 w-full h-full object-contain"
    />
    <!-- fallback：静态兜底（zeekr floor.jpg / default CSS 伪地图） -->
    <div v-else-if="mapState.status === 'fallback'" class="absolute inset-0 z-10">
      <slot />
    </div>
  </div>
</template>
