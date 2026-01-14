<script setup lang="ts">
import { ref } from 'vue'
import BaseCard from '../components/BaseCard.vue'
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import { 
  Lightbulb, Power, Thermometer, Snowflake, Wind, 
  ArrowRight
} from 'lucide-vue-next'

// Define Emits
const emit = defineEmits(['close'])

// Mock Data for Lights
const lights = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  name: i % 3 === 0 ? '电话亭外筒灯' : '吊灯-吊灯一',
  isOn: i % 5 !== 0, // Some off
  type: i % 3 === 0 ? 'spot' : 'pendant'
}))

// Mock Data for Map Markers
const mapMarkers = [
  { id: 1, label: '过道照明 1', x: 30, y: 40, active: true },
  { id: 2, label: '照明 1', x: 50, y: 35, active: true },
  { id: 3, label: '过道照明 2', x: 25, y: 55, active: true },
  { id: 4, label: '照明 2', x: 45, y: 50, active: true },
  { id: 5, label: '照明 3', x: 40, y: 65, active: true },
  { id: 6, label: '照明 4', x: 35, y: 80, active: true },
]

const acStatus = {
  temp: 17,
  mode: '制冷',
  fan: '中风'
}

</script>

<template>
  <div class="relative w-full h-full p-8 text-white overflow-hidden flex flex-col bg-black/90">
    
    <!-- Top Header -->
    <header class="flex justify-between items-center mb-6 px-2">
      <AppLogo @click="emit('close')" />
      <TimeWidget />
    </header>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-12 gap-6 flex-1 min-h-0">
      
      <!-- Left Column (Controls) -->
      <div class="col-span-8 flex flex-col gap-6">
        
        <!-- Lighting Control Section -->
        <div class="flex-1 flex flex-col gap-4">
          <div class="text-xl font-bold tracking-wide">8号楼-1F 开放区域 照明控制</div>
          
          <BaseCard className="flex-1 !border-white/5 !bg-white/5 !rounded-3xl p-6 flex flex-col gap-6">
            <!-- Global Controls -->
            <div class="flex flex-col gap-2">
              <div class="text-sm text-white/60">整区设置</div>
              <div class="flex gap-4">
                <button class="w-32 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-sm font-medium">全关</button>
                <button class="w-32 h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-sm font-medium">全开</button>
              </div>
            </div>

            <!-- Light Grid -->
            <div class="grid grid-cols-6 gap-4 overflow-y-auto pr-2">
              <div 
                v-for="light in lights" 
                :key="light.id"
                class="aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                :class="light.isOn ? 'bg-white/20 hover:bg-white/25' : 'bg-white/5 hover:bg-white/10'"
              >
                 <!-- Icon Placeholder (using Lightbulb for generic) -->
                 <Lightbulb 
                   class="w-8 h-8" 
                   :class="light.isOn ? 'text-white fill-white' : 'text-white/40'" 
                 />
                 <span class="text-xs text-center px-2 truncate w-full text-white/80">{{ light.name }}</span>
              </div>
            </div>
          </BaseCard>
        </div>



      </div>

      <!-- Right Column (Map) -->
      <div class="col-span-4 h-full">
         <BaseCard className="h-full !border-white/5 !bg-white/5 !rounded-3xl p-0 overflow-hidden relative">
            <!-- Map Background Placeholder -->
            <div class="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
               <!-- Simple CSS Shapes to mimic floor plan -->
               <div class="w-[80%] h-[70%] border-2 border-white/10 rounded-3xl transform rotate-12 relative">
                  <div class="absolute top-0 right-0 w-1/3 h-full border-l-2 border-white/10 bg-white/5"></div>
                  <div class="absolute bottom-10 left-10 text-white/20 text-4xl font-bold rotate-[-12deg]">2604会议室</div>
               </div>
            </div>

            <!-- Markers -->
            <div 
              v-for="marker in mapMarkers"
              :key="marker.id"
              class="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform z-10"
              :style="{ left: `${marker.x + 20}%`, top: `${marker.y + 10}%` }"
            >
               <div class="flex flex-col items-center">
                  <div class="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg whitespace-nowrap">
                     <Lightbulb class="w-3 h-3 text-orange-500 fill-orange-500" />
                     {{ marker.label }}
                  </div>
                  <!-- Triangle pointer -->
                  <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
               </div>
            </div>

            <!-- Map Controls / Legend (Optional) -->
            <div class="absolute top-6 left-6 flex flex-col gap-2">
               <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                  <span class="text-xs">1F</span>
               </div>
            </div>
         </BaseCard>
      </div>

    </div>
  </div>
</template>