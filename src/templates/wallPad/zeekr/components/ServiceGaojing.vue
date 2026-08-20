<script setup lang="ts">
import { ref } from 'vue'

const sosImg = new URL('../assets/images/bgIconsos.png', import.meta.url).href
</script>

<template>
  <div class="left-box-box">
    <div class="content" style="display:flex;align-items:center;justify-content:center;flex-direction:column;height:100%;">
      <img :src="sosImg" style="width:120px;margin-bottom:32px;" />
      <div style="font-size:32px;color:#FF5544;margin-bottom:16px;">紧急呼叫中！</div>
      <div style="font-size:24px;opacity:0.7;">安保人员正在前往此楼层</div>
      <div style="font-size:20px;opacity:0.5;margin-top:12px;">安保处联络方式：</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.left-box-box {
  width: 100%;
  height: 100%;
  background: #202838;
  padding: 20px 40px;
  .content {
    width: calc(100% - 40px);
    margin-left: 20px;
    padding: 24px;
    border-radius: 16px;
    background: #263041;
  }
}
</style>
