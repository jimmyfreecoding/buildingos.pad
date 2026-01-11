<script setup lang="ts">
import { ref } from 'vue'
import { useDateFormat, useNow } from '@vueuse/core'
import { ElMessage } from 'element-plus'

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
    width="300px"
    :append-to-body="true"
    :modal="true"
    :show-close="false"
    class="pin-dialog"
    center
  >
    <div class="py-4">
      <el-input
        v-model="pinCode"
        type="password"
        placeholder="4位数字密码"
        maxlength="4"
        show-password
        input-style="text-align: center; letter-spacing: 0.5em; font-size: 1.2em;"
        @keyup.enter="handlePinSubmit"
      />
    </div>
    <template #footer>
      <div class="flex justify-center gap-4">
        <el-button @click="showPinDialog = false">取消</el-button>
        <el-button type="primary" @click="handlePinSubmit">确认</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- Configuration Dialog (Blank Page) -->
  <el-dialog
    v-model="showConfigDialog"
    fullscreen
    :show-close="true"
    :append-to-body="true"
    class="config-dialog"
  >
    <div class="w-full h-full flex flex-col items-center justify-center text-white/50">
      <div class="text-4xl font-light mb-4">配置界面</div>
      <div class="text-lg">暂无内容</div>
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
  background: #1a1a1a;
}

:deep(.config-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 24px;
}
</style>