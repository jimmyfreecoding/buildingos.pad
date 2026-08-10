import { computed, ref } from 'vue'
import { useAirSensorMqtt } from '@/composables/useAirSensorMqtt'
import { useLightMqtt } from '@/composables/useLightMqtt'
import { useWcSensorMqtt } from '@/composables/useWcSensorMqtt'
import { useBlindMqtt } from '@/composables/useBlindMqtt'
import { useAcMqtt } from '@/composables/useAcMqtt'
import { isConnected, subscribe, onMessage } from '@/utils/mqtt'
import * as mock from './mockData'

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
  }

  // --- Domain composables ---
  const { airQuality } = useAirSensorMqtt()
  const { lights: mqttLights, toggleLight: mqttToggleLight, setAll: mqttSetAll } = useLightMqtt()
  const { sensors: wcSensors } = useWcSensorMqtt()
  const { blind: mqttBlind, move: mqttBlindMove } = useBlindMqtt()
  const { ac: mqttAc, togglePower, setTemp, setMode, setSpeed } = useAcMqtt()

  // --- Outdoor weather (MQTT updates mock ref in place) ---
  subscribe('/wallpad/outside')
  onMessage('/wallpad/outside', (payload: any) => {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      mock.outside.value = payload
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
    if (isConnected.value && mqttAc.value) {
      return [{
        name: '空调',
        power: mqttAc.value.power,
        temp: mqttAc.value.temp,
        mode: mqttAc.value.mode,
        speed: mqttAc.value.speed,
        currentTemp: mqttAc.value.currentTemp ?? mqttAc.value.temp,
      }]
    }
    return mock.acobj.value
  })

  // --- Blinds ---
  const blind = computed(() => {
    if (isConnected.value && mqttBlind.value?.position !== undefined) {
      return [{ position: mqttBlind.value.position }]
    }
    return mock.blind.value
  })

  // --- WC Sensors ---
  const wcmanStatusObj = computed(() => {
    if (isConnected.value && wcSensors.value?.length) {
      const tman = wcSensors.value.find((s) => s.room === 'TMAN')
      if (tman) {
        const result: Record<string, number> = {}
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
        const result: Record<string, number> = {}
        for (let i = 0; i < twoman.total; i++) {
          result[String(i + 1)] = i < twoman.occupied ? 1 : 0
        }
        return result
      }
    }
    return mock.wcwomanStatusObj.value
  })

  // --- Light actions (MQTT when connected, local state toggle when not) ---
  const toggleLight = (light: any) => {
    if (isConnected.value) {
      const device = mqttLights.value?.devices?.find((d) => d.name === light.name)
      if (device) {
        mqttToggleLight(device.id)
        return
      }
    }
    // Fallback: local toggle
    const idx = mock.lights.value.findIndex((l: any) => l.name === light.name)
    if (idx !== -1) {
      mock.lights.value[idx].status = mock.lights.value[idx].status === 1 ? 0 : 1
    }
  }

  const setAllLights = (on: boolean) => {
    if (isConnected.value) {
      mqttSetAll(on)
      return
    }
    mock.lights.value.forEach((l: any) => { l.status = on ? 1 : 0 })
  }

  // --- Blind action ---
  const blindMove = (direction: 'up' | 'down' | 'stop') => {
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
    roomoSensorObj: mock.roomoSensorObj,
    meetingRooms: mock.meetingRooms,
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

    // Actions
    toggleLight,
    setAllLights,
    blindMove,
    acTogglePower: togglePower,
    acSetTemp: setTemp,
    acSetTempAbsolute,
    acSetSpeed: setSpeed,
    acSetSpeedStr,
    acSetMode: setMode,
  }
}
