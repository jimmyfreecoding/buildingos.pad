<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'image' | 'video'
  src: string
  overlayOpacity?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'image',
  overlayOpacity: 0.4,
})

const isVideo = computed(() => props.type === 'video')
</script>

<template>
  <div class="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none">
    <video
      v-if="isVideo"
      :src="props.src"
      autoplay
      loop
      muted
      playsinline
      class="absolute inset-0 w-full h-full object-cover"
    />
    <img
      v-else
      :src="props.src"
      alt="Background"
      class="absolute inset-0 w-full h-full object-cover"
    />
    <!-- Overlay for better text readability if needed -->
    <div 
      class="absolute inset-0 bg-black" 
      :style="{ opacity: props.overlayOpacity }" 
    />
  </div>
</template>

<style scoped>
</style>
