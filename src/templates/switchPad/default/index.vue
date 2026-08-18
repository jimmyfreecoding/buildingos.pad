<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLightMqtt } from '@/composables/useLightMqtt'
import { useAcMqtt } from '@/composables/useAcMqtt'
import { isConnected, subscribe, unsubscribe, onMessage } from '@/utils/mqtt'

const router = useRouter()
import type { AcMode, FanSpeed } from '@/types/device'

// --- Room info ---
const roomName = ref('')
const roomCode = ref('')

onMounted(() => {
  try {
    const raw = localStorage.getItem('initData')
    if (raw) {
      const data = JSON.parse(raw)
      roomName.value = data.roomName || data.name || ''
      roomCode.value = data.code || data.roomCode || ''
    }
  } catch { /* ignore */ }
})

const displayRoom = computed(() => roomName.value || roomCode.value || '')

// --- Clock ---
const clock = ref('')
let clockTimer: ReturnType<typeof setInterval> | null = null

const updateClock = () => {
  const d = new Date()
  clock.value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 15000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})

// --- MQTT composables ---
const { lights, toggleLight, setAll } = useLightMqtt()
const { ac, toggleDevicePower, setDeviceTemp, setDeviceMode, setDeviceSpeed, togglePower } = useAcMqtt()

// --- Logo triple-tap → init ---
const logoTapCount = ref(0)
let logoTapTimer: ReturnType<typeof setTimeout> | null = null
const onLogoClick = () => {
  logoTapCount.value++
  if (logoTapCount.value >= 3) {
    logoTapCount.value = 0
    router.push('/init')
    return
  }
  if (logoTapTimer) clearTimeout(logoTapTimer)
  logoTapTimer = setTimeout(() => { logoTapCount.value = 0 }, 800)
}

// --- Screen state ---
const screen = ref(0)

// --- Swipe ---
let downX = 0
const onDown = (e: PointerEvent) => { downX = e.clientX }
const onUp = (e: PointerEvent) => {
  const dx = e.clientX - downX
  if (Math.abs(dx) > 40) {
    screen.value = Math.min(2, Math.max(0, screen.value + (dx < 0 ? 1 : -1)))
  }
}

// --- Background ---
const BGS = [
  'background-image:radial-gradient(circle at 32% 46%, #ff4a1a 0%, #b81806 26%, #3d0703 46%, #0b0708 72%)',
  'background-image:linear-gradient(155deg,#2a2c30 0%,#141517 55%,#0a0a0b 100%)',
  'background-image:radial-gradient(circle at 70% 25%, #1d3a5c 0%, #10203a 40%, #07090f 78%)',
  'background-image:linear-gradient(180deg,#111 0%,#000 100%)',
]
const bgIndex = ref(0)
const bgStyle = computed(() => BGS[bgIndex.value])
const cycleBg = () => { bgIndex.value = (bgIndex.value + 1) % BGS.length }

// --- 外部天气 → 背景视频（与 wallPad zeekr 相同） ---
const outside = ref<{ today?: string }>({})
const bgParams = ref<{ type: 'image' | 'video'; urls: { url: string }[] }>({ type: 'image', urls: [{ url: '' }] })

const setInitBg = () => {
  const today = outside.value.today
  if (!today) return
  bgParams.value.type = 'video'
  let file = 'sun.mp4'
  if (today === '多云') {
    file = 'cloud.mp4'
  } else if (today === '阴' || today.indexOf('雾') !== -1 || today.indexOf('霾') !== -1) {
    file = 'overcast.mp4'
  } else if (today === '晴') {
    file = 'sun.mp4'
  } else if (today.indexOf('雨') !== -1) {
    file = 'rain.mp4'
  } else if (today.indexOf('雪') !== -1) {
    file = 'snow.mp4'
  }
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  bgParams.value.urls = [{ url: `${base}video/${file}` }]
}

const onOutside = (payload: unknown) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    outside.value = payload as { today?: string }
    setInitBg()
  }
}

let offOutside: (() => void) | null = null
onMounted(() => {
  subscribe('/wallpad/outside')
  offOutside = onMessage('/wallpad/outside', onOutside)
})

onUnmounted(() => {
  offOutside?.()
  unsubscribe('/wallpad/outside')
})

// --- Confirm dialog ---
const dialogVisible = ref(false)
const dialogText = ref('')
let pendingAction: (() => void) | null = null

const showConfirm = (text: string, action: () => void) => {
  dialogText.value = text
  pendingAction = action
  dialogVisible.value = true
}

const onConfirm = () => {
  dialogVisible.value = false
  if (pendingAction) {
    pendingAction()
    pendingAction = null
  }
}

const onCancel = () => {
  dialogVisible.value = false
  pendingAction = null
}

// --- Helpers ---
const MODE_MAP_REV: Record<number, AcMode> = { 1: 'auto', 2: 'vent', 3: 'cool', 4: 'heat', 5: 'vent' as AcMode }
const FAN_MAP_REV: Record<number, FanSpeed> = { 15: 'low', 45: 'mid', 75: 'high' }

const MODE_LABEL: Record<string, string> = { cool: '制冷', heat: '制热', vent: '送风', auto: '自动' }
const MODE_COLOR: Record<string, string> = { cool: '74,168,255', heat: '236,48,19', vent: '222,222,222', auto: '47,191,160' }
const SPEED_LABEL: Record<string, string> = { low: '低风', mid: '中风', high: '高风' }

const MODE_CYCLE: AcMode[] = ['cool', 'heat', 'vent', 'auto']
const SPEED_CYCLE: FanSpeed[] = ['low', 'mid', 'high']

const getDeviceOn = (d: any) => d.status?.status === 'on' || d.status?.status === true || d.status?.status === 1

const getDeviceTemp = (d: any): number => {
  const t = Number(d.status?.pretemperature ?? d.status?.temperature)
  return isNaN(t) ? 24 : t
}

const getDeviceMode = (d: any): AcMode => MODE_MAP_REV[Number(d.status?.mode)] || 'cool'

const getDeviceSpeed = (d: any): FanSpeed => FAN_MAP_REV[Number(d.status?.fan)] || 'mid'

// --- Lighting devices (from MQTT) ---
const lightDevices = computed(() => {
  if (isConnected.value && lights.value?.devices?.length) {
    return lights.value.devices
  }
  return []
})

// --- AC devices (from MQTT) ---
const acDevices = computed(() => {
  if (isConnected.value && ac.value?.devices?.length) {
    return ac.value.devices
  }
  return []
})

const activeAcIndex = ref(0)

const activeAcDevice = computed(() => {
  return acDevices.value[activeAcIndex.value] || null
})

// --- Scene state (local only) ---
const activeScene = ref(-1)
const sceneList = [
  { name: '会议', icon: 'meeting' },
  { name: '离开', icon: 'leave' },
]

const loadingSceneIdx = ref(-1)

const setScene = (idx: number) => {
  if (!isConnected.value) return
  activeScene.value = idx
  loadingSceneIdx.value = idx

  if (idx === 0) {
    // 会议：全开
    setAll(true)
    if (!ac.value.power) togglePower()
  } else if (idx === 1) {
    // 离开：全关
    setAll(false)
    if (ac.value.power) togglePower()
  }

  setTimeout(() => {
    if (loadingSceneIdx.value === idx) {
      loadingSceneIdx.value = -1
      activeScene.value = -1
    }
  }, 3000)
}

// --- Lighting actions ---
const loadingLightId = ref<string | null>(null)

const handleToggleLight = (device: any) => {
  if (!isConnected.value) return
  toggleLight(device.id)
  loadingLightId.value = device.id
  setTimeout(() => {
    if (loadingLightId.value === device.id) loadingLightId.value = null
  }, 1000)
}

// --- AC actions ---
const loadingAcId = ref<string | null>(null)

const handleToggleAcPower = (device: any) => {
  if (!isConnected.value) return
  toggleDevicePower(device.id)
  loadingAcId.value = device.id
  setTimeout(() => {
    if (loadingAcId.value === device.id) loadingAcId.value = null
  }, 1000)
}

const handleSetTemp = (device: any, temp: number) => {
  if (!isConnected.value) return
  const clamped = Math.min(30, Math.max(16, Math.round(temp)))
  setDeviceTemp(device.id, clamped)
}

const handleCycleMode = (device: any) => {
  if (!isConnected.value) return
  const currentMode = getDeviceMode(device)
  const idx = MODE_CYCLE.indexOf(currentMode)
  const nextMode = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]
  setDeviceMode(device.id, nextMode)
}

const handleCycleSpeed = (device: any) => {
  if (!isConnected.value) return
  const currentSpeed = getDeviceSpeed(device)
  const idx = SPEED_CYCLE.indexOf(currentSpeed)
  const nextSpeed = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length]
  setDeviceSpeed(device.id, nextSpeed)
}

// --- Vertical slider ---
const dragTemp = ref<number | null>(null)

const displayTemp = computed(() => {
  if (dragTemp.value !== null) return dragTemp.value
  return activeAcDevice.value ? getDeviceTemp(activeAcDevice.value) : 24
})

const tempPercent = computed(() => ((displayTemp.value - 16) / 14 * 100).toFixed(1) + '%')

const tempFromEvent = (e: PointerEvent): number => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const p = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height))
  return Math.round(16 + p * 14)
}

let sliderDragging = false

const onSliderDown = (e: PointerEvent) => {
  if (!activeAcDevice.value || !isConnected.value) return
  e.stopPropagation()
  sliderDragging = true
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  dragTemp.value = tempFromEvent(e)
}

const onSliderMove = (e: PointerEvent) => {
  if (!sliderDragging) return
  dragTemp.value = tempFromEvent(e)
}

const onSliderUp = (e: PointerEvent) => {
  if (!sliderDragging) return
  e.stopPropagation()
  sliderDragging = false
  const t = dragTemp.value
  dragTemp.value = null
  if (t !== null && activeAcDevice.value && isConnected.value) {
    handleSetTemp(activeAcDevice.value, t)
  }
}
</script>

<template>
  <div class="w-full h-full flex items-center justify-center bg-[#111]">
    <!-- Confirm Dialog -->
    <div
      v-if="dialogVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      @click="onCancel"
    >
      <div
        class="bg-white/95 rounded-2xl px-8 py-6 mx-8 text-center shadow-xl"
        @click.stop
      >
        <p class="text-[#131313] text-base font-medium mb-6">{{ dialogText }}</p>
        <div class="flex gap-3">
          <button
            class="flex-1 h-10 rounded-xl bg-black/8 text-[#131313] text-sm font-medium active:scale-95 transition-all"
            @click="onCancel"
          >取消</button>
          <button
            class="flex-1 h-10 rounded-xl bg-[#131313] text-white text-sm font-medium active:scale-95 transition-all"
            @click="onConfirm"
          >确认</button>
        </div>
      </div>
    </div>

    <!-- Main Frame -->
    <div
      class="frame"
      @pointerdown="onDown"
      @pointerup="onUp"
    >
      <!-- Background gradient -->
      <div v-if="bgParams.type === 'image'" class="bg" :style="bgStyle"></div>
      <video v-else-if="bgParams.urls[0]?.url" :src="bgParams.urls[0].url" class="bg-video" loop autoplay muted preload="auto"></video>
      <div class="scrim"></div>

      <!-- Header -->
      <div class="hdr">
        <span class="brand" style="cursor:pointer" @click.stop="onLogoClick">smart</span>
        <span class="clock">{{ clock }}</span>
        <span class="dot-live"></span>
      </div>

      <!-- Viewport -->
      <div class="viewport">
        <div class="track" :style="{ transform: 'translateX(' + (-640 * screen) + 'px)' }">

          <!-- ===================== LIGHTING ===================== -->
          <div class="scr">
            <div class="flex items-center justify-between">
              <div class="room room-sm">
                <span class="num">{{ displayRoom || '--' }}</span>
                <span class="sub">{{ displayRoom ? '· 照明' : '' }}</span>
              </div>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1.2" stroke-linecap="round">
                <path d="M12 2v6"/>
                <path d="M4 14a8 8 0 0 1 16 0z"/>
                <path d="M12 17v4M8 17l-2.5 3M16 17l2.5 3"/>
              </svg>
            </div>

            <!-- No devices state -->
            <div v-if="lightDevices.length === 0" class="flex-1 flex items-center justify-center">
              <span class="text-white/30 text-sm">暂无照明设备</span>
            </div>

            <!-- Device tiles -->
            <div v-else class="tiles">
              <button
                v-for="d in lightDevices"
                :key="d.id"
                class="tile"
                :class="{ on: getDeviceOn(d) }"
                :disabled="loadingLightId === d.id"
                @click="handleToggleLight(d)"
              >
                <!-- Loading spinner -->
                <svg v-if="loadingLightId === d.id" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" class="animate-spin">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/>
                </svg>
                <!-- Lightbulb icon -->
                <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18h6"/>
                  <path d="M10 22h4"/>
                  <path d="M12 2a6 6 0 0 0-4 10.5c.7.6 1 1.4 1 2.5h6c0-1.1.3-1.9 1-2.5A6 6 0 0 0 12 2z"/>
                </svg>
                <span class="px-2">{{ d.name }}</span>
              </button>
            </div>
          </div>

          <!-- ===================== AC ===================== -->
          <div class="scr">
            <div class="flex items-center justify-between">
              <div class="room room-xs">
                <span class="num">{{ displayRoom || '--' }}</span>
                <span class="sub">{{ displayRoom ? '· 空调' : '' }}</span>
              </div>
              <!-- Unit tabs -->
              <div v-if="acDevices.length > 0" class="unit-tabs">
                <button
                  v-for="(d, i) in acDevices"
                  :key="d.id"
                  class="unit-tab"
                  :class="{ on: activeAcIndex === i }"
                  @click="activeAcIndex = i"
                >{{ d.name }}</button>
              </div>
            </div>

            <!-- No devices -->
            <div v-if="!activeAcDevice" class="flex-1 flex items-center justify-center">
              <span class="text-white/30 text-sm">暂无空调设备</span>
            </div>

            <!-- Active device controls -->
            <template v-else>
              <div class="temp-row">
                <div class="temp-box">
                  <div class="temp-num" :class="{ 'opacity-30': !getDeviceOn(activeAcDevice) }">
                    <span class="v">{{ displayTemp }}</span>
                    <span class="u">°C</span>
                  </div>
                </div>
                <div
                  v-if="getDeviceOn(activeAcDevice)"
                  class="track-v"
                  @pointerdown="onSliderDown"
                  @pointermove="onSliderMove"
                  @pointerup="onSliderUp"
                  @pointercancel="onSliderUp"
                >
                  <div class="fill" :style="{ height: tempPercent }"></div>
                </div>
              </div>

              <div class="ac-actions">
                <button
                  class="act-btn"
                  style="flex:1"
                  :class="{ on: getDeviceOn(activeAcDevice) }"
                  :disabled="loadingAcId === activeAcDevice.id"
                  @click="handleToggleAcPower(activeAcDevice)"
                >
                  <svg v-if="loadingAcId === activeAcDevice.id" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" class="animate-spin">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                    <path d="M12 3v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>
                  </svg>
                </button>
                <button
                  class="act-btn"
                  style="flex:1.4"
                  :class="{ on: getDeviceOn(activeAcDevice) }"
                  :style="getDeviceOn(activeAcDevice)
                    ? { background: 'rgb(' + MODE_COLOR[getDeviceMode(activeAcDevice)] + ')', color: getDeviceMode(activeAcDevice) === 'vent' ? '#131313' : '#fff' }
                    : {}"
                  @click="handleCycleMode(activeAcDevice)"
                >{{ MODE_LABEL[getDeviceMode(activeAcDevice)] }}</button>
                <button
                  class="act-btn"
                  style="flex:1.4"
                  :class="{ on: getDeviceOn(activeAcDevice) }"
                  @click="handleCycleSpeed(activeAcDevice)"
                >风速 {{ SPEED_LABEL[getDeviceSpeed(activeAcDevice)] }}</button>
              </div>
            </template>
          </div>

          <!-- ===================== SCENES ===================== -->
          <div class="scr">
            <div class="room room-sm">
              <span class="num">{{ displayRoom || '--' }}</span>
              <span class="sub">{{ displayRoom ? '· 场景' : '' }}</span>
            </div>
            <div class="tiles">
              <button
                v-for="(scene, i) in sceneList"
                :key="i"
                class="tile"
                :class="{ on: activeScene === i }"
                :disabled="loadingSceneIdx >= 0"
                @click="setScene(i)"
              >
                <!-- Meeting icon -->
                <svg v-if="scene.icon === 'meeting'" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8M12 18v2"/>
                </svg>
                <!-- Presentation icon -->
                <svg v-else-if="scene.icon === 'presentation'" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>
                </svg>
                <!-- Release icon -->
                <svg v-else-if="scene.icon === 'release'" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
                </svg>
                <!-- Leave icon -->
                <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>
                </svg>
                <span>{{ scene.name }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Dot navigation -->
      <div class="dots">
        <button
          v-for="i in 3"
          :key="i"
          class="dotbtn"
          :class="screen === i - 1 ? 'on' : 'off'"
          @click="screen = i - 1"
        ></button>
      </div>

      <!-- Background cycle -->
      <button class="bgbtn" @click="cycleBg">切换背景 →</button>
    </div>
  </div>
</template>

<style scoped>
.frame {
  position: relative;
  width: 640px;
  height: 640px;
  overflow: hidden;
  background: #0a0a0b;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 70px rgba(0,0,0,.5);
  -webkit-user-select: none;
  user-select: none;
  touch-action: none;
}

.bg {
  position: absolute;
  inset: 0;
  transition: opacity .5s;
}

.bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.4), rgba(0,0,0,.1) 40%, rgba(0,0,0,.5));
}

.hdr {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 26px 0;
}

.brand {
  font: 700 13px/1 Archivo, sans-serif;
  letter-spacing: .24em;
  color: rgba(255,255,255,.85);
}

.clock {
  font: 400 15px/1 Archivo, sans-serif;
  color: rgba(255,255,255,.9);
  font-variant-numeric: tabular-nums;
}

.dot-live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ec3013;
  box-shadow: 0 0 10px #ec3013;
}

.viewport {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.track {
  display: flex;
  width: 1920px;
  height: 100%;
  transition: transform .42s cubic-bezier(.4,0,.2,1);
}

.scr {
  width: 640px;
  box-sizing: border-box;
  padding: 16px 26px 0;
  display: flex;
  flex-direction: column;
}

.room {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.room .num {
  font: 600 72px/1 Archivo, sans-serif;
  color: #fff;
  letter-spacing: -.02em;
}

.room .sub {
  font: 400 13px/1 'Noto Sans SC', sans-serif;
  color: rgba(255,255,255,.7);
}

.room-sm .num {
  font: 600 64px/1 Archivo, sans-serif;
  color: #fff;
  letter-spacing: -.02em;
}

.room-xs .num {
  font: 600 48px/1 Archivo, sans-serif;
  color: #fff;
  letter-spacing: -.02em;
}

.tiles {
  margin-top: auto;
  padding-bottom: 18px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.tile {
  all: unset;
  box-sizing: border-box;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 11px;
  border-radius: 26px;
  backdrop-filter: blur(14px);
  background: rgba(255,255,255,.13);
  color: rgba(255,255,255,.78);
  font: 400 15px/1 'Noto Sans SC', sans-serif;
  cursor: pointer;
  transition: all .24s;
}

.tile.on {
  background: rgba(255,255,255,.94);
  color: #131313;
}

.unit-tabs {
  display: flex;
  gap: 6px;
}

.unit-tab {
  all: unset;
  padding: 6px 13px;
  border-radius: 16px;
  font: 400 12px/1 'Noto Sans SC', sans-serif;
  cursor: pointer;
  transition: all .2s;
  color: rgba(255,255,255,.7);
}

.unit-tab.on {
  background: rgba(255,255,255,.92);
  color: #131313;
}

.temp-row {
  margin-top: 16px;
  margin-bottom: 16px;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 14px;
}

.temp-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.temp-num {
  display: flex;
  align-items: flex-start;
  gap: 3px;
  color: #fff;
}

.temp-num .v {
  font: 600 104px/.8 Archivo, sans-serif;
  letter-spacing: -.045em;
  font-variant-numeric: tabular-nums;
}

.temp-num .u {
  font: 400 28px/1 Archivo, sans-serif;
  padding-top: 10px;
}

.mode-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 9px;
}

.mode-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background .3s;
  background: rgba(255,255,255,.3);
}

.mode-label {
  font: 400 13px/1 'Noto Sans SC', sans-serif;
  letter-spacing: .22em;
  color: #fff;
}

.track-v {
  flex: none;
  position: relative;
  width: 56px;
  border-radius: 28px;
  overflow: hidden;
  cursor: pointer;
  backdrop-filter: blur(14px);
  background: rgba(255,255,255,.13);
}

.track-v .fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,.9);
  transition: height .12s;
}

.ac-actions {
  margin-top: 0;
  padding-bottom: 18px;
  display: flex;
  gap: 9px;
}

.act-btn {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 58px;
  border-radius: 29px;
  backdrop-filter: blur(14px);
  background: rgba(255,255,255,.13);
  color: rgba(255,255,255,.78);
  font: 400 15px/1 'Noto Sans SC', sans-serif;
  cursor: pointer;
  transition: all .24s;
}

.act-btn.on {
  background: rgba(255,255,255,.94);
  color: #131313;
}

.dots {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 26px;
}

.dotbtn {
  all: unset;
  height: 5px;
  border-radius: 3px;
  cursor: pointer;
  transition: all .3s;
}

.dotbtn.on {
  width: 18px;
  background: rgba(255,255,255,.92);
}

.dotbtn.off {
  width: 5px;
  background: rgba(255,255,255,.35);
}

.bgbtn {
  all: unset;
  margin-top: 14px;
  align-self: flex-start;
  padding: 6px 12px;
  border: 1.5px solid rgba(255,255,255,.3);
  color: #fff;
  font: 400 11px/1 'Noto Sans SC', sans-serif;
  cursor: pointer;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 0.8s linear infinite;
}
</style>
