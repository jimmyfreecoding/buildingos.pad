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
      <div class="flex-1 relative flex justify-center items-center -mt-20 z-0">
        <!-- Building Image -->
        <div class="relative w-[600px] h-[1200px] flex items-center justify-center z-0 pointer-events-none">
           <!-- Inline SVG Building -->
           <svg width="100%" height="100%" viewBox="0 0 1447 949" fill="none" xmlns="http://www.w3.org/2000/svg" class="opacity-80 scale-150">
             <path d="M697 948.406L753.5 16.4064L111 464.906L0 928.406L697 948.406Z" fill="#2C2C2C"/>
             <path d="M119.5 457.906L112.5 462.406L40 774.406L46 772.906L119.5 457.906Z" fill="#444444"/>
             <path d="M108.5 462.906L101.5 467.906L28.5 775.906H34L108.5 462.906Z" fill="#444444"/>
             <path d="M146.5 438.406L139 443.406L63 770.406L70 769.406L146.5 438.406Z" fill="#444444"/>
             <path d="M179 414.906L168.5 422.406L89 765.906L98 764.406L179 414.906Z" fill="#444444"/>
             <path d="M212.5 390.906L201.5 398.906L122 760.906L131 759.906L212.5 390.906Z" fill="#444444"/>
             <path d="M247.5 366.906L238 371.406L156.5 755.406L166 753.906L247.5 366.906Z" fill="#444444"/>
             <path d="M288 336.906L276.5 344.906L195.5 749.406L207.5 747.406L288 336.906Z" fill="#444444"/>
             <path d="M335 303.406L321 313.406L241 741.906L254.5 739.906L335 303.406Z" fill="#444444"/>
             <path d="M387.5 265.906L373 276.406L294 733.406L309 730.906L387.5 265.906Z" fill="#444444"/>
             <path d="M447 222.406L431.5 233.906L355 723.906L373.5 720.906L447 222.406Z" fill="#444444"/>
             <path d="M519.5 171.406L501 185.406L427 712.906L449.5 708.406L519.5 171.406Z" fill="#444444"/>
             <path d="M601 111.906L578 128.406L536 510.406L561.5 502.906L601 111.906Z" fill="#444444"/>
             <path d="M698.5 41.4064L672.5 60.4064L640 474.406L669.5 464.906L698.5 41.4064Z" fill="#444444"/>
             <path d="M113.5 459.906L106.5 464.406L34 776.406L40 774.906L113.5 459.906Z" fill="#626262"/>
             <path d="M102.5 464.906L95.5 469.906L22.5 777.906H28L102.5 464.906Z" fill="#626262"/>
             <path d="M140.5 440.406L133 445.406L57 772.406L64 771.406L140.5 440.406Z" fill="#626262"/>
             <path d="M173 416.906L162.5 424.406L83 767.906L92 766.406L173 416.906Z" fill="#626262"/>
             <path d="M206.5 392.906L195.5 400.906L116 762.906L125 761.906L206.5 392.906Z" fill="#626262"/>
             <path d="M241.5 368.906L232 373.406L150.5 757.406L160 755.906L241.5 368.906Z" fill="#626262"/>
             <path d="M282 338.906L270.5 346.906L189.5 751.406L201.5 749.406L282 338.906Z" fill="#626262"/>
             <path d="M329 305.406L315 315.406L235 743.906L248.5 741.906L329 305.406Z" fill="#626262"/>
             <path d="M381.5 267.906L367 278.406L288 735.406L303 732.906L381.5 267.906Z" fill="#626262"/>
             <path d="M441 224.406L425.5 235.906L349 725.906L367.5 722.906L441 224.406Z" fill="#626262"/>
             <path d="M513.5 173.406L495 187.406L421 714.906L443.5 710.406L513.5 173.406Z" fill="#626262"/>
             <path d="M595 113.906L572 130.406L530 512.406L555.5 504.906L595 113.906Z" fill="#626262"/>
             <path d="M692.5 43.4064L666.5 62.4064L634 476.406L663.5 466.906L692.5 43.4064Z" fill="#626262"/>
             <path d="M1379.5 459.406L755 18.4064L695 947.906H1442L1379.5 459.406Z" fill="#202020"/>
             <path d="M754.5 0.406403L34.5 516.406" stroke="#FA6262"/>
             <path d="M754.5 0.406403L714.5 28.4064L646.5 946.406L697 948.406L754.5 0.406403Z" fill="#626262"/>
             <path d="M794.5 28.4064L754 0.406403L696.5 947.906H748.5L794.5 28.4064Z" fill="#434343"/>
             <path d="M1365 442.906L1376 450.906L1439.5 946.406L1428.5 946.906L1365 442.906Z" fill="black"/>
             <path d="M1329 416.906L1338.5 421.406L1398 946.906H1389.5L1329 416.906Z" fill="black"/>
             <path d="M1285 386.906L1296.5 394.906L1354 947.406H1343L1285 386.906Z" fill="black"/>
             <path d="M1236.5 352.906L1250.5 362.906L1289.5 766.906L1271 765.906L1236.5 352.906Z" fill="black"/>
             <path d="M1179 312.906L1193.5 323.406L1220.5 639.906L1204 634.406L1179 312.906Z" fill="black"/>
             <path d="M1117 268.906L1133.5 280.906L1154.5 615.406L1135 608.906L1117 268.906Z" fill="black"/>
             <path d="M1042 215.906L1063.5 230.906L1077.5 587.906L1057 580.406L1042 215.906Z" fill="black"/>
             <path d="M960.5 156.406L983.5 172.906L989.5 555.906L963.5 546.906L960.5 156.406Z" fill="black"/>
             <path d="M863 85.9064L889 104.906L883.5 516.406L853 505.406L863 85.9064Z" fill="black"/>
             <path d="M1372 442.906L1383 450.906L1446.5 946.406L1435.5 946.906L1372 442.906Z" fill="#434343"/>
             <path d="M1336 416.906L1345.5 421.406L1405 946.906H1396.5L1336 416.906Z" fill="#434343"/>
             <path d="M1292 386.906L1303.5 394.906L1361 947.406H1350L1292 386.906Z" fill="#434343"/>
             <path d="M1243.5 352.906L1257.5 362.906L1296.5 766.906L1278 765.906L1243.5 352.906Z" fill="#434343"/>
             <path d="M1186 312.906L1200.5 323.406L1227.5 639.906L1211 634.406L1186 312.906Z" fill="#434343"/>
             <path d="M1124 268.906L1140.5 280.906L1161.5 615.406L1142 608.906L1124 268.906Z" fill="#434343"/>
             <path d="M1049 215.906L1070.5 230.906L1084.5 587.906L1064 580.406L1049 215.906Z" fill="#434343"/>
             <path d="M967.5 156.406L990.5 172.906L996.5 555.906L970.5 546.906L967.5 156.406Z" fill="#434343"/>
             <path d="M870 85.9064L896 104.906L890.5 516.406L860 505.406L870 85.9064Z" fill="#434343"/>
           </svg>
        </div>

        <!-- Left Cards -->
        <div class="absolute left-0 top-0 bottom-0 flex flex-col justify-center gap-16 w-80 z-10 pointer-events-none">
          <div v-for="(card, idx) in leftCards" :key="idx" 
               class="bg-[#1a2332]/90 backdrop-blur-md p-6 rounded-r-lg border-l-4 border-orange-500 relative group pointer-events-auto">
            <h3 class="font-bold text-lg mb-2">{{ card.title }}</h3>
            <p class="text-sm text-white/60 leading-relaxed">{{ card.content }}</p>
            
            <!-- Connector Line (Left) -->
            <div class="absolute right-0 top-1/2 w-24 h-[1px] border-t border-dashed border-blue-400/50 translate-x-full hidden lg:block">
              <div class="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400"></div>
            </div>
          </div>
        </div>

        <!-- Right Cards -->
        <div class="absolute right-0 top-0 bottom-0 flex flex-col justify-center gap-32 w-80 z-10 pointer-events-none">
          <div v-for="(card, idx) in rightCards" :key="idx" 
               class="bg-[#1a2332]/90 backdrop-blur-md p-6 rounded-l-lg border-r-4 border-orange-500 relative group text-right pointer-events-auto">
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
  </div>
</template>

<style scoped>
/* Custom scrollbar if needed */
::-webkit-scrollbar {
  width: 0px;
}
</style>
