<script setup lang="ts">
// 蓝色主题（buildingos_meetingpad）：装饰条蓝 #009CFF，会议状态块与进度条同色族
import MeetingPadScreen from '../shared/MeetingPadScreen.vue'

// 兜底背景只保留第一张（当前不轮播）；PadBg 仍是 el-carousel，
// 云端素材（display_json）下发多张时依旧轮播 —— 轮播能力保留
const fallbackBgs = [
  new URL('./assets/images/bg1.png', import.meta.url).href,
]
const bgLineSrc = new URL('./assets/images/bg-icon.png', import.meta.url).href
</script>

<template>
  <MeetingPadScreen
    accent="#009CFF"
    progress-fill="rgba(190, 235, 255, 0.6)"
    :fallback-bgs="fallbackBgs"
    :bg-line-src="bgLineSrc"
  />
</template>