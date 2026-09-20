<template>
  <!-- 会议状态区（原项目 src/components/meeting.vue）：底色 / 进度条按主题色 -->
  <div :class="props.currentStatus" class="meeting-box" :style="blockStyle">
    <PadProgress
      v-if="startValue > 0 && meetingTime > 0"
      class="progress-box"
      :startValue="startValue"
      :endValue="100"
      :duration="meetingTime"
      :fillColor="progressFill"
    />
    <div v-if="isDown !== '1'" class="left">
      <div class="font72">
        {{ current.data === '' || current.data === undefined ? nowTime : current.data }}
      </div>
      <div style="margin-top: 8px" class="ziti">{{ current.txt }}</div>
    </div>
    <div v-if="isDown === '1'" class="left_2">专用会议室</div>

    <div class="line"></div>

    <div v-if="isDown !== '1'" class="right">
      <div class="font48">{{ current.status }}</div>
      <div v-if="props.currentStatus === 'in'" class="ziti">
        剩余：
        <PadCountDown :endTime="current.endTime ?? 0" endText="0" :mobj="current" :meetingTime="meetingTime" />
      </div>
      <div v-else style="margin-top: 8px">{{ current.desc }}</div>
    </div>
    <div v-if="isDown === '1'" class="right_2">全天使用</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PadProgress from './PadProgress.vue'
import PadCountDown from './PadCountDown.vue'

export interface MeetingStatusBlock {
  data?: string
  txt?: string
  status?: string
  desc?: string
  startTime?: number
  endTime?: number
}

const props = withDefaults(defineProps<{
  currentStatus?: string
  obj?: Record<string, MeetingStatusBlock>
  isDown?: string
  /** 主题主色（会议中状态底色） */
  accent?: string
  /** 主题进度条填充色 */
  progressFill?: string
}>(), { currentStatus: 'free', obj: () => ({}), isDown: '', accent: '#f36604', progressFill: 'rgba(255, 255, 255, 0.5)' })

const nowTime = ref('')
const meetingTime = ref(0)
const startValue = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const current = computed<MeetingStatusBlock>(() => props.obj[props.currentStatus] ?? {})

// 无会议（空闲 / 使用中）沿用老项目灰底；会议中 / 专用会议室用主题主色
const blockStyle = computed(() => ({
  background: props.currentStatus === 'in' ? props.accent : '#7f7f7f',
}))

const pad = (n: number) => String(n).padStart(2, '0')

const tick = () => {
  const d = new Date()
  nowTime.value = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  const nowSec = Math.floor(Date.now() / 1000)
  const cur = props.obj[props.currentStatus] ?? {}
  const startT = Number(cur.startTime) || 0
  const endT = Number(cur.endTime) || 0
  const remain = endT - nowSec
  meetingTime.value = remain > 0 ? remain : 0
  const cha = endT - startT
  const ratio = cha > 0 ? ((nowSec - startT) / cha) * 100 : 0
  startValue.value = Math.min(100, Math.max(0, ratio))
}

onMounted(() => { tick(); timer = setInterval(tick, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped lang="scss">
.meeting-box {
  width: 736px;
  height: 240px;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  .progress-box {
    position: absolute;
    top: 0;
    left: 0;
    width: 736px;
    height: 100%;
  }
  .line {
    width: 1px;
    height: 138px;
    background: #ffffff;
    opacity: 0.5;
    flex: none;
  }
  .font72 {
    font-size: 72px;
    font-family: 'ly-regular', serif !important;
    line-height: 1.05;
  }
  .font48 {
    font-size: 48px;
    font-family: 'DingTalk-JinBuTi', serif !important;
    line-height: 1.1;
  }
  .ziti {
    font-family: 'DingTalk-JinBuTi', serif !important;
  }
  .left {
    width: 425px;
    margin-left: 50px;
  }
  .left_2 {
    width: 425px;
    margin-left: 50px;
    color: #fff;
    font-size: 40px;
    font-family: 'DingTalk-JinBuTi', serif !important;
  }
  .right {
    flex: 1;
    margin-left: 50px;
  }
  .right_2 {
    flex: 1;
    margin-left: 50px;
    font-size: 40px;
    font-family: 'DingTalk-JinBuTi', serif !important;
  }
}
</style>
