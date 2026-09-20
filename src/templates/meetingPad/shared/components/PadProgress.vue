<template>
  <div class="lines">
    <Transition>
      <div class="proportion" :style="{ width: percent + '%', background: fillColor }"></div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
// 会议进行进度条（原项目 src/components/progress.vue；填充色改为主题色族）
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  startValue?: number
  endValue?: number
  duration?: number
  /** 进度填充色（蓝 / 橙主题） */
  fillColor?: string
}>(), { startValue: 0, endValue: 100, duration: 1, fillColor: 'rgba(255, 255, 255, 0.5)' })

const percent = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  percent.value = props.startValue >= props.endValue ? props.endValue : props.startValue
  let progress = props.startValue
  const endValue = props.endValue
  if (progress >= endValue) { percent.value = endValue; return }
  const time = (props.duration * 1000) / (endValue - progress)
  if (!Number.isFinite(time) || time <= 0) return
  timer = setInterval(() => {
    progress += 1 / 100
    if (progress >= endValue) {
      progress = endValue
      if (timer) { clearInterval(timer); timer = null }
    }
    percent.value = progress
  }, time / 100)
})

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style lang="scss" scoped>
.lines {
  width: 100%;
  height: 100%;
  position: relative;
  .proportion {
    height: 100%;
    position: absolute;
    opacity: 0.6;
  }
}
</style>
