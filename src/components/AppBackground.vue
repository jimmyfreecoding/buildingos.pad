<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'image' | 'video'
  src: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'image',
})

const isVideo = computed(() => props.type === 'video')
</script>

<template>
  <div class="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none">
    <transition name="fade" mode="out-in">
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
    </transition>
    <!-- Overlay for better text readability if needed -->
    <div class="absolute inset-0 bg-black/20" />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
