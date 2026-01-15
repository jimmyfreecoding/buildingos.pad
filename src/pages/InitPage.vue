<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { AppConfig } from '../config'

const router = useRouter()

const form = reactive({
  padType: 'wallPad',
  ratio: '16:9'
})

const padTypes = [
  { label: 'Wall Pad (墙面中控)', value: 'wallPad' },
  { label: 'Tolite Pad (卫生间中控)', value: 'tolitePad' },
  { label: 'Room Control (独立房间中控)', value: 'roomControl' },
  { label: 'Meeting Control (会议室中控)', value: 'meetingControl' },
  { label: 'Door Pad (独立房间门屏)', value: 'doorPad' }
]

const ratios = [
  { label: '16:9 (1920x1080)', value: '16:9' },
  { label: '16:10 (1920x1200)', value: '16:10' }
]

const handleSubmit = () => {
  const initData = {
    padType: form.padType,
    ratio: form.ratio
  }
  localStorage.setItem('initData', JSON.stringify(initData))
  
  // Reload to root to apply config changes and trigger routing logic
  window.location.href = '/'
}
</script>

<template>
  <div class="w-full h-full flex items-center justify-center bg-black text-white">
    <div class="w-[500px] bg-[#1a1a1a] p-8 rounded-2xl border border-white/10">
      <h2 class="text-2xl font-bold mb-6 text-center">初始化平板设置</h2>
      
      <el-form :model="form" label-position="top">
        <el-form-item label="平板场景类型">
          <el-select v-model="form.padType" placeholder="请选择场景类型" class="w-full">
            <el-option 
              v-for="item in padTypes" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="屏幕比例">
          <el-radio-group v-model="form.ratio">
            <el-radio 
              v-for="item in ratios" 
              :key="item.value" 
              :value="item.value"
              border
              class="!mr-4 !mb-2"
            >
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <div class="mt-8 flex justify-end">
          <el-button type="primary" size="large" @click="handleSubmit" class="w-full">
            确认并进入系统
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.9);
}
:deep(.el-radio__label) {
  color: rgba(255, 255, 255, 0.9);
}
</style>