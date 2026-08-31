import { computed, ref } from 'vue'
import { useAirSensorMqtt } from '@/composables/useAirSensorMqtt'
import { useLightMqtt } from '@/composables/useLightMqtt'
import { useWcSensorMqtt } from '@/composables/useWcSensorMqtt'
import { useHumanSensorMqtt } from '@/composables/useHumanSensorMqtt'
import { useBlindMqtt } from '@/composables/useBlindMqtt'
import { useAcMqtt } from '@/composables/useAcMqtt'
import { isConnected, subscribe, onMessage } from '@/utils/mqtt'
import { isCompleteSpaceContext } from '@/utils/mqttTopics'
import * as mock from './mockData'

type WcStatusObj = Record<string, number> & { vip?: number }

function readInitData() {
  try {
    const raw = localStorage.getItem('initData')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function useZeekrData() {
  // --- Bind display names from initData ---
  const init = readInitData()
  if (init) {
    mock.obj.value.floor = init.floorName || mock.obj.value.floor
    mock.obj.value.name = init.roomName || init.floorAreaName || mock.obj.value.name
    mock.obj.value.spaceName = init.spaceName || mock.obj.value.spaceName
  }

  // --- Domain composables ---
  const { airQuality } = useAirSensorMqtt()
  const { lights: mqttLights, ctx: lightCtx, toggleLight: mqttToggleLight, setAll: mqttSetAll } = useLightMqtt()
  const { sensors: wcSensors } = useWcSensorMqtt()
  const { sensors: humanSensors } = useHumanSensorMqtt()
  const { blind: mqttBlind, move: mqttBlindMove } = useBlindMqtt()
  const { ac: mqttAc, togglePower, setTemp, setMode: mqttSetMode, setSpeed } = useAcMqtt()

  // --- Outdoor weather → background video (参考原项目 setInitBg) ---
  const setInitBg = () => {
    const today = mock.outside.value.today
    if (!today) return
    mock.bgParams.type = 'video'
    let file = 'sun.mp4'
    if (today === '多云') {
      file = 'cloud.mp4'
    } else if (today === '阴' || today.indexOf('雾') !== -1 || today.indexOf('霾') !== -1) {
      file = 'overcast.mp4'
    } else if (today === '晴') {
      file = 'sun.mp4'
    } else if (today.indexOf('雨') !== -1) {
      file = 'rain.mp4'
    } else if (today.indexOf('雪') !== -1) {
      file = 'snow.mp4'
    }
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
    mock.bgParams.urls = [{ url: `${base}video/${file}` }]
  }

  // --- Outdoor weather (MQTT updates mock ref in place) ---
  subscribe('/wallpad/outside')
  onMessage('/wallpad/outside', (payload: any) => {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      mock.outside.value = payload
      setInitBg()
    }
  })

  // --- Indoor environment ---
  const inside = computed(() => {
    if (isConnected.value && airQuality.value) {
      const aq = airQuality.value
      return {
        temperature: aq.temp ?? mock.inside.value.temperature,
        humidity: aq.humidity ?? mock.inside.value.humidity,
        co2: aq.co2 ?? mock.inside.value.co2,
        pm25: aq.pm25 ?? mock.inside.value.pm25,
        tvoc: aq.tvoc ?? mock.inside.value.tvoc,
        formaldehyde: aq.formaldehyde ?? mock.inside.value.formaldehyde,
        h2s: mock.inside.value.h2s,
        nh3: mock.inside.value.nh3,
      }
    }
    return mock.inside.value
  })

  // --- Lighting ---
  const lights = computed(() => {
    if (isConnected.value && mqttLights.value?.devices?.length) {
      return mqttLights.value.devices.map((d) => ({
        name: d.name,
        status: d.status?.status === 'on' || d.status?.status === 1 ? 1 : 0,
        online: 1,
      }))
    }
    return mock.lights.value
  })

  const lightobj = mock.lightobj

  // --- AC ---
  const acobj = computed(() => {
    if (isConnected.value && mqttAc.value?.devices?.length) {
      return [{
        name: '空调',
        power: mqttAc.value.power,
        temp: mqttAc.value.temp,
        mode: mqttAc.value.mode,
        speed: mqttAc.value.speed,
        currentTemp: mqttAc.value.currentTemp ?? mqttAc.value.temp,
        devices: mqttAc.value.devices,
      }]
    }
    return mock.acobj.value
  })

  // --- Blinds ---
  const blind = computed(() => {
    if (isConnected.value && mqttBlind.value?.devices?.length) {
      return [{ position: mqttBlind.value.position }]
    }
    return mock.blind.value
  })

  // --- WC Sensors ---
  const wcmanStatusObj = computed(() => {
    if (isConnected.value && wcSensors.value?.length) {
      const tman = wcSensors.value.find((s) => s.room === 'TMAN')
      if (tman) {
        const result: WcStatusObj = {}
        for (let i = 0; i < tman.total; i++) {
          result[String(i + 1)] = i < tman.occupied ? 1 : 0
        }
        return result
      }
    }
    return mock.wcmanStatusObj.value
  })

  const wcwomanStatusObj = computed(() => {
    if (isConnected.value && wcSensors.value?.length) {
      const twoman = wcSensors.value.find((s) => s.room === 'TWOMAN')
      if (twoman) {
        const result: WcStatusObj = {}
        for (let i = 0; i < twoman.total; i++) {
          result[String(i + 1)] = i < twoman.occupied ? 1 : 0
        }
        return result
      }
    }
    return mock.wcwomanStatusObj.value
  })

  // --- 空间使用: pure subscription data (no mock fallback) ---
  const roomoSensorObj = computed(() => {
    const result: Record<string, { online: number[]; status: string[] }> = {}
    for (const s of humanSensors.value) {
      result[s.room] = { online: s.online, status: s.status }
    }
    return result
  })

  const meetingRooms = computed(() =>
    humanSensors.value.map((s) => ({ code: s.room }))
  )

  const wcObjFrom = (room: string): WcStatusObj => {
    const result: WcStatusObj = {}
    const sensor = wcSensors.value?.find((s) => s.room === room)
    if (sensor) {
      for (let i = 0; i < sensor.total; i++) {
        result[String(i + 1)] = i < sensor.occupied ? 1 : 0
      }
    }
    return result
  }

  const wcmanStatusLive = computed(() => wcObjFrom('TMAN'))
  const wcwomanStatusLive = computed(() => wcObjFrom('TWOMAN'))

  // --- Light actions (MQTT only when connected AND binding complete; otherwise local state) ---
  const toggleLight = (light: any) => {
    if (isConnected.value && isCompleteSpaceContext(lightCtx.value)) {
      const device = mqttLights.value?.devices?.find((d) => d.name === light.name)
      if (device) {
        mqttToggleLight(device.id)
        return
      }
    }
    // Fallback: local toggle（断连或绑定不完整时，绝不发 MQTT）
    const idx = mock.lights.value.findIndex((l: any) => l.name === light.name)
    if (idx !== -1) {
      mock.lights.value[idx].status = mock.lights.value[idx].status === 1 ? 0 : 1
    }
  }

  const setAllLights = (on: boolean) => {
    if (isConnected.value && isCompleteSpaceContext(lightCtx.value)) {
      mqttSetAll(on)
      return
    }
    console.warn('[useZeekrData] setAllLights: binding incomplete or disconnected — local state only')
    mock.lights.value.forEach((l: any) => { l.status = on ? 1 : 0 })
  }

  // --- Blind action ---
  const blindMove = (direction: 'up' | 'down' | 'pause') => {
    console.log('[useZeekrData] blindMove:', direction, 'isConnected:', isConnected.value)
    if (isConnected.value) {
      mqttBlindMove(direction)
    }
  }

  // --- AC absolute-temp & speed helpers for ZhaomingPanel ---
  const acSetTempAbsolute = (absoluteTemp: number) => {
    if (isConnected.value) {
      const current = mqttAc.value?.temp ?? 24
      setTemp(absoluteTemp - current)
    }
  }

  const acSetSpeedStr = (speedStr: string) => {
    if (isConnected.value) {
      const map: Record<string, string> = { '15': 'low', '45': 'mid', '75': 'high' }
      setSpeed((map[speedStr] || 'low') as any)
    }
  }

  const acSetModeStr = (mode: string) => {
    if (isConnected.value) {
      mqttSetMode(mode as any)
    }
  }

  return {
    // Static (from mockData)
    obj: mock.obj,
    isWuxiui: mock.isWuxiui,
    sosAnimate: mock.sosAnimate,
    sosAnimateDia: mock.sosAnimateDia,
    disabledSos: mock.disabledSos,
    outside: mock.outside,
    bgParams: mock.bgParams,
    air2: mock.air2,
    roomoSensorObj,
    meetingRooms,
    wcmanOtherFloorObj: mock.wcmanOtherFloorObj,
    wcmanOtherFloorObj2: mock.wcmanOtherFloorObj2,
    wcwomanOtherFloorObj: mock.wcwomanOtherFloorObj,
    wcwomanOtherFloorObj2: mock.wcwomanOtherFloorObj2,
    ceowcStatusObj: mock.ceowcStatusObj,
    ceowcStatusObj2: mock.ceowcStatusObj2,
    baojie: mock.baojie,
    mapData: mock.mapData,
    otherFloor: mock.otherFloor,
    otherFloor2: mock.otherFloor2,
    airsensorMap: mock.airsensorMap,

    // Dynamic (MQTT with mock fallback)
    inside,
    lights,
    lightobj,
    acobj,
    blind,
    blind2: mock.blind2,
    wcmanStatusObj,
    wcwomanStatusObj,
    wcmanStatusLive,
    wcwomanStatusLive,

    // Actions
    toggleLight,
    setAllLights,
    blindMove,
    acTogglePower: togglePower,
    acSetTemp: setTemp,
    acSetTempAbsolute,
    acSetSpeed: setSpeed,
    acSetSpeedStr,
    acSetMode: acSetModeStr,
  }
}
