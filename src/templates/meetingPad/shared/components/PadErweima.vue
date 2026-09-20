<template>
  <!-- 二维码 / 保洁打卡（原项目 src/components/erweima.vue）
       仅展示：保洁人员用自己的手机扫码打卡，门牌端不再有点击行为
       取不到后端二维码 / 图片加载失败 → 兜底为「扫码无效」的二维码（内置静态图），不再出现破图 -->
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
  /** 空间四段路径：{space}/{floorarea}/{floor}/{code} */
  roomCode?: string
  /** 兜底二维码（扫码无效） */
  fallbackSrc?: string
}>(), { roomCode: '', fallbackSrc: '' })

// 内置兜底二维码：内容为无效标识，扫码不指向任何有效业务
const builtinFallback = new URL('../assets/images/qr-invalid.png', import.meta.url).href
const failed = ref(false)

// 原项目一致：baseURL + /wechat/getQRCode?scene=door&{space}/{area}/{floor}/{code}
const remoteUrl = computed(() => {
  const baseURL = window.config?.VITE_APP_BASE_URL || import.meta.env.VITE_APP_BASE_URL || ''
  if (!baseURL || !props.roomCode) return ''
  const scene = encodeURIComponent(`door&${props.roomCode}`)
  return `${baseURL}/wechat/getQRCode?scene=${scene}&page=apps/deviceControl/deviceControl&width=200&is_hyaline=true`
})

// 绑定空间变化（重新初始化）后允许重新尝试后端二维码
watch(() => props.roomCode, () => { failed.value = false })

const fallback = computed(() => props.fallbackSrc || builtinFallback)
const displaySrc = computed(() => (failed.value || !remoteUrl.value ? fallback.value : remoteUrl.value))
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
  }
}
.tip {
  margin-top: 8px;
  font-family: 'DingTalk-JinBuTi', serif !important;
}
</style>
