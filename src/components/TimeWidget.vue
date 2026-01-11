<script setup lang="ts">
import { useDateFormat, useNow } from '@vueuse/core'

const now = useNow()
const currentTime = useDateFormat(now, 'HH:mm')
const currentDate = useDateFormat(now, 'YYYY年M月D日 dddd', { locales: 'zh-CN' })
</script>

<template>
  <div class="text-right">
    <div class="text-2xl font-medium tracking-wide">{{ currentTime }}</div>
    <div class="text-sm text-white/60">{{ currentDate }}</div>
  </div>
</template>