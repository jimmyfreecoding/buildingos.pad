<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="twin-card relative w-full bg-black/40 backdrop-blur-sm border border-[#2b4c7c]/50">
    <!-- Header -->
    <div class="h-10 flex items-center px-4 bg-gradient-to-r from-[#1a2f4d] to-transparent border-b border-[#2b4c7c]/50 relative overflow-hidden">
      <!-- Decorator Icon -->
      <div class="w-1 h-4 bg-[#00f0ff] mr-2 shadow-[0_0_8px_#00f0ff]"></div>
      
      <!-- Title -->
      <h3 class="text-white font-medium tracking-wider text-lg italic flex-1">{{ title }}</h3>
      
      <!-- Top Right Corner Decoration -->
      <div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00f0ff]"></div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <slot></slot>
    </div>

    <!-- Corner Decorations -->
    <div class="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#2b4c7c]"></div>
    <div class="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#2b4c7c]"></div>
  </div>
</template>

<style scoped>
.twin-card {
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
}
</style>
