<script setup lang="ts">
import { ref } from 'vue'
import { AppConfig } from '@/config'
import { useCockpitStore } from '@/stores/cockpit'
import AppBackground from '@/components/AppBackground.vue'
import AppLogo from '@/components/AppLogo.vue'
import BaseCard from '@/components/BaseCard.vue'
import RoomNumber from '@/components/RoomNumber.vue'
import VScaleScreen from 'v-scale-screen'
import TimeWidget from '@/components/TimeWidget.vue'
import { Maximize2, ScanLine } from 'lucide-vue-next'

const store = useCockpitStore()

const companyName = "桂林华艺健康科技有限公司成都分公司"

const handleOpenDoor = () => {
  console.log('Open Door')
}
</script>

<template>
  <VScaleScreen :width="AppConfig.design.width" :height="AppConfig.design.height" :fullScreen="true">
    <AppBackground :type="store.background.type" :src="store.background.src" />

    <div class="relative z-10 w-full h-full text-white overflow-hidden flex flex-col p-12">
      <div class="flex justify-between items-start mb-10">
        <AppLogo />
        <TimeWidget />
      </div>

      <div class="flex-1 flex items-center gap-12 w-full px-4">
        <div class="flex-[3]">
          <BaseCard class="h-80 flex items-center justify-center">
             <h1 class="text-7xl font-light text-center leading-snug tracking-wider">
               {{ companyName }}
             </h1>
          </BaseCard>
        </div>

        <div class="flex-1">
          <BaseCard class="h-80 flex items-center justify-center p-8">
             <div class="w-full h-full bg-white p-2">
                <div class="w-full h-full border-4 border-black relative bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=DoorPad')] bg-cover bg-no-repeat bg-center opacity-90">
                </div>
             </div>
          </BaseCard>
        </div>
      </div>

      <div class="mt-10 flex justify-end items-end px-4">
        <BaseCard class="flex items-start gap-4 !p-2 !rounded-xl">
           <RoomNumber />
        </BaseCard>
      </div>
    </div>
  </VScaleScreen>
</template>

<style scoped>
</style>
