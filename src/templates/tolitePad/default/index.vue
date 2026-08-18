<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCockpitStore } from '@/stores/cockpit'
import AppBackground from '@/components/AppBackground.vue'
import TimeWidget from '@/components/TimeWidget.vue'
import BaseCard from '@/components/BaseCard.vue'
import QualityCard from '@/components/QualityCard.vue'
import { useToliteData } from './useToliteData'

const router = useRouter()
const store = useCockpitStore()
const { floorName, activeRoom, stallRows, otherFloorList, airDisplay, cleaningDisplay, bgVideo } = useToliteData()

const logoUrl = new URL('./assets/images/geely.png', import.meta.url).href

// 背景：MQTT 天气视频，未收到天气消息时使用默认视频
const background = computed(() => ({
  type: 'video' as const,
  src: bgVideo.value || store.background.src,
}))

// Logo 三击 → /init（密码页）
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
onUnmounted(() => { if (logoTapTimer) clearTimeout(logoTapTimer) })

const genderLabel = computed(() => (activeRoom.value.startsWith('TWOMAN') ? '女卫生间' : '男卫生间'))
const floorLabel = computed(() => floorName || '—')

// 厕位 dot：0 空闲(绿) / 1 占用(红) / null 未知(灰)
const stallColor = (status: number | null) => {
  if (status === null) return 'bg-white/15'
  return status === 1 ? 'bg-[#ef4444]' : 'bg-[#4ade80]'
}

// 最近保洁时间（无数据显示“未知”）
const cleaningTime = computed(() => cleaningDisplay.value?.time || '未知')
const cleaningDate = computed(() => cleaningDisplay.value?.date || '')

// 空气指标（无数据显示“未知”）
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const metrics = computed(() => {
  const air = airDisplay.value
  const humidityStatus = (h: number) => (h < 30 ? '干燥' : h <= 60 ? '舒适' : '高湿')
  return [
    {
      title: '温度',
      status: air?.temperature !== undefined ? '实时' : '未知',
      value: air?.temperature !== undefined ? air.temperature.toFixed(1) : '未知',
      unit: air?.temperature !== undefined ? '℃' : '',
      progress: air?.temperature !== undefined ? clamp((air.temperature - 10) / 30 * 100, 0, 100) : 0,
      statusColor: 'text-green-400',
    },
    {
      title: '湿度',
      status: air?.humidity !== undefined ? humidityStatus(air.humidity) : '未知',
      value: air?.humidity !== undefined ? air.humidity.toFixed(1) : '未知',
      unit: air?.humidity !== undefined ? '%' : '',
      progress: air?.humidity !== undefined ? clamp(air.humidity, 0, 100) : 0,
      statusColor: 'text-green-400',
    },
    {
      title: '硫化氢',
      status: air?.h2s !== undefined ? '正常' : '未知',
      value: air?.h2s !== undefined ? air.h2s.toFixed(3) : '未知',
      unit: air?.h2s !== undefined ? 'mg/m³' : '',
      progress: air?.h2s !== undefined ? clamp(air.h2s / 0.011 * 100, 0, 100) : 0,
      statusColor: 'text-green-400',
    },
    {
      title: 'PM2.5',
      status: air?.pm25 !== undefined ? '优' : '未知',
      value: air?.pm25 !== undefined ? air.pm25.toFixed(1) : '未知',
      unit: air?.pm25 !== undefined ? 'μg/m³' : '',
      progress: air?.pm25 !== undefined ? clamp(air.pm25 / 75 * 100, 0, 100) : 0,
      statusColor: 'text-green-400',
    },
    {
      title: '氨气',
      status: air?.nh3 !== undefined ? '正常' : '未知',
      value: air?.nh3 !== undefined ? air.nh3.toFixed(3) : '未知',
      unit: air?.nh3 !== undefined ? 'mg/m³' : '',
      progress: air?.nh3 !== undefined ? clamp(air.nh3 / 9.2 * 100, 0, 100) : 0,
      statusColor: 'text-green-400',
    },
  ]
})
</script>

<template>
  <AppBackground :type="background.type" :src="background.src" />
  <div class="relative z-10 w-full h-full text-white flex flex-col p-6 box-border overflow-hidden">

    <header class="flex justify-between items-start px-2 shrink-0 mb-4">
      <img :src="logoUrl" class="h-12 w-auto cursor-pointer select-none" @click="onLogoClick" />
      <TimeWidget />
    </header>

    <div class="flex-1 min-h-0 grid grid-cols-12 grid-rows-[1fr_auto] gap-6">
      <div class="col-span-12 grid grid-cols-12 gap-6 h-full min-h-0">
        <div class="col-span-3 flex flex-col gap-6 h-full min-h-0">
          <BaseCard title="最近保洁时间" class="h-[35%] border-none shrink-0 flex flex-col">
            <div class="flex-1 flex flex-col justify-center mt-2">
              <div class="text-[clamp(2.5rem,4vw,3.75rem)] font-medium tracking-tight mb-2 leading-none">{{ cleaningTime }}</div>
              <div class="text-lg text-white/50">{{ cleaningDate }}</div>
            </div>
          </BaseCard>

          <BaseCard title="其他楼层" class="h-[65%] border-none min-h-0 flex flex-col">
            <div class="flex-1 flex flex-col gap-6 justify-center mt-2">
              <div v-for="floor in otherFloorList" :key="floor.label" class="flex items-center justify-start">
                <span class="text-[clamp(1rem,1.5vw,1.25rem)] text-white/80 font-medium whitespace-nowrap mr-2 xl:mr-4">{{ floor.label }}-空闲{{ floor.free }}</span>
                <div class="flex gap-1.5 xl:gap-2 items-center flex-wrap">
                  <div
                    v-for="(status, idx) in floor.statuses"
                    :key="idx"
                    class="w-[clamp(0.625rem,0.9vw,0.875rem)] h-[clamp(0.625rem,0.9vw,0.875rem)] rounded-full shrink-0"
                    :class="stallColor(status)"
                  ></div>
                  <div
                    v-if="floor.vip !== null"
                    class="w-[clamp(0.625rem,0.9vw,0.875rem)] h-[clamp(0.625rem,0.9vw,0.875rem)] rounded-full shrink-0"
                    :class="stallColor(floor.vip)"
                  ></div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>

        <div class="col-span-9 h-full min-h-0">
          <BaseCard title="当前楼层" class="w-full h-full border-none min-h-0 flex flex-col">
            <div class="absolute inset-0 opacity-30">
              <div class="absolute top-1/2 left-0 w-full h-64 -translate-y-1/2 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-3xl transform rotate-12"></div>
              <div class="absolute top-1/2 left-0 w-full h-64 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent blur-3xl transform -rotate-6"></div>
            </div>
            <h1 class="text-4xl font-medium mb-12 z-10 tracking-widest">{{ floorLabel }} {{ genderLabel }}</h1>

            <!-- 厕位状态：6 个以内一行，超过分两行且列对齐 -->
            <div class="w-full max-w-4xl px-8 z-10 flex flex-col gap-12">
              <div
                v-for="(row, ri) in stallRows"
                :key="ri"
                class="grid w-full justify-center"
                :style="{ gridTemplateColumns: `repeat(${row.cols}, minmax(0, 1fr))`, columnGap: '2rem' }"
              >
                <div
                  v-for="(status, idx) in row.stalls"
                  :key="idx"
                  class="flex items-center justify-center"
                  :style="row.offset > 0 && idx === 0 ? { gridColumn: row.offset + 1 } : undefined"
                >
                  <div
                    class="w-[clamp(3rem,7vw,4.5rem)] h-[clamp(3rem,7vw,4.5rem)] rounded-full shadow-lg transition-all duration-500 hover:scale-105 shrink-0"
                    :class="stallColor(status)"
                  ></div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

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
          class="border-none h-full"
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
