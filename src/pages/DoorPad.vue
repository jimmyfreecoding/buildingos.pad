<script setup lang="ts">
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
</script>

<template>
  <div class="w-full h-full bg-black text-white flex flex-col">
    <!-- Header -->
    <header class="flex justify-between items-center p-8">
      <AppLogo />
      <TimeWidget />
    </header>
    
    <!-- Content -->
    <div class="flex-1 flex items-center justify-center text-white/30 text-2xl font-light">
      Door Pad Page (Coming Soon)
    </div>
  </div>
</template>