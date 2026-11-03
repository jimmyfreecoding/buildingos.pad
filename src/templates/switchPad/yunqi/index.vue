<script setup lang="ts">
/**
 * switchPad · 云起 4 寸标准屏（实机复刻）
 * ------------------------------------------------------------------
 * 三屏，**同一组左右滑动循环**（1 → 2 → 3 → 1 …），静默 30s 自动回到第 1 屏：
 *   ① 首页   截图1：大时钟 + 日期/星期 + 户外天气 + 四个按钮
 *             按钮 = 照明开 / 照明关 / 空调开 / 空调关（当前空间**群控**），恒显 4 个
 *   ② 空调   截图2 1:1 复刻；页面内所有控制 = 当前空间空调群控
 *   ③ 照明   房间号 + 智能开关 + 吊灯 + 设备开关胶囊（多灯按字数一行 1/2/3 个）
 *             左上角返回首页按钮
 *
 * 取设备 / 控制 / 请求状态 / 回显 与 switchPad/default 一致：
 *   群控灯：useLightMqtt().setAll(on)（整组名字拼接的群控主题）
 *   群控空调：useAcMqtt().togglePower / setTemp / setMode / setSpeed（裸群控主题）
 *   单灯：useLightMqtt().toggleLight(id)（内部 500ms 回查该路状态）
 *   界面状态只读设备回显；下发期间用 pending / busy + 4s 本地乐观层给反馈
 *
 * 可点条件（重要，别再改回去）：群控主题 /iot/action/{domain}/{space}/{area}/{floor}/{code}
 * 只依赖**空间绑定信息**，与设备列表无关；设备列表来自 config 响应，拿不到 ≠ 没有设备。
 * 因此按钮/空调页是否可点只看 isCompleteSpaceContext(ctx)，只有绑定缺失（会导致主题出现
 * 空段、被平台按整楼匹配）时才锁死。离线只提示"已进发送队列"，不锁死操作。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { isConnected, topics } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'
import { useMqtt } from '@/utils/useMqtt'
import { useLightMqtt } from '@/composables/useLightMqtt'
import { useAcMqtt } from '@/composables/useAcMqtt'
import { usePadPublishedContent } from '@/composables/usePadPublishedContent'
import type { AcMode, FanSpeed } from '@/types/device'
import type { LightRow } from './types'
import HomeScreen from './components/HomeScreen.vue'
import AcScreen from './components/AcScreen.vue'
import LightingScreen from './components/LightingScreen.vue'
// 画布 / 字体 / 壁纸（设计令牌 + @font-face），与各屏组件共享
import './assets/pad-theme.css'

const router = useRouter()
const mqtt = useMqtt()

/** 设计稿边长（与 config.ts 中 1:1 = 640x640 对齐） */
const DESIGN = 640

/** 首页左上角 logo：云端发布内容（edge display_json 的 logo 素材）→ HomeScreen 内 geely 兜底 */
const { publishedLogoUrl } = usePadPublishedContent()
/** 静默回首页时长 */
const IDLE_MS = 30000

/* ============================================================
 * 铺满屏幕：设计稿整体等比缩放（方屏 = 完美覆盖）
 * ============================================================ */
const scale = ref(1)
const fitScreen = () => {
  const w = window.innerWidth || DESIGN
  const h = window.innerHeight || DESIGN
  scale.value = Math.min(w, h) / DESIGN
}
onMounted(() => {
  fitScreen()
  window.addEventListener('resize', fitScreen)
  window.addEventListener('orientationchange', fitScreen)
})
onUnmounted(() => {
  window.removeEventListener('resize', fitScreen)
  window.removeEventListener('orientationchange', fitScreen)
})

/* ============================================================
 * 绑定信息：房间号（首页不显示，照明页显示）
 * ============================================================ */
const room = ref('')
onMounted(() => {
  try {
    const data = JSON.parse(localStorage.getItem('initData') || '{}')
    room.value = data.roomName || data.name || data.roomCode || data.code || ''
  } catch { /* ignore */ }
})

/* ============================================================
 * 设备能力（与 default 模板同一套 composable）
 * ============================================================ */
const { lights, ctx: lightCtx, toggleLight, setAll } = useLightMqtt()
const { ac, ctx: acCtx, setPower, setTemp, setMode, setSpeed } = useAcMqtt()

const lightDevices = computed(() => (isConnected.value ? lights.value?.devices ?? [] : []))

const MODE_CYCLE: AcMode[] = ['cool', 'heat', 'vent', 'auto']
const SPEED_CYCLE: FanSpeed[] = ['low', 'mid', 'high']

const getDeviceOn = (d: any) => d?.status?.status === 'on' || d?.status?.status === true || d?.status?.status === 1

/* 群控聚合状态（useAcMqtt 的 aggregate 已算好 power / temp / mode / speed） */
const acOn = computed(() => !!ac.value?.power)
const acTemp = computed(() => {
  const t = Number(ac.value?.temp)
  return isNaN(t) ? 24 : Math.min(30, Math.max(16, Math.round(t)))
})
const acMode = computed<AcMode>(() => ac.value?.mode ?? 'cool')
const acSpeed = computed<FanSpeed>(() => ac.value?.speed ?? 'mid')

/**
 * 群控空调"点击即有反馈"：本地乐观层（最多 4s）
 * ------------------------------------------------------------------
 * 群控下发后平台回显（topics.acStatus）通常要等一次 4s 状态回查，期间界面如果不给任何
 * 反馈，操作员就会觉得"点了没反应"。这里点一下先本地翻牌 + busy 提示，
 * 回显一旦与预期一致立刻让位给真实状态；4s 内没有回显（下发失败/离线）则自动回退，
 * 不会长期显示假状态。
 */
type AcView = Partial<{ on: boolean; temp: number; mode: AcMode; speed: FanSpeed }>
const acLocal = ref<AcView | null>(null)
let acLocalTimer: ReturnType<typeof setTimeout> | null = null
const clearAcLocal = () => {
  acLocal.value = null
  if (acLocalTimer) { clearTimeout(acLocalTimer); acLocalTimer = null }
}
const setAcLocal = (patch: AcView, ms = 4000) => {
  acLocal.value = { ...(acLocal.value || {}), ...patch }
  if (acLocalTimer) clearTimeout(acLocalTimer)
  acLocalTimer = setTimeout(() => { acLocal.value = null; acLocalTimer = null }, ms)
}
/* 回显与乐观层一致 → 立即清除；不一致 → 保留到超时（由真实状态接管） */
watch([ac, acLocal], () => {
  const l = acLocal.value
  if (!l) return
  const match = (l.on === undefined || l.on === acOn.value)
    && (l.temp === undefined || l.temp === acTemp.value)
    && (l.mode === undefined || l.mode === acMode.value)
    && (l.speed === undefined || l.speed === acSpeed.value)
  if (match) clearAcLocal()
})

const acOnView = computed(() => acLocal.value?.on ?? acOn.value)
const acTempView = computed(() => acLocal.value?.temp ?? acTemp.value)
const acModeView = computed<AcMode>(() => acLocal.value?.mode ?? acMode.value)
const acSpeedView = computed<FanSpeed>(() => acLocal.value?.speed ?? acSpeed.value)

/* 照明群控聚合状态 */
const lightsAllOn = computed(() => lightDevices.value.length > 0 && lightDevices.value.every(getDeviceOn))
const lightsAllOff = computed(() => lightDevices.value.length > 0 && lightDevices.value.every((d) => !getDeviceOn(d)))

/* ============================================================
 * 时钟 + 户外天气（首页）
 * ============================================================ */
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  now.value = new Date()
  clockTimer = setInterval(() => { now.value = new Date() }, 10000)
})
onUnmounted(() => { if (clockTimer) clearInterval(clockTimer) })

const hhmm = computed(() => {
  const d = now.value
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
})
const monthDay = computed(() => `${now.value.getMonth() + 1}/${now.value.getDate()}`)
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const weekday = computed(() => WEEKDAYS[now.value.getDay()])

const outdoor = ref<Record<string, any> | null>(null)
const weatherTopic = topics.outdoorWeather()
let unsubWeather: (() => void) | null = null
onMounted(() => {
  mqtt.subscribe(weatherTopic)
  unsubWeather = mqtt.onMessage(weatherTopic, (payload: unknown) => {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      outdoor.value = payload as Record<string, any>
    }
  })
})
onUnmounted(() => {
  if (unsubWeather) unsubWeather()
  unsubWeather = null
  mqtt.unsubscribe(weatherTopic)
})
const weatherTemp = computed(() => {
  const t = Number(outdoor.value?.temperatureNum ?? outdoor.value?.temperature)
  return outdoor.value === null || isNaN(t) ? '--' : String(Math.round(t))
})
const weatherIcon = computed<'sun' | 'cloud' | 'rain' | 'snow'>(() => {
  const today = String(outdoor.value?.today ?? '')
  if (today.indexOf('雨') !== -1) return 'rain'
  if (today.indexOf('雪') !== -1) return 'snow'
  if (today.indexOf('晴') !== -1) return 'sun'
  return today ? 'cloud' : 'sun'
})

/* ============================================================
 * 三屏循环：0 首页 / 1 空调 / 2 照明（1→2→3→1），静默 30s 回 0
 * ============================================================ */
const PAGE_W = 640
const PAGE_COUNT = 3
const screen = ref(0)
const goScreen = (i: number) => { screen.value = ((i % PAGE_COUNT) + PAGE_COUNT) % PAGE_COUNT }

const dragX = ref(0)
const dragging = ref(false)
let startX = 0
let startY = 0
let startT = 0
let axis: 'none' | 'x' | 'y' = 'none'
let activePointer: number | null = null
let suppressClick = false
let clickGuardTimer: ReturnType<typeof setTimeout> | null = null

/** 静默回首页：记录最后一次交互时间，1s 轮询判定 */
let lastActive = Date.now()
let idleTimer: ReturnType<typeof setInterval> | null = null
const markActive = () => { lastActive = Date.now() }
onMounted(() => {
  idleTimer = setInterval(() => {
    if (screen.value !== 0 && Date.now() - lastActive > IDLE_MS) goScreen(0)
  }, 1000)
})
onUnmounted(() => { if (idleTimer) clearInterval(idleTimer) })

const toDesign = (px: number) => px / (scale.value || 1)

const onPointerDown = (e: PointerEvent) => {
  markActive()
  activePointer = e.pointerId
  startX = e.clientX
  startY = e.clientY
  startT = Date.now()
  axis = 'none'
  dragX.value = 0
  dragging.value = false
}

const onPointerMove = (e: PointerEvent) => {
  if (activePointer !== e.pointerId) return
  const dx = toDesign(e.clientX - startX)
  const dy = toDesign(e.clientY - startY)
  if (axis === 'none') {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
  }
  if (axis !== 'x') return
  dragging.value = true
  dragX.value = dx
}

const endDrag = (e: PointerEvent) => {
  if (activePointer !== e.pointerId) return
  activePointer = null
  if (dragging.value) {
    const dx = dragX.value
    const dt = Math.max(1, Date.now() - startT)
    const velocity = dx / dt
    const far = Math.abs(dx) > PAGE_W * 0.16
    const flick = Math.abs(velocity) > 0.3
    if (far || (flick && Math.abs(dx) > 20)) goScreen(screen.value + (dx < 0 ? 1 : -1))
    suppressClick = true
    if (clickGuardTimer) clearTimeout(clickGuardTimer)
    clickGuardTimer = setTimeout(() => { suppressClick = false }, 350)
  }
  dragX.value = 0
  dragging.value = false
  axis = 'none'
}

const onPointerCancel = () => {
  activePointer = null
  dragX.value = 0
  dragging.value = false
  axis = 'none'
}

/* 兜底：指针在画布外抬起 / 被系统取消时，也能正确结束手势 */
const onWindowPointerUp = (e: PointerEvent) => { if (activePointer === e.pointerId) endDrag(e) }
const onWindowPointerCancel = (e: PointerEvent) => { if (activePointer === e.pointerId) onPointerCancel() }
onMounted(() => {
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointercancel', onWindowPointerCancel)
})
onUnmounted(() => {
  window.removeEventListener('pointerup', onWindowPointerUp)
  window.removeEventListener('pointercancel', onWindowPointerCancel)
})

const trackStyle = computed(() => ({
  transform: `translateX(${-(screen.value * PAGE_W) + dragX.value}px)`,
}))

/* ---------- 三击进入系统设置：**只认标题**（首页=大时钟，空调页/照明页=标题文字） ---------- */
let titleTaps = 0
let titleTapTimer: ReturnType<typeof setTimeout> | null = null

const onTitleTap = () => {
  markActive()
  titleTaps += 1
  if (titleTaps >= 3) {
    titleTaps = 0
    // 预览沙箱（preview-switchpad.html）没有装 vue-router，这里兜一下避免报错
    if (router && typeof router.push === 'function') router.push('/init')
    else window.location.href = '/pad/init'
    return
  }
  if (titleTapTimer) clearTimeout(titleTapTimer)
  titleTapTimer = setTimeout(() => { titleTaps = 0 }, 900)
}

const onClickCapture = (e: MouseEvent) => {
  if (!suppressClick) return
  suppressClick = false
  e.stopPropagation()
  e.preventDefault()
}

/** 画布其它位置：只用于"活跃计时"与滑动后的误触拦截，不再计入三击 */
const onCanvasClick = () => {
  markActive()
  if (suppressClick) suppressClick = false
}
onUnmounted(() => {
  if (titleTapTimer) clearTimeout(titleTapTimer)
  if (clickGuardTimer) clearTimeout(clickGuardTimer)
})

/* ============================================================
 * 首页四个按钮：群控灯 / 群控空调
 * ============================================================ */
const homeBusy = ref<string | null>(null)
const markBusy = (key: string, ms = 3000) => {
  homeBusy.value = key
  setTimeout(() => { if (homeBusy.value === key) homeBusy.value = null }, ms)
}


/**
 * 首页四个按钮：恒显 4 个。可点条件按**群控主题是否真的能拼出来**分别判断：
 *
 *  · 照明群控主题 = /iot/action/light/{space}/{area}/{floor}/{code}/{逗号拼接的设备名}
 *    → 最后一段靠设备名，没有设备名时 useLightMqtt.setAll 会主动跳过（发出去就是空段，
 *      平台按整楼匹配 → 全楼关灯）。所以照明按钮：绑定完整 **且** 有照明设备才可点。
 *  · 空调群控主题 = /iot/action/airconditioning/{space}/{area}/{floor}/{code}
 *    → **不需要设备列表**！设备列表来自 config 响应，拿不到 ≠ 没设备。
 *      之前用 devices.length>0 判可点，设备列表为空时空调页/按钮被 pointer-events:none
 *      锁死（点了完全没反应）。所以空调按钮/空调页：只看绑定是否完整。
 *
 * 绑定不完整（缺 space/area/floor/room 任一段）→ 主题会退化成 /iot/action/light/SMART///
 * 被平台按整楼匹配，此时必须锁死（mqtt.ts publish 里还有一层空段硬拦截兜底）。
 */
const lightBound = computed(() => isCompleteSpaceContext(lightCtx.value))
const acBound = computed(() => isCompleteSpaceContext(acCtx.value))
const hasLights = computed(() => lightDevices.value.length > 0)

const homeButtons = computed(() => [
  { key: 'light-on', label: '照明开', active: lightsAllOn.value, disabled: !lightBound.value || !hasLights.value },
  { key: 'light-off', label: '照明关', active: lightsAllOff.value, disabled: !lightBound.value || !hasLights.value },
  { key: 'ac-on', label: '空调开', active: acOnView.value, disabled: !acBound.value },
  { key: 'ac-off', label: '空调关', active: !acOnView.value, disabled: !acBound.value },
])

/** 群控前置条件：绑定信息完整（离线时 publish 会进 mqtt.js 队列，重连后送达） */
const canGroupControl = (bound: boolean, ctx: any) => {
  if (!bound || !isCompleteSpaceContext(ctx)) {
    console.warn('[yunqi] 群控下发拦截：空间绑定信息不完整，主题会出现空段')
    return false
  }
  if (!isConnected.value) {
    console.warn('[yunqi] MQTT 未连接：指令已进入发送队列，联网后补发')
  }
  return true
}

const onHomePress = (key: string) => {
  markActive()
  if (key === 'light-on' || key === 'light-off') {
    if (!lightBound.value || !hasLights.value) {
      console.warn('[yunqi] 照明群控跳过：绑定不完整或没有照明设备（群控主题需要设备名段）')
      return
    }
    markBusy(key)
    setAll(key === 'light-on')
    return
  }
  if (!canGroupControl(acBound.value, acCtx.value)) return
  markBusy(key)
  // 空调群控：绝对状态下发（on / off），与"照明开/照明关"的 setAll(bool) 语义一致
  setPower(key === 'ac-on')
  setAcLocal({ on: key === 'ac-on' })
}

/* ============================================================
 * 空调页：全部走群控（setPower / setTemp / setMode / setSpeed）
 * 页面是否可点只看绑定信息（acBound），与设备列表无关 —— 见 §7.1 的坑
 * ============================================================ */
const acBusy = ref<'power' | 'mode' | 'fan' | 'temp' | null>(null)
const markAcBusy = (k: 'power' | 'mode' | 'fan' | 'temp') => {
  acBusy.value = k
  setTimeout(() => { if (acBusy.value === k) acBusy.value = null }, 1200)
}

/** 副标题：优先用绑定的空间名，没有则用截图里的 Office AC */
const acSubtitle = computed(() => room.value || 'Office AC')

const onAcTemp = (delta: number) => {
  markActive()
  if (!canGroupControl(acBound.value, acCtx.value)) return
  const next = Math.min(30, Math.max(16, acTempView.value + delta))
  if (next === acTempView.value) return
  // ⚠️ useAcMqtt.setTemp 的语义是"相对**回显**温度"的增量，本地乐观层不能当基准：
  // 连点两次时若按乐观值算增量，平台会收到 回显+1（例如 24→23→又发 25 而不是 24）。
  const step = next - acTemp.value
  if (step !== 0) setTemp(step)
  setAcLocal({ temp: next })
  markAcBusy('temp')
}
const onAcPower = () => {
  markActive()
  if (!canGroupControl(acBound.value, acCtx.value)) return
  const next = !acOnView.value
  setPower(next)
  setAcLocal({ on: next })
  markAcBusy('power')
}
const onAcMode = () => {
  markActive()
  if (!canGroupControl(acBound.value, acCtx.value)) return
  const idx = MODE_CYCLE.indexOf(acModeView.value)
  const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]
  setMode(next)
  setAcLocal({ mode: next })
  markAcBusy('mode')
}
const onAcFan = () => {
  markActive()
  if (!canGroupControl(acBound.value, acCtx.value)) return
  const idx = SPEED_CYCLE.indexOf(acSpeedView.value)
  const next = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length]
  setSpeed(next)
  setAcLocal({ speed: next })
  markAcBusy('fan')
}

/* ============================================================
 * 照明页：单路控制（回显驱动）
 * ============================================================ */
const pendingKey = ref<string | null>(null)
const setPending = (key: string, ms: number) => {
  pendingKey.value = key
  setTimeout(() => { if (pendingKey.value === key) pendingKey.value = null }, ms)
}

const lightRows = computed<LightRow[]>(() => {
  if (lightDevices.value.length === 0) {
    return [{ id: '__ph', name: '暂无照明设备', on: false, pending: false, disabled: true }]
  }
  return lightDevices.value.map((d) => ({
    id: d.id,
    name: d.name,
    on: getDeviceOn(d),
    pending: pendingKey.value === 'light:' + d.id,
  }))
})

const onToggleLight = (row: LightRow) => {
  if (row.disabled || !isConnected.value) return
  markActive()
  toggleLight(row.id)
  setPending('light:' + row.id, 1200)
}
</script>

<template>
  <div class="pad-stage">
    <div
      class="pad-canvas"
      :style="{ transform: `scale(${scale})` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="onPointerCancel"
      @pointerleave="onPointerCancel"
      @click.capture="onClickCapture"
      @click="onCanvasClick"
    >
      <!-- 背景壁纸（客户提供的原厂图，全屏同一张） -->
      <div class="pad-wallpaper"></div>

      <!-- 三屏轨道：跟手拖动 + 平移缓动，1→2→3→1 循环 -->
      <div class="pad-viewport">
        <div class="pad-track" :class="{ animate: !dragging }" :style="trackStyle">
          <section class="pad-scr">
            <!-- ① 首页 -->
            <HomeScreen
              :time="hhmm"
              :date="monthDay"
              :weekday="weekday"
              :weather-icon="weatherIcon"
              :weather-temp="weatherTemp"
              :buttons="homeButtons"
              :busy="homeBusy"
              :logo="publishedLogoUrl"
              @press="onHomePress"
              @title-tap="onTitleTap"
            />
          </section>

          <section class="pad-scr">
            <!-- ② 空调（群控） -->
            <AcScreen
              title="空调控制面板"
              :subtitle="acSubtitle"
              :temp="acTempView"
              :on="acOnView"
              :mode="acModeView"
              :speed="acSpeedView"
              :enabled="acBound"
              :busy="acBusy"
              :dot-index="0"
              :dot-total="2"
              @back="goScreen(0)"
              @temp-down="onAcTemp(-1)"
              @temp-up="onAcTemp(1)"
              @power="onAcPower"
              @mode="onAcMode"
              @fan="onAcFan"
              @title-tap="onTitleTap"
            />
          </section>

          <section class="pad-scr">
            <!-- ③ 照明 -->
            <LightingScreen
              :room="room"
              title="照明控制面板"
              :rows="lightRows"
              :dot-index="1"
              :dot-total="2"
              @back="goScreen(0)"
              @toggle="onToggleLight"
              @title-tap="onTitleTap"
            />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
