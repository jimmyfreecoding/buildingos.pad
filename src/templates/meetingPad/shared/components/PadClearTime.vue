<template>
  <!-- 保洁打卡（原项目 src/components/clearTime.vue）：请求内容保持不变 -->
  <div class="clear-box" @click="handleCleanBtnStatus">
    <img class="img" v-if="!cleanBtnVisible" :src="clearIcon" alt="" />
    <span class="ziti" v-if="!cleanBtnVisible || isOk">
      最近保洁时间：{{ formattedEndTime }}
    </span>
    <div style="display: inline-block" v-if="cleanBtnVisible">
      <el-button v-if="!isOk" type="success" plain :loading="loading" @click.stop="handleCleanRecord">
        立即清扫
      </el-button>
      <el-button v-else type="success" class="result" plain>打卡成功</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { cleanCheckIn } from '@/api/cleaning'

export interface BaojieInfo {
  empName?: string
  endTime?: string | number
  updateTime?: string
  spaceCode?: string
}

const props = withDefaults(defineProps<{
  baojie?: BaojieInfo
  spaceCode?: string
}>(), { baojie: () => ({}), spaceCode: '' })

const emit = defineEmits<{ (e: 'checked-in', timestamp: number): void }>()

const clearIcon = new URL('../assets/images/clear-icon.png', import.meta.url).href

const loading = ref(false)
const isOk = ref(false)
const cleanBtnVisible = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null
let okTimer: ReturnType<typeof setTimeout> | null = null

const pad = (n: number) => String(n).padStart(2, '0')
const formatTime = (v: string | number | undefined): string => {
  if (v === undefined || v === '' || v === null) return '--'
  const d = typeof v === 'number' || /^\d+$/.test(String(v)) ? new Date(Number(v)) : new Date(String(v).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return '--'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formattedEndTime = computed(() => formatTime(props.baojie?.endTime))

const handleCleanBtnStatus = () => {
  if (hideTimer) clearTimeout(hideTimer)
  cleanBtnVisible.value = true
  hideTimer = setTimeout(() => { cleanBtnVisible.value = false }, 15000)
}

const handleCleanRecord = async () => {
  if (hideTimer) clearTimeout(hideTimer)

  const endTime = Number(props.baojie?.endTime) || 0
  if (endTime && Date.now() - endTime < 5 * 60 * 1000) {
    // element-plus 2.x 的 MessageProps 未声明 style，沿用原项目内联样式需显式断言
    ElMessage({
      dangerouslyUseHTMLString: true,
      message:
        '<div style="color:#fff;font-size:18px;margin-bottom:8px">刚刚已经清扫过啦~</div>' +
        '<div style="color:#fff;font-size:18px">如果需要再次打卡，至少5分钟后才能操作！</div>',
      type: 'warning',
      offset: 450,
      duration: 5000,
      style: {
        flexDirection: 'column',
        justifyContent: 'space-around',
        height: '120px',
        backgroundColor: 'rgba(0, 0, 0, .2)',
        borderRadius: '9px',
        border: 'none',
        textAlign: 'center',
        fontSize: '30px',
        color: 'red',
      },
    } as any)
    return
  }

  loading.value = true
  try {
    const spaceCode = props.spaceCode || props.baojie?.spaceCode || ''
    const d = new Date()
    const time = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    const data = await cleanCheckIn(spaceCode, time)
    isOk.value = !!data?.success
    if (data?.timestamp) {
      localStorage.setItem('BAOJIE_TIME', String(data.timestamp))
      emit('checked-in', Number(data.timestamp))
    }
    if (isOk.value) {
      if (okTimer) clearTimeout(okTimer)
      okTimer = setTimeout(() => {
        isOk.value = false
        cleanBtnVisible.value = false
      }, 3000)
    }
  } catch (e) {
    console.warn('[meetingPad] cleaning check-in failed:', e)
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer)
  if (okTimer) clearTimeout(okTimer)
})
</script>

<style scoped>
.img {
  width: 22px;
  height: 22px;
  font-size: 22px;
  margin-right: 4px;
}
.clear-box {
  font-size: 22px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.clear-box :deep(.el-button--success) {
  width: 150px;
  height: 50px;
  background-color: #40891f;
  color: #fff;
  font-size: 24px;
  font-family: 'DingTalk-JinBuTi', serif;
  border-radius: 40px;
  border: none;
  margin-left: 15px;
}
.clear-box :deep(.el-button--success.result) {
  background-color: #e89e42;
}
.ziti {
  font-family: 'DingTalk-JinBuTi', serif !important;
}
</style>
