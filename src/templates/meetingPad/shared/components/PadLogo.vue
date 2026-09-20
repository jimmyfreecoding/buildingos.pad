<template>
  <!-- 左上角 logo：云端发布内容（wallPad 链路）→ geely 兜底；三击进入系统管理密码页 -->
  <div class="logo-box" @click="emit('click')">
    <img class="logo" :src="src || geelyLogo" alt="logo" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ src?: string }>(), { src: '' })
const emit = defineEmits<{ (e: 'click'): void }>()

// 与 wallPad zeekr 模板一致：取不到云端配置的 logo 时兜底 geely
const geelyLogo = new URL('../assets/images/geely.png', import.meta.url).href
</script>

<style scoped>
.logo-box {
  height: 100px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.logo {
  width: 240px;
  height: auto;
  display: block;
}
</style>
