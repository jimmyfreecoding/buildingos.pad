<script setup lang="ts">
import { computed } from 'vue'
import * as Icons from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  icon: string
  label: string
  subLabel?: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const IconComponent = computed(() => {
  return (Icons as any)[props.icon] || Icons.HelpCircle
})

const toggle = () => {
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    class="group flex w-full items-center justify-between rounded-2xl bg-white/5 p-4 transition-all hover:bg-white/10 active:scale-95"
    :class="{ '!bg-primary/20': modelValue }"
    @click="toggle"
  >
    <div class="flex items-center gap-4">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors"
        :class="{ 'bg-yellow-400/20 text-yellow-400': modelValue, 'text-white/60': !modelValue }"
      >
        <component :is="IconComponent" class="h-6 w-6" />
      </div>
      <div class="text-left">
        <div class="text-base font-medium text-white whitespace-pre-line leading-tight">{{ label }}</div>
        <div v-if="subLabel" class="text-xs text-white/50">{{ subLabel }}</div>
      </div>
    </div>
    
    <div
      class="h-6 w-11 rounded-full p-1 transition-colors duration-200"
      :class="modelValue ? 'bg-primary' : 'bg-white/20'"
    >
      <div
        class="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
        :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
      />
    </div>
  </button>
</template>
