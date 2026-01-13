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
  Home, Wind, Thermometer, Droplet, Sun, Moon, 
  CloudRain, Eye, Gauge, Activity
} from 'lucide-vue-next'

const router = useRouter()
const store = useCockpitStore()

const handleHome = () => {
  // If used in a drawer, emitting an event or just closing might be handled by parent
  // But here we can also emit 'close' if this component is used inside a drawer
  emit('close')
}

const emit = defineEmits(['close'])

</script>

<template>
    <!-- Main Container -->
    <div class="relative z-10 w-full h-full text-white flex flex-col p-8 overflow-hidden">
      
      <!-- Header -->
      <header class="flex justify-between items-start mb-6 shrink-0">
        <AppLogo />
        <TimeWidget />
      </header>

      <!-- Grid Content -->
      <div class="flex-1 grid grid-cols-4 grid-rows-3 gap-6 min-h-0">
        
        <!-- Row 1 -->
        <!-- Temperature -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Thermometer class="w-4 h-4" /> 温度
           </div>
           <div class="flex items-baseline mt-2">
             <span class="text-6xl font-medium">12</span>
             <span class="text-2xl text-white/60">°</span>
           </div>
           <div class="mt-auto">
             <div class="text-lg mb-1">下降 ↘</div>
             <div class="text-xs text-white/60 leading-relaxed">
               持续降温，将于 下午11:00 达到最低气温 9°。上午 3:00 达到夜间最低 8°。
             </div>
           </div>
        </BaseCard>

        <!-- Feels Like -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Thermometer class="w-4 h-4" /> 体感温度
           </div>
           <div class="flex items-baseline mt-2">
             <span class="text-6xl font-medium">15</span>
             <span class="text-2xl text-white/60">°</span>
           </div>
           <div class="text-sm text-white/60">温度 12°</div>
           <div class="mt-auto">
             <div class="text-lg mb-1">舒适 ↘</div>
             <div class="text-xs text-white/60 leading-relaxed">
               由于湿度原因，感觉比实际温度更暖和。
             </div>
           </div>
        </BaseCard>

        <!-- Wind -->
        <BaseCard class="col-span-2 bg-[#1e1e1e]/60 border-white/5 flex flex-col !p-5">
           <div class="flex items-center gap-2 text-white/60 text-sm mb-4">
             <Wind class="w-4 h-4" /> 风速
           </div>
           <div class="flex justify-between items-start mb-4">
              <div class="flex flex-col">
                 <div class="flex items-baseline gap-2">
                   <span class="text-5xl font-medium">3</span>
                   <span class="text-sm text-white/60">公里/小时</span>
                 </div>
                 <div class="text-xs text-white/60 mt-1">风向: WSW</div>
              </div>
              <div class="flex flex-col text-right">
                 <div class="flex items-baseline gap-2 justify-end">
                   <span class="text-5xl font-medium">8</span>
                   <span class="text-sm text-white/60">公里/小时</span>
                 </div>
                 <div class="text-xs text-white/60 mt-1">阵风</div>
              </div>
              <!-- Compass Graphic Placeholder -->
              <div class="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center relative">
                 <div class="absolute top-1 text-[10px] text-white/60">北</div>
                 <div class="absolute bottom-1 text-[10px] text-white/60">南</div>
                 <div class="absolute left-1 text-[10px] text-white/60">西</div>
                 <div class="absolute right-1 text-[10px] text-white/60">东</div>
                 <Wind class="w-8 h-8 text-white/40" />
              </div>
           </div>
           <div class="mt-auto border-t border-white/10 pt-3">
             <div class="text-lg mb-1">风力：1 (软风) ~</div>
             <div class="text-xs text-white/60 leading-relaxed">
               风力稳定，西南偏南 风预计到夜间保持平均风速 2 公里/小时 (阵风风速为 8)。
             </div>
           </div>
        </BaseCard>

        <!-- Row 2 -->
        <!-- Precipitation -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <CloudRain class="w-4 h-4" /> 降水
           </div>
           <div class="flex items-baseline mt-2">
             <span class="text-6xl font-medium">0</span>
             <span class="text-sm text-white/60 ml-2">毫米</span>
           </div>
           <div class="text-xs text-white/60">接下来 24 小时</div>
           <div class="mt-auto">
             <div class="text-lg mb-1">无降水 ~</div>
             <div class="text-xs text-white/60 leading-relaxed">
               未来 24 小时没有降水。
             </div>
           </div>
        </BaseCard>

        <!-- Humidity -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5 relative">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Droplet class="w-4 h-4" /> 湿度
           </div>
           <div class="flex items-baseline mt-2">
             <span class="text-6xl font-medium">71</span>
             <span class="text-2xl text-white/60">%</span>
           </div>
           <!-- Simple Gauge -->
           <div class="absolute top-6 right-6 w-16 h-16 rounded-full border-4 border-white/10 border-t-blue-400 transform rotate-45"></div>

           <div class="mt-auto">
             <div class="text-lg mb-1">普通 ↗</div>
             <div class="text-xs text-white/60 leading-relaxed">
               持续升高，在 下午7:00 达到 82% 的最高值。
             </div>
           </div>
        </BaseCard>

        <!-- UV Index -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5 relative">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Sun class="w-4 h-4" /> 紫外线
           </div>
           <div class="flex items-baseline mt-2">
             <span class="text-6xl font-medium">1</span>
           </div>
           <!-- Simple Gauge -->
           <div class="absolute top-6 right-6 w-16 h-16 rounded-full border-4 border-white/10 border-l-yellow-400"></div>

           <div class="mt-auto">
             <div class="text-lg mb-1">低 ~</div>
             <div class="text-xs text-white/60 leading-relaxed">
               今天的最大紫外线照射量较低，预计出现在 下午 4:15。
             </div>
           </div>
        </BaseCard>

        <!-- AQI -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5 relative">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Activity class="w-4 h-4" /> AQI
           </div>
           <div class="flex items-baseline mt-2">
             <span class="text-6xl font-medium">58</span>
           </div>
           <!-- Simple Gauge -->
           <div class="absolute top-6 right-6 w-16 h-16 rounded-full border-4 border-white/10 border-r-green-400"></div>

           <div class="mt-auto">
             <div class="text-lg mb-1">良 ↘</div>
             <div class="text-xs text-white/60 leading-relaxed">
               空气质量有恶化趋势，主要污染物：PM2.5 6.4 μg/m³。
             </div>
           </div>
        </BaseCard>

        <!-- Row 3 -->
        <!-- Visibility -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Eye class="w-4 h-4" /> 能见度
           </div>
           <div class="flex items-baseline mt-2">
             <span class="text-6xl font-medium">16</span>
             <span class="text-sm text-white/60 ml-2">公里</span>
           </div>
           <div class="mt-auto">
             <div class="text-lg mb-1">极好 ↘</div>
             <div class="text-xs text-white/60 leading-relaxed">
               能见度不断降低，预计在 下午4:15 达到最低值 16 公里。
             </div>
           </div>
        </BaseCard>

        <!-- Pressure -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5 relative">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Gauge class="w-4 h-4" /> 气压
           </div>
           <div class="flex items-baseline mt-2">
             <span class="text-5xl font-medium">1023</span>
             <span class="text-sm text-white/60 ml-1">hPa</span>
           </div>
           <!-- Simple Gauge -->
           <div class="absolute top-8 right-6 w-12 h-8 border-t-2 border-white/20 rounded-t-full"></div>

           <div class="mt-auto">
             <div class="text-lg mb-1">缓慢下降 ↘</div>
             <div class="text-xs text-white/60 leading-relaxed">
               在过去 3 小时内缓慢下降。预计在接下来的 3 小时内将下降。
             </div>
           </div>
        </BaseCard>

        <!-- Sun -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Sun class="w-4 h-4" /> 太阳
           </div>
           <!-- Sun Graph Placeholder -->
           <div class="flex-1 flex items-center justify-center relative my-2">
              <div class="w-full h-16 border-t border-white/20 rounded-t-[50%] relative overflow-hidden">
                 <div class="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-yellow-500/10 to-transparent"></div>
                 <div class="absolute top-0 left-1/4 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
              </div>
              <div class="absolute bottom-0 text-xs text-white/60">10 小时 25 分钟</div>
           </div>
           <div class="flex justify-between items-end">
              <div>
                <div class="text-2xl font-medium">07:18</div>
                <div class="text-xs text-white/60">日出</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-medium">17:44</div>
                <div class="text-xs text-white/60">日落</div>
              </div>
           </div>
        </BaseCard>

        <!-- Moon -->
        <BaseCard class="bg-[#1e1e1e]/60 border-white/5 flex flex-col justify-between !p-5">
           <div class="flex items-center gap-2 text-white/60 text-sm">
             <Moon class="w-4 h-4" /> 月亮
           </div>
           <!-- Moon Graph Placeholder -->
           <div class="flex-1 flex items-center justify-center relative my-2">
              <div class="w-full h-16 border-t border-white/20 rounded-t-[50%] relative overflow-hidden">
                 <div class="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-blue-500/10 to-transparent"></div>
                 <div class="absolute top-0 left-3/4 w-3 h-3 bg-gray-300 rounded-full"></div>
              </div>
              <div class="absolute bottom-0 text-xs text-white/60">10 小时 6 分钟</div>
           </div>
           <div class="flex justify-between items-end">
              <div>
                <div class="text-2xl font-medium">04:01</div>
                <div class="text-xs text-white/60">月出</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-medium">14:07</div>
                <div class="text-xs text-white/60">月落</div>
              </div>
           </div>
        </BaseCard>

        <!-- Moon Phase (Small extra card, merging with Moon or as separate? Image shows 4 columns, let's stick to grid) -->
        <!-- Note: Image actually has 4 cards in last row, but grid is 4 columns. 
             Wait, image row 3 has: Visibility, Pressure, Sun, Moon. 
             Bottom row left is Moon Phase. 
             It seems the grid is flexible. Let's add Moon Phase as a 5th item in row 3 or separate row?
             The image shows 3 rows.
             Row 1: Temp, FeelsLike, Wind (2 cols) -> Total 4 cols.
             Row 2: Precip, Humid, UV, AQI -> Total 4 cols.
             Row 3: Vis, Press, Sun, Moon -> Total 4 cols.
             Row 4 (Bottom-left): Moon Phase.
             Let's add a 4th row for Moon Phase if needed or fit it. 
             The image description says "Bottom row, middle-right card: Moon", "Bottom row, left card: Moon Phase".
             Actually looking at image_1 description again:
             Third row: Visibility, Pressure, Sun. (3 cards)
             Bottom row: Moon Phase, Moon.
             
             Let's re-examine the image crop/layout visually from description.
             Row 1: Temp, Feels Like, Wind(wide?) -> Wind looks wide in description "Left value... Right value...". Yes, Wind takes 2 cols.
             Row 2: Precip, Humid, UV, AQI. (4 cols)
             Row 3: Vis, Press, Sun, Moon. (4 cols)
             Row 4: Moon Phase? 
             
             Let's stick to a standard grid. I will put Moon Phase in a new row or alongside others.
             Let's assume a 4-column grid.
             Row 1: Temp(1), Feels(1), Wind(2)
             Row 2: Precip(1), Humid(1), UV(1), AQI(1)
             Row 3: Vis(1), Press(1), Sun(1), Moon(1)
             Row 4: Moon Phase(1)
        -->
        
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
