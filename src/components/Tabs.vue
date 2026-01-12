<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string | number
  options: { label: string; value: string | number }[]
}>()

const emit = defineEmits(['update:modelValue'])

const activeValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <div class="inline-flex bg-gray-100 rounded-full p-1">
    <button
      v-for="option in options"
      :key="option.value"
      class="px-8 py-2 rounded-full text-sm font-medium transition-all"
      :class="activeValue === option.value ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'"
      @click="activeValue = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>