<script setup lang="ts">
import { ChevronUp, ChevronDown } from 'lucide-vue-next'

interface Props {
  modelValue: number
  unit?: string
  step?: number
  min?: number
  max?: number
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  unit: '',
  step: 1,
  min: 16,
  max: 30,
  label: 'Temp'
})

const emit = defineEmits(['update:modelValue'])

const increase = () => {
  if (props.modelValue < props.max) {
    emit('update:modelValue', props.modelValue + props.step)
  }
}

const decrease = () => {
  if (props.modelValue > props.min) {
    emit('update:modelValue', props.modelValue - props.step)
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-between rounded-3xl bg-white/5 p-2 py-4 h-full min-h-[160px]">
    <button 
      @click="increase"
      class="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/70 transition-all hover:bg-white/20 active:scale-95 disabled:opacity-30"
      :disabled="modelValue >= max"
    >
      <ChevronUp class="h-6 w-6" />
    </button>

    <div class="flex flex-col items-center gap-1 my-4">
      <span class="text-4xl font-light text-white tracking-tighter">
        {{ modelValue }}<span class="text-xl text-white/50 ml-0.5">{{ unit }}</span>
      </span>
      <span class="text-xs font-medium text-white/40 uppercase tracking-widest">{{ label }}</span>
    </div>

    <button 
      @click="decrease"
      class="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/70 transition-all hover:bg-white/20 active:scale-95 disabled:opacity-30"
      :disabled="modelValue <= min"
    >
      <ChevronDown class="h-6 w-6" />
    </button>
  </div>
</template>
