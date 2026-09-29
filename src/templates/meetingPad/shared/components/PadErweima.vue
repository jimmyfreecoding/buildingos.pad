<template>
  <!-- 二维码 / 保洁打卡：图片来自云端下发素材（与 logo 同一条 wallPad 发布内容链路）
       未配置素材 / 加载失败 → 兜底为内置「扫码无效」二维码，不再出现破图
       仅展示：保洁人员用自己的手机扫码打卡，门牌端无点击行为 -->
  <div class="erweima-wrap">
    <div class="erweima-box">
      <img class="img" :src="displaySrc" alt="qr" @error="onError" />
    </div>
    <div class="tip ziti">保洁打卡</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  /** 云端下发素材地址（display_json 的二维码素材） */
  src?: string
  /** 兜底二维码（扫码无效） */
  fallbackSrc?: string
}>(), { src: '', fallbackSrc: '' })

// 内置兜底二维码：内容为无效标识，扫码不指向任何有效业务
const builtinFallback = new URL('../assets/images/qr-invalid.png', import.meta.url).href
const failed = ref(false)

// 云端素材地址变化（配置更新 / 重新绑定）后允许重新尝试
watch(() => props.src, () => { failed.value = false })

const fallback = computed(() => props.fallbackSrc || builtinFallback)
const displaySrc = computed(() => (failed.value || !props.src ? fallback.value : props.src))
const onError = () => { failed.value = true }
</script>

<style scoped lang="scss">
.erweima-wrap {
  text-align: center;
  width: 190px;
  z-index: 2000;
  user-select: none;
}
.erweima-box {
  width: 190px;
  height: 190px;
  padding: 10px;
  background: #fff;
  box-sizing: border-box;
  border-radius: 16px;
  .img {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    object-fit: contain;
  }
}
.tip {
  margin-top: 8px;
  font-family: 'DingTalk-JinBuTi', serif !important;
}
</style>
