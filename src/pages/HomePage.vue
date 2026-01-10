<script setup lang="ts">
import { computed } from 'vue'
import { AppConfig } from '../config'
import { useCockpitStore } from '../stores/cockpit'
import AppBackground from '../components/AppBackground.vue'
import BaseCard from '../components/BaseCard.vue'
import ToggleItem from '../components/ToggleItem.vue'
import VerticalControl from '../components/VerticalControl.vue'
import MonitorWidget from '../components/MonitorWidget.vue'
import { 
  Zap, Fan, RotateCw, Power, Settings, Sun, 
  ChevronLeft, ChevronRight, Pause, X,
  Thermometer, Droplet, Wind, CloudFog,
  ArrowUp, ArrowDown
} from 'lucide-vue-next'
import VScaleScreen from 'v-scale-screen'

const store = useCockpitStore()

const currentTime = '09:01:02'
const currentDate = '07/01/2024'

// Mock Data for new Layout
const lightingList = [
  { id: 'office', label: '办公室灯光', isOn: true },
  { id: 'meeting', label: '会议室灯光', isOn: false },
  { id: 'office2', label: '办公室灯光', isOn: true },
]

</script>

<template>
  <VScaleScreen :width="AppConfig.design.width" :height="AppConfig.design.height" :fullScreen="true">
    <!-- Background Layer -->
    <AppBackground :type="store.background.type" :src="store.background.src" />

    <!-- Main Container -->
    <div class="relative z-10 w-full h-full p-8 text-white overflow-hidden flex flex-col">
      
      <!-- Top Header -->
      <header class="flex justify-between items-center mb-6 px-2">
        <div class="text-2xl font-bold tracking-wider flex items-center gap-2">
          <div class="w-8 h-8 border-2 border-white flex items-center justify-center rounded-sm">
             <span class="text-lg font-bold">Z</span>
          </div>
          ZEEKR
        </div>
        <div class="text-right">
          <div class="text-2xl font-medium tracking-wide">{{ currentTime }}</div>
          <div class="text-sm text-white/60">{{ currentDate }}</div>
        </div>
      </header>

      <!-- Main Grid Content -->
      <div class="grid grid-cols-12 gap-6 flex-1 min-h-0">
        
        <!-- Column 1: Lighting Control (Span 4) -->
        <div class="col-span-4 flex flex-col gap-4">
           <div class="text-xl font-bold tracking-wide">照明控制</div>
           <BaseCard className="flex-1 !bg-white/5 !border-white/5 !rounded-3xl p-6 flex flex-col gap-6">
              <div class="flex flex-1 gap-6">
                 <!-- Left Slider Area -->
                 <div class="w-24 bg-black/20 rounded-2xl flex flex-col justify-between items-center py-6">
                    <Sun class="w-6 h-6 text-white/70" />
                    <!-- Mock Slider Track -->
                    <div class="w-2 flex-1 bg-white/10 rounded-full my-4 relative">
                       <div class="absolute bottom-0 left-0 w-full h-1/2 bg-white rounded-full"></div>
                    </div>
                    <Sun class="w-6 h-6 text-white" />
                 </div>
                 
                 <!-- Right Button List -->
                 <div class="flex-1 flex flex-col gap-4">
                    <div 
                      v-for="item in lightingList" 
                      :key="item.id"
                      class="h-20 bg-white/10 rounded-2xl flex items-center justify-between px-6 active:scale-95 transition-all cursor-pointer hover:bg-white/20"
                    >
                       <span class="text-lg font-medium">{{ item.label }}</span>
                       <div class="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center">
                          <Power class="w-4 h-4" :class="item.isOn ? 'text-green-400' : 'text-white/50'" />
                       </div>
                    </div>
                 </div>
              </div>

              <!-- Bottom Power Button -->
              <button class="h-20 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
                 <Power class="w-8 h-8" />
              </button>
           </BaseCard>
        </div>

        <!-- Column 2: Climate Control (Span 4) -->
        <div class="col-span-4 flex flex-col gap-4">
           <div class="text-xl font-bold tracking-wide">空调控制</div>
           <BaseCard className="flex-1 !bg-white/5 !border-white/5 !rounded-3xl p-6 flex flex-col gap-6">
              <!-- Status Bar -->
              <div class="h-16 bg-white/10 rounded-full flex items-center justify-between px-8">
                 <span class="text-lg text-white/80">当前温度：17°C</span>
                 <span class="text-lg text-white/80">空调模式：制冷</span>
              </div>

              <!-- Controls Area -->
              <div class="flex-1 flex gap-6">
                 <!-- Temp Control -->
                 <div class="flex-1 bg-black/20 rounded-3xl flex flex-col items-center justify-between py-8">
                    <button class="p-4 hover:bg-white/5 rounded-full"><ArrowUp class="w-8 h-8" /></button>
                    <div class="text-5xl font-light">26<span class="text-2xl">°C</span></div>
                    <button class="p-4 hover:bg-white/5 rounded-full"><ArrowDown class="w-8 h-8" /></button>
                 </div>
                 <!-- Fan Control -->
                 <div class="flex-1 bg-black/20 rounded-3xl flex flex-col items-center justify-between py-8">
                    <button class="p-4 hover:bg-white/5 rounded-full"><ArrowUp class="w-8 h-8" /></button>
                    <div class="flex flex-col items-center gap-2">
                       <Fan class="w-10 h-10 animate-spin-slow" />
                       <div class="flex gap-1">
                          <div class="w-2 h-2 bg-white rounded-full"></div>
                          <div class="w-2 h-2 bg-white rounded-full"></div>
                          <div class="w-2 h-2 bg-white/30 rounded-full"></div>
                       </div>
                    </div>
                    <button class="p-4 hover:bg-white/5 rounded-full"><ArrowDown class="w-8 h-8" /></button>
                 </div>
              </div>

              <!-- Bottom Power Button -->
              <button class="h-20 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
                 <Power class="w-8 h-8" />
              </button>
           </BaseCard>
        </div>

        <!-- Column 3: Environment (Span 4) -->
        <div class="col-span-4 flex flex-col gap-4">
           <div class="text-xl font-bold tracking-wide">室内环境</div>
           <!-- Top Row: Temp & Humidity -->
           <div class="grid grid-cols-2 gap-4 h-40">
              <BaseCard className="!bg-white/5 !border-white/5 !rounded-3xl p-5 flex flex-col justify-between">
                 <span class="text-white/60">温度</span>
                 <div>
                    <div class="text-4xl font-light mb-2">23<span class="text-lg">°C</span></div>
                    <div class="h-1 w-full bg-gradient-to-r from-blue-500 via-green-400 to-orange-500 rounded-full"></div>
                 </div>
              </BaseCard>
              <BaseCard className="!bg-white/5 !border-white/5 !rounded-3xl p-5 flex flex-col justify-between">
                 <span class="text-white/60">湿度</span>
                 <div>
                    <div class="text-4xl font-light mb-2">50<span class="text-lg">%</span></div>
                    <div class="h-1 w-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full"></div>
                 </div>
              </BaseCard>
           </div>

           <!-- Stacked Metrics -->
           <div class="flex-1 flex flex-col gap-4">
              <BaseCard className="flex-1 !bg-white/5 !border-white/5 !rounded-3xl p-5 flex flex-col justify-center">
                 <span class="text-white/60 text-sm mb-1">PM2.5</span>
                 <div class="text-3xl font-light mb-2">8<span class="text-base text-white/60 ml-1">μg/m³</span></div>
                 <div class="h-1 w-full bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-60"></div>
              </BaseCard>
              <BaseCard className="flex-1 !bg-white/5 !border-white/5 !rounded-3xl p-5 flex flex-col justify-center">
                 <span class="text-white/60 text-sm mb-1">CO₂</span>
                 <div class="text-3xl font-light mb-2">564<span class="text-base text-white/60 ml-1">ppm</span></div>
                 <div class="h-1 w-full bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-60"></div>
              </BaseCard>
              <BaseCard className="flex-1 !bg-white/5 !border-white/5 !rounded-3xl p-5 flex flex-col justify-center">
                 <span class="text-white/60 text-sm mb-1">TVOC</span>
                 <div class="text-3xl font-light mb-2">0.085<span class="text-base text-white/60 ml-1">mg/m³</span></div>
                 <div class="h-1 w-full bg-gradient-to-r from-green-400 to-orange-400 rounded-full opacity-60"></div>
              </BaseCard>
           </div>
        </div>

      </div>

      <!-- Bottom Row: Curtain Control -->
      <div class="mt-6 h-48 grid grid-cols-12 gap-6">
         <!-- Left Control Panel -->
         <div class="col-span-4 flex flex-col gap-2">
            <div class="text-xl font-bold tracking-wide mb-2">窗帘控制</div>
            <BaseCard className="flex-1 !bg-white/5 !border-white/5 !rounded-3xl flex items-center justify-around px-8">
               <button class="p-4 hover:bg-white/10 rounded-full active:scale-95 transition-all"><ChevronLeft class="w-8 h-8" /></button>
               <button class="p-6 border border-white/20 rounded-full hover:bg-white/10 active:scale-95 transition-all"><Pause class="w-8 h-8" /></button>
               <button class="p-4 hover:bg-white/10 rounded-full active:scale-95 transition-all"><ChevronRight class="w-8 h-8" /></button>
            </BaseCard>
         </div>

         <!-- Right Curtain Visuals (Span 8) -->
         <div class="col-span-8 relative">
            <!-- Curtain Rail -->
            <div class="absolute top-4 left-0 right-0 h-2 bg-white/20 rounded-full"></div>
            <!-- Curtain Visuals -->
            <div class="absolute top-4 bottom-0 left-10 right-10 flex justify-between">
               <div class="w-[45%] h-full bg-gradient-to-b from-white/10 to-transparent backdrop-blur-sm rounded-b-xl border-x border-white/5 transform origin-top scale-y-95"></div>
               <div class="w-[45%] h-full bg-gradient-to-b from-white/10 to-transparent backdrop-blur-sm rounded-b-xl border-x border-white/5 transform origin-top scale-y-95"></div>
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
</style>
