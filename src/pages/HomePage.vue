<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppConfig } from '../config'
import { useCockpitStore } from '../stores/cockpit'
import AppBackground from '../components/AppBackground.vue'
import SmartBuildingPage from './SmartBuilding.vue'
import ControlPage from './Control.vue'
import LightPage from './Light.vue'
import SpacePage from './Space.vue'
import EnergyPage from './Energy.vue'
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import QualityCard from '../components/QualityCard.vue'
import { 
  Zap, Fan, Armchair, Lightbulb, 
  Droplet, Thermometer, CloudRain
} from 'lucide-vue-next'
import VScaleScreen from 'v-scale-screen'

const router = useRouter()
const store = useCockpitStore()

const controlDrawer = ref(false)
const lightDrawer = ref(false)
const spaceDrawer = ref(false)
const smartBuildingDrawer = ref(false)
const energyDrawer = ref(false)

// Bottom Dock Items
const dockItems = [
  { icon: Zap, label: 'Charge' },
  { icon: Lightbulb, label: 'Light' },
  { icon: Armchair, label: 'Seat' },
  { text: '20°', label: 'Temp L' ,action:'smartBuilding'},
  { icon: Fan, label: 'Climate', active: true,  spin: true },
  { text: '20°', label: 'Temp R' },
  { icon: Armchair, label: 'Seat R' },
  { icon: Lightbulb, label: 'Light R' },
  { icon: Zap, label: 'Charge R' },
]

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
  }
}

</script>

<template>
  <VScaleScreen :width="AppConfig.design.width" :height="AppConfig.design.height" :fullScreen="true">
    <!-- Background Layer -->
    <AppBackground :type="store.background.type" :src="store.background.src" />

    <!-- Main Container -->
    <div class="relative z-10 w-full h-full text-white overflow-hidden flex flex-col">
      
      <!-- Top Header -->
      <header class="flex justify-between items-start pt-8 px-10">
        <!-- Logo -->
        <AppLogo />
        
        <!-- Date/Time -->
        <TimeWidget />
      </header>

      <!-- Center Content (Two Columns) -->
      <div class="flex-1 w-full flex items-center relative">
        
        <!-- Vertical Divider -->
        <div class="absolute left-1/2 top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

        <!-- Left Panel: Indoor (Takes up left 50%) -->
        <div class="flex-1 h-full flex flex-col justify-between px-16 py-10">
           
           <!-- Center Group -->
           <div class="flex flex-col gap-8 my-auto">
              <!-- Header -->
              <div class="flex items-center gap-2 text-white/80 text-xl">
                  <Thermometer class="w-6 h-6" />
                  <span>42F B区 室内</span>
              </div>
              
              <!-- Big Temp & Humidity Row -->
              <div class="flex items-end gap-12">
                  <!-- Temp -->
                  <div class="flex items-baseline leading-none">
                    <span class="text-[12rem] font-bold tracking-tighter">23</span>
                    <span class="text-[6rem] font-medium mb-4">.7</span>
                    <span class="text-4xl font-light mb-12 ml-2">°C</span>
                  </div>
                  
                  <!-- Humidity -->
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

           <!-- Cards Row -->
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

        <!-- Right Panel: Outdoor (Takes up right 50%) -->
        <div class="flex-1 h-full flex flex-col justify-between px-16 py-10">
           
           <!-- Center Group -->
           <div class="flex flex-col gap-8 my-auto">
              <!-- Header -->
              <div class="flex items-center gap-2 text-white/80 text-xl">
                  <Thermometer class="w-6 h-6" />
                  <span>室外</span>
              </div>
              
              <!-- Big Temp & Weather Row -->
              <div class="flex items-end gap-8">
                  <!-- Temp -->
                  <div class="flex items-baseline leading-none">
                    <span class="text-[12rem] font-bold tracking-tighter">20</span>
                    <span class="text-[6rem] font-medium mb-4">.2</span>
                    <span class="text-4xl font-light mb-12 ml-2">°C</span>
                  </div>
                  
                  <!-- Weather -->
                  <div class="flex flex-col gap-2 mb-10">
                    <div class="text-3xl font-light tracking-wide text-white/90">小雨转晴</div>
                  </div>
              </div>
           </div>

           <!-- Cards Row -->
           <div class="grid grid-cols-3 gap-6">
              <QualityCard 
                title="AQI" 
                status="清新" 
                value="26" 
                :progress="26"
              />
              <QualityCard 
                title="PM2.5" 
                status="优" 
                value="18" 
                unit="μg/m³" 
                :progress="18"
              />
                <QualityCard 
                title="气压" 
                status="优" 
                value="18" 
                unit="μg/m³" 
                :progress="18"
              />
           </div>
        </div>

      </div>

      <!-- Bottom Dock -->
      <div class="h-28 bg-black/40 backdrop-blur-md flex justify-center items-center gap-20 px-10">
         <template v-for="(item, index) in dockItems" :key="index">
            <div 
               class="flex flex-col items-center justify-center gap-1 opacity-90 hover:opacity-100 cursor-pointer"
               @click="handleDockClick(item)"
            >
               <!-- Icon or Text or Image -->
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

               <!-- Caption (e.g. for Fan) -->
               <span v-if="'caption' in item" class="text-xs font-light mt-1">{{ item.caption }}</span>
            </div>
         </template>
      </div>

    </div>

    <!-- Control Drawer -->
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

    <!-- Light Drawer -->
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

    <!-- Space Drawer -->
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

    <!-- Smart Building Drawer -->
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

    <!-- Energy Drawer -->
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