<script setup lang="ts">
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import BaseCard from '../components/BaseCard.vue'
import QualityCard from '../components/QualityCard.vue'

// Data
const cleaningTime = '09:00'
const cleaningDate = '07月01日'

const otherFloors = [
  { floor: '43F', free: 3, statuses: ['free', 'free', 'free', 'occupied', 'free'] },
  { floor: '41F', free: 2, statuses: ['occupied', 'free', 'free', 'occupied', 'free'] }
]

const currentFloor = {
  floor: '42F',
  statuses: ['free', 'free', 'occupied', 'free', 'free']
}

const metrics = [
  { title: '温度', status: '舒适', value: '26.2', unit: '℃', progress: 70, statusColor: 'text-green-400' },
  { title: '湿度', status: '舒适', value: '63', unit: '%', progress: 60, statusColor: 'text-green-400' },
  { title: '硫化氢', status: '正常', value: '0.001', unit: 'mg/m³', progress: 10, statusColor: 'text-green-400' },
  { title: 'PM2.5', status: '优', value: '18', unit: 'μg/m³', progress: 20, statusColor: 'text-green-400' },
  { title: '氨气', status: '安全', value: '0.000', unit: 'mg/m³', progress: 0, statusColor: 'text-green-400' }
]

const getStatusColor = (status: string) => {
  return status === 'free' ? 'bg-[#4ade80]' : 'bg-[#ef4444]'
}
</script>

<template>
  <div class="w-full h-full bg-[#0f1b2a] text-white flex flex-col p-6 box-border overflow-hidden">
    <!-- Header -->
    <header class="flex justify-between items-start px-2 shrink-0 mb-4">
      <AppLogo />
      <TimeWidget />
    </header>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 grid grid-cols-12 grid-rows-[1fr_auto] gap-6">
      <!-- Top Row: Left Column + Center Panel -->
      <div class="col-span-12 grid grid-cols-12 gap-6 h-full min-h-0">
        <!-- Left Column -->
        <div class="col-span-3 flex flex-col gap-6 h-full min-h-0">
          <!-- Recent Cleaning -->
          <BaseCard title="最近保洁时间" class="h-[35%] !bg-[#152234] border-none shrink-0 flex flex-col">
             <div class="flex-1 flex flex-col justify-center mt-2">
               <div class="text-[clamp(2.5rem,4vw,3.75rem)] font-medium tracking-tight mb-2 leading-none">{{ cleaningTime }}</div>
               <div class="text-lg text-white/50">{{ cleaningDate }}</div>
             </div>
          </BaseCard>

          <!-- Other Floors -->
          <BaseCard title="其他楼层" class="h-[65%] !bg-[#152234] border-none min-h-0 flex flex-col">
            <div class="flex-1 flex flex-col gap-6 justify-center mt-2">
              <div v-for="floor in otherFloors" :key="floor.floor" class="flex items-center justify-start">
                <span class="text-[clamp(1rem,1.5vw,1.25rem)] text-white/80 font-medium whitespace-nowrap mr-2 xl:mr-4">{{ floor.floor }}-空闲{{ floor.free }}</span>
                <div class="flex gap-1.5 xl:gap-2 items-center flex-wrap">
                  <div 
                    v-for="(status, idx) in floor.statuses" 
                    :key="idx"
                    class="w-[clamp(0.625rem,0.9vw,0.875rem)] h-[clamp(0.625rem,0.9vw,0.875rem)] rounded-full shrink-0"
                    :class="getStatusColor(status)"
                  ></div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>

        <!-- Center Panel -->
        <div class="col-span-9 h-full min-h-0">
           <div class="w-full h-full rounded-3xl bg-[#152234] flex flex-col items-center justify-center relative overflow-hidden">
              <!-- Background Wave Effect -->
              <div class="absolute inset-0 opacity-30">
                 <div class="absolute top-1/2 left-0 w-full h-64 -translate-y-1/2 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-3xl transform rotate-12"></div>
                 <div class="absolute top-1/2 left-0 w-full h-64 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent blur-3xl transform -rotate-6"></div>
              </div>
              
              <h1 class="text-4xl font-medium mb-12 z-10 tracking-widest">{{ currentFloor.floor }}</h1>
              
              <div class="flex items-center justify-between w-full max-w-4xl px-12 z-10">
                 <template v-for="(status, idx) in currentFloor.statuses" :key="idx">
                    <div class="flex-1 flex justify-center relative">
                      <div 
                         class="w-[clamp(3rem,8vw,5rem)] h-[clamp(3rem,8vw,5rem)] rounded-full shadow-lg transition-all duration-500 hover:scale-105 shrink-0"
                         :class="getStatusColor(status)"
                       ></div>
                      
                      <!-- Right Separator line (except for last item) -->
                      <div v-if="idx < currentFloor.statuses.length - 1" class="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-[clamp(2rem,6vw,4rem)] bg-white/10 translate-x-[50%]"></div>
                    </div>
                 </template>
              </div>
           </div>
        </div>
      </div>

      <!-- Bottom Row: Metrics -->
      <div class="col-span-12 h-32 xl:h-40 grid grid-cols-5 gap-6 shrink-0 z-10 relative">
        <QualityCard
          v-for="item in metrics"
          :key="item.title"
          :title="item.title"
          :status="item.status"
          :value="item.value"
          :unit="item.unit"
          :progress="item.progress"
          :status-color="item.statusColor"
          class="!bg-[#152234] border-none h-full"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(body), :global(#app) {
  height: 100vh;
  overflow: hidden;
  background-color: #0f1b2a;
}
</style>
