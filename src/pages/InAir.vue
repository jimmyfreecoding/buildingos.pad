<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AppConfig } from '../config'
import { useCockpitStore } from '../stores/cockpit'
import AppBackground from '../components/AppBackground.vue'
import BaseCard from '../components/BaseCard.vue'
import AppLogo from '../components/AppLogo.vue'
import TimeWidget from '../components/TimeWidget.vue'
import VScaleScreen from 'v-scale-screen'
import QualityCard from '../components/QualityCard.vue'
import { Home } from 'lucide-vue-next'

const router = useRouter()
const store = useCockpitStore()

const handleHome = () => {
  emit('close')
}

const emit = defineEmits(['close'])

const tempLevels = [
  { label: '偏冷', color: 'bg-blue-500' },
  { label: '适宜', color: 'bg-green-400' },
  { label: '偏热', color: 'bg-orange-400' },
]
const humidityLevels = [
  { label: '干燥', color: 'bg-yellow-400' },
  { label: '适宜', color: 'bg-green-400' },
  { label: '微湿', color: 'bg-teal-400' },
  { label: '高湿', color: 'bg-blue-500' },
]

const pm25Levels = [
  { label: '<35, 优', color: 'bg-green-500' },
  { label: '>35 且≤75, 良', color: 'bg-yellow-400' },
  { label: '>75 且≤115, 轻度污染', color: 'bg-orange-400' },
  { label: '>115 且≤150, 中度污染', color: 'bg-red-500' },
  { label: '>150 且≤250, 重度污染', color: 'bg-purple-500' },
  { label: '>250, 严重污染', color: 'bg-rose-900' },
]

const co2Levels = [
  { label: '<=500, 非常清新', color: 'bg-green-500' },
  { label: '>500 且≤800, 清新', color: 'bg-green-300' },
  { label: '>800 且≤1000, 较清新', color: 'bg-yellow-200' },
  { label: '>1000 且≤1500, 较污染', color: 'bg-orange-300' },
  { label: '>1500 且≤2000, 污染', color: 'bg-red-400' },
  { label: '>2000, 非常污浊', color: 'bg-red-700' },
]

const pm10Levels = [
  { label: '<= 0.5 正常', color: 'bg-green-500' },
  { label: '> 0.5 异常', color: 'bg-red-500' },
]

const tvocLevels = [
  { label: '<= 0.5 正常', color: 'bg-green-500' },
  { label: '> 0.5 异常', color: 'bg-red-500' },
]

const hchoLevels = [
  { label: '<= 0.08 正常', color: 'bg-green-500' },
  { label: '> 0.08 超标', color: 'bg-red-500' },
]

const aqiTable = [
  { range: '0 - 50', level: '一级（优）', desc: '空气质量令人满意，基本无空气污染', action: '各类人群可正常活动', color: 'bg-green-500' },
  { range: '51 - 100', level: '二级（良）', desc: '空气质量可接受，但某些污染物可能对极少数异常敏感人群健康有较弱影响', action: '极少数异常敏感人群应减少户外活动', color: 'bg-yellow-400' },
  { range: '101 - 150', level: '三级（轻度污染）', desc: '易感人群症状有轻度加剧，健康人群出现刺激症状', action: '儿童、老年人及心脏病、呼吸系统疾病患者应减少长时间、高强度的户外锻炼', color: 'bg-orange-400' },
  { range: '151 - 200', level: '四级（中度污染）', desc: '进一步加剧易感人群症状，可能对健康人群心脏、呼吸系统有影响', action: '儿童、老年人及心脏病、呼吸系统疾病患者避免长时间、高强度的户外锻炼，一般人适量减少户外运动', color: 'bg-red-500' },
  { range: '201 - 300', level: '五级（重度污染）', desc: '心脏病和肺病患者症状显著加剧，运动耐受力降低，健康人群普遍出现症状', action: '儿童、老年人及心脏病、肺病患者应停留在室内，停止户外运动，一般人群减少户外运动', color: 'bg-purple-600' },
  { range: '>300', level: '六级（严重污染）', desc: '健康人群运动耐受力降低，有明显强烈症状，提前出现某些疾病', action: '儿童、老年人及病人应停留在室内，避免体力消耗，一般人避免户外活动', color: 'bg-red-900' },
]

</script>

<template>

    <div class="relative z-10 w-full h-full text-white flex flex-col p-8 overflow-hidden">
      <!-- Header -->
      <header class="flex justify-between items-start mb-6 shrink-0">
        <AppLogo />
        <TimeWidget />
      </header>

      <!-- Main Grid -->
      <div class="flex-1 overflow-y-auto pr-2 pb-2">
        <!-- Top Row: Indicators -->
        <div class="grid grid-cols-3 gap-4 mb-6">
           <QualityCard title="温度" status="舒适" value="23.7" unit="°C" :progress="40" />
           <QualityCard title="湿度" status="舒适" value="55.9" unit="%" :progress="56" />
           <QualityCard title="甲醛" status="安全" value="0.012" unit="mg/m³" :progress="12" />
           <QualityCard title="CO₂" status="清新" value="558" unit="ppm" :progress="30" />
           <QualityCard title="PM2.5" status="优" value="10" unit="μg/m³" :progress="10" />
           <QualityCard title="TVOC" status="正常" value="0.1" unit="mg/m³" :progress="20" />
        </div>

        <!-- Explanation Rows -->
        <div class="grid grid-cols-2 gap-6">


           <!-- Environmental Colors -->
           <BaseCard class="col-span-2 bg-[#1e1e1e]/60 border-white/5 flex flex-col !p-6">
              <div class="text-lg font-medium mb-6">环境指标用色</div>
              <div class="grid grid-cols-6 gap-8">
                 <!-- Temperature -->
                 <div>
                    <div class="text-sm font-medium mb-3">温度</div>
                    <div class="flex flex-col gap-2">
                       <div v-for="(item, idx) in tempLevels" :key="idx" class="flex items-center gap-2 text-xs text-white/80">
                          <div class="w-2 h-2 rounded-full shrink-0" :class="item.color"></div>
                          <span>{{ item.label }}</span>
                       </div>
                    </div>
                 </div>

                 <!-- Humidity -->
                 <div>
                    <div class="text-sm font-medium mb-3">湿度</div>
                    <div class="flex flex-col gap-2">
                       <div v-for="(item, idx) in humidityLevels" :key="idx" class="flex items-center gap-2 text-xs text-white/80">
                          <div class="w-2 h-2 rounded-full shrink-0" :class="item.color"></div>
                          <span>{{ item.label }}</span>
                       </div>
                    </div>
                 </div>

                 <!-- PM2.5 -->
                 <div>
                    <div class="text-sm font-medium mb-3">PM2.5</div>
                    <div class="flex flex-col gap-2">
                       <div v-for="(item, idx) in pm25Levels" :key="idx" class="flex items-center gap-2 text-xs text-white/80">
                          <div class="w-2 h-2 rounded-full shrink-0" :class="item.color"></div>
                          <span>{{ item.label }}</span>
                       </div>
                    </div>
                 </div>
                 
                 <!-- CO2 -->
                 <div>
                    <div class="text-sm font-medium mb-3">CO2</div>
                    <div class="flex flex-col gap-2">
                       <div v-for="(item, idx) in co2Levels" :key="idx" class="flex items-center gap-2 text-xs text-white/80">
                          <div class="w-2 h-2 rounded-full shrink-0" :class="item.color"></div>
                          <span>{{ item.label }}</span>
                       </div>
                    </div>
                 </div>

                 <!-- Others Group -->
                 <div class="grid grid-cols-2 gap-8">
                    <!-- PM10 -->
                    <div>
                       <div class="text-sm font-medium mb-3">PM10</div>
                       <div class="flex flex-col gap-2">
                           <div v-for="(item, idx) in pm10Levels" :key="idx" class="flex items-center gap-2 text-xs text-white/80">
                              <div class="w-2 h-2 rounded-full shrink-0" :class="item.color"></div>
                              <span>{{ item.label }}</span>
                           </div>
                       </div>
                    </div>
                    <!-- TVOC -->
                    <div>
                       <div class="text-sm font-medium mb-3">TVOC</div>
                       <div class="flex flex-col gap-2">
                           <div v-for="(item, idx) in tvocLevels" :key="idx" class="flex items-center gap-2 text-xs text-white/80">
                              <div class="w-2 h-2 rounded-full shrink-0" :class="item.color"></div>
                              <span>{{ item.label }}</span>
                           </div>
                       </div>
                    </div>
                    <!-- HCHO -->
                    <div>
                       <div class="text-sm font-medium mb-3">甲醛</div>
                       <div class="flex flex-col gap-2">
                           <div v-for="(item, idx) in hchoLevels" :key="idx" class="flex items-center gap-2 text-xs text-white/80">
                              <div class="w-2 h-2 rounded-full shrink-0" :class="item.color"></div>
                              <span>{{ item.label }}</span>
                           </div>
                       </div>
                    </div>
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
/* Custom scrollbar for table if needed */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
</style>
