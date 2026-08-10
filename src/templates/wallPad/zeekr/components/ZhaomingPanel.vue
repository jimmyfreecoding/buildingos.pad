<script setup lang="ts">
import { ref, computed, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  lights: any[]
  lightobj: any[]
  acobj: any[]
  inside: any
  blind: any[]
  blind2: any[]
  air2: any[]
  obj: any
}>()

const emit = defineEmits(['syncLightStatus', 'syncLight', 'syncAllLight', 'syncAcPower', 'syncAcTemp', 'syncAcMode', 'syncAcSpeed', 'syncBlind'])

// ====== Local state ======
const lightallbutton = computed(() => {
  if (!props.lights.length) return -1
  const allOn = props.lights.every((l: any) => l.status === 1)
  const allOff = props.lights.every((l: any) => l.status === 0)
  if (allOn) return 1
  if (allOff) return 0
  return -1
})
const acbutton = ref(0)
const fanActive = ref(0)
const dialogLight = ref(false)
const dialogLightAll = ref(false)
const dialogBlind = ref(false)
const dialogAcAll = ref(false)
const dialogFankui = ref(false)
const dialogAirError = ref(false)
const loadingFlag = ref(false)
const acloadingFlag = ref(false)
const dialogTxt = ref('')
const currtlight = ref<any>({})
const currtstatus = ref('off')
const currtBlindAction = ref('')
const tempStatus = ref('off')
const tempVal = ref(24)
const fanVal = ref('15')
const acModeEdit = ref('cool')

// AC display derived from props
const acDisplay = computed(() => {
  if (!props.acobj?.length) return null
  const ac = props.acobj[0]
  const modeMap: Record<string, string> = { cool: '制冷', heat: '制热', auto: '自动', vent: '吹风' }
  const speedMap: Record<string, string> = { low: '弱风', mid: '中风', high: '强风' }
  const speedIdx: Record<string, number> = { low: 0, mid: 1, high: 2 }
  return {
    power: ac.power,
    temp: ac.temp,
    mode: modeMap[ac.mode] || ac.mode || '自动',
    speed: speedMap[ac.speed] || ac.speed || '弱风',
    currentTemp: ac.currentTemp ?? ac.temp,
    fanIdx: speedIdx[ac.speed] ?? 0,
  }
})

watch(acDisplay, (val) => {
  if (val) {
    acbutton.value = val.power ? 1 : 0
    tempStatus.value = val.power ? 'on' : 'off'
    tempVal.value = val.temp
    fanActive.value = val.fanIdx
    if (props.acobj?.[0]?.mode) {
      const modeMap: Record<string, string> = { '制冷': 'cool', '制热': 'heat', '自动': 'auto', '吹风': 'vent' }
      acModeEdit.value = modeMap[props.acobj[0].mode] || props.acobj[0].mode || 'cool'
    }
  }
}, { immediate: true })

const TEMP_CONTROL_FLOORS = ['34F', '35F', '54F']
const airControlDisplay = computed(() => TEMP_CONTROL_FLOORS.includes(props.obj?.floor))
const blindShow = computed(() => props.blind?.length > 0)
const blind2Show = computed(() => props.blind2?.length > 0)

const errorList = computed(() => {
  if (!props.acobj?.length) return []
  const ac = props.acobj[0]
  if (!ac?.devices) return []
  return ac.devices.filter((d: any) => d.status?.online == 0 || d.status?.alarmValue != 0)
})

// ====== Handlers ======
const showLightTitle = (name: string) => {
  if (!name) return ''
  return name.length > 6 ? '..' + name.substring(name.length - 6) : name
}

const lightOp = (light: any) => {
  if (light.online == 0) return
  currtlight.value = light
  emit('syncLightStatus', true)
  dialogLight.value = true
  dialogTxt.value = '确认' + (light.status === 0 ? '打开' : '关闭') + light.name
}

const setLight = () => {
  const light = currtlight.value
  emit('syncLightStatus', false)
  emit('syncLight', light)
  loadingFlag.value = true
  setTimeout(() => { loadingFlag.value = false; dialogLight.value = false }, 2000)
}

const lightAllOP = (idx: number) => {
  currtstatus.value = idx === 0 ? 'on' : 'off'
  dialogLightAll.value = true
  dialogTxt.value = '确认' + (idx === 0 ? '关闭' : '打开') + '所有照明'
}

const lightAll = () => {
  const on = currtstatus.value === 'off'
  emit('syncAllLight', on)
  emit('syncLightStatus', false)
  loadingFlag.value = true
  setTimeout(() => { loadingFlag.value = false; dialogLightAll.value = false }, 2000)
}

const acAllOP = (idx: number) => {
  tempStatus.value = idx === 0 ? 'on' : 'off'
  dialogAcAll.value = true
  dialogTxt.value = '确认' + (idx === 0 ? '关闭' : '打开') + '所有空调'
}

const airconditionAll = () => {
  const on = tempStatus.value === 'off'
  console.log('[ZhaomingPanel] airconditionAll: on=', on)
  emit('syncAcPower', on)
  acbutton.value = on ? 1 : 0
  tempStatus.value = on ? 'on' : 'off'
  acloadingFlag.value = true
  setTimeout(() => { acloadingFlag.value = false; dialogAcAll.value = false }, 3000)
}

const blindActionLabel: Record<string, string> = { up: '打开', down: '关闭', pause: '暂停' }

const handleBlind = (action: string) => {
  currtBlindAction.value = action
  dialogTxt.value = '确认' + blindActionLabel[action] + '窗帘'
  dialogBlind.value = true
}

const setBlind = () => {
  console.log('[ZhaomingPanel] setBlind:', currtBlindAction.value)
  emit('syncBlind', currtBlindAction.value)
  loadingFlag.value = true
  setTimeout(() => { loadingFlag.value = false; dialogBlind.value = false }, 2000)
}

const switchWindSpeed = (idx: number) => {
  fanActive.value = idx
  const speeds = ['15', '45', '75']
  fanVal.value = speeds[idx]
}

const switchAcMode = (mode: string) => {
  acModeEdit.value = mode
  const modeIdx: Record<string, number> = { cool: 0, heat: 1, auto: 2, vent: 3 }
  const idx = modeIdx[mode] ?? 0
}

const phoneMap: Record<string, string> = {
  A3: '18667083301', A4: '18667083298', A5: '18667083299',
}

// Asset images
const lightonImg = new URL('../assets/images/lighton.png', import.meta.url).href
const lightoffImg = new URL('../assets/images/lightoff.png', import.meta.url).href
const offlineImg = new URL('../assets/images/offline.png', import.meta.url).href
const chuanglian1 = new URL('../assets/images/chuanglian1.png', import.meta.url).href
const chuanglian2 = new URL('../assets/images/chuanglian2.png', import.meta.url).href
const chuanglian3 = new URL('../assets/images/chuanglian3.png', import.meta.url).href
</script>

<template>
  <div class="left-box-box" :style="blind2Show ? 'overflow-y: auto' : ''">
    <!-- ====== 照明控制 ====== -->
    <div class="index-title-box flex-row align-center">
      <div class="txt">{{ obj.floor }} {{ obj.name }} 照明控制</div>
    </div>
    <div class="content light-wrap">
      <!-- 全关/全开 toggle -->
      <div class="tabs-nav flex-row">
        <div class="tabs-item" :class="{ active: lightallbutton === 0 }" @click="lightAllOP(0)">
          <div style="position:relative;z-index:2">全关</div>
        </div>
        <div class="tabs-item" :class="{ active: lightallbutton === 1 }" @click="lightAllOP(1)">
          <div style="position:relative;z-index:2">全开</div>
        </div>
      </div>

      <!-- 独立照明 -->
      <div class="light flex-row align-center" style="flex-wrap:wrap;">
        <div
          v-for="(item, index) in lights"
          :key="index"
          class="flex-col align-center justify-center"
          :class="[
            item.online == 1 ? 'light-item' : '',
            item.status === 0 && item.online == 1 ? 'close' : '',
            item.online == 0 || !item.online ? 'offline' : '',
          ]"
          @click="lightOp(item)"
        >
          <div class="flex-col align-center justify-center" style="position:relative;z-index:2;">
            <img v-if="item.online == 1 && item.status === 1" class="icon" :src="lightonImg" />
            <img v-if="item.status === 0 && item.online == 1" class="icon" :src="lightoffImg" />
            <img v-if="item.online == 0 || !item.online" class="icon" style="height:36px;" :src="offlineImg" />
            <div class="txt">{{ showLightTitle(item.name) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 窗帘控制 ====== -->
    <div v-if="blindShow">
      <div class="index-title-box flex-row align-center">
        <div class="txt">{{ obj.floor }} {{ obj.name }} 窗帘控制</div>
      </div>
      <div class="content" style="min-height:0;">
        <div class="flex-row align-center justify-between">
          <div class="chuanglian-box flex-row justify-center align-center" @click="handleBlind('up')">
            <div class="flex-row align-center justify-center">
              <img :src="chuanglian1" class="icon-chuanglian" /> 打开
            </div>
          </div>
          <div class="chuanglian-box flex-row justify-center align-center" @click="handleBlind('pause')">
            <div class="flex-row align-center justify-center">
              <img :src="chuanglian2" class="icon-chuanglian" /> 暂停
            </div>
          </div>
          <div class="chuanglian-box flex-row justify-center align-center" @click="handleBlind('down')">
            <div class="flex-row align-center justify-center">
              <img :src="chuanglian3" class="icon-chuanglian" />关闭
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 空调控制 ====== -->
    <div>
      <div style="display:flex;">
        <div class="index-title-box flex-row align-center" style="margin-top:40px;">
          <div class="txt">{{ obj.floor }} {{ obj.name }} 空调控制</div>
        </div>
      </div>

      <div class="content" style="overflow-y:visible;">
        <div class="flex-row justify-between align-center">
          <div @click="dialogFankui = true" class="colorOrange">温度不适？点击反馈</div>
        </div>

        <div v-if="acloadingFlag">空调指令执行中....</div>
        <div v-else>
          <!-- 关闭/开启 toggle -->
          <div class="tabs-nav mini flex-row" style="margin-bottom:24px;">
            <div class="tabs-item" :class="{ active: acbutton === 0 }" @click="acAllOP(0)">
              <div style="position:relative;z-index:2">关闭</div>
            </div>
            <div class="tabs-item" :class="{ active: acbutton === 1 }" @click="acAllOP(1)">
              <div style="position:relative;z-index:2">开启</div>
            </div>
          </div>

          <!-- AC 状态 -->
          <div class="air-box flex-row align-center justify-between">
            <div class="txt">
              <span class="opa85">设置温度：</span>{{ acbutton === 0 ? ' 关闭 ' : (acDisplay?.temp ?? '--') + '℃' }}
            </div>
            <div class="txt" v-if="acDisplay?.mode">
              <span class="opa85">空调模式：</span>{{ acbutton === 0 ? '关闭' : acDisplay?.mode }}
            </div>
            <div class="txt">
              <span class="opa85">风量大小：</span>{{ acbutton === 0 ? '关闭' : acDisplay?.speed }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ====== 照明单控确认弹窗 ====== -->
  <el-dialog v-model="dialogLight" append-to-body width="600" top="40vh" :show-close="false" @close="emit('syncLightStatus', false)">
    <span style="margin:40px;">{{ dialogTxt }}</span>
    <template #footer>
      <div class="dialog-footer flex-row justify-around">
        <el-button type="default" @click="dialogLight = false; emit('syncLightStatus', false)" :loading="loadingFlag">取消</el-button>
        <el-button type="primary" @click="setLight" :loading="loadingFlag">确认</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- ====== 照明全控确认弹窗 ====== -->
  <el-dialog v-model="dialogLightAll" append-to-body width="500" top="40vh" :show-close="false">
    <span>{{ dialogTxt }}</span>
    <template #footer>
      <div class="dialog-footer flex-row justify-around">
        <el-button type="default" @click="dialogLightAll = false" :loading="loadingFlag">取消</el-button>
        <el-button type="primary" @click="lightAll" :loading="loadingFlag">确认</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- ====== 窗帘确认弹窗 ====== -->
  <el-dialog v-model="dialogBlind" append-to-body width="500" top="40vh" :show-close="false">
    <span>{{ dialogTxt }}</span>
    <template #footer>
      <div class="dialog-footer flex-row justify-around">
        <el-button type="default" @click="dialogBlind = false" :loading="loadingFlag">取消</el-button>
        <el-button type="primary" @click="setBlind" :loading="loadingFlag">确认</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- ====== 空调全控确认弹窗 ====== -->
  <el-dialog v-model="dialogAcAll" append-to-body width="500" top="40vh" :show-close="false">
    <span>{{ dialogTxt }}</span>
    <template #footer>
      <div class="dialog-footer flex-row justify-around">
        <el-button type="default" @click="dialogAcAll = false" :loading="acloadingFlag">取消</el-button>
        <el-button type="primary" @click="airconditionAll" :loading="acloadingFlag">确认</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- ====== 温度反馈弹窗 ====== -->
  <el-dialog v-model="dialogFankui" append-to-body width="560" top="30vh" :show-close="true">
    <template #header><div>有问题直接找楼长</div></template>
    <div class="fankui-txt">请使用企业微信扫描二维码添加</div>
    <div class="fankui-txt">TEL：{{ ['53F','52F','54F'].includes(obj.floor) ? '13777586082' : (phoneMap[obj.floorarea] || '18667083298') }}</div>
  </el-dialog>
</template>

<style scoped lang="scss">
.left-box-box {
  width: 900px;
  height: 100%;
  background: #202838;
  padding: 20px 40px;
  overflow-y: auto;
  .index-title-box {
    font-size: 26px;
    letter-spacing: 2px;
    margin: 20px 20px 20px 26px;
  }
  .content {
    width: calc(100% - 40px);
    margin-left: 20px;
    min-height: 148px;
    max-height: 608px;
    overflow-y: auto;
    padding: 24px;
    border-radius: 16px;
    background: #263041;
    position: relative;
    &.light-wrap { max-height: 355px; }
    .colorOrange {
      color: #ed8733;
      font-size: 18px;
      cursor: pointer;
      position: absolute;
      right: 0;
      top: -43px;
    }
    .chuanglian-box {
      width: 230px;
      height: 60px;
      border-radius: 30px;
      position: relative;
      cursor: pointer;
      background-image: linear-gradient(96.08deg, #607594 5.78%, rgba(63, 79, 108, 0) 22.99%, rgba(63, 79, 108, 0) 75.06%, #3f4f6c 91.49%);
      &::before {
        content: '';
        display: inline-block;
        width: calc(100% - 2px);
        height: calc(100% - 2px);
        position: absolute;
        top: 1px;
        left: 1px;
        border-radius: 30px;
        background-image: linear-gradient(96.9deg, #4a5a76 8.02%, #34445e 88%);
      }
      & > div { position: relative; z-index: 2; color: #fff; font-size: 18px; }
      .icon-chuanglian { width: 24px; height: 24px; margin-right: 8px; }
      &.active {
        background: #2e3a4d;
        &::before { background: #2e3a4d; }
      }
    }
    .icon-chuanglian { width: 24px; height: 24px; margin-right: 8px; }
    .title {
      font-size: 20px; font-weight: 500; line-height: 28px;
      color: #fff; opacity: 0.85; margin: 24px 0 16px 0;
    }
    .light {
      gap: 20px;
      margin-top: 20px;
      .offline {
        width: 105px; flex: 0 0 105px; height: 105px;
        border-radius: 14.5px; position: relative; cursor: pointer;
        background: #2f3644;
        &::before {
          content: ''; display: inline-block; width: calc(100% - 2px); height: calc(100% - 2px);
          border-radius: 16px; position: absolute; top: 1px; left: 1px; background: #2f3644;
        }
        .icon { width: 36px; height: 42px; margin-bottom: 6px; }
        .txt { font-size: 18px; color: #ffffff73; }
      }
      .light-item {
        width: 105px; flex: 0 0 105px; height: 105px;
        border-radius: 14.5px; position: relative; cursor: pointer;
        background-image: linear-gradient(96.08deg, #607594 5.78%, rgba(63, 79, 108, 0) 22.99%, rgba(63, 79, 108, 0) 75.06%, #3f4f6c 91.49%);
        &::before {
          content: ''; display: inline-block; width: calc(100% - 2px); height: calc(100% - 2px);
          border-radius: 16px; position: absolute; top: 1px; left: 1px;
          background: linear-gradient(96.9deg, #4a5a76 8.02%, #34445e 88%);
        }
        .icon { width: 36px; height: 42px; margin-bottom: 6px; }
        .txt { font-size: 18px; color: #fff; }
      }
      .close {
        background-image: linear-gradient(96.08deg, #3d4d65 5.78%, rgba(63, 79, 108, 0) 22.99%, rgba(63, 79, 108, 0) 75.06%, #2c3850 91.49%);
        &::before { background: #1a2130 !important; }
        .txt { color: #ffffff73; }
      }
    }
    .air-box {
      font-size: 22px;
      margin-top: 20px;
      width: 100%;
      height: auto;
      padding: 14px 24px;
      border-radius: 16px;
      position: relative;
      background: #2e3a4d;
      .txt { line-height: 40px; font-size: 20px; color: #fff; }
      .opa85 { opacity: 0.85; }
    }
    .temp-control {
      font-size: 20px !important;
      height: 102px !important;
      .floor { margin-right: 14px; }
      .celling { margin-left: 12px; }
    }
  }
}

// sliderPick-style toggle
.tabs-nav {
  width: 680px;
  height: 60px;
  background: #2e3a4d;
  border-radius: 30px;
  &.mini {
    width: 371px;
    height: 48px;
    background: #263041;
    border-radius: 24px;
    font-size: 18px;
  }
}
.tabs-item {
  width: 340px;
  height: 60px;
  line-height: 60px;
  border-radius: 30px;
  text-align: center;
  z-index: 1;
  font-size: 20px;
  color: #ffffff;
  cursor: pointer;
}
.mini .tabs-item {
  width: 50%;
  height: 48px;
  line-height: 48px;
  font-size: 18px;
  border-radius: 24px;
}
.active {
  position: relative;
  background-image: linear-gradient(96.08deg, #607594 5.78%, rgba(63, 79, 108, 0) 22.99%, rgba(63, 79, 108, 0) 75.06%, #3f4f6c 91.49%);
  &::before {
    content: '';
    display: inline-block;
    width: calc(100% - 2px);
    height: calc(100% - 2px);
    position: absolute;
    top: 1px;
    left: 1px;
    border-radius: 30px;
    background-image: linear-gradient(96.9deg, #4a5a76 8.02%, #34445e 88%);
  }
}
.mini .active::before { border-radius: 24px; }

.dialog-footer { margin: 0 0 40px 0 !important; padding: 0 20px; }
.fankui-txt {
  font-size: 16px; color: #fff; opacity: 0.65; margin-top: 16px; text-align: center;
}

.flex-row { display: flex; flex-direction: row; }
.flex-col { display: flex; flex-direction: column; }
.align-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.justify-around { justify-content: space-around; }
</style>

<style lang="scss">
.air-box {
  .el-slider__runway {
    height: 12px;
    border-radius: 100px;
    background: linear-gradient(90deg, #418bfb 0%, #59a7d5 20%, #6dbeb5 34%, #87dd8b 52.5%, #bee262 69.5%, #d5e450 78.5%, #eee73d 86%, #f0c425 92.5%, #f49301 100%);
  }
  .el-slider__bar { height: 100%; background-color: transparent; }
  .el-slider__button-wrapper {
    height: 20px; width: 20px; top: -6px;
    .el-slider__button { border: none; }
    &::after {
      position: absolute; width: 10px; height: 10px;
      background-color: #b9e265; border-radius: 10px;
      top: 7px; left: 5px;
    }
  }
  .el-slider__stop { height: 8px; width: 8px; top: 2px; }
}
.el-popper.temp-tip {
  border-radius: 8px !important; background: #fff !important; color: #000;
  text-align: center; font-size: 16px; font-weight: 500; border: none;
  padding: 2px 7px; margin-bottom: -5px;
  .el-popper__arrow { display: none; }
}
</style>
