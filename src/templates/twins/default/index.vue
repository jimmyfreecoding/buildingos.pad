<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import TwinCard from '@/components/TwinCard.vue'
import dayjs from 'dayjs'

const currentTime = ref(dayjs().format('YYYY/MM/DD | HH:mm:ss'))
let timer: any = null

const menuItems = [
  { label: '综合态势', active: true },
  { label: '综合安防', active: false },
  { label: '智慧通行', active: false },
  { label: '设施设备', active: false },
  { label: '能耗管理', active: false },
  { label: '智慧空间', active: false },
]

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = dayjs().format('YYYY/MM/DD | HH:mm:ss')
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="w-[3840px] h-[2160px] bg-[#0a0f1c] text-white overflow-hidden relative font-sans">
    <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none z-10"></div>
    <div class="absolute inset-0 bg-[url('/images/twin.avif')] bg-cover bg-center opacity-60"></div>

    <header class="absolute top-0 left-0 right-0 h-[120px] z-50 flex justify-between items-start pt-6 px-12 bg-gradient-to-b from-black/90 to-transparent">
      <div class="flex items-center">
        <div class="text-5xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-b from-white to-[#00f0ff] italic">
          杭州极企大厦智慧运营中心
        </div>
      </div>

      <div class="flex items-center gap-2 transform translate-y-2">
        <div
          v-for="(item, index) in menuItems"
          :key="index"
          class="px-10 py-3 bg-[#112233]/80 border border-[#2b4c7c] transform skew-x-[-20deg] cursor-pointer transition-all hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]"
          :class="{'!bg-[#00f0ff]/30 !border-[#00f0ff] shadow-[0_0_15px_#00f0ff]': item.active}"
        >
          <div class="transform skew-x-[20deg] text-2xl font-bold tracking-wide" :class="item.active ? 'text-white' : 'text-gray-400'">
            {{ item.label }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-6 text-2xl font-mono text-[#00f0ff]">
        <div class="flex flex-col items-end">
          <span>{{ currentTime }}</span>
          <span class="text-sm text-gray-400 mt-1">多云 23°C PM2.5: 45</span>
        </div>
      </div>
    </header>

    <main class="relative z-40 w-full h-full pt-[140px] pb-10 px-12 flex justify-between">
      <div class="w-[800px] flex flex-col gap-6 h-full">
        <TwinCard title="实时能耗" class="h-[500px]">
          <div class="flex flex-col h-full gap-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-[#112233]/50 p-4 rounded border border-[#2b4c7c]/30">
                <div class="text-gray-400 text-lg mb-2">今日总耗电(kWh)</div>
                <div class="text-4xl font-bold text-[#00f0ff] font-mono">5,094</div>
              </div>
              <div class="bg-[#112233]/50 p-4 rounded border border-[#2b4c7c]/30">
                <div class="text-gray-400 text-lg mb-2">本月总耗电(kWh)</div>
                <div class="text-4xl font-bold text-[#00f0ff] font-mono">134,843</div>
              </div>
            </div>
            <div class="flex-1 bg-[#112233]/30 border border-[#2b4c7c]/20 rounded relative p-4">
              <div class="text-sm text-gray-500">能耗趋势分析</div>
              <div class="absolute bottom-4 left-4 right-4 h-[200px] flex items-end justify-between gap-2">
                 <div v-for="i in 12" :key="i" class="w-full bg-gradient-to-t from-[#00f0ff]/20 to-[#00f0ff]" :style="{height: Math.random() * 100 + '%' }"></div>
              </div>
            </div>
          </div>
        </TwinCard>

        <TwinCard title="办公环境监测" class="h-[400px]">
           <div class="grid grid-cols-3 gap-6 pt-4">
             <div class="text-center">
               <div class="text-gray-400 mb-2">温度</div>
               <div class="text-4xl text-[#00f0ff] font-mono">23.7<span class="text-sm">°C</span></div>
             </div>
             <div class="text-center">
               <div class="text-gray-400 mb-2">湿度</div>
               <div class="text-4xl text-[#00f0ff] font-mono">49<span class="text-sm">%</span></div>
             </div>
             <div class="text-center">
               <div class="text-gray-400 mb-2">PM2.5</div>
               <div class="text-4xl text-[#00f0ff] font-mono">24<span class="text-sm">μg/m³</span></div>
             </div>
             <div class="text-center">
               <div class="text-gray-400 mb-2">CO2</div>
               <div class="text-4xl text-[#00f0ff] font-mono">450<span class="text-sm">ppm</span></div>
             </div>
             <div class="text-center">
               <div class="text-gray-400 mb-2">甲醛</div>
               <div class="text-4xl text-[#00f0ff] font-mono">0.02<span class="text-sm">mg/m³</span></div>
             </div>
             <div class="text-center">
               <div class="text-gray-400 mb-2">噪音</div>
               <div class="text-4xl text-[#00f0ff] font-mono">45<span class="text-sm">dB</span></div>
             </div>
           </div>
        </TwinCard>

        <TwinCard title="空间占用情况" class="flex-1">
          <div class="space-y-4 pt-2">
            <div class="flex items-center justify-between bg-[#112233]/40 p-4 rounded">
              <span class="text-xl">会议室</span>
              <div class="w-64 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 w-[60%]"></div>
              </div>
              <span class="text-[#00f0ff] text-xl font-mono">60%</span>
            </div>
            <div class="flex items-center justify-between bg-[#112233]/40 p-4 rounded">
              <span class="text-xl">工位</span>
              <div class="w-64 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-green-500 w-[85%]"></div>
              </div>
              <span class="text-[#00f0ff] text-xl font-mono">85%</span>
            </div>
             <div class="flex items-center justify-between bg-[#112233]/40 p-4 rounded">
              <span class="text-xl">卫生间</span>
              <div class="w-64 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-yellow-500 w-[30%]"></div>
              </div>
              <span class="text-[#00f0ff] text-xl font-mono">30%</span>
            </div>
          </div>
        </TwinCard>
      </div>

      <div class="w-[800px] flex flex-col gap-6 h-full">
        <TwinCard title="楼层告警事件" class="h-[500px]">
           <table class="w-full text-left border-collapse">
             <thead>
               <tr class="text-gray-400 border-b border-gray-700">
                 <th class="p-3">序号</th>
                 <th class="p-3">位置</th>
                 <th class="p-3">告警类型</th>
                 <th class="p-3">时间</th>
               </tr>
             </thead>
             <tbody>
               <tr v-for="i in 5" :key="i" class="border-b border-gray-800 hover:bg-white/5">
                 <td class="p-3 text-[#00f0ff]">{{ i }}</td>
                 <td class="p-3">12F - 办公区A</td>
                 <td class="p-3 text-red-400">烟感报警</td>
                 <td class="p-3 text-gray-300">14:23:0{{ i }}</td>
               </tr>
             </tbody>
           </table>
        </TwinCard>

        <TwinCard title="电梯运行状态" class="h-[400px]">
           <div class="grid grid-cols-2 gap-4 h-full pt-2">
              <div class="bg-[#112233]/50 p-4 flex flex-col items-center justify-center border border-[#2b4c7c]/30">
                <div class="text-xl mb-2">客梯 1#</div>
                <div class="text-3xl font-bold text-green-400">运行中</div>
                <div class="text-sm text-gray-400 mt-2">当前楼层: 12F</div>
              </div>
              <div class="bg-[#112233]/50 p-4 flex flex-col items-center justify-center border border-[#2b4c7c]/30">
                <div class="text-xl mb-2">客梯 2#</div>
                <div class="text-3xl font-bold text-green-400">运行中</div>
                <div class="text-sm text-gray-400 mt-2">当前楼层: 1F</div>
              </div>
              <div class="bg-[#112233]/50 p-4 flex flex-col items-center justify-center border border-[#2b4c7c]/30">
                <div class="text-xl mb-2">货梯 1#</div>
                <div class="text-3xl font-bold text-yellow-400">维护中</div>
                <div class="text-sm text-gray-400 mt-2">当前楼层: -1F</div>
              </div>
               <div class="bg-[#112233]/50 p-4 flex flex-col items-center justify-center border border-[#2b4c7c]/30">
                <div class="text-xl mb-2">VIP梯</div>
                <div class="text-3xl font-bold text-green-400">待机</div>
                <div class="text-sm text-gray-400 mt-2">当前楼层: 25F</div>
              </div>
           </div>
        </TwinCard>

        <TwinCard title="人员流量统计" class="flex-1">
           <div class="flex items-center justify-around h-full">
             <div class="relative w-48 h-48 rounded-full border-4 border-[#112233] flex items-center justify-center">
               <div class="absolute inset-0 rounded-full border-4 border-[#00f0ff] border-r-transparent rotate-45"></div>
               <div class="text-center">
                 <div class="text-sm text-gray-400">今日人流</div>
                 <div class="text-3xl font-bold text-white">3,245</div>
               </div>
             </div>
             <div class="relative w-48 h-48 rounded-full border-4 border-[#112233] flex items-center justify-center">
               <div class="absolute inset-0 rounded-full border-4 border-yellow-500 border-l-transparent -rotate-12"></div>
               <div class="text-center">
                 <div class="text-sm text-gray-400">访客人数</div>
                 <div class="text-3xl font-bold text-white">128</div>
               </div>
             </div>
           </div>
        </TwinCard>
      </div>
    </main>
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #0b1120;
}
::-webkit-scrollbar-thumb {
  background: #2b4c7c;
  border-radius: 3px;
}
</style>
