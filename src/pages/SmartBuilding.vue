<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Brain, Check, Home } from 'lucide-vue-next'

const levels = [
  { level: 4, label: '感知控制', active: true },
  { level: 3, label: '理解控制', active: true },
  { level: 2, label: '定时控制', active: true },
  { level: 1, label: '远程运维', active: true }
]

const leftCards = [
  {
    title: 'AI算法控制',
    content: '极氪智慧楼宇按照智能化L5级标准建设，通过物联网数据中台向业务和60余的数据存储、清洗对接建模机制等，不断优化AI算法来完成L5级楼宇智能。'
  },
  {
    title: '配置场景数：65种',
    content: '配置场景条件进行智能化控制，如迎宾场景联动等应用'
  },
  {
    title: '可落地物联数：5个',
    content: '过程进行运维管理，避免运维难题'
  }
]

const rightCards = [
  {
    title: '工作传感器数：342个',
    content: '上万个传感器可对楼宇的空气、环境、能耗指标实时监测和调控'
  },
  {
    title: '运行策略数：13个',
    content: '通过AI洞察设备自动进行调节，确保制冷与耗能和体验的最佳平衡点'
  }
]

const buildingImage = ref('https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=A%20futuristic%20twisted%20skyscraper%20with%20glowing%20blue%20and%20green%20lights%2C%20minimalist%20style%2C%20dark%20background%2C%20vector%20art%20style%2C%20isometric%20view&image_size=portrait_4_3')

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleHome = () => {
  emit('close')
}
</script>

<template>
  <div class="relative w-full h-full bg-[#0a0f16] text-white p-8 overflow-hidden flex flex-col">
    <!-- Close Button -->
    <div class="absolute top-8 right-8 z-50 cursor-pointer" @click="emit('close')">
      <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
        <span class="text-xl">×</span>
      </div>
    </div>

    <!-- Title -->
    <h1 class="text-2xl font-bold mb-12">极企大厦</h1>

    <div class="flex-1 relative flex">
      <!-- Left Column: Levels -->
      <div class="w-64 flex flex-col gap-8 relative z-10">
        <!-- Level 5 (Active) -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <Brain class="w-5 h-5 text-white" />
            </div>
            <span class="text-lg font-bold">智能化等级 Lv.5</span>
          </div>
          <span class="text-white/60 text-sm pl-11">自我学习控制</span>
        </div>

        <!-- Vertical Line -->
        <div class="absolute left-4 top-10 bottom-0 w-[1px] border-l border-dashed border-white/20"></div>

        <!-- Other Levels -->
        <div class="flex flex-col gap-8 mt-2">
          <div v-for="lvl in levels" :key="lvl.level" class="flex flex-col gap-2">
            <div class="flex items-center gap-3 relative">
              <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center z-10">
                <Check class="w-4 h-4 text-white/60" />
              </div>
              <span class="text-lg font-bold text-white/60">智能化等级 Lv.{{ lvl.level }}</span>
            </div>
            <span class="text-white/40 text-sm pl-11">{{ lvl.label }}</span>
          </div>
        </div>
      </div>

      <!-- Center Area with Building and Cards -->
      <div class="flex-1 relative flex justify-center items-center">
        <!-- Building Image -->
        <div class="relative w-[400px] h-[800px] flex items-center justify-center z-0">
           <!-- Placeholder for building image -->
           <img :src="buildingImage" alt="Building" class="w-full h-full object-contain opacity-80" />
           
           <!-- Logo on Building -->
           <div class="absolute top-[20%] left-[30%] w-12 h-12 border-2 border-white opacity-80 rotate-[-15deg]">
             <div class="w-full h-full flex items-center justify-center">
               <div class="w-[1px] h-full bg-white"></div>
             </div>
           </div>
        </div>

        <!-- Left Cards -->
        <div class="absolute left-0 top-0 bottom-0 flex flex-col justify-center gap-16 w-80 z-10">
          <div v-for="(card, idx) in leftCards" :key="idx" 
               class="bg-[#1a2332]/90 backdrop-blur-md p-6 rounded-r-lg border-l-4 border-orange-500 relative group">
            <h3 class="font-bold text-lg mb-2">{{ card.title }}</h3>
            <p class="text-sm text-white/60 leading-relaxed">{{ card.content }}</p>
            
            <!-- Connector Line (Left) -->
            <div class="absolute right-0 top-1/2 w-24 h-[1px] border-t border-dashed border-blue-400/50 translate-x-full hidden lg:block">
              <div class="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400"></div>
            </div>
          </div>
        </div>

        <!-- Right Cards -->
        <div class="absolute right-0 top-0 bottom-0 flex flex-col justify-center gap-32 w-80 z-10">
          <div v-for="(card, idx) in rightCards" :key="idx" 
               class="bg-[#1a2332]/90 backdrop-blur-md p-6 rounded-l-lg border-r-4 border-orange-500 relative group text-right">
            <h3 class="font-bold text-lg mb-2">{{ card.title }}</h3>
            <p class="text-sm text-white/60 leading-relaxed">{{ card.content }}</p>

            <!-- Connector Line (Right) -->
            <div class="absolute left-0 top-1/2 w-24 h-[1px] border-t border-dashed border-blue-400/50 -translate-x-full hidden lg:block">
              <div class="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400"></div>
            </div>
          </div>
        </div>
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
/* Custom scrollbar if needed */
::-webkit-scrollbar {
  width: 0px;
}
</style>
