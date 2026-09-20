<template>
  <!-- 左侧装饰条（原项目 src/components/bgLine.vue）：素材由主题提供（蓝 / 橙） -->
  <div class="bg-line-box">
    <img class="img" :src="src" alt="" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ src: string }>(), { src: '' })
</script>

<style scoped lang="scss">
.bg-line-box {
  width: 198px;
  height: 723px;
  padding: 10px;
  .img {
    width: 100%;
    height: 100%;
  }
}
</style>
