<script setup lang="ts">
const props = defineProps<{
  tabIndex: number
  lights: any[]
  currentLight: any
  currentLightStatus: boolean
}>()

const emit = defineEmits(['clickChild'])

const mapImg = new URL('../assets/images/map1.png', import.meta.url).href
</script>

<template>
  <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#161616;">
    <img
      :src="mapImg"
      style="max-width:100%;max-height:100%;object-fit:contain;"
    />
  </div>
</template>

<style scoped>
</style>
