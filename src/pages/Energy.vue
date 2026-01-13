<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Zap, Activity, X } from 'lucide-vue-next'
import * as echarts from 'echarts'

const emit = defineEmits(['close'])

const activeTab = ref('日')
const tabs = ['日', '周', '月']

const chartRef = ref<HTMLElement | null>(null)
let myChart: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  myChart = echarts.init(chartRef.value)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      textStyle: {
        color: '#000'
      },
      padding: [8, 12],
      formatter: function (params: any) {
        const val = params[0].value
        return `用电量: ${val}kwh`
      },
      extraCssText: 'border-radius: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: none;'
    },
    grid: {
      top: '15%',
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10
      }
    },
    series: [
      {
        name: '用电量',
        type: 'bar',
        barWidth: '25%',
        itemStyle: {
          color: '#00e5ff',
          borderRadius: [2, 2, 0, 0]
        },
        data: [
          0.6, 1.2, 1.5, 1.5, 1.6, 1.8, 2.6, 3.2, 5.5, 6.2, 
          6.3, 6.6, 7.0, 6.1, 7.6, 7.4, 6.5, 6.8, 5.6, 4.6, 
          5.1, 4.2, 2.8, 1.6
        ],
        markPoint: {
            symbol: 'circle',
            symbolSize: 1,
            label: {
                show: false
            },
            data: [
                { type: 'max', name: 'Max' }
            ]
        },
        // Highlight logic can be done via itemStyle callback or visualMap, 
        // but for simplicity we'll just stick to the cyan color for now
        // or customize specific bars if needed.
      }
    ]
  }

  myChart.setOption(option)
}

onMounted(() => {
  nextTick(() => {
    initChart()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  myChart?.dispose()
})

const handleResize = () => {
  myChart?.resize()
}

</script>

<template>
  <div class="w-full h-full flex flex-col p-8 relative">
    <!-- Close Button -->
    <button 
      @click="$emit('close')" 
      class="absolute top-8 right-8 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
    >
      <X class="w-6 h-6" />
    </button>

    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex flex-col gap-4">
        <h1 class="text-2xl font-medium text-white">26F 能耗数据</h1>
        
        <!-- Tabs -->
        <div class="flex bg-slate-800/50 rounded-full p-1 w-fit">
          <button 
            v-for="tab in tabs" 
            :key="tab"
            @click="activeTab = tab"
            class="px-8 py-1.5 rounded-full text-sm transition-all duration-300"
            :class="activeTab === tab ? 'bg-slate-700 text-white shadow-lg' : 'text-white/40 hover:text-white/70'"
          >
            {{ tab }}
          </button>
        </div>
      </div>
    </div>

    <!-- Top Cards -->
    <div class="grid grid-cols-2 gap-6 mb-6">
      <!-- Card 1 -->
      <div class="bg-slate-800/40 rounded-2xl p-6 flex items-center gap-6 border border-white/5">
        <div class="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0">
          <Zap class="w-6 h-6 text-white" />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-white/40 text-sm">今日总用电量 (2024.05.13)</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-white">55.96</span>
            <span class="text-white/40 text-sm">kwh</span>
          </div>
          <span class="text-green-400 text-xs font-medium">+2.4%</span>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="bg-slate-800/40 rounded-2xl p-6 flex items-center gap-6 border border-white/5">
        <div class="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0">
          <Activity class="w-6 h-6 text-white" />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-white/40 text-sm">实时功率</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-white">4140.8</span>
            <span class="text-white/40 text-sm">w</span>
          </div>
          <span class="text-green-400 text-xs font-medium">+2.4%</span>
        </div>
      </div>
    </div>

    <!-- Main Chart Section -->
    <div class="flex-1 bg-slate-800/40 rounded-2xl p-6 border border-white/5 flex flex-col min-h-0">
      <div class="text-white/40 text-sm mb-4">日用电量(kwh)</div>
      <div ref="chartRef" class="flex-1 w-full h-full min-h-[300px]"></div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar if needed */
</style>
