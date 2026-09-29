<template>
  <!--
    会议室门牌屏幕（竖屏 800x1280）——两套主题共用本体，颜色 / 装饰条 / 兜底背景由主题组件注入。
    原项目：C:\\cnb\\bxbuildingmeetingpad（橙）与 buildingos_meetingpad（蓝）
    标准动作：
      - 左上角 logo 三击 → /init 系统管理密码页
      - 右上角时钟三击 → 整页刷新
      - pad 心跳 / 接受刷新指令 → TemplateLoader 的 usePadHeartbeat + usePadCommand
  -->
  <VScaleScreen width="800" height="1280" :auto-scale="true">
    <div class="main-box" :style="'width:' + DW + 'px;height:' + DH + 'px'">
      <PadBg
        :dw="DW"
        :dh="DH"
        :imgs="bgImgs"
        :fallback-imgs="fallbackBgs"
        style="position: absolute; left: 0; top: 0; z-index: 1"
      />
      <div
        class="bg-shdow"
        :style="'position:absolute;left:-1px;top:0;z-index:2;width:' + DW + 'px;height:' + DH + 'px'"
      ></div>

      <div class="header" style="z-index: 10">
        <PadLogo :src="publishedLogoUrl" @click="onLogoClick" />
        <PadLocalTime @click="onTimeClick" />
      </div>

      <PadMeetRoom :name="roomName" :capacity="capacity" style="margin-top: 66px; z-index: 10" />

      <PadMeeting
        :currentStatus="currentStatus"
        :obj="obj"
        :isDown="isDown"
        :accent="accent"
        :progressFill="progressFill"
        style="margin-top: 10px; z-index: 10"
      />

      <PadMeetList
        v-if="isDown !== '1' && currentStatus !== 'special'"
        :data="bookList"
        :accent="accent"
        class="mlist"
        style="margin-top: 96px"
      />

      <PadBgLine
        :src="bgLineSrc"
        style="position: absolute; left: 20px; bottom: -4px; z-index: 10; pointer-events: none"
      />

      <PadErweima
        :src="publishedQrUrl"
        :fallbackSrc="resolvedQrFallback"
        style="position: absolute; bottom: 0; right: 32px; z-index: 10"
      />

      <PadClearTime
        :baojie="baojie"
        :spaceCode="baojie.spaceCode"
        style="position: absolute; bottom: 250px; right: 32px; z-index: 10"
        @checked-in="onCheckedIn"
      />
    </div>
  </VScaleScreen>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import VScaleScreen from 'v-scale-screen'
import PadBg from './components/PadBg.vue'
import PadBgLine from './components/PadBgLine.vue'
import PadLogo from './components/PadLogo.vue'
import PadLocalTime from './components/PadLocalTime.vue'
import PadMeetRoom from './components/PadMeetRoom.vue'
import PadMeeting from './components/PadMeeting.vue'
import PadMeetList from './components/PadMeetList.vue'
import PadErweima from './components/PadErweima.vue'
import PadClearTime from './components/PadClearTime.vue'
import { useMeetingPadData } from './useMeetingPadData'
import { usePadPublishedContent } from './usePadPublishedContent'

const props = withDefaults(defineProps<{
  /** 主题主色：会议中状态底色 / 进行中标签 / 进度条色族基准 */
  accent?: string
  /** 进度条填充色 */
  progressFill?: string
  /** 主题内置兜底背景图 */
  fallbackBgs?: string[]
  /** 主题装饰条素材 */
  bgLineSrc?: string
  /** 主题内置兜底二维码（扫码无效） */
  qrFallbackSrc?: string
}>(), {
  accent: '#f36604',
  progressFill: 'rgba(255, 255, 255, 0.5)',
  fallbackBgs: () => [],
  bgLineSrc: '',
  qrFallbackSrc: '',
})

// 竖屏设计稿尺寸（原项目 dw=800 / dh=1280）
const DW = 800
const DH = 1280

const router = useRouter()

const {
  roomName,
  capacity,
  bgImgs,
  obj,
  currentStatus,
  isDown,
  bookList,
  baojie,
  onCheckedIn,
} = useMeetingPadData()

// logo / 二维码：云端发布内容（wallPad 链路）→ 各自兜底（geely / 扫码无效图）
const { publishedLogoUrl, publishedQrUrl } = usePadPublishedContent()

// 兜底二维码（扫码无效）：主题未提供时用内置静态图
const resolvedQrFallback = props.qrFallbackSrc || new URL('./assets/images/qr-invalid.png', import.meta.url).href

// ===== 左上角 logo 三击 → 系统管理密码页（项目标准动作） =====
const logoTapCount = ref(0)
let logoTapTimer: ReturnType<typeof setTimeout> | null = null
const onLogoClick = () => {
  logoTapCount.value++
  if (logoTapCount.value >= 3) {
    logoTapCount.value = 0
    router.push('/init')
    return
  }
  if (logoTapTimer) clearTimeout(logoTapTimer)
  logoTapTimer = setTimeout(() => { logoTapCount.value = 0; logoTapTimer = null }, 800)
}

// ===== 右上角时钟三击 → 刷新整页（项目标准动作） =====
let timeTapCount = 0
let timeTapTimer: ReturnType<typeof setTimeout> | null = null
const onTimeClick = () => {
  timeTapCount++
  if (timeTapTimer) clearTimeout(timeTapTimer)
  if (timeTapCount >= 3) {
    timeTapCount = 0
    timeTapTimer = null
    location.reload()
    return
  }
  timeTapTimer = setTimeout(() => { timeTapCount = 0; timeTapTimer = null }, 1500)
}

onUnmounted(() => {
  if (logoTapTimer) clearTimeout(logoTapTimer)
  if (timeTapTimer) clearTimeout(timeTapTimer)
})
</script>

<style>
/* 原项目字体别名（数字/时间），字体文件来自项目公共资源 */
@font-face {
  font-family: 'ly-regular';
  src: url('@/assets/fonts/LynkcoType-Regular.ttf');
  font-display: swap;
}
</style>

<style scoped lang="scss">
.main-box {
  padding: 30px 34px;
  margin: 0 auto;
  position: relative;
  color: #fff;
  font-family: 'ly-regular', 'DingTalk-JinBuTi', serif;
  font-size: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
}
.mlist {
  align-self: flex-end;
  z-index: 10;
}
.bg-shdow {
  position: absolute;
  top: 0;
  left: -1px;
  background: rgba(0, 0, 0, 0.6);
}
</style>
