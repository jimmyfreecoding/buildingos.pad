<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  bgUrls: { url: string }[]
}>()

const url = computed(() => props.bgUrls[0]?.url ?? '')
</script>

<template>
  <video :src="url" loop autoplay muted preload="auto"></video>
</template>
