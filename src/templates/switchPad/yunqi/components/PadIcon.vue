<script setup lang="ts">
/**
 * 云起 4 寸屏图标集（描边风格，颜色一律 currentColor）
 * 尺寸由父级以 w/h 指定（640 设计稿坐标）。
 */
type PadIconName =
  | 'back'
  | 'minus'
  | 'plus'
  | 'power'
  | 'cool'
  | 'heat'
  | 'vent'
  | 'auto'
  | 'fan'
  | 'ac-unit'
  | 'lamp'
  | 'sun'
  | 'cloud'
  | 'rain'
  | 'snow'

withDefaults(defineProps<{
  name: PadIconName
  w?: number
  h?: number
  /** 风速档位（仅 fan）：亮起的竖条数量 */
  level?: number
}>(), { w: 48, h: 48, level: 0 })
</script>

<template>
  <!-- 返回（截图2 同款：胶囊内一个粗箭头） -->
  <svg v-if="name === 'back'" :width="w" :height="h" viewBox="0 0 44 32" fill="none"
    stroke="currentColor" stroke-width="7" stroke-linecap="butt" stroke-linejoin="miter">
    <path d="M40 16H9" />
    <path d="M9 16 22 4.5" />
    <path d="M9 16 22 27.5" />
  </svg>

  <!-- 减号 -->
  <svg v-else-if="name === 'minus'" :width="w" :height="h" viewBox="0 0 44 12" fill="currentColor">
    <rect x="0" y="0" width="44" height="12" />
  </svg>

  <!-- 加号 -->
  <svg v-else-if="name === 'plus'" :width="w" :height="h" viewBox="0 0 44 44" fill="currentColor">
    <rect x="0" y="17.5" width="44" height="9" />
    <rect x="17.5" y="0" width="9" height="44" />
  </svg>

  <!-- 电源 -->
  <svg v-else-if="name === 'power'" :width="w" :height="h" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="4.6" stroke-linecap="round">
    <path d="M24 5.5V23.5" />
    <path d="M13.8 11.9A17 17 0 1 0 34.2 11.9" />
  </svg>

  <!-- 制冷：雪花 -->
  <svg v-else-if="name === 'cool'" :width="w" :height="h" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
    <g>
      <path d="M24 3V45" />
      <path d="M24 9 30 15M24 9 18 15M24 39 30 33M24 39 18 33" />
    </g>
    <g transform="rotate(60 24 24)">
      <path d="M24 3V45" />
      <path d="M24 9 30 15M24 9 18 15M24 39 30 33M24 39 18 33" />
    </g>
    <g transform="rotate(120 24 24)">
      <path d="M24 3V45" />
      <path d="M24 9 30 15M24 9 18 15M24 39 30 33M24 39 18 33" />
    </g>
  </svg>

  <!-- 制热：太阳 -->
  <svg v-else-if="name === 'heat'" :width="w" :height="h" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="3.6" stroke-linecap="round">
    <circle cx="24" cy="24" r="9.5" />
    <path d="M24 3.5V9M24 39v5.5M3.5 24H9M39 24h5.5M9.5 9.5l3.9 3.9M34.6 34.6l3.9 3.9M38.5 9.5l-3.9 3.9M13.4 34.6l-3.9 3.9" />
  </svg>

  <!-- 送风 -->
  <svg v-else-if="name === 'vent'" :width="w" :height="h" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 16h21a6 6 0 1 0-6-6" />
    <path d="M4 24h29a6 6 0 1 1-6 6" />
    <path d="M4 32h15" />
  </svg>

  <!-- 自动 -->
  <svg v-else-if="name === 'auto'" :width="w" :height="h" viewBox="0 0 44 40" fill="none"
    stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 36 22 5l17 31" />
    <path d="M13 26h18" />
  </svg>

  <!-- 风速：三根递增竖条 -->
  <svg v-else-if="name === 'fan'" :width="w" :height="h" viewBox="0 0 36 32" fill="currentColor">
    <rect x="0" y="19" width="9.4" height="13" :fill="level >= 1 ? '#fff' : 'currentColor'" />
    <rect x="13.4" y="10" width="9.4" height="22" :fill="level >= 2 ? '#fff' : 'currentColor'" />
    <rect x="26.8" y="0" width="9.4" height="32" :fill="level >= 3 ? '#fff' : 'currentColor'" />
  </svg>

  <!-- 空调机组（首页 / 空调页副图标） -->
  <svg v-else-if="name === 'ac-unit'" :width="w" :height="h" viewBox="0 0 195 145" fill="none"
    stroke="currentColor" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3.5" y="3.5" width="188" height="103" rx="24" />
    <path d="M4 79h187" />
    <g>
      <path d="M70 40c16 6 22 18 14 30-8 12-26 14-32 26-6 12 0 26 14 34" />
      <path d="M95 40c16 6 22 18 14 30-8 12-26 14-32 26-6 12 0 26 14 34" />
      <path d="M120 40c16 6 22 18 14 30-8 12-26 14-32 26-6 12 0 26 14 34" />
    </g>
  </svg>

  <!-- 吊灯 -->
  <svg v-else-if="name === 'lamp'" :width="w" :height="h" viewBox="0 0 175 141" fill="none"
    stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M87 4V40" />
    <path d="M10 112a77.5 77.5 0 0 1 155 0" />
    <path d="M10 112h30M135 112h30" />
    <path d="M72 112a15 15 0 0 0 30 0" />
    <path d="M87 127v8M58 124l-11 12M116 124l11 12" />
  </svg>

  <!-- 天气：晴 / 多云 / 雨 / 雪（首页） -->
  <svg v-else-if="name === 'sun'" :width="w" :height="h" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <circle cx="24" cy="24" r="9" />
    <path d="M24 2.5v7M24 38.5v7M2.5 24h7M38.5 24h7M8.7 8.7l5 5M34.3 34.3l5 5M39.3 8.7l-5 5M13.7 34.3l-5 5" />
  </svg>
  <svg v-else-if="name === 'cloud'" :width="w" :height="h" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 34a7.5 7.5 0 0 1-.6-15 10 10 0 0 1 19 2.6A6.5 6.5 0 0 1 32 34z" />
  </svg>
  <svg v-else-if="name === 'rain'" :width="w" :height="h" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 28a7 7 0 0 1-.6-14 9.5 9.5 0 0 1 18 2.5A6 6 0 0 1 31 28z" />
    <path d="M17 34l-2 6M25 34l-2 6M33 34l-2 6" />
  </svg>
  <svg v-else-if="name === 'snow'" :width="w" :height="h" viewBox="0 0 48 48" fill="none"
    stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 26a7 7 0 0 1-.6-14 9.5 9.5 0 0 1 18 2.5A6 6 0 0 1 31 26z" />
    <path d="M17 34v6M17 34l-4 6M17 34l4 6M31 34v6M31 34l-4 6M31 34l4 6" />
  </svg>
</template>
