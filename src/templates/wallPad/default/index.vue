<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppConfig } from '@/config'
import { useCockpitStore } from '@/stores/cockpit'
import AppBackground from '@/components/AppBackground.vue'
import SmartBuildingPage from '@/pages/SmartBuilding.vue'
import ControlPage from '@/pages/Control.vue'
import LightPage from '@/pages/Light.vue'
import SpacePage from '@/pages/Space.vue'
import EnergyPage from '@/pages/Energy.vue'
import OutAirPage from '@/pages/OutAir.vue'
import InAirPage from '@/pages/InAir.vue'
import ServicePage from '@/pages/Service.vue'
import AppLogo from '@/components/AppLogo.vue'
import TimeWidget from '@/components/TimeWidget.vue'
import QualityCard from '@/components/QualityCard.vue'
import {
  Zap, Fan, Lightbulb,
  Droplet, Thermometer,CircleEllipsis,
  UserRound, Building2,Siren
} from 'lucide-vue-next'
import VScaleScreen from 'v-scale-screen'

const router = useRouter()
const store = useCockpitStore()

const controlDrawer = ref(false)
const lightDrawer = ref(false)
const spaceDrawer = ref(false)
const smartBuildingDrawer = ref(false)
const energyDrawer = ref(false)
const outAirDrawer = ref(false)
const inAirDrawer = ref(false)
const serviceDrawer = ref(false)
const showSOSDialog = ref(false)

const outdoorTemp = ref(20.2)
const outdoorTempInt = computed(() => Math.floor(outdoorTemp.value))
const outdoorTempDec = computed(() => (outdoorTemp.value % 1).toFixed(1).substring(1))

const indoorTemp = ref(23.7)
const indoorTempInt = computed(() => Math.floor(indoorTemp.value))
const indoorTempDec = computed(() => (indoorTemp.value % 1).toFixed(1).substring(1))

const dockItems = computed(() => [
  { icon: Zap, label: 'Charge' },
  { icon: Lightbulb, label: 'Light' },
  { icon: CircleEllipsis, label: 'Seat' },
  { text: indoorTemp.value.toString(), label: 'AirQualityL', action: 'inAir' },
  { icon: Fan, label: 'Climate', active: true,  spin: true },
  { text: outdoorTemp.value.toString(), label: 'AirQualityR', action: 'outAir' },
  { icon: UserRound, label: 'Service', action: 'service' },
  { icon: Siren, label: 'Emergency', action: 'sos' },
  { icon: Building2, label: 'SmartInfo', action: 'smartBuilding' },
])

const handleDockClick = (item: any) => {
  if (item.label === 'Climate') {
    controlDrawer.value = true
  } else if (item.label === 'Light') {
    lightDrawer.value = true
  } else if (item.label === 'Seat') {
    spaceDrawer.value = true
  } else if (item.action === 'smartBuilding') {
    smartBuildingDrawer.value = true
  } else if (item.label === 'Charge') {
    energyDrawer.value = true
  } else if (item.action === 'outAir') {
    outAirDrawer.value = true
  } else if (item.action === 'inAir') {
    inAirDrawer.value = true
  } else if (item.action === 'service') {
    serviceDrawer.value = true
  } else if (item.action === 'sos') {
    showSOSDialog.value = true
  }
}
</script>

<template>
  <VScaleScreen :width="AppConfig.design.width" :height="AppConfig.design.height" :fullScreen="true">
    <AppBackground :type="store.background.type" :src="store.background.src" />

    <div class="relative z-10 w-full h-full text-white overflow-hidden flex flex-col">

      <header class="flex justify-between items-start pt-8 px-10">
        <AppLogo />
        <TimeWidget />
      </header>

      <div class="flex-1 w-full flex items-center relative">

        <div class="absolute left-1/2 top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

        <div class="flex-1 h-full flex flex-col justify-between px-16 py-10">

           <div class="flex flex-col gap-8 my-auto">
              <div class="flex items-center gap-2 text-white/80 text-2xl">
                  <Thermometer class="w-6 h-6" />
                  <span>42F B区 室内</span>
              </div>

              <div class="flex items-end gap-12">
                  <div class="flex items-baseline leading-none">
                    <span class="text-[12rem] font-bold tracking-tighter">{{ indoorTempInt }}</span>
                    <span class="text-[6rem] font-medium mb-4">{{ indoorTempDec }}</span>
                    <span class="text-4xl font-light mb-12 ml-2">°C</span>
                  </div>

                  <div class="flex flex-col gap-2 mb-8 pl-8 border-l border-white/10">
                    <div class="flex items-center gap-2 text-white/60">
                        <Droplet class="w-5 h-5" />
                        <span>湿度</span>
                    </div>
                    <div class="flex items-baseline gap-3">
                        <span class="text-5xl font-medium">55<span class="text-2xl">.9%</span></span>
                        <span class="text-green-400 text-xl">舒适</span>
                    </div>
                  </div>
              </div>
           </div>

           <div class="grid grid-cols-3 gap-6">
              <QualityCard
                 title="甲醛"
                 status="安全"
                 value="0.012"
                 unit="mg/m³"
                 :progress="12"
               />
              <QualityCard
                title="CO₂"
                status="清新"
                value="558"
                unit="ppm"
                :progress="30"
              />
              <QualityCard
                title="PM2.5"
                status="优"
                value="10"
                unit="mg/m³"
                :progress="10"
              />
           </div>
        </div>

        <div class="flex-1 h-full flex flex-col justify-between px-16 py-10">

           <div class="flex flex-col gap-8 my-auto">
              <div class="flex items-center gap-2 text-white/80 text-2xl">
                  <Thermometer class="w-6 h-6" />
                  <span>室外</span>
              </div>

              <div class="flex items-end gap-8">
                  <div class="flex items-baseline leading-none">
                    <span class="text-[12rem] font-bold tracking-tighter">{{ outdoorTempInt }}</span>
                    <span class="text-[6rem] font-medium mb-4">{{ outdoorTempDec }}</span>
                    <span class="text-4xl font-light mb-12 ml-2">°C</span>
                  </div>

                  <div class="flex flex-col gap-2 mb-10">
                    <div class="text-3xl font-light tracking-wide text-white/90">小雨转晴</div>
                  </div>
              </div>
           </div>

           <div class="grid grid-cols-3 gap-6">
              <QualityCard
                title="AQI"
                status="清新"
                value="26"
                :progress="26"
              />
              <QualityCard
                title="气压"
                status="正常"
                value="1016"
                unit="hPa"
                :progress="66"
              />
              <QualityCard
                title="PM2.5"
                status="优"
                value="18"
                unit="μg/m³"
                :progress="18"
              />
           </div>
        </div>

      </div>

      <div class="h-28 bg-black/40 backdrop-blur-md flex justify-center items-center gap-20 px-10">
         <template v-for="(item, index) in dockItems" :key="index">
            <div
               class="flex flex-col items-center justify-center gap-1 opacity-90 hover:opacity-100 cursor-pointer"
               @click="handleDockClick(item)"
            >
               <img
                 v-if="'image' in item && typeof item.image === 'string'"
                 :src="item.image"
                 class="w-8 h-8 object-contain"
               />
               <component
                 v-else-if="'icon' in item"
                 :is="item.icon"
                 :class="{
                   'w-14 h-14': item.label === 'Climate',
                   'w-8 h-8': item.label !== 'Climate',
                   'text-white': !item.active,
                   'text-white fill-white': item.active && 'caption' in item && item.caption,
                   'animate-spin-slow': item.spin
                 }"
               />
               <span v-else class="text-2xl font-medium">{{ item.text }}</span>

               <span v-if="'caption' in item" class="text-xs font-light mt-1">{{ item.caption }}</span>
            </div>
         </template>
      </div>

    </div>

    <el-drawer
      v-model="controlDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/10 !text-white backdrop-blur-xl"
    >
      <ControlPage @close="controlDrawer = false" />
    </el-drawer>

    <el-drawer
      v-model="lightDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/10 !text-white backdrop-blur-xl"
    >
      <LightPage @close="lightDrawer = false" />
    </el-drawer>

    <el-drawer
      v-model="spaceDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/10 !text-white backdrop-blur-xl"
    >
      <SpacePage @close="spaceDrawer = false" />
    </el-drawer>

    <el-drawer
      v-model="smartBuildingDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/10 !text-white backdrop-blur-xl"
    >
      <SmartBuildingPage @close="smartBuildingDrawer = false" />
    </el-drawer>

    <el-drawer
      v-model="energyDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/10 !text-white backdrop-blur-xl"
    >
      <EnergyPage @close="energyDrawer = false" />
    </el-drawer>

    <el-drawer
      v-model="outAirDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/10 !text-white backdrop-blur-xl"
    >
      <OutAirPage @close="outAirDrawer = false" />
    </el-drawer>

    <el-drawer
      v-model="inAirDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/10 !text-white backdrop-blur-xl"
    >
      <InAirPage @close="inAirDrawer = false" />
    </el-drawer>

    <el-drawer
      v-model="serviceDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/10 !text-white backdrop-blur-xl"
    >
      <ServicePage @close="serviceDrawer = false" />
    </el-drawer>

    <div v-if="showSOSDialog" class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="w-[500px] bg-white rounded-3xl p-8 relative overflow-hidden shadow-2xl animate-fade-in-up">
         <div class="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-100/50 to-transparent pointer-events-none"></div>

         <div class="relative z-10 flex flex-col items-center text-center">
            <h2 class="text-[#8B0000] text-2xl font-bold mb-6 tracking-wide">SOS紧急呼叫</h2>

            <p class="text-[#333333] text-lg leading-relaxed text-left w-full mb-6">
               当您处于紧急情况下可点击立即呼叫，系统将发送当前位置的求助信息至安保值班室
            </p>

            <p class="text-[#999999] text-base text-left w-full mb-10">
               7*24小时安保电话：(0571) 28098488
            </p>

            <div class="flex gap-6 w-full">
               <button
                 @click="showSOSDialog = false"
                 class="flex-1 h-14 rounded-full border border-[#CCCCCC] text-[#333333] text-lg font-medium hover:bg-gray-50 active:scale-95 transition-all"
               >
                 取消
               </button>
               <button
                 @click="showSOSDialog = false"
                 class="flex-1 h-14 rounded-full bg-[#FF5C4D] text-white text-lg font-medium shadow-lg hover:bg-[#FF4C3D] active:scale-95 transition-all"
               >
                 确认
               </button>
            </div>
         </div>
      </div>
    </div>
  </VScaleScreen>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 3s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}

:deep(.el-drawer) {
  background: rgba(0, 0, 0, 0.85) !important;
  backdrop-filter: blur(20px);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
}

:deep(.el-drawer__body) {
  padding: 0;
  overflow: hidden;
}
</style>
