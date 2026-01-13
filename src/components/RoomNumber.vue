<script setup lang="ts">
interface Props {
  number?: string
}

withDefaults(defineProps<Props>(), {
  number: '1F 103房间'
})
</script>

<template>
  <div class="text-[2rem] font-bold tracking-wider leading-none">
    {{ number }}
  </div>
</template>
