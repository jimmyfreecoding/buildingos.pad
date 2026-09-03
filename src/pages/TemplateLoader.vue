<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { getTemplate } from '@/templates/registry'
import { usePadHeartbeat, type PadHeartbeatKind } from '@/composables/usePadHeartbeat'
import { usePadCommand } from '@/composables/usePadCommand'

const route = useRoute()
const padType = computed(() => route.params.padType as string)

function readInitData(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem('initData') || '{}')
  } catch {
    return {}
  }
}

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
const heartbeatKind = computed<PadHeartbeatKind | null>(() => {
  const base = HEARTBEAT_KINDS[padType.value] ?? null
  if (!base) return null
  // 仅会议室门牌（模板类型 DoorPad + 绑定 area 类型为会议室）走 meeting 逻辑计算 padStatus；
  // 其余类型（含 switchPad）一律普通心跳 {online:1, status:"busy"}
  if (base === 'doorPad' && readInitData().type === 'meetingRoom') return 'meetingControl'
  return base
})
if (heartbeatKind.value) {
  usePadHeartbeat(heartbeatKind.value)
}

// 云端下发 pad 指令（含 refresh），所有 pad 类型统一响应（bug：门牌在线状态下刷新失效）
usePadCommand()

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
