<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppConfig } from '../config'
import { useCockpitStore } from '../stores/cockpit'
import AppBackground from '../components/AppBackground.vue'
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import BaseCard from '../components/BaseCard.vue'
import VScaleScreen from 'v-scale-screen'
import { 
  Briefcase, Sun, Power, Info, ChevronRight, 
  Pause, Snowflake, Wind, Home, Undo2,
  Settings, Columns, ChevronsLeftRight, ChevronsRightLeft,
  Circle
} from 'lucide-vue-next'

const router = useRouter()
const store = useCockpitStore()

// State for drawers
const lightingDrawer = ref(false)
const curtainDrawer = ref(false)

// AC State
const acMode = ref<'smart' | 'manual'>('smart')
const acTemp = ref(20)
const acState = ref({
  power: true,
  mode: 'cool', // cool, heat, fan
  speed: 'mid' // low, mid, high
})

// Lighting Detail Data
const lights = ref([
  { id: 1, name: '办公桌吊灯', type: 'switch', on: true },
  { id: 2, name: '会议桌吊灯', type: 'switch', on: false },
  { id: 3, name: '内圈筒灯', type: 'dimmer', value: 50, on: true },
  { id: 4, name: '外圈灯带', type: 'dimmer', value: 70, on: true },
  { id: 5, name: '外圈筒灯', type: 'dimmer', value: 70, on: true },
  { id: 6, name: '内圈灯带', type: 'dimmer', value: 100, on: true },
])

// Curtain Detail Data
const curtains = ref([
  { id: 'left', name: '窗帘左' },
  { id: 'center', name: '窗帘中' },
  { id: 'right', name: '窗帘右' },
])

const handleHome = () => {
  router.push('/')
}

const toggleLight = (light: any) => {
  light.on = !light.on
}

const formatTemp = (val: number) => {
  return val.toFixed(1)
}
</script>

<template>
  <VScaleScreen :width="AppConfig.design.width" :height="AppConfig.design.height" :fullScreen="true">
    <!-- Background -->
    <AppBackground :type="store.background.type" :src="store.background.src" />

    <!-- Main Container -->
    <div class="relative z-10 w-full h-full text-white flex flex-col overflow-hidden p-8">
      
      <!-- Header -->
      <header class="flex justify-between items-start mb-6 shrink-0">
        <AppLogo />
        <TimeWidget />
      </header>

      <!-- Main Content Grid -->
      <div class="flex-1 grid grid-cols-3 gap-6 min-h-0">
        
        <!-- Left Column -->
        <div class="col-span-2 flex flex-col gap-6">
          
          <!-- Lighting Section -->
          <BaseCard class="flex-1 flex flex-col bg-[#1]1e1e]/8000 border-none !p-6">
            <div class="flex justify-between items-center mb-6">
              <span class="text-2xl font-medium">照明</span>
              <button 
                @click="lightingDrawer = true"
                class="flex items-center gap-1 text-white/60 hover:text-white bg-white/10 px-3 py-1 rounded-full text-sm transition-colors"
              >
                更多控制 <ChevronRight class="w-4 h-4" />
              </button>
            </div>
            
            <div class="grid grid-cols-3 gap-4 h-full">
              <!-- Quick Modes -->
              <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center gap-4 transition-colors group">
                <div class="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/50">
                  <Briefcase class="w-8 h-8 text-white/80" />
                </div>
                <span class="text-2xl">办公模式</span>
              </button>
              
              <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center gap-4 transition-colors group">
                <div class="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/50">
                  <Sun class="w-8 h-8 text-white/80" />
                </div>
                <span class="text-2xl">全亮模式</span>
              </button>
              
              <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center gap-4 transition-colors group">
                <div class="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:border-white/50">
                  <Power class="w-8 h-8 text-white/80" />
                </div>
                <span class="text-2xl">一键全关</span>
              </button>
            </div>
          </BaseCard>

          <!-- Curtain Section -->
          <BaseCard class="flex-1 flex flex-col bg-transparent border-none !p-6">
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-4">
                <span class="text-2xl font-medium">窗帘</span>
                <div class="flex items-center gap-1 text-white/40 text-sm">
                  <Info class="w-4 h-4" />
                  <span>控制窗帘前，请确保已解开束带</span>
                </div>
              </div>
              <button 
                @click="curtainDrawer = true"
                class="flex items-center gap-1 text-white/60 hover:text-white bg-white/10 px-3 py-1 rounded-full text-sm transition-colors"
              >
                更多控制 <ChevronRight class="w-4 h-4" />
              </button>
            </div>

            <div class="flex flex-col gap-4 mt-auto">
              <!-- Row 1: Cloth -->
              <BaseCard class="grid grid-cols-4 gap-4 flex-1 bg-[#2a2a2a]/80 border-white/5 !p-4 !rounded-2xl">
                <div class=" flex flex-col items-center justify-center p-4">
                  <Columns class="w-8 h-8 mb-2 text-white/60" />
                  <span class="text-lg text-white/60">布帘</span>
                </div>
                <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center p-4 transition-colors">
                  <ChevronsLeftRight class="w-8 h-8 mb-2" />
                  <span class="text-lg">打开</span>
                </button>
                <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center p-4 transition-colors">
                  <Pause class="w-8 h-8 mb-2" />
                  <span class="text-lg">暂停</span>
                </button>
                <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center p-4 transition-colors">
                  <ChevronsRightLeft class="w-8 h-8 mb-2" />
                  <span class="text-lg">关闭</span>
                </button>
              </BaseCard>

              <!-- Row 2: Gauze -->
              <BaseCard class="grid grid-cols-4 gap-4 flex-1 bg-[#2a2a2a]/80 border-white/5 !p-4 !rounded-2xl">
                <div class="flex flex-col items-center justify-center p-4">
                  <Columns class="w-8 h-8 mb-2 text-white/40" />
                  <span class="text-lg text-white/60">纱帘</span>
                </div>
                <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center p-4 transition-colors">
                  <ChevronsLeftRight class="w-8 h-8 mb-2" />
                  <span class="text-lg">打开</span>
                </button>
                <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center p-4 transition-colors">
                  <Pause class="w-8 h-8 mb-2" />
                  <span class="text-lg">暂停</span>
                </button>
                <button class="bg-[#2a2a2a]/50 hover:bg-[#333] rounded-2xl flex flex-col items-center justify-center p-4 transition-colors">
                  <ChevronsRightLeft class="w-8 h-8 mb-2" />
                  <span class="text-lg">关闭</span>
                </button>
              </BaseCard>
            </div>
          </BaseCard>

        </div>

        <!-- Right Column -->
        <div class="flex flex-col gap-6">
          
          <!-- AC Section -->
          <BaseCard class="flex-[3] flex flex-col bg-transparent border-none !p-6 relative overflow-visible">
            <div class="flex justify-between items-start mb-8">
              <span class="text-2xl font-medium">空调</span>
              <div class="flex bg-black/20 rounded-full p-1">
                <button 
                  @click="acMode = 'smart'"
                  class="px-4 py-1.5 rounded-full text-sm transition-colors"
                  :class="acMode === 'smart' ? 'bg-[#ff6b4a] text-white' : 'text-white/40 hover:text-white/60'"
                >
                  智控模式
                </button>
                <button 
                  @click="acMode = 'manual'"
                  class="px-4 py-1.5 rounded-full text-sm transition-colors"
                  :class="acMode === 'manual' ? 'bg-[#ff6b4a] text-white' : 'text-white/40 hover:text-white/60'"
                >
                  手动模式
                </button>
              </div>
            </div>

            <!-- Temp Display -->
            <div class="flex flex-col items-center mb-8 px-4">
              <div class="flex justify-between w-full text-white/40 text-sm mb-2">
                <span>16.0°C</span>
                <span>30.0°C</span>
              </div>
              <div class="text-5xl font-light mb-6">{{ acTemp }}°C</div>
              <!-- Slider -->
              <el-slider 
                v-model="acTemp" 
                :min="16" 
                :max="30" 
                :step="0.5"
                :show-tooltip="false"
                class="w-full ac-slider"
              />
            </div>

            <!-- Controls -->
            <div class="grid grid-cols-3 gap-4 mb-auto">
              <!-- Mode -->
              <button 
                @click="acState.mode = 'cool'"
                class="bg-[#2a2a2a] hover:bg-[#333] rounded-xl py-4 flex flex-col items-center gap-2 transition-colors"
                :class="{'!bg-[#3a3a3a] border border-white/20': acState.mode === 'cool'}"
              >
                <Snowflake class="w-6 h-6" />
                <span>制冷</span>
              </button>
              <button 
                @click="acState.mode = 'heat'"
                class="bg-[#2a2a2a] hover:bg-[#333] rounded-xl py-4 flex flex-col items-center gap-2 transition-colors"
                :class="{'!bg-[#3a3a3a] border border-white/20': acState.mode === 'heat'}"
              >
                <Sun class="w-6 h-6" />
                <span>制热</span>
              </button>
              <button 
                @click="acState.mode = 'fan'"
                class="bg-[#2a2a2a] hover:bg-[#333] rounded-xl py-4 flex flex-col items-center gap-2 transition-colors"
                :class="{'!bg-[#3a3a3a] border border-white/20': acState.mode === 'fan'}"
              >
                <Wind class="w-6 h-6" />
                <span>送风</span>
              </button>

              <!-- Speed -->
              <button 
                @click="acState.speed = 'low'"
                class="bg-[#2a2a2a] hover:bg-[#333] rounded-xl py-4 flex flex-col items-center gap-2 transition-colors"
                :class="{'!bg-[#3a3a3a] border border-white/20': acState.speed === 'low'}"
              >
                <Wind class="w-5 h-5 opacity-50" />
                <span>弱风</span>
              </button>
              <button 
                @click="acState.speed = 'mid'"
                class="bg-[#2a2a2a] hover:bg-[#333] rounded-xl py-4 flex flex-col items-center gap-2 transition-colors"
                :class="{'!bg-[#3a3a3a] border border-white/20': acState.speed === 'mid'}"
              >
                <Wind class="w-6 h-6 opacity-75" />
                <span>中风</span>
              </button>
              <button 
                @click="acState.speed = 'high'"
                class="bg-[#2a2a2a] hover:bg-[#333] rounded-xl py-4 flex flex-col items-center gap-2 transition-colors"
                :class="{'!bg-[#3a3a3a] border border-white/20': acState.speed === 'high'}"
              >
                <Wind class="w-7 h-7" />
                <span>强风</span>
              </button>
            </div>

            <!-- Power Button -->
            <button 
              @click="acState.power = !acState.power"
              class="mt-6 w-full bg-white/10 hover:bg-white/20 rounded-full py-4 flex items-center justify-center transition-colors"
              :class="{'bg-white/20': acState.power}"
            >
              <Power class="w-8 h-8 text-white" />
            </button>

          </BaseCard>

          <!-- Exhaust Section -->
          <BaseCard class="flex-1 flex flex-col bg-transparent border-none !p-6">
             <span class="text-2xl font-medium mb-4">排风</span>
             <div class="mt-auto self-end">
                <button class="w-12 h-12 rounded-full bg-[#ff4d4f] hover:bg-[#ff7875] flex items-center justify-center shadow-lg transition-colors">
                   <Power class="w-6 h-6 text-white" />
                </button>
             </div>
          </BaseCard>

        </div>

      </div>

      
    </div>

    <!-- Lighting Drawer -->
    <el-drawer
      v-model="lightingDrawer"
      direction="rtl"
      :size="600"
      :show-close="false"
      class="!bg-[#1a1a1a] !border-l !border-white/10"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
           <span class="text-2xl font-medium text-white">更多控制</span>
           <button 
             @click="lightingDrawer = false"
             class="flex items-center gap-1 text-white/60 hover:text-white bg-white/10 px-4 py-1.5 rounded-full text-sm transition-colors"
           >
             <Undo2 class="w-4 h-4" /> 返回
           </button>
        </div>
      </template>

      <div class="grid grid-cols-2 gap-4 p-4">
         <div 
           v-for="light in lights" 
           :key="light.id"
           class="bg-[#2a2a2a] rounded-xl p-5 flex flex-col justify-between h-40"
         >
            <div class="flex justify-between items-start">
               <span class="text-lg font-medium">{{ light.name }}</span>
               <span v-if="light.type === 'dimmer'" class="text-white/60">{{ light.value }}%</span>
            </div>

            <!-- Controls -->
            <div class="flex items-end justify-between gap-4">
               <!-- Slider for Dimmers -->
               <div v-if="light.type === 'dimmer'" class="flex-1 flex flex-col gap-2">
                  <el-slider 
                    v-model="light.value" 
                    :show-tooltip="false" 
                    class="dimmer-slider"
                  />
                  <div class="flex justify-between text-xs text-white/30 px-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
               </div>

               <!-- Power Btn -->
               <button 
                 @click="toggleLight(light)"
                 class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
                 :class="light.on ? 'bg-[#ff4d4f] text-white' : 'bg-white/10 text-white/40'"
               >
                 <Power class="w-5 h-5" />
               </button>
            </div>
         </div>
      </div>
    </el-drawer>

    <!-- Curtain Drawer -->
    <el-drawer
      v-model="curtainDrawer"
      direction="rtl"
      :size="600"
      :show-close="false"
      class="!bg-[#1a1a1a] !border-l !border-white/10"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
           <span class="text-2xl font-medium text-white">更多控制</span>
           <button 
             @click="curtainDrawer = false"
             class="flex items-center gap-1 text-white/60 hover:text-white bg-white/10 px-4 py-1.5 rounded-full text-sm transition-colors"
           >
             <Undo2 class="w-4 h-4" /> 返回
           </button>
        </div>
      </template>

      <div class="flex flex-col gap-6 p-4">
         <div 
           v-for="curtain in curtains" 
           :key="curtain.id"
           class="bg-[#2a2a2a] rounded-xl p-6"
         >
            <div class="text-lg font-medium mb-4">{{ curtain.name }}</div>
            
            <div class="flex flex-col gap-4">
               <!-- Cloth -->
               <div class="grid grid-cols-4 gap-3">
                 <div class="bg-[#333] rounded-lg flex flex-col items-center justify-center py-3">
                    <Columns class="w-5 h-5 mb-1 text-white/60" />
                    <span class="text-xs text-white/60">布帘</span>
                 </div>
                 <button class="bg-[#333] hover:bg-[#444] rounded-lg flex flex-col items-center justify-center py-3 transition-colors">
                    <ChevronsLeftRight class="w-5 h-5 mb-1" />
                    <span class="text-xs">打开</span>
                 </button>
                 <button class="bg-[#333] hover:bg-[#444] rounded-lg flex flex-col items-center justify-center py-3 transition-colors">
                    <Pause class="w-5 h-5 mb-1" />
                    <span class="text-xs">暂停</span>
                 </button>
                 <button class="bg-[#333] hover:bg-[#444] rounded-lg flex flex-col items-center justify-center py-3 transition-colors">
                    <ChevronsRightLeft class="w-5 h-5 mb-1" />
                    <span class="text-xs">关闭</span>
                 </button>
               </div>
               
               <!-- Gauze -->
               <div class="grid grid-cols-4 gap-3">
                 <div class="bg-[#333] rounded-lg flex flex-col items-center justify-center py-3">
                    <Columns class="w-5 h-5 mb-1 text-white/40" />
                    <span class="text-xs text-white/60">纱帘</span>
                 </div>
                 <button class="bg-[#333] hover:bg-[#444] rounded-lg flex flex-col items-center justify-center py-3 transition-colors">
                    <ChevronsLeftRight class="w-5 h-5 mb-1" />
                    <span class="text-xs">打开</span>
                 </button>
                 <button class="bg-[#333] hover:bg-[#444] rounded-lg flex flex-col items-center justify-center py-3 transition-colors">
                    <Pause class="w-5 h-5 mb-1" />
                    <span class="text-xs">暂停</span>
                 </button>
                 <button class="bg-[#333] hover:bg-[#444] rounded-lg flex flex-col items-center justify-center py-3 transition-colors">
                    <ChevronsRightLeft class="w-5 h-5 mb-1" />
                    <span class="text-xs">关闭</span>
                 </button>
               </div>
            </div>
         </div>
      </div>
    </el-drawer>

  </VScaleScreen>
</template>

<style scoped>
:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 1.5rem;
}

:deep(.ac-slider .el-slider__bar) {
  background-color: white;
  height: 32px;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}
:deep(.ac-slider .el-slider__button) {
  display: none;
}
:deep(.ac-slider .el-slider__runway) {
  background-color: rgba(255,255,255,0.1);
  height: 32px;
  border-radius: 12px;
}

/* Dimmer Slider Styles */
:deep(.dimmer-slider .el-slider__bar) {
  background-color: #e5e7eb; /* Light gray/white */
}
:deep(.dimmer-slider .el-slider__runway) {
  background-color: rgba(255,255,255,0.1);
}
:deep(.dimmer-slider .el-slider__button) {
  width: 16px;
  height: 16px;
  border: none;
}
</style>
