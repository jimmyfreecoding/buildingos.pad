<script setup lang="ts">
import { ref, watch, computed, reactive } from 'vue'
import { Delete, MapPin } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { getSpaceData } from '@/api/space';

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const pinCode = ref('')
const showConfigDialog = ref(false)
const showSpaceDialog = ref(false)
const spaceObj = ref<any[]>([])
const formLabelWidth = '100px'
const padType = ref('')

const typeOptions = computed(() => {
  switch (padType.value) {
    case 'wallPad':
      return [{ label: '办公区域', value: 'area' }]
    case 'tolitePad':
      return [{ label: '卫生间', value: 'tolite' }]
    case 'roomControl':
    case 'doorPad':
      return [{ label: '独立房间', value: 'room' }]
    case 'meetingControl':
      return [{ label: '会议室', value: 'meetingRoom' }]
    default:
      return [
        { label: '会议室', value: 'meetingRoom' },
        { label: '独立房间', value: 'room' },
        { label: '办公区域', value: 'area' },
        { label: '卫生间', value: 'tolite' }
      ]
  }
})

watch(typeOptions, (newVal) => {
  if (newVal.length === 1) {
    form.type = newVal[0].value
  }
})

const padTypeLabels: Record<string, string> = {
  wallPad: 'Wall Pad (墙面中控)',
  tolitePad: 'Tolite Pad (卫生间中控)',
  roomControl: 'Room Control (独立房间中控)',
  meetingControl: 'Meeting Control (会议室中控)',
  doorPad: 'Door Pad (独立房间门屏)'
}

const savedConfigStr = localStorage.getItem('initData')
const savedConfigObj = savedConfigStr ? JSON.parse(savedConfigStr) : {}
const hasSpaceBinding = computed(() => {
  return savedConfigObj && savedConfigObj.spaceName
})

const spaceBindingInfo = computed(() => {
  if (!savedConfigObj.spaceName) return ''
  return [
    savedConfigObj.spaceName,
    savedConfigObj.floorAreaName,
    savedConfigObj.floorName,
    savedConfigObj.roomName
  ].filter(Boolean).join(' / ')
})
const hasBinding = computed(() => {
  return savedConfigObj && savedConfigObj.padType
})

const bindingInfo = computed(() => {
  if (!savedConfigObj.padType) return ''
  return padTypeLabels[savedConfigObj.padType] || savedConfigObj.padType
})
  const form = reactive({
  spaceIndex: null as number | null,
  floorareaIndex: null as number | null,
  floorIndex: null as number | null,
  type: '',
  mettingRoomIndex: null as number | null,
  roomIndex: null as number | null,
  areaIndex: null as number | null,
  toiletIndex: null as number | null,
  companyName: ''
})

const canSave = computed(() => {
  // Simple validation logic, can be enhanced
  return form.spaceIndex !== null
})

const getSpaceList = async () => {
  try {
    const data: any = await getSpaceData({})
    console.log("data", data)
    if (Array.isArray(data)) {
      spaceObj.value = data
    }
  } catch (error) {
    console.error('Failed to fetch space list:', error)
  }
}

const handleSpaceConfig = async () => {
  showSpaceDialog.value = true
  await getSpaceList()
  // Load existing config if available
  const savedConfig = localStorage.getItem('initData')
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig)
      padType.value = parsed.padType || ''
      // Populate form with saved data if structure matches
      // This part depends on how you want to map saved data back to indices
    } catch (e) {
      console.error('Error parsing saved config', e)
    }
  }
  

}

const saveData = () => {
  // Construct the config object based on selections
  const config: any = {}
  
  if (form.spaceIndex !== null && spaceObj.value[form.spaceIndex]) {
    const space = spaceObj.value[form.spaceIndex]
    config.spaceId = space.id
    config.spaceName = space.name
    config.code = space.code
    
    if (form.floorareaIndex !== null && space.floorArea[form.floorareaIndex]) {
      const floorArea = space.floorArea[form.floorareaIndex]
      config.floorAreaId = floorArea.id
      config.floorAreaName = floorArea.name
      config.floorAreaCode = floorArea.code
      
      if (form.floorIndex !== null && floorArea.floor[form.floorIndex]) {
        const floor = floorArea.floor[form.floorIndex]
        config.floorId = floor.id
        config.floorName = floor.name
        config.floorCode = floor.code
        
        config.type = form.type
        
        if (form.type === 'meetingRoom' && form.mettingRoomIndex !== null) {
           const mr = floor.mettingRoom[form.mettingRoomIndex]
           config.roomId = mr.id
           config.roomName = mr.name
        } else if (form.type === 'room' && form.roomIndex !== null) {
           const room = floor.room[form.roomIndex]
           config.roomId = room.id
           config.roomName = room.name
           
           if (form.companyName) {
             config.companyName = form.companyName
           }
        } else if (form.type === 'area' && form.areaIndex !== null) {
           const area = floor.area[form.areaIndex]
           config.roomId = area.id
           config.roomName = area.name
           config.roomCode = area.code
        } else if (form.type === 'tolite' && form.toiletIndex !== null) {
           const toilet = floor.toilet[form.toiletIndex]
           config.roomId = toilet.id
           config.roomName = toilet.name
           config.roomCode = toilet.code
        }
      }
    }
  }
  
  // Merge with existing initData to preserve padType and ratio
  const savedConfig = localStorage.getItem('initData')
  if (savedConfig) {
    const parsed = JSON.parse(savedConfig)
    Object.assign(config, parsed, config)
  }

  localStorage.setItem('initData', JSON.stringify(config))
  ElMessage.success('配置已保存')
  showSpaceDialog.value = false
  console.log("config",localStorage.getItem('initData'))
  //window.location.reload()
}

const handlePinSubmit = () => {
  if (pinCode.value === '1111') {
    // 验证成功，切换到 Config 界面
    showConfigDialog.value = true
    pinCode.value = ''
  } else {
    ElMessage.error('密码错误')
    pinCode.value = ''
  }
}

const closeDialog = () => {
  emit('update:modelValue', false)
  pinCode.value = ''
  showConfigDialog.value = false
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
    closeDialog()
  }
}

const handleReset = () => {
  localStorage.removeItem('initData')
  window.location.href = '/'
}

// Watch for dialog opening to reset state
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // 每次打开时，重置为 PIN 模式
    pinCode.value = ''
    showConfigDialog.value = false
  }
})

// Single dialog handling
const handleDialogUpdate = (val: boolean) => {
  if (!val) {
    closeDialog()
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="showConfigDialog ? '' : '请输入管理密码'"
    :fullscreen="showConfigDialog"
    :width="showConfigDialog ? '100%' : '360px'"
    :append-to-body="true"
    :show-close="showConfigDialog"
    :modal="true"
    :class="showConfigDialog ? 'config-dialog' : 'pin-dialog'"
    :center="!showConfigDialog"
    @update:model-value="handleDialogUpdate"
  >
    <!-- PIN Content -->
    <div v-if="!showConfigDialog" class="py-4 flex flex-col items-center gap-6 select-none">
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

    <!-- Config Content -->
    <div v-else class="w-full h-full flex flex-col items-center justify-center p-20">
      <div class="text-4xl font-light mb-12 text-white">管理员配置</div>
      
      <div class="grid grid-cols-3 gap-8 w-full max-w-4xl">
        <!-- Space Config Card -->
        <div 
          class="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
          @click="handleSpaceConfig"
        >
           <div class="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
             <MapPin class="w-10 h-10" />
           </div>
           <div class="text-center">
             <div class="text-2xl font-medium mb-2 text-white">空间配置</div>
             <div class="text-white/50" v-if="!hasSpaceBinding">绑定设备所属的空间位置信息</div>
             <div class="text-white/50" v-else>{{ spaceBindingInfo }}</div>
           </div>
        </div>

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
             <div class="text-white/50" v-if="!hasBinding">清除当前配置并返回初始化页面</div>
             <div class="text-white/50" v-else>{{ bindingInfo }}</div>
           </div>
        </div>
      </div>
    </div>
  </el-dialog>

  <!-- Space Config Dialog -->
  <el-dialog v-model="showSpaceDialog" title="初始化平板" width="500" append-to-body>
    <el-form :model="form">
      <el-form-item label="属地" :label-width="formLabelWidth">
        <el-select v-model="form.spaceIndex" placeholder="选择属地">
          <el-option 
            :label="space.name" 
            :value="index" 
            v-for="(space, index) in spaceObj" 
            :key="index"
          />
        </el-select>
      </el-form-item>
      <el-form-item 
        label="楼层区域" 
        :label-width="formLabelWidth" 
        v-if="form.spaceIndex !== null && spaceObj[form.spaceIndex]"
      >
        <el-select v-model="form.floorareaIndex" placeholder="选择楼层区域">
          <el-option 
            :label="fa.name" 
            :value="index2" 
            v-for="(fa, index2) in spaceObj[form.spaceIndex].floorArea" 
            :key="index2"
          />
        </el-select>
      </el-form-item>
      <el-form-item 
        label="楼层" 
        :label-width="formLabelWidth" 
        v-if="
          form.spaceIndex !== null &&
          spaceObj[form.spaceIndex] && 
          form.floorareaIndex !== null &&
          spaceObj[form.spaceIndex].floorArea && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex]
        "
      >
        <el-select v-model="form.floorIndex" placeholder="选择楼层">
          <el-option 
            :label="floor.name" 
            :value="index" 
            v-for="(floor, index) in spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor" 
            :key="index"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="选择类型" :label-width="formLabelWidth">
        <el-select 
          v-model="form.type" 
          placeholder="选择类型" 
          size="large" 
        >
          <el-option 
            v-for="item in typeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item 
        label="绑定会议室" 
        :label-width="formLabelWidth" 
        v-if="
          form.spaceIndex !== null &&
          spaceObj[form.spaceIndex] && 
          form.floorareaIndex !== null &&
          spaceObj[form.spaceIndex].floorArea && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex] && 
          form.floorIndex !== null &&
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex] && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].mettingRoom && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].mettingRoom.length > 0 && 
          form.type === 'meetingRoom'
        "
      >
        <el-select 
          v-model="form.mettingRoomIndex" 
          placeholder="绑定会议室" 
          size="large" 
        >
          <el-option 
            :label="area.name" 
            :value="index" 
            v-for="(area, index) in spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].mettingRoom" 
            :key="index"
          />
        </el-select>
      </el-form-item>

      <el-form-item 
        label="绑定房间" 
        :label-width="formLabelWidth" 
        v-if="
          form.spaceIndex !== null &&
          spaceObj[form.spaceIndex] && 
          form.floorareaIndex !== null &&
          spaceObj[form.spaceIndex].floorArea && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex] && 
          form.floorIndex !== null &&
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex] && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].room && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].room.length > 0 && 
          form.type === 'room'
        "
      >
        <el-select 
          v-model="form.roomIndex" 
          placeholder="绑定房间" 
          size="large" 
        >
          <el-option 
            :label="area.name" 
            :value="index" 
            v-for="(area, index) in spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].room" 
            :key="index"
          />
        </el-select>
      </el-form-item>

      <el-form-item 
        label="绑定区域" 
        :label-width="formLabelWidth" 
        v-if="
          form.spaceIndex !== null &&
          spaceObj[form.spaceIndex] && 
          form.floorareaIndex !== null &&
          spaceObj[form.spaceIndex].floorArea && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex] && 
          form.floorIndex !== null &&
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex] && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].area && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].area.length > 0 && 
          form.type === 'area'
        "
      >
        <el-select 
          v-model="form.areaIndex" 
          placeholder="绑定区域" 
          size="large" 
        >
          <el-option 
            :label="area.name" 
            :value="index" 
            v-for="(area, index) in spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].area" 
            :key="index"
          />
        </el-select>
      </el-form-item>

      <el-form-item 
        label="绑定卫生间" 
        :label-width="formLabelWidth" 
        v-if="
          form.spaceIndex !== null &&
          spaceObj[form.spaceIndex] && 
          form.floorareaIndex !== null &&
          spaceObj[form.spaceIndex].floorArea && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex] && 
          form.floorIndex !== null &&
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex] && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].toilet && 
          spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].toilet.length > 0 && 
          form.type === 'tolite'
        "
      >
        <el-select 
          v-model="form.toiletIndex" 
          placeholder="绑定卫生间" 
          size="large" 
        >
          <el-option 
            :label="area.name" 
            :value="index" 
            v-for="(area, index) in spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].toilet" 
            :key="index"
          />
        </el-select>
      </el-form-item>

      <el-form-item 
        label="绑定公司" 
        :label-width="formLabelWidth" 
        v-if="
          (
            form.spaceIndex !== null &&
            spaceObj[form.spaceIndex] && 
            form.floorareaIndex !== null &&
            spaceObj[form.spaceIndex].floorArea && 
            spaceObj[form.spaceIndex].floorArea[form.floorareaIndex] && 
            form.floorIndex !== null &&
            spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor && 
            spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex] && 
            spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].room && 
            spaceObj[form.spaceIndex].floorArea[form.floorareaIndex].floor[form.floorIndex].room.length > 0 && 
            form.type === 'room'
          ) && spaceObj[form.spaceIndex].company && spaceObj[form.spaceIndex].company.length > 0
        "
      >
        <el-select 
          v-model="form.companyName" 
          placeholder="绑定公司" 
          size="large" 
        >
          <el-option 
            :label="company.orgName" 
            :value="company.orgName" 
            v-for="(company, index) in spaceObj[form.spaceIndex].company" 
            :key="index"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="showSpaceDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="saveData" 
          v-if="canSave"
        > 确认 </el-button>
      </div>
    </template>
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
