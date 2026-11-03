<script setup lang="ts">
/**
 * 第 1 屏 · 首页（按截图1 复刻：大时钟 + 日期/星期 + 天气 + 四个按钮）
 * 标定（640 设计稿，均由截图 538×548 换算）：
 *   时钟 "14:00"   DIN 178.5px + scaleX(.973)，墨迹 x 90–483、y 116–244
 *   日期 "6/24 Monday"  DIN 30px，墨迹 x 96 起、y 314 起，两段间距 48
 *   天气 图标 66×66 中心 (546,152) + 温度 26px 墨迹 y 227
 *   四个按钮 220×68 圆角 34：列 x84 / x322.5，行 y400 / y486，文字居中 28px + 字距 .9
 *     选中态：#B5542E 实心 + 白字；未选中：透明 + 白字
 *   logo    左上角 x91（与日期/时钟墨迹左沿对齐）、y46，宽 96、限高 28（与 default 模板同尺寸）
 *           仅首页显示（空调/照明页左上角是返回键）；三击同时钟 → 系统管理
 */
import { computed } from 'vue'
import PadIcon from './PadIcon.vue'

type WeatherIcon = 'sun' | 'cloud' | 'rain' | 'snow'

const props = defineProps<{
  /** HH:MM */
  time: string
  /** M/D */
  date: string
  weekday: string
  weatherIcon: WeatherIcon
  /** 户外温度（无数据为 '--'） */
  weatherTemp: string
  /** 按钮：照明开/照明关/空调开/空调关（按可用设备动态生成） */
  buttons: Array<{ key: string; label: string; active: boolean; disabled?: boolean }>
  busy?: string | null
  /** 左上角 logo（云端发布素材）；空 → geely 兜底 */
  logo?: string
}>()

const geelyLogo = new URL('../assets/images/geely.png', import.meta.url).href
const logoSrc = computed(() => props.logo || geelyLogo)

defineEmits<{ press: [key: string]; 'title-tap': [] }>()

const clock = computed(() => {
  const t = props.time || '--:--'
  const [h = '--', m = '--'] = t.split(':')
  return { h, m }
})
</script>

<template>
  <div class="home">
    <!-- 左上角 logo（三击 → 系统管理，同时钟） -->
    <img class="logo" :src="logoSrc" alt="logo" draggable="false" @click.stop="$emit('title-tap')" />

    <!-- 大时钟 -->
    <div class="clock" @click.stop="$emit('title-tap')"><span>{{ clock.h }}</span><span class="colon">:</span><span>{{ clock.m }}</span></div>

    <!-- 日期 + 星期 -->
    <div class="date">
      <span>{{ date }}</span>
      <span class="weekday">{{ weekday }}</span>
    </div>

    <!-- 户外天气 -->
    <div class="weather">
      <div class="w-icon">
        <PadIcon :name="weatherIcon" :w="66" :h="66" />
      </div>
      <div class="w-temp">{{ weatherTemp }}°C</div>
    </div>

    <!-- 四个按钮：照明开/关 + 空调开/关（无对应设备则不渲染） -->
    <div class="modes">
      <button
        v-for="b in buttons"
        :key="b.key"
        type="button"
        class="mode"
        :class="{ on: b.active, busy: busy === b.key, off: b.disabled }"
        @click="$emit('press', b.key)"
      >
        {{ b.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.home {
  position: absolute;
  inset: 0;
}

/* ---------- logo ---------- */
.logo {
  position: absolute;
  left: 91px;
  top: 46px;
  display: block;
  width: 96px;
  height: auto;
  max-height: 28px;
  object-fit: contain;
  object-position: left top;
  cursor: pointer;
  -webkit-user-drag: none;
}

/* ---------- 时钟 ---------- */
.clock {
  position: absolute;
  left: 72.4px;
  top: 85.5px;
  display: flex;
  align-items: baseline;
  font-family: var(--pad-font-latin);
  font-size: 178.5px;
  line-height: 1;
  color: var(--pad-white);
  white-space: nowrap;
  /* 实机数字比 DIN 略窄，横向收敛到截图字宽（字高/基线不变） */
  transform: scaleX(0.973);
  transform-origin: left center;
}

.colon {
  padding: 0 4px;
}

/* ---------- 日期 ---------- */
.date {
  position: absolute;
  left: 91px;
  top: 301px;
  display: flex;
  align-items: baseline;
  gap: 48px;
  font-family: var(--pad-font-latin);
  font-size: 30px;
  line-height: 1;
  color: var(--pad-white);
  white-space: nowrap;
}

/* ---------- 天气 ---------- */
.weather {
  position: absolute;
  left: 452px;
  top: 121px;
  width: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--pad-white);
}

.w-icon {
  width: 66px;
  height: 66px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.w-temp {
  margin-top: 37px;
  font-family: var(--pad-font-latin);
  font-size: 26px;
  line-height: 1;
}

/* ---------- 四个按钮 ---------- */
.modes {
  position: absolute;
  left: 84px;
  top: 400px;
  width: 458.5px;
  display: grid;
  grid-template-columns: 220px 220px;
  column-gap: 18.5px;
  row-gap: 18px;
}

.mode {
  all: unset;
  box-sizing: border-box;
  width: 220px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 34px;
  font-family: var(--pad-font-latin);
  font-size: 28px;
  line-height: 1;
  letter-spacing: 0.9px;
  color: var(--pad-white);
  cursor: pointer;
  transition: background-color 0.24s, opacity 0.2s;
}

.mode.on {
  background: #b5542e;
}

.mode.busy {
  opacity: 0.6;
}

/* 无对应设备：置灰且不可点（按钮位置保留，避免首页看起来少了控制） */
.mode.off {
  opacity: 0.45;
  pointer-events: none;
}
</style>
