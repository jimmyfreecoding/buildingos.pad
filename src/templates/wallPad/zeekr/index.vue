<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import VScaleScreen from 'v-scale-screen'
import { useZeekrData } from './useZeekrData'

const {
  obj, isWuxiui, sosAnimate, sosAnimateDia, disabledSos,
  inside, outside, bgParams, lights, acobj,
  blind, roomoSensorObj, meetingRooms,
  wcmanStatusObj, wcwomanStatusObj, wcmanStatusLive, wcwomanStatusLive, wcmanOtherFloorObj, wcmanOtherFloorObj2,
  wcwomanOtherFloorObj, ceowcStatusObj, ceowcStatusObj2,
  baojie, mapData, otherFloor, otherFloor2, airsensorMap,
  toggleLight, setAllLights, blindMove, acTogglePower, acSetTempAbsolute, acSetSpeedStr, acSetMode,
} = useZeekrData()

const router = useRouter()
const logoTapCount = ref(0)
let logoTapTimer: ReturnType<typeof setTimeout> | null = null
const onLogoClick = () => {
  logoTapCount.value++
  if (logoTapCount.value >= 3) {
    logoTapCount.value = 0
    router.push('/init')
    return
  }
  if (logoTapTimer) clearTimeout(logoTapTimer)
  logoTapTimer = setTimeout(() => { logoTapCount.value = 0 }, 800)
}

import LeftNav from './components/LeftNav.vue'
import ServicePanel from './components/ServicePanel.vue'
import ServiceGaojing from './components/ServiceGaojing.vue'
import HuanjingPanel from './components/HuanjingPanel.vue'
import ZhaomingPanel from './components/ZhaomingPanel.vue'
import RoomUsePanel from './components/RoomUsePanel.vue'
import BgVideo from './components/BgVideo.vue'
import IntelligentPanel from './components/IntelligentPanel.vue'
import MapCanvas from '@/components/MapCanvas.vue'
import { destroyMap } from '@/services/mapViewer'

// ====== Screen state ======
const drawer = ref(false)
const tabIndex = ref(0)
const isWc = ref(true)
const loading = ref(false)
const isOk = ref(false)
const cleanBtnVisible = ref(true)
const currentLight = ref({})
const currentLightStatus = ref(false)
const class1 = ref('')
const class2 = ref('')

// Mock toilet air
const toiletAir = ref({
  temperature: 24,
  humidity: 55,
  h2s: 0.003,
  pm25: 15,
  nh3: 1.5,
})

// ====== Computed ======
const now = ref(new Date())
const timer = setInterval(() => { now.value = new Date() }, 1000)
onUnmounted(() => { clearInterval(timer) })

const timeStr = computed(() => {
  const d = now.value
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
})
const dateStr = computed(() => {
  const d = now.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
const weekStr = computed(() => {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[now.value.getDay()]
})

// ====== Helpers ======
const airValue = (avalue: number, airtype: string) => {
  let showValue: any = '0'; let parcent = 0
  if (airtype === 'formaldehyde') {
    let sValue = parseFloat((avalue * 1.230).toFixed(3))
    let tValue = sValue > 0.07 ? 0.07 : sValue
    if (tValue === 0) tValue = 0.001
    showValue = tValue; parcent = 100 - (tValue / 0.16 * 100)
  } else if (airtype === 'co2') {
    let tValue = avalue > 800 ? 802 : avalue
    showValue = tValue; parcent = 100 - (tValue / 2000 * 100)
  } else if (airtype === 'pm25' || airtype === 'pm25out') {
    let tValue = avalue > 75 ? 75 : avalue
    showValue = tValue; parcent = 100 - (tValue / 400 * 100)
  } else if (airtype === 'tvoc') {
    let sValue = parseFloat((avalue * 0.0023).toFixed(3))
    let tValue = sValue > 0.4 ? 0.4 : sValue
    if (tValue === 0) tValue = 0.1
    showValue = tValue; parcent = 100 - (tValue / 2 * 100)
  } else if (airtype === 'h2s') {
    let sValue = parseFloat((avalue * 1.391).toFixed(3))
    let tValue = sValue > 0.011 ? 0.011 : sValue
    if (tValue === 0) tValue = 0.001
    showValue = tValue; parcent = 100 - (tValue / 0.02 * 100)
  } else if (airtype === 'nh3') {
    let sValue = parseFloat((avalue * 0.695).toFixed(3))
    let tValue = sValue > 9 ? 9.2 : sValue
    if (tValue === 0) tValue = 1
    showValue = tValue; parcent = 100 - (tValue / 20 * 100)
  }
  return { showValue, parcent }
}

const getHuanjingText = (type: string, val: number) => {
  if (type === 'humidity') { if (val < 30) return '干燥'; if (val <= 60) return '舒适'; return '潮湿' }
  return ''
}

// ====== Actions ======
const showIndex = (idx: number) => { tabIndex.value = idx; drawer.value = true }
// ====== SOS 临时屏蔽：呼叫页需服务端响应才会消失，后端未就绪期间屏蔽点击；后端就绪后改回 true ======
const SOS_ENABLED = false
const openSos = () => {
  if (!SOS_ENABLED) return
  sosAnimate.value = true; sosAnimateDia.value = true; drawer.value = true; tabIndex.value = 0
}
const sosConfirm = () => { sosAnimate.value = false; sosAnimateDia.value = false; drawer.value = false; disabledSos.value = true; setTimeout(() => { disabledSos.value = false }, 3000) }
const toMainBox = () => { isWuxiui.value = false }
const handleCleanRecord = () => { loading.value = true; setTimeout(() => { loading.value = false; isOk.value = true }, 1500) }
const navFun = (idx: number) => { if (idx === -1) { drawer.value = false } else { tabIndex.value = idx } }

// ====== 二级页面 1 分钟无触控自动返回首页 ======
const IDLE_TIMEOUT_MS = 60 * 1000
let idleTimer: ReturnType<typeof setTimeout> | null = null

const clearIdleTimer = () => {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
}

const resetIdleTimer = () => {
  if (!drawer.value) return
  clearIdleTimer()
  idleTimer = setTimeout(() => {
    idleTimer = null
    drawer.value = false
    tabIndex.value = 0
  }, IDLE_TIMEOUT_MS)
}

const onUserActivity = () => resetIdleTimer()

watch(drawer, (open) => {
  clearIdleTimer()
  if (open) resetIdleTimer()
})

onMounted(() => {
  window.addEventListener('touchstart', onUserActivity)
  window.addEventListener('pointerdown', onUserActivity)
  window.addEventListener('mousedown', onUserActivity)
  window.addEventListener('keydown', onUserActivity)
})

onUnmounted(() => {
  window.removeEventListener('touchstart', onUserActivity)
  window.removeEventListener('pointerdown', onUserActivity)
  window.removeEventListener('mousedown', onUserActivity)
  window.removeEventListener('keydown', onUserActivity)
  clearIdleTimer()
  destroyMap()
})
const serviceGaojingFun = () => { sosConfirm() }
const syncLight = (light: any) => { currentLight.value = light; toggleLight(light) }
const syncAllLight = (on: boolean) => { setAllLights(on) }
const syncLightStatus = (light: any) => { currentLightStatus.value = light.status === 1 }
const syncAcPower = (on: boolean) => { console.log('[index] syncAcPower:', on); acTogglePower() }
const syncAcTemp = (val: number) => { console.log('[index] syncAcTemp:', val); acSetTempAbsolute(val) }
const syncAcSpeed = (speed: string) => { console.log('[index] syncAcSpeed:', speed); acSetSpeedStr(speed) }
const syncAcMode = (mode: string) => { console.log('[index] syncAcMode:', mode); acSetMode(mode) }
const syncBlind = (dir: string) => { blindMove(dir as 'up' | 'down' | 'pause') }

// ====== 右上角时间三连击刷新页面 ======
let timeClickCount = 0
let timeClickTimer: ReturnType<typeof setTimeout> | null = null
const onTimeClick = () => {
  timeClickCount++
  if (timeClickTimer) clearTimeout(timeClickTimer)
  if (timeClickCount >= 3) {
    timeClickCount = 0
    timeClickTimer = null
    location.href = location.href
    return
  }
  timeClickTimer = setTimeout(() => { timeClickCount = 0; timeClickTimer = null }, 1500)
}

// Asset URLs
const iconWen = new URL('./assets/images/wen.png', import.meta.url).href
const iconTem = new URL('./assets/images/tem.png', import.meta.url).href
const tabAll = new URL('./assets/images/tabAll.png', import.meta.url).href
const iconfw = new URL('./assets/images/iconfw.png', import.meta.url).href
const iconSos1 = new URL('./assets/images/iconSos1.png', import.meta.url).href
const bgLine = new URL('./assets/images/bgLine.png', import.meta.url).href
const chahua = new URL('./assets/images/chahuaNew1.png', import.meta.url).href
const bgWC = new URL('./assets/images/bgWC.png', import.meta.url).href
const wuxiuBg = new URL('./assets/images/wuxiuBgNew.jpg', import.meta.url).href
const wuxiu = new URL('./assets/images/wuxiuNew.png', import.meta.url).href
const bg1 = new URL('./assets/images/bgNew1.jpg', import.meta.url).href
const logoUrl = new URL('./assets/images/geely.png', import.meta.url).href
const bottomBg = new URL('./assets/images/bottomBg.png', import.meta.url).href
const jingBg = new URL('./assets/images/jingBg.png', import.meta.url).href
const jingling = new URL('./assets/images/jingling.png', import.meta.url).href
const floorImg = new URL('./assets/images/floor.jpg', import.meta.url).href
</script>

<template>
  <VScaleScreen width="1920" height="1080" :auto-scale="true">
    <div style="width:1920px;height:1080px;overflow:hidden;background:#000;font-family:DingTalk,sans-serif;color:#fff;font-size:24px;" class="zeekr-wallpad">

      <!-- ==================== 主屏幕 ==================== -->
      <div
        v-if="!['wc','wcw','wc1','wc2'].includes(obj.type) && !isWuxiui"
        class="main-box"
      >
        <div v-if="sosAnimate" class="sos-animate"></div>

        <img v-if="bgParams.type === 'image'" :src="bg1" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;" />
        <BgVideo v-if="bgParams.type === 'video'" style="position:absolute;left:0;top:0;height:100%;width:100%;" :bg-urls="bgParams.urls"></BgVideo>
        <div class="bg-shdow"></div>
        <!-- 视频背景遮罩层（70%） -->
        <div v-if="bgParams.type === 'video'" style="position:absolute;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:0;"></div>

        <!-- 顶部栏 -->
        <div style="position:absolute;top:0;width:100%;padding:80px 100px;z-index:1;" class="flex-row justify-between">
          <div style="width:15%;"><img :src="logoUrl" style="width:100%;height:auto;cursor:pointer;" @click="onLogoClick" /></div>
          <div class="flex-col align-center" style="cursor:pointer;" @click="onTimeClick">
            <div style="font-size:40px;line-height:10px;">{{ timeStr }}</div>
            <div style="margin-top:24px;font-size:16px;opacity:0.8;" class="flex-row align-center">
              <div>{{ dateStr }}</div>
              <el-divider style="margin:0 16px;" direction="vertical" />
              <div>{{ weekStr }}</div>
            </div>
          </div>
        </div>

        <!-- 环境区 -->
        <div style="position:absolute;top:160px;width:100%;padding:80px 100px;z-index:1;" class="content flex-row justify-between">
          <!-- 左：室内 -->
          <div class="left flex-col justify-between">
            <div class="index-title-box flex-row align-center" style="opacity:0.6;">
              <div class="img-box flex-row align-center justify-center"><img class="img-icon" :src="iconWen" /></div>
              <div>{{ obj.floor }} {{ obj.name }} 室内</div>
            </div>
            <div class="flex-row align-end justify-between">
              <div class="title-num">
                <span style="font-family:DINPro,serif !important;">{{ Math.floor(inside.temperature) }}<span class="font100" style="font-family:DINPro !important;">.{{ inside.temperature.toFixed(1).split('.')[1] }}</span></span>
                <span class="unit">℃</span>
              </div>
              <el-divider direction="vertical" style="width:20px;opacity:0.8;height:125px;position:relative;bottom:30px;color:red;" />
              <div style="flex:1;">
                <div class="index-title-box flex-row align-center">
                  <div class="img-box flex-row align-center justify-center"><img class="img-icon" :src="iconTem" /></div>
                  <div>湿度</div>
                </div>
                <div class="title-num1">{{ inside.humidity }}% <span style="color:#79d172;margin-left:10px;font-size:44px;">{{ getHuanjingText('humidity', inside.humidity) }}</span></div>
              </div>
            </div>
            <div class="flex-row" style="gap:20px;">
              <div class="zhibiao shadow">
                <div class="title-box flex-row align-center justify-between">
                  <div class="flex-row align-center"><div class="dot bgcolor1"></div>甲醛</div>
                  <div class="color1">安全</div>
                </div>
                <el-progress color="#00000000" :percentage="airValue(inside.formaldehyde,'formaldehyde').parcent" :stroke-width="4">{{ airValue(inside.formaldehyde,'formaldehyde').showValue }}mg/m³</el-progress>
              </div>
              <div class="zhibiao shadow">
                <div class="title-box flex-row align-center justify-between">
                  <div class="flex-row align-center"><div class="dot bgcolor1"></div>CO₂</div>
                  <div class="color1">清新</div>
                </div>
                <el-progress color="#00000000" :percentage="airValue(inside.co2,'co2').parcent" :stroke-width="4">{{ airValue(inside.co2,'co2').showValue }}ppm</el-progress>
              </div>
              <div class="zhibiao shadow">
                <div class="title-box flex-row align-center justify-between">
                  <div class="flex-row align-center"><div class="dot bgcolor1"></div>PM2.5</div>
                  <div class="color1">优</div>
                </div>
                <el-progress color="#00000000" :percentage="airValue(inside.pm25,'pm25').parcent" :stroke-width="4">{{ airValue(inside.pm25,'pm25').showValue }}<span style="letter-spacing:-3px;">μg</span> /m³</el-progress>
              </div>
            </div>
          </div>

          <img class="bg-line" :src="bgLine" />

          <!-- 右：室外 -->
          <div class="right flex-col justify-between">
            <div class="index-title-box flex-row align-center">
              <div class="img-box flex-row align-center justify-center"><img class="img-icon" :src="iconWen" /></div>
              <div>室外</div>
            </div>
            <div class="flex-row align-end">
              <div class="title-num">{{ outside.temperatureNum }}<span class="font100">.0</span><span class="unit">℃</span></div>
              <div style="flex:1;"></div>
            </div>
            <div class="flex-row" style="gap:20px;">
              <div class="zhibiao shadow">
                <div class="title-box flex-row align-center justify-between">
                  <div class="flex-row align-center"><div class="dot bgcolor1"></div>AQI</div>
                  <div class="color1">清新</div>
                </div>
                <el-progress color="#00000000" :percentage="84" :stroke-width="4">{{ outside.AIQ }}</el-progress>
              </div>
              <div class="zhibiao shadow">
                <div class="title-box flex-row align-center justify-between">
                  <div class="flex-row align-center"><div class="dot bgcolor1"></div>PM2.5</div>
                  <div class="color1">优</div>
                </div>
                <el-progress color="#00000000" :percentage="airValue(outside.pm25,'pm25out').parcent" :stroke-width="4">{{ outside.pm25 }}<span style="letter-spacing:-3px;">μg</span> /m³</el-progress>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部Tab导航 -->
        <div class="bottom-tab">
          <div @click="showIndex(0)" class="bottom-all flex-row justify-center align-center">
            <img class="icon" :src="tabAll" /><div>全部</div>
          </div>
          <div class="bottom-box flex-row align-center justify-around">
            <div @click="showIndex(0)" class="bottom-width flex-row justify-center align-center" style="opacity:0;">
              <img class="icon" :src="tabAll" /><div>全部</div>
            </div>
            <div @click="showIndex(0)" class="flex-row justify-center align-center menu-box">
              <img class="icon" :src="iconfw" /><div>行政服务</div>
            </div>
            <el-divider style="flex:0 0 1px;" direction="vertical" />
            <div @click="showIndex(2)" class="flex-row justify-center align-center menu-box">
              <img class="icon" src="./assets/images/iconzm.png" /><div>照明空调</div>
            </div>
            <el-divider style="flex:0 0 1px;" direction="vertical" />
            <div @click="showIndex(1)" class="flex-row justify-center align-center menu-box">
              <img class="icon" src="./assets/images/iconhj.png" /><div>室内环境</div>
            </div>
            <el-divider style="flex:0 0 1px;" direction="vertical" />
            <div v-if="obj.floor !== '54F'" @click="showIndex(3)" class="flex-row justify-center align-center menu-box">
              <img class="icon" src="./assets/images/iconkj.png" /><div>空间使用</div>
            </div>
            <div @click="openSos" class="bottom-width flex-row justify-center align-center" style="opacity:0;">
              <img class="icon" :src="iconSos1" /><div>SOS</div>
            </div>
          </div>
          <div @click="openSos" class="bottom-soc flex-row justify-center align-center">
            <img class="icon" :src="iconSos1" /><div style="margin-top:4px;">SOS</div>
          </div>
        </div>

        <!-- 插画 -->
        <div class="chahua" v-if="!['52F','53F','54F'].includes(obj.floor)">
          <img class="img" :src="chahua" />
          <div class="txt"><div>全天候温度、空气</div><div>智能调节中~~</div></div>
        </div>

        <!-- 告警 -->
        <div v-if="sosAnimate" class="sos-jinling flex-col justify-center">
          <div class="txt1">紧急呼叫中！安保人员正在前往此楼层</div>
          <div class="txt2">安保处联络方式：</div>
        </div>

        <!-- Drawer -->
        <el-drawer
          v-model="drawer"
          :modal="false"
          direction="btt"
          :show-close="false"
          :with-header="false"
          destroy-on-close
          class="cus-drawer"
          size="100%"
          :z-index="2"
        >
          <div class="index-box flex-row">
            <div v-if="sosAnimateDia" class="sos-animate"></div>
            <LeftNav
              style="width:220px;flex:none;z-index:3"
              :active="tabIndex"
              :floor="obj.floor"
              @clickChild="navFun"
            ></LeftNav>

            <div style="flex:1;height:100%;background:#090909;z-index:3;position:relative;left:-1px;">
              <ServicePanel v-if="tabIndex === 0 && !sosAnimateDia" :disabledSos="disabledSos" @childFun="openSos"></ServicePanel>
              <ServiceGaojing v-if="tabIndex === 0 && sosAnimateDia"></ServiceGaojing>
              <HuanjingPanel v-if="tabIndex === 1" :inside="inside" :outside="outside" :obj="obj"></HuanjingPanel>
              <ZhaomingPanel
                v-if="tabIndex === 2"
                :lights="lights" :acobj="acobj"
                :blind="blind" :obj="obj"
                @syncLight="syncLight" @syncAllLight="syncAllLight" @syncLightStatus="syncLightStatus"
                @syncAcPower="syncAcPower" @syncAcTemp="syncAcTemp" @syncAcMode="syncAcMode" @syncAcSpeed="syncAcSpeed" @syncBlind="syncBlind"
              ></ZhaomingPanel>
              <RoomUsePanel v-if="tabIndex === 3 && obj.floor !== '54F'" :roomoSensorObj="roomoSensorObj" :meetingRooms="meetingRooms" :wcmanStatusObj="wcmanStatusLive" :wcwomanStatusObj="wcwomanStatusLive"></RoomUsePanel>
              <IntelligentPanel v-if="obj.floor === '54F' ? tabIndex === 3 : tabIndex === 4" :space-name="obj.spaceName"></IntelligentPanel>
            </div>

            <!-- 2.5D 地图由 drawer 外持久 MapCanvas 覆盖层渲染，此处仅保留 800px 布局占位 -->
            <div v-if="[1,2,3].includes(tabIndex)" style="width:800px;height:100%;background:#161616;z-index:2;flex:none;position:relative;left:-2px;"></div>
          </div>
        </el-drawer>

        <!-- 2.5D 地图持久覆盖层：drawer destroy-on-close 会销毁内部 DOM，canvas 必须活在 drawer 外 -->
        <MapCanvas
          v-show="drawer && [1,2,3].includes(tabIndex)"
          style="position:absolute;right:-2px;top:0;bottom:0;width:800px;z-index:4;background:#161616;"
        >
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
            <img :src="floorImg" style="max-width:100%;max-height:100%;object-fit:contain;display:block;" />
          </div>
        </MapCanvas>
      </div>

      <!-- ==================== 卫生间屏幕 ==================== -->
      <div v-if="!['53F'].includes(obj.floor) && (obj.type === 'wc' || obj.type === 'wcw')" class="main-box wc">
        <div style="position:absolute;top:0;width:100%;padding:80px 100px;z-index:1;" class="flex-row justify-between">
          <div style="font-size:28px;font-weight:700;">Zeekr</div>
          <div style="font-size:24px;opacity:0.7;">{{ dateStr }} {{ weekStr }}</div>
        </div>

        <div class="wc-box flex-col align-center">
          <div class="content flex-row align-center">
            <div class="left-box flex-col justify-between">
              <div class="border-bg" @click="handleCleanRecord">
                <div class="txt1">最近保洁时间</div>
                <div class="wc-clean">
                  <div class="wc-clean__time">
                    <div class="txt2">{{ baojie.endTime.split(' ')[1] || '14:30' }}</div>
                    <div class="txt3">{{ baojie.endTime.split(' ')[0] || '2025-01-15' }}</div>
                  </div>
                  <div class="wc-clean__btn">
                    <el-button v-if="!isOk" type="success" @click="handleCleanRecord" :loading="loading">立即清扫</el-button>
                    <el-button v-else type="success" class="result" disabled>打卡成功</el-button>
                  </div>
                </div>
              </div>
              <div class="border-bg">
                <div class="txt1">其他楼层</div>
                <div class="txt4 flex-row align-center justify-between">
                  <div>{{ otherFloor }}F-空闲：{{ Object.values(wcmanOtherFloorObj).filter((v:any) => v === 0).length }}</div>
                  <div class="flex-row align-center">
                    <div class="flex-row align-center">
                      <div v-for="(v, k) in wcmanOtherFloorObj" :key="k"
                        v-if="[0,1].includes(v) && k !== 'vip'"
                        :class="v === 0 ? 'weizhi' : 'weizhi-active weizhi'"
                        style="margin-left:15px;"></div>
                    </div>
                    <el-divider direction="vertical" v-if="wcmanOtherFloorObj.hasOwnProperty('vip')" />
                    <div v-if="[0,1].includes(wcmanOtherFloorObj.vip)"
                      :class="wcmanOtherFloorObj.vip === 0 ? 'weizhi' : 'weizhi-active weizhi'"
                      style="margin-left:15px;"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="right-box flex-row align-center justify-center" style="flex:1;text-align:center;">
              <img class="bg-liudong" :src="bgWC" />
              <div class="flex-col align-center" style="z-index:1;">
                <div class="txt1" style="font-size:72px;">{{ obj.floor }}</div>
                <div v-if="obj.type === 'wc'" class="txt4 flex-row align-center justify-center">
                  <div class="flex-row align-center">
                    <div v-for="(v, k) in wcmanStatusObj" :key="k"
                      v-if="[0,1].includes(v) && k !== 'vip'"
                      :class="v === 0 ? 'weizhi weizhi-margin' : 'weizhi-active weizhi-margin'"></div>
                    <el-divider direction="vertical" v-if="wcmanStatusObj.hasOwnProperty('vip')" />
                    <div v-if="[0,1].includes(wcmanStatusObj.vip)"
                      :class="wcmanStatusObj.vip === 0 ? 'weizhi weizhi-margin' : 'weizhi-active weizhi-margin'"></div>
                  </div>
                </div>
                <div v-if="obj.type === 'wcw'" class="txt4 flex-row align-center justify-center">
                  <div class="flex-row align-center">
                    <div v-for="(v, k) in wcwomanStatusObj" :key="k"
                      v-if="[0,1].includes(v) && k !== 'vip'"
                      :class="v === 0 ? 'weizhi weizhi-margin' : 'weizhi-active weizhi-margin'"></div>
                    <el-divider direction="vertical" v-if="wcwomanStatusObj.hasOwnProperty('vip')" />
                    <div v-if="[0,1].includes(wcwomanStatusObj.vip)"
                      :class="wcwomanStatusObj.vip === 0 ? 'weizhi weizhi-margin' : 'weizhi-active weizhi-margin'"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 厕所空气质量 -->
          <div class="content1 flex-row align-center">
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor1"></div>温度</div>
                <div class="color1">舒适</div>
              </div>
              <el-progress color="#000" :percentage="100-toiletAir.temperature" :stroke-width="4">{{ toiletAir.temperature }}℃</el-progress>
            </div>
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor1"></div>湿度</div>
                <div class="color1">{{ getHuanjingText('humidity', toiletAir.humidity) }}</div>
              </div>
              <el-progress color="#000" :percentage="Math.ceil(100-toiletAir.humidity)" :stroke-width="4">{{ toiletAir.humidity?.toFixed(2) }}%</el-progress>
            </div>
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor2"></div>硫化氢</div>
                <div class="color1">正常</div>
              </div>
              <el-progress color="#000" :percentage="airValue(toiletAir.h2s,'h2s').parcent" :stroke-width="4">{{ airValue(toiletAir.h2s,'h2s').showValue }}mg/m³</el-progress>
            </div>
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor1"></div>PM2.5</div>
                <div class="color1">优</div>
              </div>
              <el-progress color="#000" :percentage="airValue(toiletAir.pm25,'pm25').parcent" :stroke-width="4">{{ airValue(toiletAir.pm25,'pm25').showValue }}μg/m³</el-progress>
            </div>
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor1"></div>氨气</div>
                <div class="color1">正常</div>
              </div>
              <el-progress color="#000" :percentage="airValue(toiletAir.nh3,'nh3').parcent" :stroke-width="4">{{ airValue(toiletAir.nh3,'nh3').showValue }}mg/m³</el-progress>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== 午休屏幕 ==================== -->
      <div v-if="!isWc && isWuxiui" class="main-box" style="position:relative;">
        <div v-if="sosAnimate" class="sos-animate"></div>
        <img :src="wuxiuBg" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;" />
        <div style="position:absolute;top:0;width:100%;padding:80px 100px;z-index:1;" class="flex-row justify-between">
          <div style="font-size:28px;font-weight:700;">Zeekr</div>
          <div style="font-size:24px;opacity:0.7;">{{ dateStr }} {{ weekStr }}</div>
        </div>
        <div class="wuxiu-box flex-col align-center">
          <img class="icon" :src="wuxiu" />
          <div class="txt1">当前已进入午休模式，照明将在午休结束后开启</div>
          <div @click="toMainBox" class="btn">返回首屏</div>
        </div>
      </div>

      <!-- ==================== 总裁层卫生间 53F ==================== -->
      <div v-if="['53F'].includes(obj.floor) && (obj.type === 'wc1' || obj.type === 'wc2')" class="main-box wc">
        <div style="position:absolute;top:0;width:100%;padding:80px 100px;z-index:1;" class="flex-row justify-between">
          <div style="font-size:28px;font-weight:700;">Zeekr</div>
          <div style="font-size:24px;opacity:0.7;">{{ dateStr }} {{ weekStr }}</div>
        </div>

        <div class="wc-box flex-col align-center">
          <div class="content flex-row align-center">
            <div class="left-box flex-col justify-between">
              <div class="border-bg">
                <div class="txt1">最近保洁时间</div>
                <div class="wc-clean">
                  <div class="wc-clean__time">
                    <div class="txt2">{{ baojie.endTime.split(' ')[1] || '14:30' }}</div>
                    <div class="txt3">{{ baojie.endTime.split(' ')[0] || '2025-01-15' }}</div>
                  </div>
                </div>
              </div>
              <div class="border-bg">
                <div class="txt1">其他楼层</div>
                <div class="txt4 flex-row align-center justify-between">
                  <div>{{ otherFloor }}F-空闲：{{
                    Object.values(wcmanOtherFloorObj).filter((v:any) => v === 0).length +
                    Object.values(wcwomanOtherFloorObj).filter((v:any) => v === 0).length
                  }}</div>
                  <div class="flex-row" :class="{ 'wc-reverse': obj.type === 'wc2' }">
                    <div class="flex-row align-center">
                      <div v-for="(v, k) in wcwomanOtherFloorObj" :key="k"
                        v-if="[0,1].includes(v) && k !== 'vip'"
                        :class="v === 0 ? 'weizhi' : 'weizhi-active weizhi'"
                        style="margin-left:15px;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="right-box flex-row align-center justify-center" style="flex:1;text-align:center;">
              <img class="bg-liudong" :src="bgWC" />
              <div class="flex-col align-center" style="z-index:1;">
                <div class="txt1" style="font-size:72px;">{{ obj.floor }}</div>
                <div class="txt4 flex-row align-center justify-center">
                  <div v-for="(v, k) in wcmanStatusObj" :key="k"
                    v-if="[0,1].includes(v) && k !== 'vip'"
                    :class="v === 0 ? 'weizhi weizhi-margin' : 'weizhi-active weizhi-margin'"></div>
                  <el-divider direction="vertical" v-if="wcmanStatusObj.hasOwnProperty('vip')" />
                  <div v-if="[0,1].includes(wcmanStatusObj.vip)"
                    :class="wcmanStatusObj.vip === 0 ? 'weizhi weizhi-margin' : 'weizhi-active weizhi-margin'"></div>
                  <el-divider direction="vertical" />
                  <div v-for="(v, k) in wcwomanStatusObj" :key="k"
                    v-if="[0,1].includes(v) && k !== 'vip'"
                    :class="v === 0 ? 'weizhi weizhi-margin' : 'weizhi-active weizhi-margin'"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="content1 flex-row align-center">
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor1"></div>温度</div>
                <div class="color1">舒适</div>
              </div>
              <el-progress color="#000" :percentage="100-toiletAir.temperature" :stroke-width="4">{{ toiletAir.temperature }}℃</el-progress>
            </div>
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor1"></div>湿度</div>
                <div class="color1">{{ getHuanjingText('humidity', toiletAir.humidity) }}</div>
              </div>
              <el-progress color="#000" :percentage="Math.ceil(100-toiletAir.humidity)" :stroke-width="4">{{ toiletAir.humidity?.toFixed(2) }}%</el-progress>
            </div>
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor2"></div>硫化氢</div>
                <div class="color1">正常</div>
              </div>
              <el-progress color="#000" :percentage="airValue(toiletAir.h2s,'h2s').parcent" :stroke-width="4">{{ airValue(toiletAir.h2s,'h2s').showValue }}mg/m³</el-progress>
            </div>
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor1"></div>PM2.5</div>
                <div class="color1">优</div>
              </div>
              <el-progress color="#000" :percentage="airValue(toiletAir.pm25,'pm25').parcent" :stroke-width="4">{{ airValue(toiletAir.pm25,'pm25').showValue }}μg/m³</el-progress>
            </div>
            <div class="border-bg zhibiao" style="margin-right:20px;">
              <div class="title-box flex-row align-center justify-between">
                <div class="flex-row align-center"><div class="dot bgcolor1"></div>氨气</div>
                <div class="color1">正常</div>
              </div>
              <el-progress color="#000" :percentage="airValue(toiletAir.nh3,'nh3').parcent" :stroke-width="4">{{ airValue(toiletAir.nh3,'nh3').showValue }}mg/m³</el-progress>
            </div>
          </div>
        </div>
      </div>

    </div>
  </VScaleScreen>
</template>

<style lang="scss">
/* ====== 全局字体 ====== */
@font-face { font-family: 'ly-regular'; src: url('./assets/fonts/LynkcoType-Regular.ttf'); }
@font-face { font-family: 'ly-light'; src: url('./assets/fonts/LynkcoType-Light.ttf'); }
@font-face { font-family: 'ly-medium'; src: url('./assets/fonts/LynkcoType-Medium.ttf'); }
@font-face { font-family: 'ly-bold'; src: url('./assets/fonts/LynkcoType-Bold.ttf'); }
@font-face { font-family: 'DingTalk'; src: url('./assets/fonts/方正兰亭准黑简体.TTF'); }
@font-face { font-family: 'DingNumber'; src: url('./assets/fonts/DINPro-Medium.ttf'); }
@font-face { font-family: 'DINPro'; src: url('./assets/fonts/DINPro-Medium.ttf'); }

/* ====== 全局工具类 ====== */
.zeekr-wallpad .flex-row { display: flex; flex-direction: row; }
.zeekr-wallpad .flex-col { display: flex; flex-direction: column; }
.zeekr-wallpad .justify-between { display: flex; justify-content: space-between; }
.zeekr-wallpad .justify-start { display: flex; justify-content: flex-start; }
.zeekr-wallpad .justify-center { display: flex; justify-content: center; }
.zeekr-wallpad .justify-around { display: flex; justify-content: space-around; }
.zeekr-wallpad .align-center { display: flex; align-items: center; }
.zeekr-wallpad .align-end { display: flex; align-items: flex-end; }
.zeekr-wallpad .align-left { display: flex; align-items: flex-start; }

/* ====== Element Plus 全局覆盖 ====== */
.zeekr-wallpad .el-dialog { background: #2E3A4D; border-radius: 16px; color: #fff; }
.zeekr-wallpad .el-dialog__body { color: #fff; font-size: 24px; text-align: center; }
.zeekr-wallpad .el-button { width: 180px; height: 60px; border-radius: 98px; font-size: 20px; }
.zeekr-wallpad .el-button--primary { background: #ED8733; border: 2px solid #ED8733; color: #fff; }
.zeekr-wallpad .el-button--default { border: 2px solid #607594; background: #ffffff00; color: #fff; }
.zeekr-wallpad .el-button--danger { background: rgba(255, 84, 67, 1); border: 2px solid rgba(255, 84, 67, 1); color: #fff; }
.zeekr-wallpad .el-button:focus, .zeekr-wallpad .el-button:hover { background: #ED8733; border: 2px solid #ED8733; color: #fff; }

/* ====== Element Plus 进度条全局覆盖 (必须unscoped) ====== */
.zeekr-wallpad .el-progress-bar__outer { overflow: visible !important; }
.zeekr-wallpad .zhibiao.shadow .el-progress-bar { transform: rotate(180deg); }
.zeekr-wallpad .zhibiao .el-progress-bar__outer { background: linear-gradient(90deg, #418BFB 0%, #87DD8B 25%, #EEE73D 50%, #F49301 75%, #EE4730 100%) !important; }
.zeekr-wallpad .zhibiao .el-progress__text { flex: 1; font-size: 20px !important; text-align: right; color: rgba(255, 255, 255, 0.4); }
.zeekr-wallpad .zhibiao .el-progress { height: 30px; }
.zeekr-wallpad .zhibiao.shadow .el-progress-bar__inner { background-color: rgba(61, 66, 69, 0.8) !important; height: 6px; top: -1px; }
.zeekr-wallpad .el-progress-bar__inner::after { width: 18px; height: 18px; position: absolute; right: 0px; border-radius: 50%; top: -2px; border: 4px solid #fff; }
.zeekr-wallpad .content .zhibiao .el-progress-bar__inner::after { width: 6px; height: 6px; }
.zeekr-wallpad .content .zhibiao .el-progress-bar__outer { background: linear-gradient(90deg, #EE4730 0%, #F49301 25%, #EEE73D 50%, #87DD8B 75%, #418BFB 100%) !important; }
.zeekr-wallpad .wc .el-progress-bar { transform: rotate(180deg); }
.zeekr-wallpad .wc .el-progress-bar__outer { background: linear-gradient(90deg, #EE4730 0%, #F49301 25%, #EEE73D 50%, #87DD8B 75%, #418BFB 100%) !important; }
.zeekr-wallpad .wc .el-progress-bar__inner { background-color: rgba(61, 66, 69, 0.8) !important; height: 6px; top: -1px; }
.zeekr-wallpad .wc .el-progress-bar__inner::after { width: 6px; height: 6px; }

/* ====== 全局其他 ====== */
.zeekr-wallpad .wc-reverse { flex-direction: row-reverse; }
.zeekr-wallpad .el-drawer__body { width: 100%; height: 100%; padding: 0 !important; }

/* ====== 无前缀全局样式 (用于teleported drawer/dialog内容) ====== */
.el-drawer__body { width: 100%; height: 100%; padding: 0 !important; }
.el-progress-bar__outer { overflow: visible !important; }
.el-progress-bar__inner::after {
  width: 18px; height: 18px; position: absolute; right: 0px;
  border-radius: 50%; top: -2px; border: 4px solid #fff;
}
.el-dialog { background: #2E3A4D; border-radius: 16px; color: #fff; }
.el-dialog__body { color: #fff; font-size: 24px; text-align: center; }
.el-button { width: 180px; height: 60px; border-radius: 98px; font-size: 20px; }
.el-button--primary { background: #ED8733; border: 2px solid #ED8733; color: #fff; }
.el-button--default { border: 2px solid #607594; background: #ffffff00; color: #fff; }
.el-button--danger { background: rgba(255, 84, 67, 1); border: 2px solid rgba(255, 84, 67, 1); color: #fff; }
.el-button:focus, .el-button:hover { background: #ED8733; border: 2px solid #ED8733; color: #fff; }
</style>

<style scoped lang="scss">
/* ====== 主屏幕 ====== */
.main-box {
  width: 1920px;
  height: 1080px;
  margin: 0 auto;
  left: -1px;
  position: relative;
  color: #fff;
  font-family: DingTalk;
  font-size: 24px;
  box-sizing: border-box;

  .bg-shdow {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(180deg, rgba(30, 30, 30, 0.5) 0%, rgba(30, 30, 30, 0.7) 46.82%, #1e1e1e 100%);
    z-index: 0;
  }

  .chahua {
    position: absolute; width: 435px; height: 236.29px; top: 200px; left: 673.04px; z-index: 1;
    .img { position: absolute; width: 248px; height: 236.29px; top: 0; right: 0; }
    .txt { position: absolute; top: 122px; left: -78px; font-size: 20px; width: 290px; text-align: right; opacity: 0.8; }
  }

  .content {
    gap: 40px;
    .index-title-box {
      font-size: 36px; font-family: PingFang SC; letter-spacing: 2px; margin: 20px 20px 20px 26px;
      .img-box { width:48px; height:48px; .img-icon { width:40px; height:40px; margin-right:18px; } }
    }
    .title-num {
      font-family: DingNumber; font-weight: 400; font-size: 300px; color: #ffffff; line-height: 280px; position: relative;
      .unit { font-size: 60px; vertical-align: text-top; display: inline-block; width: 0px; position: relative; top: -34px; }
    }
    .font200 { font-size: 200px; line-height: 200px; }
    .font100 { font-size: 100px; line-height: 100px; position: relative; right: 10px; bottom: 0; }
    .title-num1 { font-family: DingNumber; font-size: 44px; margin: 20px; }

    .zhibiao {
      width: 320px; height: 114px; padding: 20px; border-radius: 16px;
      background: rgba(255, 255, 255, 0.1); margin-top: 40px; position: relative; z-index: 1;
      .title-box { margin-bottom: 14px; position: relative; z-index: 1; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background-color: #79d172; margin-right: 8px; }
      .color1 { color: #79d172; } .bgcolor1 { background: #79d172; }
      .color2 { color: #88c271; } .bgcolor2 { background: #88c271; }
      .color3 { color: #c7d263; } .bgcolor3 { background: #c7d263; }
    }

    .left { position: relative; width: 1142px; height: 632px; border-radius: 32px; padding: 20px 0px 40px 0px; }
    .bg-line { width: 79px; height: 611px; position: relative; left: -40px; }
    .right { width: 578px; height: 632px; border-radius: 32px; padding: 20px 0px 40px 0px; }
  }

  .bottom-tab { position: absolute; bottom: 0; width: 100%; }

  .bottom-all {
    width: 268px; height: 75px; position: absolute; left: 0; bottom: 19px; z-index: 1;
    margin: auto; background: linear-gradient(180deg, #5c5c5c 0%, #3d3d3d 122%);
    cursor: pointer;
    .icon { width: 36px; height: 36px; margin-right: 10px; margin-left: -48px; }
  }

  .bottom-box {
    width: 100%; height: 133px;
    background: url('./assets/images/bottomBg.png'); background-size: 100% 133px;
    position: relative; z-index: 2; padding-top: 22px;
    & > div { width: 23%; cursor: pointer; }
    .bottom-width { width: 284px; height: 100%; }
    .menu-box { height: 100%; }
    .icon { width: 30px; height: 30px; margin-right: 10px; }
  }

  .bottom-soc {
    width: 268px; height: 76px; position: absolute; bottom: 19px; z-index: 1; right: 0px;
    margin: auto; background: linear-gradient(180.09deg, #ff794f -1.06%, #ef523b 75.84%);
    cursor: pointer;
    .icon { width: 30px; height: 30px; margin-right: 10px; margin-left: 48px; }
  }

  .sos-jinling {
    width: 457px; height: 88px; position: absolute; top: 60px; left: 50%; margin-left: -230px;
    font-size: 32px; cursor: pointer; padding-left: 50px; z-index: 10;
    background: url('./assets/images/jingBg.png') no-repeat; background-size: 100% 88px;
    &::before { content: ''; display: inline-block; width: 100px; height: 100px; position: absolute; top: -4px; left: -46px; background: url('./assets/images/jingling.png'); }
    .txt1 { font-size: 22px; }
    .txt2 { font-size: 20px; opacity: 0.8; margin-top: 6px; }
  }

  .hide { visibility: hidden; }
  .show { display: block; }
}

/* ====== SOS动画 ====== */
.sos-animate {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  border: 1px solid #ff3636; background: rgba(255, 0, 0, 0.05);
  z-index: 10; pointer-events: none;
  &::after {
    content: ''; display: block; width: 100%; height: 100%; border: 2px solid #ff3636;
    animation: myfirst 1s infinite;
  }
}
@keyframes myfirst {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.02); opacity: 0; }
}

/* ====== 厕所屏幕 ====== */
.wc {
  background: #1a2130; width: 100%; height: 100%;
  .wc-box {
    padding: 180px 0 0 0;
    .el-divider--horizontal, .el-divider--vertical { opacity: 0.2; }
    .bg { width: 1080px; height: 459px; }

    .content {
      width: 1760px; height: 660px; border-radius: 16px; position: relative;
      background: #263041; padding: 40px;
      .left-box {
        height: 580px;
        .border-bg { min-height: 250px; }
        .wc-clean {
          display: flex; flex-direction: row; justify-content: space-between; align-items: center;
          &__time { flex: 1 0 auto; }
          &__btn { width: 100%; z-index: 2; text-align: right; }
          .el-button--success {
            width: 170px; height: 60px; background-color: #79d172; color: #fff;
            font-size: 26px; border: none;
            &.result { background-color: #e89e42; }
          }
        }
        .txt4 .el-divider--vertical { opacity: 0.2; height: 28px; margin: 0 0 0 10px; }
      }

      .right-box {
        width: 1194px; height: 580px; border-radius: 16px; position: relative;
        background-image: linear-gradient(112.88deg, #52647d 4.92%, #34435b 22.21%, #313f56 35.62%, #2e3b51 55.07%, #314157 74.54%);
        .txt1 { font-size: 72px; }
        .txt4 .el-divider--vertical { height: 50px; }
        &::before {
          content: ''; display: inline-block; width: calc(100% - 2px); height: calc(100% - 2px);
          border-radius: 16px; position: absolute; top: 1px; left: 1px;
          background: linear-gradient(102.66deg, #3b475c 6.07%, #2b374a 91.4%);
        }
        .bg-liudong { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      }

      .txt1 { font-size: 32px; opacity: 1; position: relative; color: #fff; margin-top: 10px; margin-bottom: 36px; }
      .txt2 { font-size: 40px; opacity: 1; color: #fff; position: relative; }
      .txt3 { font-size: 22px; opacity: 0.5; color: #fff; position: relative; }
      .txt4 { font-size: 24px; color: #e3e7ee; line-height: 38px; position: relative; }

      .weizhi {
        width: 28px; height: 28px; border-radius: 50%; position: relative;
        background-image: linear-gradient(112.88deg, #52647d 0%, #34435b 22.21%, #313f56 35.62%, #2e3b51 55.07%, #314157 74.54%);
        &::before {
          content: ''; display: inline-block; width: 22px; height: 22px; border-radius: 50%;
          position: absolute; top: 3px; left: 3px; background: #79d172;
        }
      }
      .weizhi-active {
        width: 28px; height: 28px; border-radius: 50%; position: relative;
        background-image: linear-gradient(112.88deg, #52647d 0%, #34435b 22.21%, #313f56 35.62%, #2e3b51 55.07%, #314157 74.54%);
        &::before {
          content: ''; display: inline-block; width: 22px; height: 22px; border-radius: 50%;
          position: absolute; top: 3px; left: 3px; background: #f95c2a;
        }
      }
      .weizhi-margin { margin: 0 50px !important; width: 80px; height: 80px; }
    }

    .content1 {
      width: 1760px; height: 180px; margin-top: 20px; border-radius: 16px; position: relative;
      padding: 20px 30px; gap: 20px;
      background-image: linear-gradient(112.88deg, #52647d 4.92%, #34435b 22.21%, #313f56 35.62%, #2e3b51 55.07%, #314157 74.54%);
      &::before {
        content: ''; display: inline-block; width: calc(100% - 2px); height: calc(100% - 2px);
        border-radius: 16px; position: absolute; top: 1px; left: 1px;
        background: #263041;
      }
      .zhibiao {
        flex: 1; height: 100%; padding: 16px; border-radius: 12px; position: relative;
        .dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
        .bgcolor1 { background: #3aad81; } .bgcolor2 { background: #2ad4f9; } .bgcolor3 { background: #ff5443; }
        .color1 { color: #79d172; } .color2 { color: #2ad4f9; } .color3 { color: #ff5443; }
        .title-box { margin-bottom: 8px; position: relative; z-index: 1; }
      }
      .border-bg { flex: 1; height: 100%; }
    }

    .border-bg {
      width: 456px; border-radius: 16px; padding: 30px; position: relative;
      background-image: linear-gradient(112.88deg, #52647d 4.92%, #34435b 22.21%, #313f56 35.62%, #2e3b51 55.07%, #314157 74.54%);
      &::before {
        content: ''; display: inline-block; width: calc(100% - 2px); height: calc(100% - 2px);
        border-radius: 16px; position: absolute; top: 1px; left: 1px;
        background: linear-gradient(102.66deg, #3b475c 6.07%, #2b374a 91.4%);
      }
    }
  }
}

/* ====== 午休屏幕 ====== */
.wuxiu-box {
  padding: 16% 0 0; position: absolute; width: 100%; z-index: 1;
  .icon { width: 248px; height: 237px; margin-bottom: 32px; }
  .txt1 { font-size: 36px; line-height: 50.4px; margin-bottom: 40px; }
  .btn { width: 180px; height: 64px; border-radius: 8px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 22px; }
}

/* ====== Drawer ====== */
.cus-drawer { background: rgb(9, 9, 9); }
.index-box { width: 100%; height: 1080px; overflow: hidden; position: absolute; bottom: 0; background-color: #090909 !important; }

/* ====== Body ====== */
body { width: 1920px; height: 1080px; margin: 0; padding: 0; }
</style>
