<script setup lang="ts">
import { ref, toRefs } from 'vue'

const props = defineProps<{
  active: number | string
  style?: string
  floor?: string
}>()

const emit = defineEmits(['clickChild'])

// Assets
const icon1 = new URL('../assets/images/icon1.png', import.meta.url).href
const icon2 = new URL('../assets/images/icon2.png', import.meta.url).href
const icon3 = new URL('../assets/images/icon3.png', import.meta.url).href
const icon4 = new URL('../assets/images/icon4.png', import.meta.url).href
const icon6 = new URL('../assets/images/icon6.png', import.meta.url).href
const icon1Active = new URL('../assets/images/icon1Active.png', import.meta.url).href
const icon2Active = new URL('../assets/images/icon2Active.png', import.meta.url).href
const icon3Active = new URL('../assets/images/icon3Active.png', import.meta.url).href
const icon4Active = new URL('../assets/images/icon4Active.png', import.meta.url).href
const icon6Active = new URL('../assets/images/icon6Active.png', import.meta.url).href
const backImg = new URL('../assets/images/back.png', import.meta.url).href
const qsjImg = new URL('../assets/images/chahuaJun.png', import.meta.url).href

const list = ref([
  { img: icon1, imgActive: icon1Active, txt: '行政服务' },
  { img: icon2, imgActive: icon2Active, txt: '室内环境' },
  { img: icon3, imgActive: icon3Active, txt: '照明空调' },
  { img: icon4, imgActive: icon4Active, txt: '空间使用' },
  { img: icon6, imgActive: icon6Active, txt: '关于智控' },
])

const change = (e: number) => {
  emit('clickChild', e)
}
</script>

<template>
  <div class="left-nav-box">
    <div
      v-for="(item, index) in list"
      :key="index"
      class="box flex-row align-center justify-center"
      :class="{ active: active === index }"
      @click="change(index)"
    >
      <div class="img-box">
        <img
          class="img"
          style="width: auto; height: auto"
          :src="active === index ? item.imgActive : item.img"
        />
      </div>
      <div class="txt">{{ item.txt }}</div>
    </div>
    <img
      class="chahua"
      :src="qsjImg"
      v-if="!['52F', '53F', '54F'].includes(floor || '')"
    />
    <div
      @click="change(-1)"
      class="back-btn flex-row align-center justify-center"
    >
      <div style="z-index:2;display:flex;flex-direction:row;align-items:center;justify-content:center;">
        <img class="icon" :src="backImg" /> 返回首页
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.left-nav-box {
  background: rgba(26, 33, 48, 1);
  padding: 10px 0;
  position: relative;
  width: 220px;
  height: 100%;
  .box {
    color: rgba(255, 255, 255, 0.85);
    font-size: 20px;
    border-right: 4px solid rgb(26, 33, 48);
    height: 48px;
    margin: 42px 0;
    cursor: pointer;
    .txt {
      letter-spacing: 4px;
    }
    .img-box {
      width: 48px;
      height: 48px;
      margin-right: 20px;
      flex-direction: column;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  .active {
    opacity: 1;
    color: #ed8733;
    border-right: 4px solid #ed8733;
    box-sizing: border-box;
  }
  .chahua {
    width: 195px;
    height: auto;
    font-size: 20px;
    position: absolute;
    bottom: 160px;
    left: 0;
  }
  .back-btn {
    width: 180px;
    height: 64px;
    font-size: 20px;
    position: absolute;
    bottom: 60px;
    left: 20px;
    cursor: pointer;
    background: linear-gradient(96.86deg, #607594 3.4%, rgba(96, 117, 148, 0.4) 12.25%, rgba(53, 70, 96, 0.4) 77%, #354660 94.45%);
    border-radius: 16px;
    &::before {
      content: '';
      display: inline-block;
      width: calc(100% - 2px);
      height: calc(100% - 2px);
      border-radius: 16px;
      position: absolute;
      top: 1px;
      left: 1px;
      background-image: linear-gradient(96.54deg, #2e3a4d 3.38%, #263245 95.54%);
    }
    .icon {
      margin-right: 8px;
      width: 24px;
      height: 24px;
    }
  }
}
.flex-row { display: flex; flex-direction: row; }
.justify-center { justify-content: center; }
.align-center { align-items: center; }
</style>
