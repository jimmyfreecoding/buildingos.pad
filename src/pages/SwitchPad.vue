<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Power, Lightbulb, ChevronLeft } from 'lucide-vue-next'

const roomName = ref('')
const roomCode = ref('')

onMounted(() => {
  try {
    const data = localStorage.getItem('initData')
    if (data) {
      const parsed = JSON.parse(data)
      roomName.value = parsed.roomName || ''
      roomCode.value = parsed.code || parsed.roomCode || ''
    }
  } catch (e) { /* ignore */ }
})

const currentTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const updateTime = () => {
    const now = new Date()
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes().toString().padStart(2, '0')
    currentTime.value = `${h}:${m}`
  }
  updateTime()
  timer = setInterval(updateTime, 10000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const displayRoom = computed(() => {
  return roomName.value || roomCode.value || ''
})

// --- Lighting (up to 3 circuits) ---
const lights = ref([
  { id: 1, name: '灯1', isOn: false },
  { id: 2, name: '灯2', isOn: false },
  { id: 3, name: '灯3', isOn: false },
])

const toggleLight = (id: number) => {
  const light = lights.value.find(l => l.id === id)
  if (light) light.isOn = !light.isOn
}

// --- AC (up to 2 units) ---
type AcMode = 'cool' | 'heat' | 'vent'
type AcSpeed = 'low' | 'medium' | 'high'

interface AcUnit {
  id: number
  name: string
  isOn: boolean
  temp: number
  mode: AcMode
  speed: AcSpeed
}

const acList = ref<AcUnit[]>([
  { id: 1, name: '空调1', isOn: false, temp: 26, mode: 'cool', speed: 'medium' },
  { id: 2, name: '空调2', isOn: false, temp: 24, mode: 'cool', speed: 'medium' },
])

const modeLabel = (mode: string) => ({ cool: '制冷', heat: '制热', vent: '送风' }[mode] || mode)
const speedLabel = (speed: string) => ({ low: '低风', medium: '中风', high: '高风' }[speed] || speed)

// --- AC Detail View ---
const currentView = ref<'main' | 'acDetail'>('main')
const activeAcId = ref<number | null>(null)

const activeAc = computed(() => acList.value.find(a => a.id === activeAcId.value))

const openAcDetail = (id: number) => {
  activeAcId.value = id
  currentView.value = 'acDetail'
}

const closeAcDetail = () => {
  currentView.value = 'main'
}

const toggleAcPower = (id: number) => {
  const ac = acList.value.find(a => a.id === id)
  if (ac) ac.isOn = !ac.isOn
}

const setAcMode = (id: number, mode: AcMode) => {
  const ac = acList.value.find(a => a.id === id)
  if (ac) ac.mode = mode
}

const setAcSpeed = (id: number, speed: AcSpeed) => {
  const ac = acList.value.find(a => a.id === id)
  if (ac) ac.speed = speed
}

const setAcTemp = (id: number, temp: number) => {
  const ac = acList.value.find(a => a.id === id)
  if (ac) ac.temp = Math.min(30, Math.max(16, temp))
}
</script>

<template>
  <div class="w-full h-full bg-[#1a1a2e] text-white flex flex-col select-none overflow-hidden">

    <!-- ==================== MAIN VIEW ==================== -->
    <template v-if="currentView === 'main'">
      <!-- Top Bar: Room + Time -->
      <header class="flex justify-between items-center px-5 py-4 shrink-0">
        <span class="text-base font-medium text-white/90 tracking-wide">{{ displayRoom }}</span>
        <span class="text-2xl font-light tracking-wider text-white/80">{{ currentTime }}</span>
      </header>

      <!-- Lighting Section -->
      <div class="flex-1 flex flex-col justify-center px-5">
        <div class="text-sm text-white/50 tracking-widest mb-5">照明</div>
        <div class="flex justify-center gap-8">
          <div
            v-for="light in lights"
            :key="light.id"
            class="flex flex-col items-center gap-3 cursor-pointer"
            @click="toggleLight(light.id)"
          >
            <div
              class="w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
              :class="light.isOn
                ? 'bg-yellow-400 shadow-[0_0_28px_rgba(250,204,21,0.5)]'
                : 'bg-white/10 border-2 border-white/15'"
            >
              <Lightbulb
                class="w-9 h-9 transition-colors duration-300"
                :class="light.isOn ? 'text-[#1a1a2e] fill-[#1a1a2e]' : 'text-white/35'"
              />
            </div>
            <span
              class="text-sm font-medium transition-colors duration-300"
              :class="light.isOn ? 'text-white' : 'text-white/40'"
            >{{ light.name }}</span>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="mx-8 border-t border-white/8"></div>

      <!-- AC Section -->
      <div class="flex-1 flex flex-col justify-center px-5">
        <div class="text-sm text-white/50 tracking-widest mb-5">空调</div>
        <div class="flex gap-4">
          <div
            v-for="ac in acList"
            :key="ac.id"
            class="flex-1 bg-white/5 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer active:scale-[0.97] transition-all duration-200 border"
            :class="ac.isOn ? 'border-white/20' : 'border-transparent'"
            @click="openAcDetail(ac.id)"
          >
            <!-- Name + Power indicator -->
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-white/80">{{ ac.name }}</span>
              <div
                class="w-2 h-2 rounded-full"
                :class="ac.isOn ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-white/20'"
              ></div>
            </div>

            <!-- Temperature -->
            <div class="flex items-baseline gap-0.5">
              <span
                class="text-4xl font-light tracking-tighter"
                :class="ac.isOn ? 'text-white' : 'text-white/30'"
              >{{ ac.temp }}</span>
              <span
                class="text-sm"
                :class="ac.isOn ? 'text-white/60' : 'text-white/20'"
              >°C</span>
            </div>

            <!-- Mode + Speed tags -->
            <div class="flex gap-2">
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="ac.isOn
                  ? 'bg-white/15 text-white/70'
                  : 'bg-white/5 text-white/25'"
              >{{ modeLabel(ac.mode) }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="ac.isOn
                  ? 'bg-white/15 text-white/70'
                  : 'bg-white/5 text-white/25'"
              >{{ speedLabel(ac.speed) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom spacing -->
      <div class="h-4 shrink-0"></div>
    </template>

    <!-- ==================== AC DETAIL VIEW ==================== -->
    <template v-if="currentView === 'acDetail' && activeAc">
      <!-- Header with back -->
      <header class="flex items-center gap-3 px-4 py-4 shrink-0">
        <button
          class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-all"
          @click="closeAcDetail"
        >
          <ChevronLeft class="w-5 h-5 text-white/70" />
        </button>
        <span class="text-base font-medium text-white/80">{{ activeAc.name }}</span>
        <div class="flex-1"></div>
        <div
          class="w-2.5 h-2.5 rounded-full"
          :class="activeAc.isOn ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-white/20'"
        ></div>
      </header>

      <!-- Temperature Display -->
      <div class="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        <!-- Large temp -->
        <div class="flex items-baseline gap-1">
          <span
            class="text-[7rem] font-light leading-none tracking-tighter"
            :class="activeAc.isOn ? 'text-white' : 'text-white/20'"
          >{{ activeAc.temp }}</span>
          <span
            class="text-2xl"
            :class="activeAc.isOn ? 'text-white/50' : 'text-white/15'"
          >°C</span>
        </div>

        <!-- Temperature Slider -->
        <div class="w-full flex items-center gap-4">
          <button
            class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl font-light active:scale-90 transition-all shrink-0"
            :class="!activeAc.isOn ? 'opacity-30 pointer-events-none' : ''"
            @click="setAcTemp(activeAc.id, activeAc.temp - 1)"
          >−</button>
          <div class="flex-1 relative flex items-center">
            <input
              type="range"
              min="16"
              max="30"
              step="1"
              :value="activeAc.temp"
              :disabled="!activeAc.isOn"
              class="w-full h-2 rounded-full appearance-none cursor-pointer"
              :class="activeAc.isOn ? 'ac-slider-on' : 'ac-slider-off'"
              @input="(e: Event) => setAcTemp(activeAc.id, Number((e.target as HTMLInputElement).value))"
            />
          </div>
          <button
            class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl font-light active:scale-90 transition-all shrink-0"
            :class="!activeAc.isOn ? 'opacity-30 pointer-events-none' : ''"
            @click="setAcTemp(activeAc.id, activeAc.temp + 1)"
          >+</button>
        </div>
      </div>

      <!-- Controls Area -->
      <div class="shrink-0 px-5 pb-5 flex flex-col gap-4">
        <!-- Mode -->
        <div class="flex gap-3">
          <button
            v-for="mode in (['cool', 'heat', 'vent'] as AcMode[])"
            :key="mode"
            class="flex-1 h-12 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
            :class="[
              activeAc.mode === mode
                ? 'bg-white text-[#1a1a2e]'
                : 'bg-white/8 text-white/50',
              !activeAc.isOn ? 'opacity-30 pointer-events-none' : ''
            ]"
            @click="setAcMode(activeAc.id, mode)"
          >
            {{ modeLabel(mode) }}
          </button>
        </div>

        <!-- Fan Speed -->
        <div class="flex gap-3">
          <button
            v-for="speed in (['low', 'medium', 'high'] as AcSpeed[])"
            :key="speed"
            class="flex-1 h-12 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
            :class="[
              activeAc.speed === speed
                ? 'bg-white text-[#1a1a2e]'
                : 'bg-white/8 text-white/50',
              !activeAc.isOn ? 'opacity-30 pointer-events-none' : ''
            ]"
            @click="setAcSpeed(activeAc.id, speed)"
          >
            {{ speedLabel(speed) }}
          </button>
        </div>

        <!-- Power Button -->
        <button
          class="w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-lg font-medium transition-all duration-200 active:scale-[0.97]"
          :class="activeAc.isOn
            ? 'bg-red-500/90 text-white shadow-[0_4px_20px_rgba(239,68,68,0.35)]'
            : 'bg-white/10 text-white/50'"
          @click="toggleAcPower(activeAc.id)"
        >
          <Power class="w-5 h-5" />
          <span>{{ activeAc.isOn ? '关闭' : '开机' }}</span>
        </button>
      </div>
    </template>

  </div>
</template>

<style scoped>
.ac-slider-on {
  background: linear-gradient(to right, #4ade80 0%, #facc15 50%, #ef4444 100%);
  accent-color: #ffffff;
}

.ac-slider-on::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  border: none;
}

.ac-slider-on::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #4ade80 0%, #facc15 50%, #ef4444 100%);
}

.ac-slider-off {
  background: rgba(255, 255, 255, 0.1);
  accent-color: rgba(255, 255, 255, 0.2);
}

.ac-slider-off::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
  border: none;
}
</style>
