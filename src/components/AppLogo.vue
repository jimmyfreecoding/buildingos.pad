<script setup lang="ts">
// Define Emits for optional click handling
const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <div 
    class="flex items-center gap-3 cursor-pointer select-none active:scale-95 transition-transform"
    @click="emit('click')"
  >
    <div class="w-10 h-10 flex items-center justify-center rounded-sm overflow-hidden">
      <img src="/images/logo.png" class="w-full h-full object-cover" />
    </div>
    <span class="text-2xl font-medium tracking-widest">Buildingos</span>
  </div>
</template>