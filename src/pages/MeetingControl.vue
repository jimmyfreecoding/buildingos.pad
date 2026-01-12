<script setup lang="ts">
import { ref } from 'vue'
import { useDateFormat, useNow } from '@vueuse/core'
import AppBackground from '../components/AppBackground.vue'
import AppLogo from '../components/AppLogo.vue'
import EnvironmentControl from './EnvironmentControl.vue'
import VideoMeeting from './VideoMeeting.vue'
import { useCockpitStore } from '../stores/cockpit'
import { 
  Phone, Cast, Video, SlidersHorizontal, 
  HelpCircle, LayoutGrid, Hash
} from 'lucide-vue-next'

const store = useCockpitStore()
const now = useNow()
const currentTime = useDateFormat(now, 'HH:mm')
const currentDate = useDateFormat(now, 'M月D日 dddd', { locales: 'zh-CN' })

const envDrawer = ref(false)
const videoDrawer = ref(false)

const menuItems = [
  { icon: Cast, label: '本地投屏' },
  { icon: Video, label: '视频会议', dot: true, action: 'video' },
  { icon: SlidersHorizontal, label: '环境控制', action: 'env' }
]

const handleMenuClick = (item: any) => {
  if (item.action === 'env') {
    envDrawer.value = true
  } else if (item.action === 'video') {
    videoDrawer.value = true
  }
}
</script>

<template>
  <div class="relative w-full h-full text-white overflow-hidden flex flex-col">
    <!-- Background -->
    <AppBackground :type="store.background.type" :src="store.background.src" />

    <!-- Top Header -->
    <header class="relative z-10 flex justify-between items-start pt-8 px-10">
      <!-- Logo Area -->
      <div class="flex items-center gap-4">
        <AppLogo />
@      </div>
      
      <!-- Contact Info -->
      <div class="flex items-center gap-6">
        <div class="bg-black/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Phone class="w-3 h-3" />
          </div>
          <span class="text-sm font-medium">会务联系：7723822</span>
        </div>
        <Cast class="w-6 h-6 text-white/80" />
      </div>
    </header>

    <!-- Main Content -->
    <div class="relative z-10 flex-1 flex">
      <!-- Center Area -->
      <div class="flex-1 flex flex-col items-center justify-center -mt-20">
        <!-- Time -->
        <div class="text-[10rem] font-medium leading-none tracking-tighter mb-4">{{ currentTime }}</div>
        <!-- Date -->
        <div class="text-xl text-white/80 mb-16">{{ currentDate }}</div>
        
        <!-- Action Button -->
        <div class="flex items-center gap-4">
          <button class="bg-[#2ecc71] hover:bg-[#27ae60] active:scale-95 transition-all text-white px-10 py-3 rounded-full font-medium text-lg shadow-lg shadow-green-900/20">
            一键开启会议
          </button>
          <HelpCircle class="w-6 h-6 text-white/60 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      <!-- Right Menu -->
      <div class="w-96 flex flex-col justify-center gap-6 pr-10">
        <div 
          v-for="(item, index) in menuItems" 
          :key="index"
          class="h-32 bg-white/10 backdrop-blur-md rounded-3xl flex items-center px-8 gap-6 cursor-pointer hover:bg-white/15 transition-all active:scale-[0.98] group"
          @click="handleMenuClick(item)"
        >
          <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors relative">
            <component :is="item.icon" class="w-8 h-8" />
            <div v-if="item.dot" class="absolute top-4 right-4 w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
          <span class="text-2xl font-medium tracking-wide">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- Bottom Info -->
    <div class="relative z-10 px-10 pb-10 flex gap-4">
      <div class="bg-black/20 backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-3">
        <div class="w-6 h-6 rounded-full bg-white flex items-center justify-center">
          <LayoutGrid class="w-3.5 h-3.5 text-black" />
        </div>
        <span class="font-medium">大会议室</span>
      </div>
      
      <div class="bg-black/20 backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-3">
        <div class="w-6 h-6 rounded-full bg-white flex items-center justify-center">
          <Hash class="w-3.5 h-3.5 text-black" />
        </div>
        <span class="font-medium">会议号：433-324-542-333</span>
      </div>
    </div>

    <!-- Environment Control Drawer -->
    <el-drawer
      v-model="envDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/50 !text-white backdrop-blur-xl"
    >
      <EnvironmentControl @close="envDrawer = false" />
    </el-drawer>

    <!-- Video Meeting Drawer -->
    <el-drawer
      v-model="videoDrawer"
      :modal="false"
      direction="btt"
      :with-header="false"
      size="100%"
      class="!bg-black/50 !text-white backdrop-blur-xl"
    >
      <VideoMeeting @close="videoDrawer = false" />
    </el-drawer>
  </div>
</template>