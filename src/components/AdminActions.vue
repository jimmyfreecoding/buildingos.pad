<template>
  <!--
    密码校验通过后的二级界面（所有 pad 统一）：刷新 / 绑定。
    绑定才进入原先的绑定界面（空间位置 / 界面模板），避免误触直接进配置。
  -->
  <div class="admin-actions">
    <div v-if="title" class="aa-title">{{ title }}</div>
    <div v-if="hint" class="aa-hint">{{ hint }}</div>

    <div class="aa-row">
      <button type="button" class="aa-btn" @click="emit('refresh')">刷新</button>
      <button type="button" class="aa-btn aa-btn-primary" @click="emit('bind')">绑定</button>
    </div>

    <button v-if="resetLabel" type="button" class="aa-reset" @click="emit('reset')">
      {{ resetLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  hint?: string
  /** 传空则不显示「重新初始化」次级操作（InitPage 的绑定流程本身即可改类型/模板） */
  resetLabel?: string
}>(), { title: '', hint: '', resetLabel: '' })

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'bind'): void
  (e: 'reset'): void
}>()
</script>

<style scoped>
.admin-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  user-select: none;
}
.aa-title {
  font-size: 30px;
  font-weight: 600;
  color: #fff;
}
.aa-hint {
  max-width: 560px;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
}
.aa-row {
  display: flex;
  gap: 28px;
  margin-top: 6px;
}
.aa-btn {
  width: 200px;
  height: 84px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
  font-size: 26px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.aa-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}
.aa-btn:active {
  background: rgba(255, 255, 255, 0.22);
  transform: scale(0.97);
}
.aa-btn-primary {
  background: #ed8733;
  border-color: #ed8733;
}
.aa-btn-primary:hover {
  background: #f59a4d;
}
.aa-btn-primary:active {
  background: #d9762a;
}
.aa-reset {
  margin-top: 4px;
  padding: 6px 10px;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 15px;
  text-decoration: underline;
  cursor: pointer;
}
.aa-reset:hover {
  color: rgba(255, 255, 255, 0.78);
}
</style>
