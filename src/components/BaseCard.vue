<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  className: '',
})
</script>

<template>
  <div
    :class="cn(
      'relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl transition-all duration-300 hover:bg-white/10',
      props.className
    )"
  >
    <div v-if="title" class="mb-4 flex items-center justify-between">
      <h3 class="text-xl font-medium text-white/90 tracking-wide">{{ title }}</h3>
      <slot name="header-action" />
    </div>
    <slot />
  </div>
</template>
