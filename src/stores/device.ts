import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type {
  LightDevice,
  LightState,
  AcState,
  AirSensorData,
  WcSensorData,
  HumanSensorData,
  BlindState,
  FreshAirState,
  SocketState,
  DoorState,
  ScreenState,
  CameraState,
  AudioState,
  MatrixState,
} from '@/types/device'
import {
  DEFAULT_LIGHT,
  DEFAULT_AC,
  DEFAULT_AIR_SENSOR,
  DEFAULT_BLIND,
  DEFAULT_FRESH_AIR,
} from '@/types/device'

export type DeviceDomain =
  | 'light'
  | 'ac'
  | 'airsensor'
  | 'wcsensor'
  | 'humansensor'
  | 'blind'
  | 'freshair'
  | 'socket'
  | 'door'
  | 'screen'
  | 'camera'
  | 'audio'
  | 'matrix'

function makeKey(ctx: { spaceCode: string; floorAreaCode: string; floorCode: string; deviceCode: string }, domain: DeviceDomain, sub?: string): string {
  const base = `${ctx.spaceCode}/${ctx.floorAreaCode}/${ctx.floorCode}/${ctx.deviceCode}/${domain}`
  return sub ? `${base}/${sub}` : base
}

export const useDeviceStore = defineStore('device', () => {
  // --- Ref counters ---
  const refCounts = reactive<Record<string, number>>({})

  function acquire(key: string): void {
    if (!(key in refCounts)) {
      refCounts[key] = 0
    }
    refCounts[key]++
  }

  function release(key: string): void {
    if (key in refCounts) {
      refCounts[key]--
      if (refCounts[key] <= 0) {
        delete refCounts[key]
        // Remove cached state
        lightMap.delete(key)
        acMap.delete(key)
        airSensorMap.delete(key)
        wcSensorMap.delete(key)
        humanSensorMap.delete(key)
        blindMap.delete(key)
        freshAirMap.delete(key)
      }
    }
  }

  function isAcquired(key: string): boolean {
    return (refCounts[key] ?? 0) > 0
  }

  // --- Domain State Caches ---
  const lightMap = reactive<Map<string, LightState>>(new Map())
  const acMap = reactive<Map<string, AcState>>(new Map())
  const airSensorMap = reactive<Map<string, AirSensorData>>(new Map())
  const wcSensorMap = reactive<Map<string, WcSensorData[]>>(new Map())
  const humanSensorMap = reactive<Map<string, HumanSensorData[]>>(new Map())
  const blindMap = reactive<Map<string, BlindState>>(new Map())
  const freshAirMap = reactive<Map<string, FreshAirState>>(new Map())
  const socketMap = reactive<Map<string, SocketState[]>>(new Map())
  const doorMap = reactive<Map<string, DoorState[]>>(new Map())

  // --- Getters (return reactive state, with mock fallback) ---
  function getLights(key: string) {
    if (!lightMap.has(key)) {
      lightMap.set(key, { ...DEFAULT_LIGHT, devices: [] })
    }
    return computed(() => lightMap.get(key)!)
  }

  function getAc(key: string) {
    if (!acMap.has(key)) {
      acMap.set(key, { ...DEFAULT_AC })
    }
    return computed(() => {
      const s = acMap.get(key)!
      if (!s.devices) s.devices = []
      return s
    })
  }

  function getAirSensor(key: string) {
    if (!airSensorMap.has(key)) {
      airSensorMap.set(key, { ...DEFAULT_AIR_SENSOR })
    }
    return computed(() => airSensorMap.get(key)!)
  }

  function getWcSensors(key: string) {
    if (!wcSensorMap.has(key)) {
      wcSensorMap.set(key, [])
    }
    return computed(() => wcSensorMap.get(key)!)
  }

  function getHumanSensors(key: string) {
    if (!humanSensorMap.has(key)) {
      humanSensorMap.set(key, [])
    }
    return computed(() => humanSensorMap.get(key)!)
  }

  function getBlind(key: string) {
    if (!blindMap.has(key)) {
      blindMap.set(key, { ...DEFAULT_BLIND })
    }
    return computed(() => {
      const s = blindMap.get(key)!
      if (!s.devices) s.devices = []
      return s
    })
  }

  function getFreshAir(key: string) {
    if (!freshAirMap.has(key)) {
      freshAirMap.set(key, { ...DEFAULT_FRESH_AIR })
    }
    return computed(() => freshAirMap.get(key)!)
  }

  function getSockets(key: string) {
    if (!socketMap.has(key)) {
      socketMap.set(key, [])
    }
    return computed(() => socketMap.get(key)!)
  }

  function getDoors(key: string) {
    if (!doorMap.has(key)) {
      doorMap.set(key, [])
    }
    return computed(() => doorMap.get(key)!)
  }

  // --- Write path (called from MQTT handlers) ---
  function applyLightState(key: string, data: Partial<LightState>): void {
    const current = lightMap.get(key) || { ...DEFAULT_LIGHT, devices: [] }
    lightMap.set(key, { ...current, ...data })
  }

  function applyAcState(key: string, data: Partial<AcState>): void {
    const current = acMap.get(key) || { ...DEFAULT_AC }
    acMap.set(key, { ...current, ...data })
  }

  function applyAirSensor(key: string, data: Partial<AirSensorData>): void {
    const current = airSensorMap.get(key) || { ...DEFAULT_AIR_SENSOR }
    airSensorMap.set(key, { ...current, ...data })
  }

  function applyWcSensor(key: string, data: WcSensorData[]): void {
    wcSensorMap.set(key, data)
  }

  function applyHumanSensors(key: string, data: HumanSensorData[]): void {
    humanSensorMap.set(key, data)
  }

  function applyBlindState(key: string, data: Partial<BlindState>): void {
    const current = blindMap.get(key) || { ...DEFAULT_BLIND }
    blindMap.set(key, { ...current, ...data })
  }

  function applyFreshAirState(key: string, data: Partial<FreshAirState>): void {
    const current = freshAirMap.get(key) || { ...DEFAULT_FRESH_AIR }
    freshAirMap.set(key, { ...current, ...data })
  }

  function applySockets(key: string, data: SocketState[]): void {
    socketMap.set(key, data)
  }

  function applyDoors(key: string, data: DoorState[]): void {
    doorMap.set(key, data)
  }

  return {
    refCounts,
    makeKey,
    acquire,
    release,
    isAcquired,
    getLights,
    getAc,
    getAirSensor,
    getWcSensors,
    getHumanSensors,
    getBlind,
    getFreshAir,
    getSockets,
    getDoors,
    applyLightState,
    applyAcState,
    applyAirSensor,
    applyWcSensor,
    applyHumanSensors,
    applyBlindState,
    applyFreshAirState,
    applySockets,
    applyDoors,
  }
})
