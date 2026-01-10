<script setup lang="ts">
import { computed } from 'vue'
import * as Icons from 'lucide-vue-next'

interface Props {
  title: string
  value: number | string
  unit?: string
  percentage?: number // 0-100
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'emerald' | 'amber' | 'rose' | 'blue'
}

const props = withDefaults(defineProps<Props>(), {
  unit: '',
  percentage: 0,
  trend: 'neutral',
  color: undefined
})

const IconComponent = computed(() => {
  return props.icon ? (Icons as any)[props.icon] || Icons.Activity : null
})

// Dynamic color based on percentage or prop
const colorClass = computed(() => {
  if (props.color) {
    const map: Record<string, string> = {
      emerald: 'bg-emerald-400',
      amber: 'bg-amber-400',
      rose: 'bg-rose-400',
      blue: 'bg-blue-400'
    }
    return map[props.color] || 'bg-emerald-400'
  }
  const p = props.percentage
  if (p < 40) return 'bg-emerald-400'
  if (p < 70) return 'bg-amber-400'
  return 'bg-rose-400'
})

const textClass = computed(() => {
    const p = props.percentage
    if (p < 40) return 'text-emerald-400'
    if (p < 70) return 'text-amber-400'
    return 'text-rose-400'
})
</script>

<template>
  <div class="flex flex-col gap-3 rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10">
    <div class="flex items-center justify-between text-white/50">
      <div class="flex items-center gap-2">
        <component :is="IconComponent" v-if="IconComponent" class="h-4 w-4" />
        <span class="text-sm font-medium">{{ title }}</span>
      </div>
      <div v-if="trend !== 'neutral'" class="text-xs">
         <!-- Trend indicator could go here -->
      </div>
    </div>

    <div class="flex items-baseline gap-1">
      <span class="text-2xl font-light text-white">{{ value }}</span>
      <span class="text-sm text-white/50">{{ unit }}</span>
    </div>

    <!-- Progress Bar -->
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :class="colorClass"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>
