<script setup lang="ts">
import { onMounted } from 'vue'
import { AppConfig } from './config'

onMounted(() => {
  // Set root font size based on design width to ensure consistent scaling
  const designWidth = AppConfig.design.width
  if (designWidth <= 768) {
    // Small screens (e.g. 640x640 switch pad): use standard 16px base
    document.documentElement.style.fontSize = '16px'
  } else {
    const baseWidth = 1920
    const baseFontSize = 20
    const scale = designWidth / baseWidth
    document.documentElement.style.fontSize = `${baseFontSize * scale}px`
  }
})
</script>

<template>
  <router-view />
</template>

<style>
</style>
