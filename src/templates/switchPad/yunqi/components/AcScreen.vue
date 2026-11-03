<script setup lang="ts">
/**
 * 第 2 屏 · 空调（按截图2 1:1 复刻；所有控制 = 当前空间空调的**群控**）
 * 标定（640 设计稿，来自截图 750×750 换算）：
 *   返回胶囊 x32 y32 128×85 描边 8 圆角 42.5（→ 回首页）
 *   标题 "空调控制面板" 79px @(32,180.5) ｜ 副标题 DIN 45px @(32,274.5)
 *   温度行 y391 高 85：−/＋ 胶囊 128×85，温度 DIN 82px（° 单独 48px）居中
 *   底部三胶囊 y517 高 90：电源 / 模式 / 风速，flex 1、间距 17、左右 33
 *   分页圆点 y557
 * 状态配色：开机 = 白色（电源胶囊 + 温度）；关机 = 灰白；模式/风速恒为灰白
 * 群控指令：useAcMqtt 的 togglePower / setTemp / setMode / setSpeed（裸群控主题）
 */
import { computed } from 'vue'
import type { AcMode, FanSpeed } from '@/types/device'
import PadIcon from './PadIcon.vue'

const props = withDefaults(defineProps<{
  title: string
  subtitle: string
  temp: number
  on: boolean
  mode: AcMode
  speed: FanSpeed
  enabled?: boolean
  busy?: 'power' | 'mode' | 'fan' | 'temp' | null
  dotIndex: number
  dotTotal: number
}>(), { enabled: true, busy: null })

defineEmits<{
  'title-tap': []
  back: []
  'temp-down': []
  'temp-up': []
  power: []
  mode: []
  fan: []
}>()

const modeIcon = computed(() => ({ cool: 'cool', heat: 'heat', vent: 'vent', auto: 'auto' } as const)[props.mode] ?? 'cool')
const speedLevel = computed(() => ({ low: 1, mid: 2, high: 3 } as const)[props.speed] ?? 2)
</script>

<template>
  <div class="ac" :class="{ disabled: !enabled }">
    <!-- 返回首页 -->
    <button type="button" class="pill solid back" @click="$emit('back')">
      <PadIcon name="back" :w="46" :h="33" />
    </button>

    <h1 class="title" @click.stop="$emit('title-tap')">{{ title }}</h1>
    <p class="subtitle">{{ subtitle }}</p>

    <!-- 温度行：− / 23°C / + -->
    <div class="temp-row">
      <button type="button" class="pill solid sm" :class="{ busy: busy === 'temp' }" @click="$emit('temp-down')">
        <PadIcon name="minus" :w="36" :h="8" />
      </button>
      <div class="temp" :class="{ off: !on }">
        <span class="num">{{ temp }}</span><span class="deg">°</span><span class="unit">C</span>
      </div>
      <button type="button" class="pill solid sm" :class="{ busy: busy === 'temp' }" @click="$emit('temp-up')">
        <PadIcon name="plus" :w="36" :h="37" />
      </button>
    </div>

    <!-- 底部三胶囊：电源 / 模式 / 风速（群控） -->
    <div class="actions">
      <button type="button" class="pill" :class="[on ? 'solid' : 'ghost', { busy: busy === 'power' }]" @click="$emit('power')">
        <PadIcon name="power" :w="50" :h="50" />
      </button>
      <button type="button" class="pill ghost" :class="{ busy: busy === 'mode' }" @click="$emit('mode')">
        <PadIcon :name="modeIcon" :w="52" :h="52" />
      </button>
      <button type="button" class="pill ghost" :class="{ busy: busy === 'fan' }" @click="$emit('fan')">
        <PadIcon name="fan" :w="38" :h="32" :level="speedLevel" />
      </button>
    </div>

    <div class="dots">
      <span v-for="i in dotTotal" :key="i" class="dot" :class="{ on: i - 1 === dotIndex }"></span>
    </div>
  </div>
</template>

<style scoped>
.ac {
  position: absolute;
  inset: 0;
}

/* ---------- 胶囊控件（截图2 的白描边风格） ---------- */
.pill {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 42.5px;
  border: 8px solid var(--pad-ghost);
  color: var(--pad-ghost);
  cursor: pointer;
  transition: opacity 0.2s, border-color 0.24s, color 0.24s;
}

.pill.solid {
  border-color: var(--pad-white);
  color: var(--pad-white);
}

.pill.busy {
  opacity: 0.55;
}

.pill:active {
  opacity: 0.8;
}

.ac.disabled .pill,
.ac.disabled .temp {
  opacity: 0.45;
}

.ac.disabled .actions .pill,
.ac.disabled .temp-row .pill {
  pointer-events: none;
}

/* ---------- 返回胶囊 ---------- */
.back {
  position: absolute;
  left: 32px;
  top: 32px;
  width: 128px;
  height: 85px;
}

/* ---------- 标题 / 副标题 ---------- */
.title {
  position: absolute;
  left: 32px;
  top: 180.5px;
  margin: 0;
  font-family: var(--pad-font-title);
  font-size: 79px;
  line-height: 1;
  font-weight: normal;
  color: var(--pad-white);
  white-space: nowrap;
}

.subtitle {
  position: absolute;
  left: 32px;
  top: 274.5px;
  margin: 0;
  font-family: var(--pad-font-latin);
  font-size: 45px;
  line-height: 1;
  color: var(--pad-ghost-soft);
  white-space: nowrap;
}

/* ---------- 温度行 ---------- */
.temp-row {
  position: absolute;
  left: 0;
  right: 0;
  top: 391px;
  height: 85px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-sizing: border-box;
}

.pill.sm {
  width: 128px;
  height: 85px;
  flex: none;
}

.temp {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--pad-font-latin);
  font-size: 82px;
  line-height: 1;
  color: var(--pad-white);
  /* 原厂数字比 DIN Pro 略窄、略高：对齐基线并收敛字宽 */
  transform: translateY(-6px) scaleX(0.94);
  transition: color 0.24s;
}

.temp.off {
  color: var(--pad-ghost);
}

.temp .num,
.temp .unit,
.temp .deg {
  font: inherit;
  color: inherit;
}

.temp .deg {
  font-size: 48px;
  align-self: flex-start;
  margin-top: 5px;
}

/* ---------- 底部三胶囊 ---------- */
.actions {
  position: absolute;
  left: 0;
  right: 0;
  top: 517px;
  height: 90px;
  display: flex;
  gap: 17px;
  padding: 0 33px;
  box-sizing: border-box;
}

.actions .pill {
  flex: 1;
  height: 90px;
}

/* ---------- 分页圆点 ---------- */
.dots {
  position: absolute;
  left: 0;
  right: 0;
  top: 618px;
  height: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pad-dot-off);
}

.dot.on {
  background: var(--pad-white);
}
</style>
