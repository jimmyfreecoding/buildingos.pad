<script setup lang="ts">
import { ref } from 'vue'
import BaseCard from '../components/BaseCard.vue'
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import { User, Users, Home } from 'lucide-vue-next'

// Define Emits
const emit = defineEmits(['close'])

const handleHome = () => {
  emit('close')
}

// Mock Data for Meeting Rooms
const rooms = [
  { id: '2601', name: '2601', status: 'free' },
  { id: '2602', name: '2602', status: 'free' },
  { id: '2603', name: '2603', status: 'busy' },
  { id: '2604', name: '2604', status: 'free' },
  { id: '2605', name: '2605', status: 'free' },
  { id: '2606', name: '2606', status: 'free' },
  { id: '2607', name: '2607', status: 'free' },
  { id: '2608', name: '2608', status: 'free' },
]

// Mock Data for Map Areas (simplified representation)
const mapAreas = [
  { id: 'female-wc', label: '女卫', status: 'busy', sub: '全满', type: 'wc-f', x: 30, y: 30, w: 20, h: 15 },
  { id: 'male-wc', label: '男卫', status: 'partial', sub: '可用 2', type: 'wc-m', x: 60, y: 30, w: 20, h: 15 },
  { id: '2606', label: '2606会议室', status: 'free', sub: '空闲', type: 'room', x: 25, y: 70, w: 15, h: 15 },
  { id: '2605', label: '2605会议室', status: 'free', sub: '空闲', type: 'room', x: 45, y: 70, w: 15, h: 15 },
  { id: '2604', label: '2604会议室', status: 'busy', sub: '使用中', type: 'room', x: 65, y: 70, w: 15, h: 15 },
]

const getStatusColor = (status: string) => {
  if (status === 'busy') return 'bg-[#ef4444] text-white' // Red
  if (status === 'partial') return 'bg-[#3b82f6]/80 text-white' // Blueish
  return 'bg-[#3b82f6]/40 text-white' // Light Blue
}

const getCardColor = (status: string) => {
  if (status === 'busy') return 'bg-[#ef4444] text-white border-transparent'
  return 'bg-white/10 text-white/90 border-transparent hover:bg-white/15'
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
      
      <!-- Left Column (Room List) -->
      <div class="col-span-8 h-full flex flex-col gap-4">
        <div class="text-xl font-bold tracking-wide pl-2">会议室实时状态</div>
        
        <BaseCard className="flex-1 !border-white/5 !bg-white/5 !rounded-3xl p-8 overflow-y-auto">
          <div class="grid grid-cols-2 gap-6">
            <div 
              v-for="room in rooms" 
              :key="room.id"
              class="h-24 rounded-2xl flex items-center justify-between px-8 text-xl font-medium transition-all cursor-pointer active:scale-[0.98]"
              :class="getCardColor(room.status)"
            >
              <span>{{ room.name }}</span>
              <span>{{ room.status === 'busy' ? '使用中' : '空闲' }}</span>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Right Column (Map) -->
      <div class="col-span-4 h-full">
         <BaseCard className="h-full !border-white/5 !bg-white/5 !rounded-3xl p-0 overflow-hidden relative flex items-center justify-center">
            <!-- Map Container -->
            <div class="relative w-[90%] aspect-square bg-[#1a1a1a] rounded-full border-4 border-white/5 flex items-center justify-center overflow-hidden">
               <!-- Octagonal Base Shape (CSS Clip Path) -->
               <div class="absolute inset-4 bg-white/5 clip-octagon"></div>

               <!-- Areas -->
               <div 
                  v-for="area in mapAreas"
                  :key="area.id"
                  class="absolute flex flex-col items-center justify-center text-center p-2 rounded-lg transition-all cursor-pointer hover:brightness-110"
                  :class="getStatusColor(area.status)"
                  :style="{ 
                    left: `${area.x}%`, 
                    top: `${area.y}%`, 
                    width: `${area.w}%`, 
                    height: `${area.h}%` 
                  }"
               >
                  <div class="flex items-center gap-1 mb-1" v-if="area.type.startsWith('wc')">
                     <User class="w-4 h-4" />
                     <span class="text-sm font-bold">{{ area.label }}</span>
                  </div>
                  <span v-else class="text-xs font-bold mb-1">{{ area.label }}</span>
                  
                  <span class="text-xs opacity-90">{{ area.sub }}</span>

                  <!-- Red dots for male WC -->
                  <div v-if="area.id === 'male-wc'" class="flex gap-1 mt-1 justify-center">
                     <div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                     <div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  </div>
               </div>
               
               <!-- Center Hub -->
               <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 h-1/4 bg-white/5 rounded-xl border border-white/10"></div>
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
.clip-octagon {
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
}
</style>