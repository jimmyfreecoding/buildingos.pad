<template>
  <!-- 会议室名称 + 容量（原项目 src/components/meetRoom.vue） -->
  <div class="meet-room">
    <div class="title1">{{ name }}</div>
    <div v-if="capacity > 0" class="capacity">
      可容纳 <span class="num">{{ capacity }}</span> 人
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  name?: string
  /** 会议室容量（来自会议推送 item.capacity），0 表示未知不显示 */
  capacity?: number
}>(), { name: '', capacity: 0 })
</script>

<style scoped lang="scss">
.meet-room {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  .title1 {
    font-size: 80px;
    line-height: 1;
    font-family: 'DingTalk-JinBuTi', serif !important;
  }
  .capacity {
    font-size: 42px;
    line-height: 1;
    font-family: 'DingTalk-JinBuTi', serif !important;
    padding: 8px 16px;
    white-space: nowrap;
    .num {
      color: coral;
    }
  }
}
</style>
