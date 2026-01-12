<script setup lang="ts">
interface Props {
  title: string
  status: string
  value: string
  unit?: string
  statusColor?: string
  progress?: number // 0-100
}

const props = withDefaults(defineProps<Props>(), {
  statusColor: 'text-green-400',
  progress: 20,
  unit: ''
})
</script>

<template>
  <div class="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-3">
        <div class="w-2.5 h-2.5 rounded-full bg-green-400"></div>
        <span class="text-white/90 text-xl font-medium">{{ title }}</span>
      </div>
      <span :class="statusColor" class="text-lg font-medium">{{ status }}</span>
    </div>

    <!-- Bottom -->
    <div class="flex flex-col gap-2 mt-2">
      <!-- Value -->
      <div class="text-white/80 text-xl whitespace-nowrap">
        {{ value }}<span class="text-base text-white/50 ml-1">{{ unit }}</span>
      </div>

      <!-- Progress Bar -->
      <div class="h-1.5 w-full bg-[#1e293b] rounded-full relative overflow-hidden">
         <!-- Gradient Track -->
         <div class="absolute inset-0 bg-gradient-to-r from-blue-500 via-white to-orange-500 opacity-20"></div>
         
         <!-- Indicator Dot -->
         <div 
          class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] border border-blue-500"
          :style="{ left: `${progress}%` }"
        ></div>
        
        <!-- Active Segment (optional styling to match UI) -->
        <div class="absolute inset-y-0 left-0 bg-blue-500/50 rounded-l-full" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
  </div>
</template>