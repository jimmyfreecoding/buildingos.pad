<script setup lang="ts">
import { computed } from 'vue'
import { AppConfig } from '../config'
import { useCockpitStore } from '../stores/cockpit'
import AppBackground from '../components/AppBackground.vue'
import BaseCard from '../components/BaseCard.vue'
import ToggleItem from '../components/ToggleItem.vue'
import VerticalControl from '../components/VerticalControl.vue'
import MonitorWidget from '../components/MonitorWidget.vue'
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import { 
  Zap, Fan, RotateCw, Power, Settings, Sun, 
  ChevronLeft, ChevronRight, Pause, X,
  Thermometer, Droplet, Wind, CloudFog,
  ArrowUp, ArrowDown, ArrowRight, Home
} from 'lucide-vue-next'

const store = useCockpitStore()

// Define Emits
const emit = defineEmits(['close'])

const handleHome = () => {
  emit('close')
}

// Mock Data for new Layout
const lightingList = [
  { id: 'office', label: '办公室灯光', isOn: true },
  { id: 'meeting', label: '会议室灯光', isOn: false },
  { id: 'office2', label: '办公室灯光', isOn: true },
]

</script>

<template>
  <!-- Main Container -->
  <div class="relative w-full h-full p-8 text-white overflow-hidden flex flex-col">
    
    <!-- Top Header -->
    <header class="flex justify-between items-center mb-6 px-2">
      <AppLogo @click="emit('close')" />
      <TimeWidget />
    </header>


    <!-- Main Grid Content -->
    <div class="grid grid-cols-12 gap-6 flex-1 min-h-0 mb-8">


      <!-- Column 2: Climate Control (Span 4) -->
      <div class="col-span-8 h-full">
         <BaseCard className="h-full !border-white/5 !rounded-3xl p-6 flex flex-col gap-4">
            <div class="text-xl font-bold tracking-wide mb-2">空调控制</div>
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
                  <div class="text-6xl font-light">26<span class="text-2xl">°C</span></div>
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
            <button class="h-20 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 active:scale-95">
               <Power class="w-8 h-8" />
            </button>
         </BaseCard>
      </div>

      <!-- Column 3: Environment (Span 4) -->
      <div class="col-span-4 h-full">
         <BaseCard className="h-full !border-white/5 !rounded-3xl p-6 flex flex-col gap-4">
            <div class="text-xl font-bold tracking-wide mb-2">室内环境</div>
            <!-- Top Row: Temp & Humidity -->
            <div class="grid grid-cols-2 gap-4 h-40">
               <div class="bg-white/5 rounded-3xl p-5 flex flex-col justify-between">
                  <span class="text-white/60">温度</span>
                  <div>
                     <div class="text-5xl font-light mb-2">23<span class="text-lg">°C</span></div>
                     <div class="h-1 w-full bg-gradient-to-r from-blue-500 via-green-400 to-orange-500 rounded-full"></div>
                  </div>
               </div>
               <div class="bg-white/5 rounded-3xl p-5 flex flex-col justify-between">
                  <span class="text-white/60">湿度</span>
                  <div>
                     <div class="text-5xl font-light mb-2">50<span class="text-lg">%</span></div>
                     <div class="h-1 w-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full"></div>
                  </div>
               </div>
            </div>

            <!-- Stacked Metrics -->
            <div class="flex-1 flex flex-col gap-4">
               <div class="flex-1 bg-white/5 rounded-3xl p-5 flex flex-col justify-center">
                  <span class="text-white/60 text-sm mb-1">PM2.5</span>
                  <div class="text-3xl font-light mb-2">8<span class="text-base text-white/60 ml-1">μg/m³</span></div>
                  <div class="h-1 w-full bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-60"></div>
               </div>
               <div class="flex-1 bg-white/5 rounded-3xl p-5 flex flex-col justify-center">
                  <span class="text-white/60 text-sm mb-1">CO₂</span>
                  <div class="text-3xl font-light mb-2">564<span class="text-base text-white/60 ml-1">ppm</span></div>
                  <div class="h-1 w-full bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-60"></div>
               </div>
               <div class="flex-1 bg-white/5 rounded-3xl p-5 flex flex-col justify-center">
                  <span class="text-white/60 text-sm mb-1">TVOC</span>
                  <div class="text-3xl font-light mb-2">0.085<span class="text-base text-white/60 ml-1">mg/m³</span></div>
                  <div class="h-1 w-full bg-gradient-to-r from-green-400 to-orange-400 rounded-full opacity-60"></div>
               </div>
            </div>
         </BaseCard>
      </div>

    </div>

    <!-- Bottom Nav -->
    <div class="flex justify-center mt-6 shrink-0">
       <button 
         @click="handleHome"
         class="bg-[#2a2a2a] hover:bg-[#333] text-white px-8 py-3 rounded-full flex items-center gap-3 transition-colors border border-white/10"
       >
         <Home class="w-5 h-5" />
         <span class="text-lg">返回首页</span>
       </button>
    </div>

  </div>
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
