<template>
  <!-- 背景轮播（原项目 src/components/bg.vue）：优先用后端下发的图片，缺省用主题内置兜底图 -->
  <el-carousel
    class="bg-box"
    :interval="5000"
    indicator-position="none"
    :autoplay="true"
    :style="'width:' + dw + 'px;height:' + dh + 'px'"
  >
    <el-carousel-item v-for="(item, index) in imgList" :key="index">
      <el-image fit="cover" :style="'width:' + dw + 'px;height:' + dh + 'px'" :src="item" />
    </el-carousel-item>
  </el-carousel>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  dw?: number
  dh?: number
  /** 后端（padInfo.imgs）下发的背景图 */
  imgs?: string[]
  /** 主题内置兜底背景图 */
  fallbackImgs?: string[]
}>(), { dw: 800, dh: 1280, imgs: () => [], fallbackImgs: () => [] })

const imgList = computed(() => (props.imgs && props.imgs.length > 0 ? props.imgs : props.fallbackImgs))
</script>

<style scoped lang="scss">
.bg-box {
  margin: 0 auto;
  position: relative;
}
:deep(.el-carousel__container) {
  width: 100%;
  height: 100%;
}
:deep(.el-carousel__indicators) {
  z-index: 10;
}
:deep(.el-carousel__arrow) {
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 10;
}
</style>
