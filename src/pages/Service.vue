<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AppConfig } from '../config'
import { useCockpitStore } from '../stores/cockpit'
import AppBackground from '../components/AppBackground.vue'
import BaseCard from '../components/BaseCard.vue'
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import VScaleScreen from 'v-scale-screen'
import { 
  Home, FileText, User, Cloud
} from 'lucide-vue-next'

// Mock QR Code Image (Replace with actual QR code resource if available)
const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ServiceRequest'

const router = useRouter()
const store = useCockpitStore()

const handleHome = () => {
  emit('close')
}

const emit = defineEmits(['close'])

const serviceCards = [
  {
    title: '报事报修',
    subtitle: 'Scan for admin service',
    desc: '故障/清洁/维修“码上报单”',
    icon: FileText,
    bgIcon: 'document'
  },
    {
    title: '保洁服务',
    subtitle: 'Scan for admin service',
    desc: '故障/清洁/维修“码上报单”',
    icon: FileText,
    bgIcon: 'document'
  },
  {
    title: '楼层管家',
    subtitle: 'floor butler',
    desc: '有问题直接找楼长 Tel: 130000000',
    icon: User,
    bgIcon: 'person'
  },
  {
    title: '行政服务',
    subtitle: 'administrative services',
    desc: '行政服务咨询 Tel：130000000',
    icon: Cloud,
    bgIcon: 'cloud'
  }
]

</script>

<template>


    <!-- Main Container -->
    <div class="relative z-10 w-full h-full text-white overflow-hidden flex flex-col p-8 bg-black/90">
      
      <!-- Top Header -->
      <header class="flex justify-between items-start mb-10 px-2">
        <div class="flex items-center gap-4">
           <AppLogo />
           <div class="h-8 w-px bg-white/20"></div>
           <h1 class="text-2xl font-bold tracking-wide">综合服务</h1>
        </div>
        <TimeWidget />
      </header>

      <!-- Content Grid -->
      <div class="flex-1 grid grid-cols-2 gap-8 px-10 pb-10 min-h-0">
         
         <!-- Left Column -->
         <div class="flex flex-col gap-8">
            <BaseCard 
              v-for="(card, index) in serviceCards.slice(0, 2)" 
              :key="index"
              className="flex-1 !bg-[#1e1e1e] !border-none !rounded-2xl relative overflow-hidden group"
            >
               <div class="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 rounded-l-full transform translate-x-1/4 scale-150 opacity-20 group-hover:scale-125 transition-transform duration-700"></div>
               <div class="absolute right-10 top-1/2 -translate-y-1/2 text-white/5">
                  <component :is="card.icon" class="w-40 h-40" />
               </div>

               <div class="h-full flex items-center p-10 gap-8 relative z-10">
                  <!-- QR Code -->
                  <div class="w-40 h-40 bg-white rounded-xl p-2 shrink-0 flex items-center justify-center shadow-lg">
                     <img :src="qrCodeUrl" class="w-full h-full object-contain" />
                  </div>
                  
                  <!-- Text Info -->
                  <div class="flex flex-col h-full justify-center gap-2">
                     <div>
                        <h2 class="text-4xl font-bold mb-1">{{ card.title }}</h2>
                        <p class="text-[#FF5C4D] text-sm">{{ card.subtitle }}</p>
                     </div>
                     <p class="text-white/60 text-xl mt-2">{{ card.desc }}</p>
                     <p class="text-white/30 text-xs mt-auto">请使用企业微信扫描二维码</p>
                  </div>
               </div>
            </BaseCard>
         </div>

         <!-- Right Column -->
         <div class="flex flex-col justify-start gap-8">
            <BaseCard 
              v-for="(card, index) in serviceCards.slice(2)" 
              :key="index"
              className="h-[48%] !bg-[#1e1e1e] !border-none !rounded-2xl relative overflow-hidden group"
            >
               <div class="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 rounded-l-full transform translate-x-1/4 scale-150 opacity-20 group-hover:scale-125 transition-transform duration-700"></div>
               <div class="absolute right-10 top-1/2 -translate-y-1/2 text-white/5">
                  <component :is="card.icon" class="w-40 h-40" />
               </div>

               <div class="h-full flex items-center p-10 gap-8 relative z-10">
                  <!-- QR Code -->
                  <div class="w-40 h-40 bg-white rounded-xl p-2 shrink-0 flex items-center justify-center shadow-lg">
                     <img :src="qrCodeUrl" class="w-full h-full object-contain" />
                  </div>
                  
                  <!-- Text Info -->
                  <div class="flex flex-col h-full justify-center gap-2">
                     <div>
                        <h2 class="text-4xl font-bold mb-1">{{ card.title }}</h2>
                        <p class="text-[#FF5C4D] text-sm">{{ card.subtitle }}</p>
                     </div>
                     <p class="text-white/60 text-xl mt-2">{{ card.desc }}</p>
                     <p class="text-white/30 text-xs mt-auto">请使用企业微信扫描二维码</p>
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
</style>
