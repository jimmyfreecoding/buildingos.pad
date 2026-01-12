<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Phone, Cast, LayoutGrid, Reply, 
  ArrowLeft, Video, Mic, Grid, Presentation, GalleryHorizontal,
  MonitorUp, UserPlus, Users, Cloud, Settings2, PhoneOff, Volume2, VideoOff, Loader2, QrCode,
  Laptop, AppWindow, Keyboard, ScreenShare, MicOff, Monitor
} from 'lucide-vue-next'
import AppLogo from '../components/AppLogo.vue'
import BaseDialog from '../components/Dialog.vue'
import Tabs from '../components/Tabs.vue'

// Define Emits
const emit = defineEmits(['close'])

const meetingNumber = ref('47456987')
const showLayoutDialog = ref(false)
const showInviteDialog = ref(false)
const showShareDialog = ref(false)
const showMembersDialog = ref(false)
const activeLayout = ref('speaker')
const meetingStatus = ref<'idle' | 'connecting' | 'connected'>('idle')
const volume = ref(81)

const activeMemberTab = ref('meeting')
const memberTabs = [
  { label: '会议中 1', value: 'meeting' },
  { label: '等候室 2', value: 'waiting' }
]

const meetingMembers = ref([
  { 
    id: 1, 
    name: '大会议室', 
    role: '主持人', 
    isSelf: true, 
    company: '成都极全科技有限公司',
    avatar: 'room',
    mic: true,
    camera: true,
    share: true
  },
  { 
    id: 2, 
    name: '蒲江', 
    company: '成都极全科技有限公司',
    avatar: 'user',
    mic: false,
    camera: false,
    share: false
  }
])

const waitingMembers = ref([
  { 
    id: 3, 
    name: 'Admin', 
    company: '成都极全科技有限公司',
    avatar: 'room'
  },
  { 
    id: 4, 
    name: '蒲江', 
    company: '成都极全科技有限公司',
    avatar: 'user'
  }
])

const layouts = [
  { id: 'grid', name: '宫格视图', icon: Grid },
  { id: 'speaker', name: '演讲者视图', icon: Presentation },
  { id: 'thumbnail', name: '缩略图视图', icon: GalleryHorizontal },
]

const handleLayoutClick = () => {
  showLayoutDialog.value = true
}

const handleInviteClick = () => {
  showInviteDialog.value = true
}

const handleShareClick = () => {
  showShareDialog.value = true
}

const handleMembersClick = () => {
  showMembersDialog.value = true
}

const handleJoinMeeting = () => {
  meetingStatus.value = 'connecting'
  setTimeout(() => {
    meetingStatus.value = 'connected'
  }, 3000)
}

const handleEndMeeting = () => {
  meetingStatus.value = 'idle'
}

const formattedNumber = computed(() => {
  const num = meetingNumber.value
  return num.replace(/(\d{3})(?=\d)/g, '$1 ')
})

const handleKeypadClick = (num: number) => {
  if (meetingNumber.value.length < 12) {
    meetingNumber.value += num.toString()
  }
}

const handleDelete = () => {
  meetingNumber.value = meetingNumber.value.slice(0, -1)
}

</script>

<template>
  <!-- Main Container -->
  <div class="relative w-full h-full pt-4 px-8 pb-4 text-white overflow-hidden flex flex-col">
    
    <!-- Top Header -->
    <header class="flex justify-between items-center mb-2 px-2 h-12">
      <!-- Logo Area -->
      <div class="flex items-center gap-4">
        <AppLogo />
      </div>
      
      <!-- Title -->
      <div class="absolute left-1/2 -translate-x-1/2 text-2xl font-medium tracking-wide">
        <div v-if="meetingStatus === 'connected'" class="flex flex-col items-center">
          <div class="text-3xl font-bold tracking-widest">会议号：{{ formattedNumber }}</div>
          <div class="text-sm text-white/70 mt-1">共享码：XUDH-DJKD</div>
        </div>
        <div v-else class="flex items-center gap-6 mb-4">
          <div class="text-3xl font-medium tracking-widest">{{ formattedNumber }}</div>
          <button 
            class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center"
            @click="handleDelete"
          >
            <ArrowLeft class="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <!-- Contact Info -->
      <div class="flex items-center gap-6">
        <div class="bg-black/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Phone class="w-3 h-3" />
          </div>
          <span class="text-sm font-medium">会务联系：13432223455</span>
        </div>
        <Cast class="w-6 h-6 text-white/80" />
      </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 flex flex-col items-center justify-center gap-6 pb-10 mt-4 overflow-hidden">
      
      <!-- Connecting State -->
      <div v-if="meetingStatus === 'connecting'" class="flex flex-col items-center gap-4">
        <Loader2 class="w-16 h-16 animate-spin text-white/50" />
        <span class="text-xl font-medium tracking-wide">正在加入会议...</span>
      </div>

      <!-- Connected State -->
      <div v-else-if="meetingStatus === 'connected'" class="flex flex-col items-center gap-12 w-full max-w-4xl">
        <!-- Control Grid -->
        <div class="grid grid-cols-4 gap-x-12 gap-y-10">
          <!-- Row 1 -->
          <div class="flex flex-col items-center gap-3">
            <div class="w-24 h-24 rounded-[2.5rem] bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer">
              <Mic class="w-10 h-10" />
            </div>
            <span class="text-base font-medium">静音</span>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div class="w-24 h-24 rounded-[2.5rem] bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer">
              <VideoOff class="w-10 h-10" />
            </div>
            <span class="text-base font-medium">关闭摄像</span>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div 
              class="w-24 h-24 rounded-[2.5rem] bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer"
              @click="handleShareClick"
            >
              <MonitorUp class="w-10 h-10" />
            </div>
            <span class="text-base font-medium">共享屏幕</span>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div 
              class="w-24 h-24 rounded-[2.5rem] bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer" 
              @click="handleLayoutClick"
            >
              <LayoutGrid class="w-10 h-10" />
            </div>
            <span class="text-base font-medium">切换布局</span>
          </div>

          <!-- Row 2 -->
          <div class="flex flex-col items-center gap-3">
            <div 
              class="w-20 h-20 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer"
              @click="handleInviteClick"
            >
              <UserPlus class="w-8 h-8" />
            </div>
            <span class="text-sm font-medium">邀请</span>
          </div>
          <div class="flex flex-col items-center gap-3 relative">
            <div 
              class="w-20 h-20 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer"
              @click="handleMembersClick"
            >
              <Users class="w-8 h-8" />
            </div>
            <div class="absolute top-0 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <span class="text-sm font-medium mt-3">成员</span>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div class="w-20 h-20 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer">
              <Cloud class="w-8 h-8" />
            </div>
            <span class="text-sm font-medium">云录制</span>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div class="w-20 h-20 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer">
              <Settings2 class="w-8 h-8" />
            </div>
            <span class="text-sm font-medium">摄像头设置</span>
          </div>
        </div>

        <!-- Volume Control -->
        <div class="flex items-center gap-6 w-[400px]">
          <Volume2 class="w-6 h-6" />
          <el-slider 
            v-model="volume" 
            :show-tooltip="false"
            class="flex-1"
            style="--el-slider-main-bg-color: #3b82f6; --el-slider-runway-bg-color: rgba(255,255,255,0.2); --el-slider-button-size: 16px;"
          />
          <span class="w-8 text-right font-medium">{{ volume }}</span>
        </div>
      </div>

      <!-- Idle State (Keypad) -->
      <div v-else class="flex flex-col items-center w-full mt-10">
        <!-- Keypad -->
        <div class="grid grid-cols-3 gap-x-10 gap-y-4">
           <button 
             v-for="num in 9" 
             :key="num"
             class="w-24 h-24 rounded-full border-2 border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-4xl font-light transition-all active:scale-95 flex items-center justify-center"
             @click="handleKeypadClick(num)"
           >
             {{ num }}
           </button>
           <!-- Spacer -->
           <div></div>
           <button 
             class="w-24 h-24 rounded-full border-2 border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-4xl font-light transition-all active:scale-95 flex items-center justify-center"
             @click="handleKeypadClick(0)"
           >
             0
           </button>
        </div>
      </div>

      <!-- Spacer to ensure bottom padding -->
      <div class="h-4"></div>
    </div>

    <!-- Bottom Footer -->
    <div class="flex justify-between items-end px-2">
      <!-- Left Info -->
      <div class="flex gap-4">

      </div>

      <!-- Center Actions -->
      <div class="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center gap-6 pb-2">
        <template v-if="meetingStatus === 'connected'">
          <button 
            class="bg-[#ff6b6b] hover:bg-[#fa5252] active:scale-95 transition-all text-white px-12 py-3.5 rounded-xl font-medium text-lg min-w-[180px]"
            @click="handleEndMeeting"
          >
            结束会议
          </button>
        </template>
        <template v-else-if="meetingStatus === 'idle'">
          <button class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center">
             <Video class="w-6 h-6" />
          </button>
          <button class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center">
             <Mic class="w-6 h-6" />
          </button>
          
          <button 
            class="bg-[#5c7cfa] hover:bg-[#4c6ef5] active:scale-95 transition-all text-white px-8 py-3.5 rounded-xl font-medium text-lg min-w-[140px]"
            @click="handleJoinMeeting"
          >
            加入会议
          </button>
          
          <button class="bg-[#40c057] hover:bg-[#37b24d] active:scale-95 transition-all text-white px-8 py-3.5 rounded-xl font-medium text-lg min-w-[140px]">
            快速会议
          </button>
        </template>
      </div>

      <!-- Right Actions -->
      <div class="flex items-center gap-4">
        <button 
          class="bg-black/20 backdrop-blur-md hover:bg-black/30 active:scale-95 transition-all rounded-full px-6 py-2.5 flex items-center gap-2"
          @click="emit('close')"
        >
          <Reply class="w-5 h-5" />
          <span class="font-medium">返回</span>
        </button>
      </div>
    </div>

    <!-- Layout Selection Dialog -->
    <BaseDialog v-model="showLayoutDialog" width="700px">
      <div class="flex items-center justify-center gap-6 w-full h-full px-8 py-12">
        <div 
          v-for="layout in layouts" 
          :key="layout.id"
          class="flex flex-col items-center gap-4 cursor-pointer group"
          @click="activeLayout = layout.id"
        >
          <div 
            class="w-40 h-28 rounded-xl border-2 flex items-center justify-center transition-all duration-300"
            :class="activeLayout === layout.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white group-hover:border-gray-300'"
          >
            <component 
              :is="layout.icon" 
              class="w-12 h-12 transition-colors duration-300"
              :class="activeLayout === layout.id ? 'text-blue-500' : 'text-gray-400'"
            />
          </div>
          <span 
            class="text-sm font-medium transition-colors duration-300"
            :class="activeLayout === layout.id ? 'text-blue-500' : 'text-gray-500'"
          >
            {{ layout.name }}
          </span>
        </div>
      </div>
    </BaseDialog>

    <!-- Invite Dialog -->
    <BaseDialog v-model="showInviteDialog" width="700px">
      <div class="flex flex-col items-center w-full py-8">
        <div class="text-slate-500 font-medium mb-6">请将会议号发送给受邀者</div>
        
        <div class="bg-gray-100 rounded-xl px-12 py-4 mb-8 w-full max-w-md flex justify-center">
          <span class="text-4xl text-slate-700 font-medium tracking-widest">323 239 392</span>
        </div>

        <div class="flex flex-col items-center gap-2">
          <div class="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
            <QrCode class="w-48 h-48 text-black" />
          </div>
          <span class="text-slate-400 text-xs">手机扫码邀请成员入会</span>
        </div>
      </div>
    </BaseDialog>

    <!-- Share Screen Dialog -->
    <BaseDialog v-model="showShareDialog" width="900px">
      <div class="flex flex-col items-center w-full py-8 px-4">
        <div class="text-[#2D7BFF] text-4xl font-medium mb-2 tracking-wider">HNA DAE</div>
        <div class="text-slate-500 font-medium mb-12">共享码</div>
        
        <div class="flex justify-between w-full px-4 gap-4">
          <!-- Step 1 -->
          <div class="flex flex-col items-start gap-4 flex-1">
            <div class="w-full aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
              <Laptop class="w-16 h-16 text-blue-500" />
            </div>
            <div class="flex gap-3">
              <div class="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
              <div class="text-xs text-gray-500 leading-relaxed">
                打开电脑或手机上的<br>“腾讯会议”应用程序
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="flex flex-col items-start gap-4 flex-1">
            <div class="w-full aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
              <AppWindow class="w-16 h-16 text-blue-500" />
            </div>
            <div class="flex gap-3">
              <div class="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
              <div class="flex flex-col gap-1">
                <div class="text-xs text-gray-500 leading-relaxed">
                  选择入口界面的“共享<br>屏幕”功能
                </div>
                <div class="text-xs text-blue-500 cursor-pointer hover:underline">
                  看不到“共享屏幕”？
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="flex flex-col items-start gap-4 flex-1">
            <div class="w-full aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 relative">
              <div class="w-3/4 h-10 border border-blue-200 rounded flex items-center px-3 bg-white">
                <span class="text-blue-500 font-medium text-sm">XUDH DJKD</span>
              </div>
              <Keyboard class="absolute bottom-4 right-4 w-8 h-8 text-gray-300" />
            </div>
            <div class="flex gap-3">
              <div class="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
              <div class="text-xs text-gray-500 leading-relaxed">
                输入上方的共享码
              </div>
            </div>
          </div>

          <!-- Step 4 -->
          <div class="flex flex-col items-start gap-4 flex-1">
            <div class="w-full aspect-[4/3] bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
              <ScreenShare class="w-16 h-16 text-blue-500" />
            </div>
            <div class="flex gap-3">
              <div class="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center shrink-0 mt-0.5">4</div>
              <div class="text-xs text-gray-500 leading-relaxed">
                电脑上选择共享内容，<br>确认后即可开始共享，<br>手机上可直接开始共享
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseDialog>

    <!-- Members Dialog -->
    <BaseDialog v-model="showMembersDialog" width="700px">
      <div class="flex flex-col items-center w-full h-full">
        <!-- Tabs -->
        <Tabs 
          v-model="activeMemberTab" 
          :options="memberTabs" 
          class="mb-4"
        />

        <!-- Meeting Members List -->
        <div v-if="activeMemberTab === 'meeting'" class="w-full flex-1 flex flex-col gap-4 px-4 overflow-y-auto">
          <div v-for="member in meetingMembers" :key="member.id" class="flex items-center justify-between p-2">
            <div class="flex items-center gap-4">
              <!-- Avatar -->
              <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="member.avatar === 'room' ? 'bg-blue-500' : 'bg-gray-200'">
                <Monitor v-if="member.avatar === 'room'" class="w-6 h-6 text-white" />
                <div v-else class="w-full h-full overflow-hidden rounded-lg">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" class="w-full h-full object-cover" />
                </div>
              </div>
              <!-- Info -->
              <div class="flex flex-col items-start">
                <div class="flex items-center gap-2">
                  <span class="text-slate-800 font-medium">{{ member.name }}</span>
                  <span v-if="member.role" class="text-orange-500 text-xs bg-orange-50 px-1.5 py-0.5 rounded">{{ member.role }}</span>
                  <span v-if="member.role" class="text-slate-300 text-xs">|</span>
                  <span v-if="member.isSelf" class="text-slate-400 text-xs">我</span>
                </div>
                <span class="text-slate-400 text-xs">{{ member.company }}</span>
              </div>
            </div>
            <!-- Status Icons -->
            <div class="flex items-center gap-3">
              <Mic v-if="member.mic" class="w-5 h-5 text-slate-400" />
              <MicOff v-else class="w-5 h-5 text-red-500" />
              
              <Video v-if="member.camera" class="w-5 h-5 text-slate-400" />
              <VideoOff v-else class="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>

        <!-- Waiting Members List -->
        <div v-else class="w-full flex-1 flex flex-col gap-4 px-4 overflow-y-auto">
          <div v-for="member in waitingMembers" :key="member.id" class="flex items-center justify-between p-2">
            <div class="flex items-center gap-4">
              <!-- Avatar -->
              <div class="w-12 h-12 rounded-lg flex items-center justify-center" :class="member.avatar === 'room' ? 'bg-blue-500' : 'bg-gray-200'">
                <Monitor v-if="member.avatar === 'room'" class="w-6 h-6 text-white" />
                <div v-else class="w-full h-full overflow-hidden rounded-lg">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" class="w-full h-full object-cover" />
                </div>
              </div>
              <!-- Info -->
              <div class="flex flex-col items-start">
                <span class="text-slate-800 font-medium">{{ member.name }}</span>
                <span class="text-slate-400 text-xs">{{ member.company }}</span>
              </div>
            </div>
            <!-- Action Buttons -->
            <div class="flex items-center gap-3">
              <button class="px-4 py-1.5 rounded-full border border-gray-200 text-slate-500 text-sm hover:bg-gray-50 active:scale-95 transition-all">移除</button>
              <button class="px-4 py-1.5 rounded-full bg-blue-500 text-white text-sm hover:bg-blue-600 active:scale-95 transition-all">准入</button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="w-full border-t border-gray-100 mt-auto pt-4 px-4 flex justify-between items-center">
          <div v-if="activeMemberTab === 'meeting'" class="flex items-center gap-2 text-slate-400">
            <Users class="w-5 h-5" />
            <span>2</span>
          </div>
          <div class="flex gap-4 ml-auto">
            <template v-if="activeMemberTab === 'meeting'">
              <button class="px-6 py-2 rounded-full bg-blue-500 text-white text-sm hover:bg-blue-600 active:scale-95 transition-all">全部静音</button>
              <button class="px-6 py-2 rounded-full border border-gray-200 text-slate-600 text-sm hover:bg-gray-50 active:scale-95 transition-all">解除全部静音</button>
            </template>
            <template v-else>
              <button class="px-6 py-2 rounded-full border border-gray-200 text-slate-600 text-sm hover:bg-gray-50 active:scale-95 transition-all">全部移除</button>
              <button class="px-6 py-2 rounded-full bg-blue-500 text-white text-sm hover:bg-blue-600 active:scale-95 transition-all">全部准入</button>
            </template>
          </div>
        </div>
      </div>
    </BaseDialog>
  </div>
</template>