<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseCard from '../components/BaseCard.vue'
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import { Lightbulb, Home } from 'lucide-vue-next'
import { useLightMqtt } from '@/composables/useLightMqtt'
import MapCanvas from '@/components/MapCanvas.vue'

const emit = defineEmits(['close'])

const { lights, toggleLight, setAll } = useLightMqtt()

const devices = computed(() => lights.value.devices)
const isDeviceOn = (d: { status?: Record<string, any> }) => d.status?.status === 'on' || d.status?.status === 1
const isAllOn = computed(() => devices.value.length > 0 && devices.value.every(isDeviceOn))
const isAllOff = computed(() => devices.value.length > 0 && devices.value.every((d) => !isDeviceOn(d)))

// Confirm dialog
const confirmVisible = ref(false)
const confirmTitle = ref('')
const pendingDevice = ref<{ id: string; name: string; status: Record<string, any> } | null>(null)

const handleLightClick = (device: { id: string; name: string; status: Record<string, any> }) => {
  pendingDevice.value = device
  const isOn = device.status?.status === 'on'
  confirmTitle.value = (isOn ? '关闭' : '打开') + ' ' + device.name
  confirmVisible.value = true
}

const handleConfirm = () => {
  if (pendingDevice.value) {
    toggleLight(pendingDevice.value.id)
    confirmVisible.value = false
    pendingDevice.value = null
  }
}

const handleCancel = () => {
  confirmVisible.value = false
  pendingDevice.value = null
}

const handleAllOff = () => setAll(false)
const handleAllOn = () => setAll(true)

// Map Markers
const mapMarkers = [
  { id: 1, label: '过道照明 1', x: 30, y: 40, active: true },
  { id: 2, label: '照明 1', x: 50, y: 35, active: true },
  { id: 3, label: '过道照明 2', x: 25, y: 55, active: true },
  { id: 4, label: '照明 2', x: 45, y: 50, active: true },
  { id: 5, label: '照明 3', x: 40, y: 65, active: true },
  { id: 6, label: '照明 4', x: 35, y: 80, active: true },
]
</script>

<template>
  <div class="relative w-full h-full p-8 text-white overflow-hidden flex flex-col bg-black/90">

    <header class="flex justify-between items-center mb-6 px-2">
      <AppLogo @click="emit('close')" />
      <TimeWidget />
    </header>

    <div class="grid grid-cols-12 gap-6 flex-1 min-h-0">

      <!-- Left Column (Controls) -->
      <div class="col-span-8 flex flex-col gap-6">

        <div class="flex-1 flex flex-col gap-4">
          <div class="text-xl font-bold tracking-wide">照明控制</div>

          <BaseCard className="flex-1 !border-white/5 !bg-white/5 !rounded-3xl p-6 flex flex-col gap-6">
            <!-- Light Grid -->
            <div class="grid grid-cols-6 gap-4 overflow-y-auto pr-2">
              <div
                v-for="device in devices"
                :key="device.id"
                @click="handleLightClick(device)"
                class="aspect-[4/4] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                :class="device.status?.status === 'on' ? 'bg-white/20 hover:bg-white/25' : 'bg-white/5 hover:bg-white/10'"
              >
                 <Lightbulb
                   class="w-8 h-8"
                   :class="device.status?.status === 'on' ? 'text-white fill-white' : 'text-white/40'"
                 />
                 <span class="text-xs text-center px-2 truncate w-full text-white/80">{{ device.name }}</span>
              </div>

              <!-- Empty state -->
              <div v-if="devices.length === 0" class="col-span-6 flex items-center justify-center h-full text-white/40 text-lg">
                暂无照明设备
              </div>
            </div>

            <!-- Bottom: All-On / All-Off segmented control -->
            <div class="flex rounded-2xl overflow-hidden border border-white/10">
              <button
                @click="handleAllOff"
                class="flex-1 py-4 text-center text-lg font-bold transition-colors"
                :class="isAllOff ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'"
              >
                全关
              </button>
              <button
                @click="handleAllOn"
                class="flex-1 py-4 text-center text-lg font-bold transition-colors border-l border-white/10"
                :class="isAllOn ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'"
              >
                全开
              </button>
            </div>
          </BaseCard>

        </div>

      </div>

      <!-- Right Column (Map) -->
      <div class="col-span-4 h-full">
         <BaseCard className="h-full !border-white/5 !bg-white/5 !rounded-3xl p-0 overflow-hidden relative">
            <MapCanvas>
               <!-- 兜底：CSS 伪地图 -->
               <div class="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
                  <div class="w-[80%] h-[70%] border-2 border-white/10 rounded-3xl transform rotate-12 relative">
                     <div class="absolute top-0 right-0 w-1/3 h-full border-l-2 border-white/10 bg-white/5"></div>
                     <div class="absolute bottom-10 left-10 text-white/20 text-4xl font-bold rotate-[-12deg]">2604会议室</div>
                  </div>
               </div>

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
                     <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
                  </div>
               </div>

               <div class="absolute top-6 left-6 flex flex-col gap-2">
                  <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                     <span class="text-xs">1F</span>
                  </div>
               </div>
            </MapCanvas>
         </BaseCard>
      </div>

    </div>

    <div class="flex justify-center mt-6 shrink-0">
       <button
         @click="emit('close')"
         class="bg-[#2a2a2a] hover:bg-[#333] text-white px-8 py-3 rounded-full flex items-center gap-3 transition-colors border border-white/10"
       >
         <Home class="w-5 h-5" />
         <span class="text-lg">返回首页</span>
       </button>
    </div>

    <!-- Confirm Dialog -->
    <Teleport to="body">
      <div
        v-if="confirmVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        @click.self="handleCancel"
      >
        <div class="w-[400px] bg-[#1e1e1e] rounded-2xl p-6 border border-white/10 shadow-2xl">
          <div class="text-white text-lg text-center mb-6">{{ confirmTitle }}</div>
          <div class="flex justify-center gap-4">
            <button
              @click="handleCancel"
              class="px-8 py-2.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors text-base"
            >
              取消
            </button>
            <button
              @click="handleConfirm"
              class="px-8 py-2.5 rounded-xl bg-white text-black hover:bg-white/90 transition-colors text-base font-medium"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
