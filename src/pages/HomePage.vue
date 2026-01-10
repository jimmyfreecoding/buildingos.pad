<script setup lang="ts">
import { computed } from 'vue'
import { AppConfig } from '../config'
import { useCockpitStore } from '../stores/cockpit'
import AppBackground from '../components/AppBackground.vue'
import { 
  Zap, Fan, Armchair, Lightbulb, MapPin, Music,
  Droplet, Leaf, Wind, Cloud
} from 'lucide-vue-next'
import VScaleScreen from 'v-scale-screen'

const store = useCockpitStore()

const currentTime = '21:20'
const currentDate = '2024年2月25日 周日'

// Bottom Dock Items
const dockItems = [
  { icon: Zap, label: 'Charge' },
  { icon: Lightbulb, label: 'Light' },
  { icon: Armchair, label: 'Seat' },
  { text: '20°', label: 'Temp L' },
  { icon: Fan, label: 'Climate', active: true, spin: true },
  { text: '20°', label: 'Temp R' },
  { icon: Armchair, label: 'Seat R' },
  { icon: Lightbulb, label: 'Light R' },
  { icon: Zap, label: 'Charge R' },
]

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
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 border-2 border-white/80 flex items-center justify-center rounded-sm">
             <span class="text-xl font-bold">Z</span>
          </div>
          <span class="text-2xl font-medium tracking-widest">ZEEKR</span>
        </div>
        
        <!-- Date/Time -->
        <div class="text-right text-white/90 font-medium">
          {{ currentDate }} {{ currentTime }}
        </div>
      </header>

      <!-- Center Content (Two Columns) -->
      <div class="flex-1 w-full flex items-center">
        
        <!-- Left Panel: Outdoor (Takes up left 50%) -->
        <div class="flex-1 h-[500px] flex flex-col justify-between items-center py-4 border-r border-white/10">
           
           <h2 class="text-4xl font-bold tracking-wide">极企大厦室外</h2>
           
           <!-- Big Temp -->
           <div class="flex items-start leading-none">
              <span class="text-[18rem] font-bold">3</span>
              <span class="text-5xl mt-6 font-light">°C</span>
           </div>

           <!-- Icons Row -->
           <div class="flex items-center gap-12 text-2xl">
              <div class="flex items-center gap-3">
                 <Droplet class="w-8 h-8" />
                 <span>38%</span>
              </div>
              <div class="flex items-center gap-3">
                 <Leaf class="w-8 h-8" />
                 <span>28</span>
              </div>
           </div>

           <!-- Details Row -->
           <div class="flex items-center gap-6 text-white/80 text-lg">
              <span>风力 4m/s</span>
              <span>云量 28%</span>
              <span>AQI 80</span>
           </div>
        </div>

        <!-- Right Panel: Indoor (Takes up right 50%) -->
        <div class="flex-1 h-[500px] flex flex-col justify-between items-center py-4">
           <h2 class="text-4xl font-bold tracking-wide">
              室内26F <span class="text-orange-500">A</span>区
           </h2>
           
           <!-- Big Temp -->
           <div class="flex items-start leading-none">
              <span class="text-[18rem] font-bold">21</span>
              <span class="text-5xl mt-6 font-light">°C</span>
           </div>

           <!-- Icons Row -->
           <div class="flex items-center gap-12 text-2xl">
              <div class="flex items-center gap-3">
                 <Droplet class="w-8 h-8" />
                 <span>38%</span>
              </div>
              <div class="flex items-center gap-3">
                 <Leaf class="w-8 h-8" />
                 <span>28</span>
              </div>
           </div>

           <!-- Details Row -->
           <div class="flex items-center gap-6 text-white/80 text-lg">
              <span>Co<sub>2</sub> 38</span>
              <span>甲醛 28</span>
              <span>综合 0.121</span>
           </div>
        </div>

      </div>

      <!-- Bottom Dock -->
      <div class="h-28 bg-black/30 backdrop-blur-md flex justify-center items-center gap-20 px-10">
         <template v-for="(item, index) in dockItems" :key="index">
            <div class="flex flex-col items-center justify-center gap-1 opacity-90 hover:opacity-100 transition-opacity cursor-pointer">
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