<script setup lang="ts">
/**
 * 第 3 屏 · 照明（截图2 同款排版；控制与回显对齐 switchPad/default）
 *   左上角返回首页胶囊（截图2 风格）
 *   标题 "照明控制面板" 79px @(32,180.5) + 副标题（空间名）DIN 45px @(32,274.5)
 *     —— 与空调页**完全同一套 layout / 位置 / 字号**
 *   吊灯图标移到右上角 150×121 @(470,50)（不压标题）
 *   设备胶囊 485×90 圆角 45 描边 6、文字 25px；多灯按字数排布：
 *     名字 ≤2 字一行 3 个 / 3 字一行 2 个 / ≥4 字一行 1 个，数量少按实际占满
 *   配色与空调页一致：点亮/可用 = 白色描边 + 白字；未点亮 = 灰白 --pad-ghost；
 *     无设备占位 = 45% 透明不可点
 *   分页圆点移到最下方（y618），不再和胶囊重叠
 *
 * 控制：点击 → useLightMqtt().toggleLight(id)（composable 内 500ms 回查该路状态），
 *       界面状态只读设备回显，下发期间用旋转指示提示。
 */
import { computed } from 'vue'
import type { LightRow } from '../types'
import PadIcon from './PadIcon.vue'
import { lightColumns } from '../layout'

const props = defineProps<{
  /** 空间名（副标题） */
  room: string
  title: string
  rows: LightRow[]
  dotIndex: number
  dotTotal: number
}>()

defineEmits<{ toggle: [row: LightRow]; back: []; 'title-tap': [] }>()

/* ---------- 设备胶囊排布 ---------- */
const PILL_H = 90
const PILL_GAP_X = 16
const PILL_GAP_Y = 20
const BLOCK_W = 485
const MULTI_BOTTOM = 540
const SINGLE_TOP = 459

const cols = computed(() => lightColumns(props.rows.map((r) => r.name)))
const pillW = computed(() => (BLOCK_W - PILL_GAP_X * (cols.value - 1)) / cols.value)
const rowCount = computed(() => Math.ceil(Math.max(1, props.rows.length) / cols.value))
const blockTop = computed(() => {
  if (props.rows.length <= 1) return SINGLE_TOP
  const h = rowCount.value * PILL_H + (rowCount.value - 1) * PILL_GAP_Y
  return MULTI_BOTTOM - h
})
const pillStyle = computed(() => (i: number) => {
  const r = Math.floor(i / cols.value)
  const c = i % cols.value
  return {
    left: (76 + c * (pillW.value + PILL_GAP_X)) + 'px',
    top: (blockTop.value + r * (PILL_H + PILL_GAP_Y)) + 'px',
    width: pillW.value + 'px',
  }
})
</script>

<template>
  <div class="light">
    <!-- 返回首页 -->
    <button type="button" class="back" @click="$emit('back')">
      <PadIcon name="back" :w="46" :h="33" />
    </button>

    <!-- 标题 + 副标题（与空调页同一套 layout） -->
    <h1 class="title" @click.stop="$emit('title-tap')">{{ title }}</h1>
    <p class="subtitle">{{ room }}</p>

    <!-- 吊灯图标：右上角；任一路点亮为白色，否则灰白 -->
    <div class="lamp-icon" :class="{ on: rows.some((r) => r.on) }">
      <PadIcon name="lamp" :w="150" :h="121" />
    </div>

    <button
      v-for="(row, i) in rows"
      :key="row.id"
      type="button"
      class="device"
      :class="{ on: row.on, off: row.disabled, busy: row.pending }"
      :style="pillStyle(i)"
      @click="$emit('toggle', row)"
    >
      <span class="name">{{ row.name }}</span>
      <!-- 下发中：与 default 一致，用旋转指示代替"提前变色" -->
      <svg v-if="row.pending" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
        <circle cx="12" cy="12" r="9" stroke-opacity="0.25" />
        <path d="M12 3a9 9 0 0 1 9 9" />
      </svg>
    </button>

    <div class="dots">
      <span v-for="i in dotTotal" :key="i" class="dot" :class="{ on: i - 1 === dotIndex }"></span>
    </div>
  </div>
</template>

<style scoped>
.light {
  position: absolute;
  inset: 0;
}

/* ---------- 返回胶囊（与空调页一致） ---------- */
.back {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  left: 32px;
  top: 32px;
  width: 128px;
  height: 85px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 42.5px;
  border: 8px solid var(--pad-white);
  color: var(--pad-white);
  cursor: pointer;
  transition: opacity 0.2s;
}

.back:active {
  opacity: 0.8;
}

/* ---------- 标题 / 副标题：与空调页完全一致 ---------- */
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

/* ---------- 吊灯图标：右上角，未点亮与空调页同色（灰白） ---------- */
.lamp-icon {
  position: absolute;
  left: 470px;
  top: 50px;
  color: var(--pad-ghost);
  transition: color 0.24s;
}

.lamp-icon.on {
  color: var(--pad-white);
}

/* ---------- 设备胶囊（与空调页同一套 disabled 配色） ---------- */
.device {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  left: 76px;
  width: 485px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 45px;
  border: 6px solid var(--pad-ghost);
  color: var(--pad-ghost);
  cursor: pointer;
  transition: color 0.24s, border-color 0.24s, opacity 0.2s;
}

.device .name {
  font-family: var(--pad-font-title);
  font-size: 25px;
  line-height: 1;
  white-space: nowrap;
}

/* 点亮：白色描边 + 白字（状态来自设备回显） */
.device.on {
  border-color: var(--pad-white);
  color: var(--pad-white);
}

.device.off {
  opacity: 0.45;
  pointer-events: none;
}

.device.busy {
  opacity: 0.6;
}

.spin {
  width: 22px;
  height: 22px;
  flex: none;
  animation: light-spin 0.9s linear infinite;
}

@keyframes light-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 分页圆点：移到最下方，避免与胶囊重叠 ---------- */
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
