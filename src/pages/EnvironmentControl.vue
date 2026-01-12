<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Monitor, Camera, Video, Volume2, 
  Lightbulb, LogIn, Blinds, Snowflake, 
  Wind, Plug, LayoutGrid, Hash, 
  Phone, Cast, Reply, Settings
} from 'lucide-vue-next'
import AppLogo from '../components/AppLogo.vue'
import BaseDialog from '../components/Dialog.vue'
import Tabs from '../components/Tabs.vue'
import { 
  Sun, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Snowflake as SnowflakeIcon, Fan, ZoomIn, ZoomOut,
  VolumeX, Volume1, Volume2 as VolumeHigh, Pause,
  Aperture, Filter
} from 'lucide-vue-next'

// Define Emits
const emit = defineEmits(['close'])

// Fresh Air Logic
const showFreshAirDialog = ref(false)
const activeFreshAir = ref(1)
const freshAirList = ref([
  { id: 1, name: '新风1', mode: 'high', power: true },
  { id: 2, name: '新风2', mode: 'auto', power: false },
])

const currentFreshAir = computed(() => freshAirList.value.find(f => f.id === activeFreshAir.value) || freshAirList.value[0])

const freshAirModes = [
  { id: 'auto', label: '自动', icon: 'A' },
  { id: 'low', label: '低风', icon: '1' },
  { id: 'medium', label: '中风', icon: '2' },
  { id: 'high', label: '高风', icon: '3' },
]

const getModeLabel = (modeId: string) => {
  return freshAirModes.find(m => m.id === modeId)?.label || ''
}

// Audio Control Logic
const showAudioDialog = ref(false)
const audioList = ref([
  { id: 1, name: '主扩音量', volume: 81 },
  { id: 2, name: '麦克风音量', volume: 60 },
  { id: 3, name: '背景音乐', volume: 30 },
])

const toggleMute = (audio: any) => {
  if (audio.volume > 0) {
    audio.lastVolume = audio.volume
    audio.volume = 0
  } else {
    audio.volume = audio.lastVolume || 50
  }
}

// Curtain Control Logic
const showCurtainDialog = ref(false)
const activeCurtain = ref('all')
const curtains = ref([
  { id: 'all', name: '全部' },
  { id: '1', name: '窗帘1' },
  { id: '2', name: '窗帘2' },
])

const handleCurtainControl = (action: 'up' | 'pause' | 'down') => {
  console.log(`Curtain ${activeCurtain.value} action: ${action}`)
}

// Socket Control Logic
const showSocketDialog = ref(false)
const sockets = ref([
  { id: 1, name: '插座1', active: false },
  { id: 2, name: '插座2', active: false },
])

const toggleSocket = (socket: any) => {
  socket.active = !socket.active
  console.log(`Toggle socket ${socket.name} to ${socket.active}`)
}

// Matrix Control Logic
const showMatrixDialog = ref(false)
const inputSignals = ref([
  { id: 'wired', name: '有线投屏' },
  { id: 'wireless', name: '无线投屏' },
  { id: 'pc1', name: '会议主机' },
  { id: 'pc2', name: '会议主机2' },
])
const activeInput = ref('wireless')

const outputSignals = ref([
  { id: 'screen1', name: '大屏1' },
  { id: 'screen2', name: '大屏2' },
  { id: 'screen3', name: '大屏3' },
  { id: 'projector', name: '投影仪' },
])
const activeOutput = ref('projector')

const handleMatrixSwitch = () => {
  console.log(`Switch Input ${activeInput.value} to Output ${activeOutput.value}`)
}

// Screen Control Logic
const showScreenDialog = ref(false)
const activeScreen = ref(1)
const screens = ref([
  { id: 1, name: '大屏1', power: true },
  { id: 2, name: '大屏2', power: false },
])
const currentScreen = computed(() => screens.value.find(s => s.id === activeScreen.value) || screens.value[0])

const signalSources = ['HDMI1', 'HDMI2', 'HDMI3', 'VGA']

const handleSourceChange = (source: string) => {
  console.log(`Screen ${activeScreen.value} switch to ${source}`)
}

const handleVolume = (action: 'mute' | 'down' | 'up') => {
  console.log(`Screen ${activeScreen.value} volume ${action}`)
}

// Camera Control Logic
const showCameraDialog = ref(false)
const activeCamera = ref(1)
const cameras = ref([
  { id: 1, name: '摄像头1' },
  { id: 2, name: '摄像头2' },
])

const handlePtz = (direction: string) => {
  console.log(`Camera ${activeCamera.value} move ${direction}`)
}

const handlePreset = (preset: number) => {
  console.log(`Camera ${activeCamera.value} goto preset ${preset}`)
}

const handleZoom = (type: 'in' | 'out') => {
  console.log(`Camera ${activeCamera.value} zoom ${type}`)
}

// Air Conditioner Logic
const showAcDialog = ref(false)
const activeAc = ref(1)
const acList = ref([
  { id: 1, name: '空调1', temp: 26, power: true, mode: 'heat', speed: 'high' },
  { id: 2, name: '空调2', temp: 24, power: false, mode: 'cool', speed: 'low' },
])

const currentAc = computed(() => acList.value.find(ac => ac.id === activeAc.value) || acList.value[0])

const adjustTemp = (delta: number) => {
  if (currentAc.value.power) {
    currentAc.value.temp += delta
  }
}

const toggleAcPower = () => {
  currentAc.value.power = !currentAc.value.power
}

// Light Control Logic
const showLightDialog = ref(false)
const lights = ref([
  { id: 1, name: '照明1', active: true },
  { id: 2, name: '照明1', active: false },
])

const masterSwitch = ref(true)

const toggleLight = (light: any) => {
  light.active = !light.active
  updateMasterSwitch()
}

const updateMasterSwitch = () => {
  masterSwitch.value = lights.value.some(l => l.active)
}

const toggleMaster = () => {
  const newState = !masterSwitch.value
  masterSwitch.value = newState
  lights.value.forEach(l => l.active = newState)
}

// Door Control Logic
const showDoorDialog = ref(false)
const doors = ref([
  { id: 1, name: '门禁1' },
  { id: 2, name: '门禁2' },
])

const handleDoorClick = (door: any) => {
  // Add door unlock logic here
  console.log('Unlock door:', door.name)
}

const devicesRow1 = [
  { icon: Monitor, label: '大屏', action: 'screen' },
  { icon: Camera, label: '摄像头', action: 'camera' },
  { icon: Video, label: '信号切换', action: 'matrix' },
  { icon: Volume2, label: '音频', action: 'audio' },
]

const devicesRow2 = [
  { icon: Lightbulb, label: '照明', action: 'light' },
  { icon: LogIn, label: '门禁', action: 'door' },
  { icon: Blinds, label: '窗帘', action: 'curtain' },
  { icon: Snowflake, label: '空调', action: 'ac' },
  { icon: Wind, label: '新风', action: 'freshAir' },
  { icon: Plug, label: '插座', action: 'socket' },
]

const handleDeviceClick = (item: any) => {
  if (item.action === 'light') {
    showLightDialog.value = true
  } else if (item.action === 'door') {
    showDoorDialog.value = true
  } else if (item.action === 'ac') {
    showAcDialog.value = true
  } else if (item.action === 'camera') {
    showCameraDialog.value = true
  } else if (item.action === 'screen') {
    showScreenDialog.value = true
  } else if (item.action === 'curtain') {
    showCurtainDialog.value = true
  } else if (item.action === 'socket') {
    showSocketDialog.value = true
  } else if (item.action === 'matrix') {
    showMatrixDialog.value = true
  } else if (item.action === 'freshAir') {
    showFreshAirDialog.value = true
  } else if (item.action === 'audio') {
    showAudioDialog.value = true
  }
}
</script>

<template>
  <!-- Main Container -->
  <div class="relative w-full h-full pt-8 px-8 pb-1 text-white overflow-hidden flex flex-col">
    
    <!-- Top Header -->
    <header class="flex justify-between items-center mb-6 px-2">
      <!-- Logo Area -->
      <div class="flex items-center gap-4">
        <AppLogo />
      </div>
      
      <!-- Title -->
      <div class="absolute left-1/2 -translate-x-1/2 text-3xl font-medium tracking-wide">
        大会议室设备控制
      </div>
      
      <!-- Contact Info -->
      <div class="flex items-center gap-6">
        <div class="bg-black/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Phone class="w-3 h-3" />
          </div>
          <span class="text-sm font-medium">会务联系：13985747388</span>
        </div>
        <Cast class="w-6 h-6 text-white/80" />
      </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 flex flex-col items-center justify-center gap-16 pb-10">
      
      <!-- Row 1 -->
      <div class="flex gap-12">
        <div 
          v-for="(item, index) in devicesRow1" 
          :key="index"
          class="flex flex-col items-center gap-4 cursor-pointer group"
          @click="handleDeviceClick(item)"
        >
          <div class="w-40 h-28 rounded-[2rem] border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:border-transparent group-active:scale-95 transition-all duration-300">
            <component :is="item.icon" class="w-14 h-14 group-hover:text-black transition-colors duration-300" />
          </div>
          <span class="text-xl">{{ item.label }}</span>
        </div>
      </div>

      <!-- Row 2 -->
      <div class="flex gap-8">
        <div 
          v-for="(item, index) in devicesRow2" 
          :key="index"
          class="flex flex-col items-center gap-4 cursor-pointer group"
          @click="handleDeviceClick(item)"
        >
          <div class="w-28 h-28 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:border-transparent group-active:scale-95 transition-all duration-300">
            <component :is="item.icon" class="w-10 h-10 group-hover:text-black transition-colors duration-300" />
          </div>
          <span class="text-lg">{{ item.label }}</span>
        </div>
      </div>

    </div>

    <!-- Bottom Footer -->
    <div class="flex justify-between items-end px-2">
      <!-- Left Info -->
      <div class="flex gap-4">
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

      <!-- Right Actions -->
      <div class="flex items-center gap-4">
        <button 
          class="bg-black/20 backdrop-blur-md hover:bg-black/30 active:scale-95 transition-all rounded-full px-6 py-2.5 flex items-center gap-2"
          @click="emit('close')"
        >
          <Reply class="w-5 h-5" />
          <span class="font-medium">返回</span>
        </button>
        
        <button class="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/30 active:scale-95 transition-all flex items-center justify-center">
          <Settings class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Dialogs -->
    <BaseDialog v-model="showLightDialog">
      <!-- Lights Grid -->
      <div class="flex gap-12">
        <div 
          v-for="light in lights" 
          :key="light.id"
          class="flex flex-col items-center gap-4 cursor-pointer group"
          @click="toggleLight(light)"
        >
          <!-- Light Icon Circle -->
          <div 
            class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
            :class="light.active ? 'bg-[#3b82f6] shadow-lg shadow-blue-500/30' : 'bg-gray-200'"
          >
            <Lightbulb 
              class="w-10 h-10 transition-colors duration-300"
              :class="light.active ? 'text-white' : 'text-gray-500'" 
            />
          </div>
          <!-- Label -->
          <span class="text-gray-500 text-sm font-medium">{{ light.name }}</span>
        </div>
      </div>

      <!-- Master Switch (Bottom Right) -->
      <div class="flex justify-end items-center gap-4 mt-8">
        <span class="text-gray-500 text-sm font-medium">总开关</span>
        <el-switch
          v-model="masterSwitch"
          @change="toggleMaster"
          style="--el-switch-on-color: #3b82f6; --el-switch-off-color: #e5e7eb"
        />
      </div>
    </BaseDialog>

    <!-- Door Control Dialog -->
    <BaseDialog v-model="showDoorDialog">
      <div class="flex gap-12">
        <div 
          v-for="door in doors" 
          :key="door.id"
          class="flex flex-col items-center gap-4 cursor-pointer group"
          @click="handleDoorClick(door)"
        >
          <!-- Door Icon Circle -->
          <div 
            class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center transition-all duration-300 group-active:scale-95 group-active:bg-gray-300"
          >
            <div class="w-10 h-10 border-2 border-slate-700 rounded flex items-center justify-center">
               <LogIn class="w-6 h-6 text-slate-700" />
            </div>
          </div>
          <!-- Label -->
          <span class="text-gray-500 text-sm font-medium">{{ door.name }}</span>
        </div>
      </div>
    </BaseDialog>

    <!-- AC Control Dialog -->
    <BaseDialog v-model="showAcDialog">
      <div class="flex flex-col items-center w-full h-full">
        <!-- Tabs -->
        <Tabs 
          v-model="activeAc" 
          :options="acList.map(ac => ({ label: ac.name, value: ac.id }))" 
          class="mb-8"
        />

        <!-- Temperature Display -->
        <div class="flex flex-col items-center mb-12 relative">
          <div class="flex items-center gap-2 text-gray-400 text-sm absolute -left-12 top-4">
            <Sun class="w-4 h-4" />
            <span>高风</span>
          </div>
          <div class="flex items-start text-[#3b5998]">
             <span class="text-[8rem] leading-none font-medium tracking-tighter">{{ currentAc.temp }}</span>
             <span class="text-3xl mt-4 ml-1">℃</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex gap-8 w-full justify-center">
          <div class="flex flex-col items-center gap-3 cursor-pointer group" @click="adjustTemp(1)">
            <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-gray-200">
               <ChevronUp class="w-8 h-8 text-gray-600 fill-current" />
            </div>
            <span class="text-gray-500 text-xs">升温</span>
          </div>

          <div class="flex flex-col items-center gap-3 cursor-pointer group" @click="adjustTemp(-1)">
            <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-gray-200">
               <ChevronDown class="w-8 h-8 text-gray-600 fill-current" />
            </div>
            <span class="text-gray-500 text-xs">降温</span>
          </div>

          <div class="flex flex-col items-center gap-3 cursor-pointer group">
            <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-gray-200">
               <SnowflakeIcon class="w-8 h-8 text-gray-600" />
            </div>
            <span class="text-gray-500 text-xs">模式</span>
          </div>

          <div class="flex flex-col items-center gap-3 cursor-pointer group">
            <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center transition-all group-active:scale-95 group-hover:bg-gray-200">
               <Fan class="w-8 h-8 text-gray-600" />
            </div>
            <span class="text-gray-500 text-xs">风速</span>
          </div>
        </div>

        <!-- Power Switch -->
        <div class="w-full flex justify-end items-center gap-3 mt-4">
          <span class="text-gray-500 text-sm">关机</span>
          <el-switch
            v-model="currentAc.power"
            style="--el-switch-on-color: #3b82f6; --el-switch-off-color: #e5e7eb"
          />
        </div>
      </div>
    </BaseDialog>

    <!-- Camera Control Dialog -->
    <BaseDialog v-model="showCameraDialog" width="700px">
      <div class="flex flex-col items-center w-full h-full">
        <!-- Tabs -->
        <Tabs 
          v-model="activeCamera" 
          :options="cameras.map(c => ({ label: c.name, value: c.id }))" 
          class="mb-8"
        />

        <div class="flex w-full px-8 gap-12">
          <!-- PTZ Controls (Left) -->
          <div class="flex-1 flex items-center justify-center">
            <div class="relative w-48 h-48">
              <!-- Up -->
              <button 
                class="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
                @mousedown="handlePtz('up')"
              >
                <ChevronUp class="w-8 h-8 text-slate-700" />
              </button>
              <!-- Down -->
              <button 
                class="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
                @mousedown="handlePtz('down')"
              >
                <ChevronDown class="w-8 h-8 text-slate-700" />
              </button>
              <!-- Left -->
              <button 
                class="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
                @mousedown="handlePtz('left')"
              >
                <ChevronLeft class="w-8 h-8 text-slate-700" />
              </button>
              <!-- Right -->
              <button 
                class="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
                @mousedown="handlePtz('right')"
              >
                <ChevronRight class="w-8 h-8 text-slate-700" />
              </button>
            </div>
          </div>

          <!-- Presets & Zoom (Right) -->
          <div class="flex-1 flex flex-col items-center gap-6 border-l border-gray-100 pl-12">
            <div class="w-full">
              <div class="text-slate-500 text-sm mb-4 text-center">预设位</div>
              <div class="grid grid-cols-3 gap-3">
                <button 
                  v-for="i in 6" 
                  :key="i"
                  class="w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-slate-700 font-medium transition-all active:scale-95"
                  @click="handlePreset(i)"
                >
                  {{ i }}
                </button>
              </div>
            </div>

            <div class="flex gap-4 mt-2">
              <button 
                class="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
                @mousedown="handleZoom('in')"
              >
                <ZoomIn class="w-6 h-6 text-slate-700" />
              </button>
              <button 
                class="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
                @mousedown="handleZoom('out')"
              >
                <ZoomOut class="w-6 h-6 text-slate-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseDialog>

    <!-- Screen Control Dialog -->
    <BaseDialog v-model="showScreenDialog">
      <div class="flex flex-col items-center w-full h-full">
        <!-- Tabs -->
        <Tabs 
          v-model="activeScreen" 
          :options="screens.map(s => ({ label: s.name, value: s.id }))" 
          class="mb-8"
        />

        <div class="flex flex-col items-center w-full">
          <div class="text-slate-500 text-sm mb-4">信号源</div>
          
          <!-- Signal Sources Grid -->
          <div class="grid grid-cols-2 gap-6 mb-8">
            <button 
              v-for="source in signalSources" 
              :key="source"
              class="w-40 h-20 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-slate-700 font-medium text-lg transition-all active:scale-95"
              @click="handleSourceChange(source)"
            >
              {{ source }}
            </button>
          </div>

          <!-- Volume Controls -->
          <div class="flex gap-6 mb-8">
            <button 
              class="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
              @click="handleVolume('mute')"
            >
              <VolumeX class="w-8 h-8 text-slate-700" />
            </button>
            <button 
              class="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
              @click="handleVolume('down')"
            >
              <Volume1 class="w-8 h-8 text-slate-700" />
            </button>
            <button 
              class="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
              @click="handleVolume('up')"
            >
              <VolumeHigh class="w-8 h-8 text-slate-700" />
            </button>
          </div>
        </div>

        <!-- Power Switch -->
        <div class="w-full flex justify-end items-center gap-3 mt-auto">
          <span class="text-gray-500 text-sm">关机</span>
          <el-switch
            v-model="currentScreen.power"
            style="--el-switch-on-color: #3b82f6; --el-switch-off-color: #e5e7eb"
          />
        </div>
      </div>
    </BaseDialog>

    <!-- Curtain Control Dialog -->
    <BaseDialog v-model="showCurtainDialog">
      <div class="flex flex-col items-center w-full h-full">
        <!-- Tabs -->
        <Tabs 
          v-model="activeCurtain" 
          :options="curtains.map(c => ({ label: c.name, value: c.id }))" 
          class="mb-12"
        />

        <!-- Controls -->
        <div class="flex gap-16">
          <div class="flex flex-col items-center gap-6">
            <button 
              class="w-20 h-20 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
              @mousedown="handleCurtainControl('up')"
            >
              <ChevronUp class="w-10 h-10 text-slate-700" />
            </button>
            <button 
              class="w-20 h-20 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
              @mousedown="handleCurtainControl('pause')"
            >
              <Pause class="w-10 h-10 text-slate-700" />
            </button>
            <button 
              class="w-20 h-20 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-all active:scale-95"
              @mousedown="handleCurtainControl('down')"
            >
              <ChevronDown class="w-10 h-10 text-slate-700" />
            </button>
          </div>
        </div>
      </div>
    </BaseDialog>

    <!-- Socket Control Dialog -->
    <BaseDialog v-model="showSocketDialog">
      <div class="flex gap-12">
        <div 
          v-for="socket in sockets" 
          :key="socket.id"
          class="flex flex-col items-center gap-4 cursor-pointer group"
          @click="toggleSocket(socket)"
        >
          <!-- Socket Icon Circle -->
          <div 
            class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300"
            :class="socket.active ? 'bg-[#3b82f6] shadow-lg shadow-blue-500/30' : 'bg-gray-200'"
          >
            <Plug 
              class="w-10 h-10 transition-colors duration-300"
              :class="socket.active ? 'text-white' : 'text-slate-700'" 
            />
          </div>
          <!-- Label -->
          <span class="text-gray-500 text-sm font-medium">{{ socket.name }}</span>
        </div>
      </div>
    </BaseDialog>

    <!-- Matrix Control Dialog -->
    <BaseDialog v-model="showMatrixDialog" width="700px">
      <div class="flex flex-col w-full h-full px-8">
        <!-- Input Signals -->
        <div class="w-full mb-8">
          <div class="text-slate-500 text-sm mb-4 text-left">输入信号：</div>
          <div class="grid grid-cols-4 gap-4">
            <button 
              v-for="input in inputSignals" 
              :key="input.id"
              class="h-16 rounded-lg flex items-center justify-center text-sm font-medium transition-all active:scale-95"
              :class="activeInput === input.id ? 'bg-slate-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="activeInput = input.id; handleMatrixSwitch()"
            >
              {{ input.name }}
            </button>
          </div>
        </div>

        <!-- Output Signals -->
        <div class="w-full">
          <div class="text-slate-500 text-sm mb-4 text-left">输出信号：</div>
          <div class="grid grid-cols-4 gap-4">
            <button 
              v-for="output in outputSignals" 
              :key="output.id"
              class="h-16 rounded-lg flex items-center justify-center text-sm font-medium transition-all active:scale-95"
              :class="activeOutput === output.id ? 'bg-slate-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="activeOutput = output.id; handleMatrixSwitch()"
            >
              {{ output.name }}
            </button>
          </div>
        </div>
      </div>
    </BaseDialog>

    <!-- Fresh Air Control Dialog -->
    <BaseDialog v-model="showFreshAirDialog">
      <div class="flex flex-col items-center w-full h-full">
        <!-- Tabs -->
        <Tabs 
          v-model="activeFreshAir" 
          :options="freshAirList.map(f => ({ label: f.name, value: f.id }))" 
          class="mb-8"
        />

        <!-- Status Display -->
        <div class="text-[#3b5998] text-[5rem] font-medium tracking-wide mb-12">
          {{ getModeLabel(currentFreshAir.mode) }}
        </div>

        <!-- Mode Controls -->
        <div class="flex gap-8 w-full justify-center">
          <div 
            v-for="mode in freshAirModes"
            :key="mode.id"
            class="flex flex-col items-center gap-3 cursor-pointer group"
            @click="currentFreshAir.mode = mode.id"
          >
            <div 
              class="w-20 h-20 rounded-full flex items-center justify-center transition-all group-active:scale-95 border-4"
              :class="currentFreshAir.mode === mode.id ? 'bg-[#3b5998] border-[#3b5998] shadow-lg shadow-blue-500/30' : 'bg-gray-100 border-gray-100 group-hover:bg-gray-200 group-hover:border-gray-200'"
            >
               <!-- Custom Icons for Modes -->
               <div v-if="mode.id === 'auto'" class="text-3xl font-bold" :class="currentFreshAir.mode === mode.id ? 'text-white' : 'text-slate-600'">A</div>
               <div v-else class="relative w-8 h-8 border-2 rounded flex items-center justify-center" :class="currentFreshAir.mode === mode.id ? 'border-white text-white' : 'border-slate-600 text-slate-600'">
                  <span class="text-lg font-bold">{{ mode.icon }}</span>
                  <div class="absolute -top-1 -right-1 w-full h-full border-t-2 border-r-2 rounded-tr" :class="currentFreshAir.mode === mode.id ? 'border-white' : 'border-slate-600'"></div>
               </div>
            </div>
            <span class="text-gray-500 text-xs">{{ mode.label }}</span>
          </div>
        </div>

        <!-- Power Switch -->
        <div class="w-full flex justify-end items-center gap-3 mt-auto">
          <span class="text-gray-500 text-sm">关机</span>
          <el-switch
            v-model="currentFreshAir.power"
            style="--el-switch-on-color: #3b82f6; --el-switch-off-color: #e5e7eb"
          />
        </div>
      </div>
    </BaseDialog>

    <!-- Audio Control Dialog -->
    <BaseDialog v-model="showAudioDialog">
      <div class="flex flex-col gap-10 px-8 py-4 w-full">
        <div v-for="audio in audioList" :key="audio.id" class="w-full">
          <div class="text-slate-500 text-sm mb-4">{{ audio.name }}</div>
          <div class="flex items-center gap-6">
            <button 
              class="active:scale-95 transition-all"
              @click="toggleMute(audio)"
            >
              <VolumeX v-if="audio.volume === 0" class="w-6 h-6 text-slate-400" />
              <VolumeHigh v-else class="w-6 h-6 text-slate-700" />
            </button>
            <div class="flex-1">
              <el-slider 
                v-model="audio.volume" 
                :show-tooltip="false"
                style="--el-slider-main-bg-color: #3b82f6; --el-slider-runway-bg-color: #e2e8f0; --el-slider-button-size: 16px;"
              />
            </div>
            <div class="text-slate-700 w-8 text-right font-medium">{{ audio.volume }}</div>
          </div>
        </div>
      </div>
    </BaseDialog>
  </div>
</template>