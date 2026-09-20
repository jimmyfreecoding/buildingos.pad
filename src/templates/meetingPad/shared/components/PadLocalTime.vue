<template>
  <!-- 右上角时钟（原项目 src/components/localTime.vue）：三击刷新整页 -->
  <div class="pad-localtime" @click="emit('click')">
    <span class="date">{{ dateStr }}</span>
    <span class="ziti week">{{ weekStr }}</span>
    <span class="time">{{ timeStr }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const emit = defineEmits<{ (e: 'click'): void }>()

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null

const pad = (n: number) => String(n).padStart(2, '0')
const weekArr = ['日', '一', '二', '三', '四', '五', '六']

const dateStr = computed(() => {
  const d = now.value
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})
const weekStr = computed(() => '周' + weekArr[now.value.getDay()])
const timeStr = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped lang="scss">
.pad-localtime {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  font-size: 24px;
  .date {
    z-index: 2001;
  }
  .week {
    margin: 0 6px;
  }
  .ziti {
    font-family: 'DingTalk-JinBuTi', 'LynkoType-Regular', serif !important;
  }
}
</style>
