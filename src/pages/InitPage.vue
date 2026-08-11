<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getSpaceData } from '@/api/space'
import { getTemplates } from '@/templates/registry'
import type { Space } from '@/types/space'

const router = useRouter()

const version = __APP_VERSION__

// ====== Password gate ======
const authenticated = ref(false)
const pwValue = ref('')
const pwError = ref('')

function derivePassword(): string {
  try {
    const raw = localStorage.getItem('initData')
    if (!raw) return '0000'
    const data = JSON.parse(raw)
    let pwd = (data.floorName || '').replace(/[^0-9]/g, '') || '00'
    if (pwd.length > 2) pwd = pwd.slice(0, 2)
    if (pwd.length === 1) pwd = '0' + pwd
    const code = data.code || ''
    const areaMap: Record<string, string> = { A: '01', B: '02', C: '03', D: '04' }
    let area = areaMap[code] || '00'
    if (data.type === 'tolite') area = '00'
    return pwd + area
  } catch { return '0000' }
}

watch(pwValue, (v) => {
  if (v.length === 4) {
    if (v === derivePassword()) { authenticated.value = true }
    else { pwError.value = '密码错误'; pwValue.value = '' }
  } else { pwError.value = '' }
})

const onNumClick = (d: string) => { if (pwValue.value.length < 4) pwValue.value += d }
const onNumDelete = () => { pwValue.value = pwValue.value.slice(0, -1) }

const kbKeys = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']]

// --- Step state ---
const step = ref<'basic' | 'binding' | 'template'>('basic')

// --- Step 1: Basic config ---
const padType = ref('wallPad')
const ratio = ref('16:9')

const padTypes = [
  { label: 'Wall Pad (墙面中控)', value: 'wallPad' },
  { label: 'Tolite Pad (卫生间中控)', value: 'tolitePad' },
  { label: 'Room Control (独立房间中控)', value: 'roomControl' },
  { label: 'Meeting Control (会议室中控)', value: 'meetingControl' },
  { label: 'Door Pad (独立房间门屏)', value: 'doorPad' },
  { label: 'Digital Twin Screen (数字孪生大屏)', value: 'twins' },
  { label: 'Switch Pad (开关屏)', value: 'switchPad' },
]

const ratios = [
  { label: '16:9 (1920x1080)', value: '16:9' },
  { label: '16:10 (1920x1200)', value: '16:10' },
  { label: '16:9 (4K - 3840x2160)', value: '4k' },
  { label: '1:1 (480x480)', value: '1:1' },
]

const typeOptions = computed(() => {
  switch (padType.value) {
    case 'wallPad': return [{ label: '办公区域', value: 'area' }]
    case 'tolitePad': return [{ label: '卫生间', value: 'tolite' }]
    case 'roomControl':
    case 'doorPad':
    case 'switchPad': return [{ label: '独立房间', value: 'room' }]
    case 'meetingControl': return [{ label: '会议室', value: 'meetingRoom' }]
    default: return [
      { label: '会议室', value: 'meetingRoom' },
      { label: '独立房间', value: 'room' },
      { label: '办公区域', value: 'area' },
      { label: '卫生间', value: 'tolite' },
    ]
  }
})

// --- Step 2: Space binding ---
const spaceObj = ref<Space[]>([])
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  spaceIndex: null as number | null,
  floorareaIndex: null as number | null,
  floorIndex: null as number | null,
  type: '',
  meetingRoomIndex: null as number | null,
  roomIndex: null as number | null,
  areaIndex: null as number | null,
  toiletIndex: null as number | null,
  companyName: '',
})

const canSave = computed(() => form.spaceIndex !== null)

const currentSpace = computed(() => {
  if (form.spaceIndex === null) return null
  return spaceObj.value[form.spaceIndex] ?? null
})

const currentFloorArea = computed(() => {
  if (!currentSpace.value || form.floorareaIndex === null) return null
  return currentSpace.value.floorArea[form.floorareaIndex] ?? null
})

const currentFloor = computed(() => {
  if (!currentFloorArea.value || form.floorIndex === null) return null
  return currentFloorArea.value.floor[form.floorIndex] ?? null
})

const goToBinding = async () => {
  step.value = 'binding'
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await getSpaceData({})
    if (Array.isArray(data)) {
      spaceObj.value = data
      if (data.length === 1) {
        form.spaceIndex = 0
      }
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '获取空间数据失败，请检查网络连接'
    console.error('[InitPage] Failed to fetch structure:', e)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  step.value = 'basic'
}

const handleSubmit = () => {
  const config: Record<string, unknown> = {
    padType: padType.value,
    ratio: ratio.value,
  }

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

        const roomKey = form.type === 'meetingRoom' ? 'mettingRoom' : form.type
        const roomIndex = form.type === 'meetingRoom' ? form.meetingRoomIndex
          : form.type === 'room' ? form.roomIndex
          : form.type === 'area' ? form.areaIndex
          : form.type === 'tolite' ? form.toiletIndex
          : null

        const roomList = (floor as any)[roomKey]
        if (roomIndex !== null && roomList?.[roomIndex]) {
          const room = roomList[roomIndex]
          config.roomId = room.id
          config.roomName = room.name
          config.roomCode = room.code
        }

        if (form.type === 'room' && form.companyName) {
          config.companyName = form.companyName
        }
      }
    }
  }

  localStorage.setItem('initData', JSON.stringify(config))
  step.value = 'template'
}

// --- Step 3: Template selection ---
const selectedTemplate = ref('default')
const templateList = computed(() => getTemplates(padType.value))

const handleConfirmTemplate = () => {
  try {
    const raw = localStorage.getItem('initData')
    const data = raw ? JSON.parse(raw) : {}
    data.template = selectedTemplate.value
    localStorage.setItem('initData', JSON.stringify(data))
  } catch { /* ignore */ }
  router.push('/' + padType.value)
}
</script>

<template>
  <div class="w-full h-full flex items-center justify-center bg-black text-white">
    <!-- Password gate -->
    <div v-if="!authenticated" class="w-[450px] bg-[#1a1a1a] p-8 rounded-2xl border border-white/10">
      <div class="pw-title">系统管理</div>
      <div class="pw-label">输入管理员密码：</div>
      <div class="pw-input-row">
        <div v-for="i in 4" :key="i" class="pw-dot" :class="{ active: pwValue.length >= i, error: pwError }"></div>
      </div>
      <div class="pw-error">{{ pwError }}</div>
      <div class="pw-keyboard">
        <div v-for="(row, ri) in kbKeys" :key="ri" class="pw-kb-row">
          <div v-for="key in row" :key="key" class="pw-kb-key" :class="{ empty: !key, del: key === 'del' }"
            @click="key === 'del' ? onNumDelete() : key ? onNumClick(key) : null">
            <template v-if="key === 'del'">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
            </template>
            <template v-else>{{ key }}</template>
          </div>
        </div>
      </div>
      <div class="mt-4 text-center text-gray-500 text-xs">v{{ version }}</div>
    </div>

    <!-- Init content -->
    <template v-else>
    <!-- Step 1: Basic -->
    <div v-if="step === 'basic'" class="w-[500px] bg-[#1a1a1a] p-8 rounded-2xl border border-white/10">
      <h2 class="text-2xl font-bold mb-6 text-center">初始化平板设置</h2>

      <el-form label-position="top">
        <el-form-item label="平板场景类型">
          <el-select v-model="padType" placeholder="请选择场景类型" class="w-full">
            <el-option
              v-for="item in padTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="屏幕比例">
          <el-radio-group v-model="ratio">
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

        <div class="mt-8">
          <el-button type="primary" size="large" @click="goToBinding" class="w-full">
            下一步：绑定空间
          </el-button>
        </div>
      </el-form>

      <div class="mt-4 text-center text-gray-500 text-xs">v{{ version }}</div>
    </div>

    <!-- Step 2: Space Binding -->
    <div v-else-if="step === 'binding'" class="w-[600px] bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
      <h2 class="text-2xl font-bold mb-2 text-center">绑定空间位置</h2>
      <p class="text-gray-400 text-sm text-center mb-6">选择本设备所在的物理空间</p>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <el-icon class="is-loading text-3xl text-blue-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></el-icon>
      </div>

      <!-- Error -->
      <div v-else-if="errorMsg" class="text-center py-8">
        <p class="text-red-400 mb-4">{{ errorMsg }}</p>
        <el-button @click="goBack">返回上一步</el-button>
        <el-button @click="goToBinding">重试</el-button>
      </div>

      <!-- Cascading Selectors -->
      <el-form v-else :model="form" label-position="top">
        <el-form-item label="属地">
          <el-select v-model="form.spaceIndex" placeholder="选择属地" class="w-full">
            <el-option :label="s.name" :value="i" v-for="(s, i) in spaceObj" :key="i" />
          </el-select>
        </el-form-item>

        <el-form-item label="楼层区域" v-if="currentSpace">
          <el-select v-model="form.floorareaIndex" placeholder="选择楼层区域" class="w-full">
            <el-option :label="fa.name" :value="i" v-for="(fa, i) in currentSpace.floorArea" :key="i" />
          </el-select>
        </el-form-item>

        <el-form-item label="楼层" v-if="currentFloorArea">
          <el-select v-model="form.floorIndex" placeholder="选择楼层" class="w-full">
            <el-option :label="f.name" :value="i" v-for="(f, i) in currentFloorArea.floor" :key="i" />
          </el-select>
        </el-form-item>

        <el-form-item label="绑定类型" v-if="currentFloor">
          <el-select v-model="form.type" placeholder="选择类型" class="w-full">
            <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>

        <!-- Meeting Room -->
        <el-form-item label="绑定会议室" v-if="currentFloor && form.type === 'meetingRoom' && currentFloor.mettingRoom?.length">
          <el-select v-model="form.meetingRoomIndex" placeholder="选择会议室" class="w-full">
            <el-option :label="r.name" :value="i" v-for="(r, i) in currentFloor.mettingRoom" :key="i" />
          </el-select>
        </el-form-item>

        <!-- Room -->
        <el-form-item label="绑定房间" v-if="currentFloor && form.type === 'room' && currentFloor.room?.length">
          <el-select v-model="form.roomIndex" placeholder="选择房间" class="w-full">
            <el-option :label="r.name" :value="i" v-for="(r, i) in currentFloor.room" :key="i" />
          </el-select>
        </el-form-item>

        <el-form-item label="绑定公司" v-if="currentFloor && form.type === 'room' && currentSpace?.company?.length && form.roomIndex !== null">
          <el-select v-model="form.companyName" placeholder="选择公司" class="w-full">
            <el-option :label="c.orgName" :value="c.orgName" v-for="(c, i) in currentSpace.company" :key="i" />
          </el-select>
        </el-form-item>

        <!-- Area -->
        <el-form-item label="绑定区域" v-if="currentFloor && form.type === 'area' && currentFloor.area?.length">
          <el-select v-model="form.areaIndex" placeholder="选择区域" class="w-full">
            <el-option :label="a.name" :value="i" v-for="(a, i) in currentFloor.area" :key="i" />
          </el-select>
        </el-form-item>

        <!-- Toilet -->
        <el-form-item label="绑定卫生间" v-if="currentFloor && form.type === 'tolite' && currentFloor.toilet?.length">
          <el-select v-model="form.toiletIndex" placeholder="选择卫生间" class="w-full">
            <el-option :label="t.name" :value="i" v-for="(t, i) in currentFloor.toilet" :key="i" />
          </el-select>
        </el-form-item>

        <div class="flex gap-4 mt-8">
          <el-button size="large" @click="goBack" class="flex-1">返回</el-button>
          <el-button type="primary" size="large" @click="handleSubmit" class="flex-1" :disabled="!canSave">
            确认并进入系统
          </el-button>
        </div>
      </el-form>

      <div class="mt-4 text-center text-gray-500 text-xs">v{{ version }}</div>
    </div>

    <!-- Step 3: Template Selection -->
    <div v-else-if="step === 'template'" class="w-[700px] bg-[#1a1a1a] p-8 rounded-2xl border border-white/10">
      <h2 class="text-2xl font-bold mb-2 text-center">选择界面模板</h2>
      <p class="text-gray-400 text-sm text-center mb-6">为 {{ padType }} 选择一个界面模板</p>

      <div v-if="templateList.length === 0" class="text-center py-8 text-gray-400">
        该类型暂无可用模板
      </div>

      <div v-else class="grid grid-cols-2 gap-4 mb-6">
        <div
          v-for="tpl in templateList"
          :key="tpl.id"
          class="bg-[#2a2a2a] rounded-xl p-5 cursor-pointer border-2 transition-all hover:border-white/30"
          :class="selectedTemplate === tpl.id ? 'border-blue-500' : 'border-transparent'"
          @click="selectedTemplate = tpl.id"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-lg font-medium">{{ tpl.manifest.name }}</span>
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              :class="selectedTemplate === tpl.id ? 'border-blue-500 bg-blue-500' : 'border-white/20'"
            >
              <div v-if="selectedTemplate === tpl.id" class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
          <p class="text-sm text-gray-400">{{ tpl.manifest.description || '暂无描述' }}</p>
          <p v-if="tpl.manifest.version" class="text-xs text-gray-500 mt-2">v{{ tpl.manifest.version }}</p>
        </div>
      </div>

      <div class="flex gap-4">
        <el-button size="large" @click="step = 'binding'" class="flex-1">返回</el-button>
        <el-button type="primary" size="large" @click="handleConfirmTemplate" class="flex-1">
          确认并进入系统
        </el-button>
      </div>

      <div class="mt-4 text-center text-gray-500 text-xs">v{{ version }}</div>
    </div>
    </template>
  </div>
</template>

<style scoped>
:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.9);
}
:deep(.el-radio__label) {
  color: rgba(255, 255, 255, 0.9);
}

/* ====== 密码键盘 ====== */
.pw-title { font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 24px; }
.pw-label { font-size: 18px; text-align: center; margin-bottom: 16px; opacity: 0.8; }
.pw-input-row { display: flex; justify-content: center; gap: 20px; margin-bottom: 8px; }
.pw-dot { width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.1); transition: background 0.2s; }
.pw-dot.active { background: #ED8733; }
.pw-dot.error { background: #ff5443; }
.pw-error { text-align: center; color: #ff5443; font-size: 16px; margin-top: 8px; height: 24px; }
.pw-keyboard { width: 360px; margin: 20px auto 0; }
.pw-kb-row { display: flex; justify-content: center; gap: 8px; margin-bottom: 8px; }
.pw-kb-key { width: 80px; height: 56px; border-radius: 8px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; user-select: none; transition: background 0.15s; }
.pw-kb-key:hover { background: rgba(255,255,255,0.18); }
.pw-kb-key:active { background: rgba(255,255,255,0.25); }
.pw-kb-key.empty { background: transparent; cursor: default; }
.pw-kb-key.del { background: rgba(255,255,255,0.05); }
</style>
