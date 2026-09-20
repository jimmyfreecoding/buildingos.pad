<script setup lang="ts">
// 橙色主题（bxbuildingmeetingpad）：装饰条橙 #F36604，会议状态块与进度条同色族
import MeetingPadScreen from '../shared/MeetingPadScreen.vue'

// 兜底背景只保留第一张（当前不轮播）；PadBg 仍是 el-carousel，
// 后端 padInfo.imgs 下发多张时依旧轮播 —— 轮播能力保留
const fallbackBgs = [
  new URL('./assets/images/bg1.png', import.meta.url).href,
]
const bgLineSrc = new URL('./assets/images/bg-icon.png', import.meta.url).href
</script>

<template>
  <MeetingPadScreen
    accent="#F36604"
    progress-fill="rgba(255, 215, 180, 0.6)"
    :fallback-bgs="fallbackBgs"
    :bg-line-src="bgLineSrc"
  />
</template>