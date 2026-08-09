<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { getTemplate } from '@/templates/registry'

const route = useRoute()
const padType = computed(() => route.params.padType as string)

const templateId = computed(() => {
  try {
    const raw = localStorage.getItem('initData')
    return raw ? JSON.parse(raw).template || 'default' : 'default'
  } catch {
    return 'default'
  }
})

const component = computed(() => {
  const info = getTemplate(padType.value, templateId.value)
  if (!info) return null
  return defineAsyncComponent(info.component)
})
</script>

<template>
  <component v-if="component" :is="component" />
  <div v-else class="flex items-center justify-center h-screen bg-black text-white">
    <p class="text-lg">
      Template not found: {{ padType }} / {{ templateId }}
    </p>
  </div>
</template>
