<script setup lang="ts">
import { ref } from 'vue'
import { useDateFormat, useNow } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { Delete, X } from 'lucide-vue-next'

const now = useNow()
const currentTime = useDateFormat(now, 'HH:mm')
const currentDate = useDateFormat(now, 'YYYY年M月D日 dddd', { locales: 'zh-CN' })

// State for PIN Dialog
const showPinDialog = ref(false)
const pinCode = ref('')

// State for Config Dialog
const showConfigDialog = ref(false)

const handleTimeClick = () => {
  pinCode.value = ''
  showPinDialog.value = true
}

const handlePinSubmit = () => {
  if (pinCode.value === '1111') {
    showPinDialog.value = false
    showConfigDialog.value = true
    pinCode.value = ''
  } else {
    ElMessage.error('密码错误')
    pinCode.value = ''
  }
}

const handleKeypadClick = (key: string | number) => {
  if (typeof key === 'number') {
    if (pinCode.value.length < 4) {
      pinCode.value += key.toString()
      if (pinCode.value.length === 4) {
        setTimeout(() => handlePinSubmit(), 200)
      }
    }
  } else if (key === 'delete') {
    if (pinCode.value.length > 0) {
      pinCode.value = pinCode.value.slice(0, -1)
    }
  } else if (key === 'close') {
    showPinDialog.value = false
    pinCode.value = ''
  }
}

const handleReset = () => {
  localStorage.removeItem('initData')
  window.location.href = '/'
}
</script>

<template>
  <div class="text-right cursor-pointer select-none active:opacity-80" @click="handleTimeClick">
    <div class="text-2xl font-medium tracking-wide">{{ currentTime }}</div>
    <div class="text-sm text-white/60">{{ currentDate }}</div>
  </div>

  <!-- PIN Input Dialog -->
  <el-dialog
    v-model="showPinDialog"
    title="请输入管理密码"
    width="360px"
    :append-to-body="true"
    :modal="true"
    :show-close="false"
    class="pin-dialog"
    center
  >
    <div class="py-4 flex flex-col items-center gap-6 select-none">
      <!-- PIN Display -->
      <div class="flex gap-6 justify-center mb-2">
         <div 
           v-for="i in 4" 
           :key="i"
           class="w-4 h-4 rounded-full border border-white/30 transition-all duration-200"
           :class="pinCode.length >= i ? 'bg-white border-white scale-110' : 'bg-transparent'"
         ></div>
      </div>

      <!-- Keypad -->
      <div class="grid grid-cols-3 gap-4 w-full px-2">
         <button 
           v-for="num in 9" 
           :key="num"
           class="h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-2xl font-medium transition-all flex items-center justify-center active:scale-95"
           @click="handleKeypadClick(num)"
         >
           {{ num }}
         </button>
         <button 
           class="h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-all active:scale-95 text-white/50 hover:text-white"
           @click="handleKeypadClick('close')"
         >
            取消
         </button>
         <button 
           class="h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-2xl font-medium transition-all flex items-center justify-center active:scale-95"
           @click="handleKeypadClick(0)"
         >
           0
         </button>
         <button 
           class="h-16 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-all active:scale-95 text-white/50 hover:text-white"
           @click="handleKeypadClick('delete')"
         >
            <Delete class="w-6 h-6" />
         </button>
      </div>
    </div>
  </el-dialog>

  <!-- Configuration Dialog -->
  <el-dialog
    v-model="showConfigDialog"
    fullscreen
    :show-close="true"
    :append-to-body="true"
    class="config-dialog"
  >
    <div class="w-full h-full flex flex-col items-center justify-center p-20">
      <div class="text-4xl font-light mb-12 text-white">管理员配置</div>
      
      <div class="grid grid-cols-3 gap-8 w-full max-w-4xl">
        <!-- Reset Card -->
        <div 
          class="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
          @click="handleReset"
        >
           <div class="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
           </div>
           <div class="text-center">
             <div class="text-2xl font-medium mb-2 text-white">重新初始化</div>
             <div class="text-white/50">清除当前配置并返回初始化页面</div>
           </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
:deep(.pin-dialog) {
  border-radius: 16px;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.pin-dialog .el-dialog__title) {
  color: white;
}

:deep(.config-dialog) {
  /* Let Element Plus dark theme handle background */
}

:deep(.config-dialog .el-dialog__headerbtn .el-dialog__close) {
  font-size: 24px;
}

:deep(.config-dialog .el-dialog__body) {
  height: 100%;
}
</style>