<template>
  <span :endTime="endTime" :endText="endText">
    <slot>{{ content }}</slot>
  </span>
</template>

<script setup lang="ts">
// 会议剩余时间倒计时（原项目 src/components/countDown.vue）
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  endTime?: string | number
  endText?: string
  meetingTime?: number
  mobj?: Record<string, any>
}>(), { endTime: '', endText: '0', meetingTime: 0, mobj: () => ({}) })

const content = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const pad = (n: number) => (n < 10 ? '0' + n : String(n))

const start = (timestamp: string | number) => {
  if (timer) { clearInterval(timer); timer = null }
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) { content.value = props.endText; return }

  const tick = () => {
    const t = ts * 1000 - Date.now()
    if (t > 0) {
      const day = Math.floor(t / 86400000)
      const hour = Math.floor((t / 3600000) % 24)
      const min = Math.floor((t / 60000) % 60)
      const sec = Math.floor((t / 1000) % 60)
      if (day > 0) content.value = `${day}天${pad(hour)}:${pad(min)}:${pad(sec)}`
      else if (hour > 0) content.value = `${pad(hour)}:${pad(min)}:${pad(sec)}`
      else content.value = `${pad(min)}:${pad(sec)}`
      return
    }
    // 本场结束：切到下一场（obj 状态由父组件按最新会议列表刷新）
    if (timer) { clearInterval(timer); timer = null }
    const next = Number(props.mobj?.endTime)
    if (Number.isFinite(next) && next * 1000 > Date.now() + 1000) {
      start(next)
    } else {
      content.value = props.endText
    }
  }

  tick()
  timer = setInterval(tick, 1000)
}

onMounted(() => start(props.endTime))
watch(() => props.endTime, (v) => start(v))
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
