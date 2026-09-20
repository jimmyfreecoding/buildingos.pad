<template>
  <!-- 会议室名称（原项目 src/components/meetRoom.vue） -->
  <div class="meet-room">
    <div class="title1">{{ name }}</div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ name?: string }>(), { name: '' })
</script>

<style scoped lang="scss">
.meet-room {
  display: flex;
  flex-direction: row;
  align-items: last baseline;
  .title1 {
    font-size: 80px;
    font-family: 'DingTalk-JinBuTi', serif !important;
  }
}
</style>
