<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as Icons from 'lucide-vue-next'

interface Props {
  modelValue: number
  icon?: string
  label?: string
  min?: number
  max?: number
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  icon: 'Sun',
  label: 'Brightness'
})

const emit = defineEmits(['update:modelValue'])

const sliderRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

const percentage = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100
})

const IconComponent = computed(() => {
  return (Icons as any)[props.icon] || Icons.Sun
})

const updateValue = (e: MouseEvent | TouchEvent) => {
  if (!sliderRef.value) return
  
  const rect = sliderRef.value.getBoundingClientRect()
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  // Calculate height from bottom
  const height = rect.bottom - clientY
  let percent = (height / rect.height) * 100
  
  // Clamp
  percent = Math.max(0, Math.min(100, percent))
  
  const newValue = Math.round((percent / 100) * (props.max - props.min) + props.min)
  emit('update:modelValue', newValue)
}

const startDrag = (e: MouseEvent | TouchEvent) => {
  isDragging.value = true
  updateValue(e)
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', handleMove)
  document.addEventListener('touchend', stopDrag)
}

const handleMove = (e: MouseEvent | TouchEvent) => {
  if (isDragging.value) {
    updateValue(e)
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', handleMove)
  document.removeEventListener('touchend', stopDrag)
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 h-full">
    <div 
      ref="sliderRef"
      class="relative w-16 flex-1 rounded-2xl bg-white/10 overflow-hidden cursor-pointer touch-none group"
      @mousedown="startDrag"
      @touchstart.prevent="startDrag"
    >
      <!-- Background Track -->
      <div class="absolute inset-0 bg-white/5" />
      
      <!-- Fill -->
      <div 
        class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-500/80 to-amber-300 transition-all duration-75 ease-out group-hover:from-amber-500 group-hover:to-amber-200"
        :style="{ height: `${percentage}%` }"
      >
        <!-- Glow effect -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-white/50 blur-[2px]" />
      </div>

      <!-- Icon/Label inside slider (optional design choice) -->
      <div class="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center text-white pointer-events-none mix-blend-overlay">
        <component :is="IconComponent" class="w-6 h-6 mb-1" />
        <span class="text-xs font-bold">{{ Math.round(percentage) }}%</span>
      </div>
    </div>
    
    <div class="text-center" v-if="label">
      <div class="text-sm font-medium text-white/80">{{ label }}</div>
    </div>
  </div>
</template>
