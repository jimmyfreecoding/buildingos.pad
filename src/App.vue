<script setup lang="ts">
import { onMounted } from 'vue'
import { AppConfig } from './config'

onMounted(() => {
  // Set root font size based on design width to ensure consistent scaling
  // Base width 1920px -> 16px (Tailwind default)
  const baseWidth = 1920
  const baseFontSize = 20
  const scale = AppConfig.design.width / baseWidth
  document.documentElement.style.fontSize = `${baseFontSize * scale}px`
})
</script>

<template>
  <router-view />
</template>
