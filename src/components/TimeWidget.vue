<script setup lang="ts">
import { ref } from 'vue'
import { useDateFormat, useNow } from '@vueuse/core'
import Setting from './Setting.vue'

const now = useNow()
const currentTime = useDateFormat(now, 'HH:mm')
const currentDate = useDateFormat(now, 'YYYY年M月D日 dddd', { locales: 'zh-CN' })

// State for Setting Dialog (PIN check + Config)
const showSetting = ref(false)

const handleTimeClick = () => {
  showSetting.value = true
}
</script>

<template>
  <div class="text-right cursor-pointer select-none active:opacity-80" @click="handleTimeClick">
    <div class="text-2xl font-medium tracking-wide">{{ currentTime }}</div>
    <div class="text-sm text-white/60">{{ currentDate }}</div>
  </div>

  <Setting v-model="showSetting" />
</template>

<style scoped>
/* Scoped styles specific to TimeWidget if any */
</style>
