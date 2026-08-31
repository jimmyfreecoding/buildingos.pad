<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { getTemplate } from '@/templates/registry'
import { usePadHeartbeat, type PadHeartbeatKind } from '@/composables/usePadHeartbeat'

const route = useRoute()
const padType = computed(() => route.params.padType as string)

// 所有 pad 类型统一心跳（见 devDocs/pad心跳-调研文档.md）
// 仅 meetingControl 计算 padStatus，其余类型恒为 {online:1, status:"busy"}
const HEARTBEAT_KINDS: Record<string, PadHeartbeatKind> = {
  wallPad: 'wallPad',
  tolitePad: 'tolitePad',
  roomControl: 'roomControl',
  doorPad: 'doorPad',
  twins: 'twins',
  switchPad: 'switchPad',
  meetingControl: 'meetingControl',
}
const heartbeatKind = computed<PadHeartbeatKind | null>(() => HEARTBEAT_KINDS[padType.value] ?? null)
if (heartbeatKind.value) {
  usePadHeartbeat(heartbeatKind.value)
}

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
