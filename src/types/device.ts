// --- Lighting ---
export interface LightDevice {
  id: string
  name: string
  status: Record<string, any>
  type?: string
}

export interface LightState {
  devices: LightDevice[]
  allOn: boolean
}

export const DEFAULT_LIGHT: LightState = {
  devices: [],
  allOn: false,
}

// --- Air Conditioner ---
export type AcMode = 'cool' | 'heat' | 'auto' | 'vent'
export type FanSpeed = 'low' | 'mid' | 'high'

export interface AcDevice {
  id: string
  name: string
  status: Record<string, any>
}

export interface AcState {
  devices: AcDevice[]
  power: boolean
  temp: number
  mode: AcMode
  speed: FanSpeed
  currentTemp?: number
}

export const DEFAULT_AC: AcState = {
  devices: [],
  power: false,
  temp: 24,
  mode: 'cool',
  speed: 'mid',
}

// --- Air Quality Sensor ---
export interface AirSensorData {
  temp: number
  humidity: number
  co2: number
  pm25: number
  tvoc?: number
  formaldehyde?: number
}

export const DEFAULT_AIR_SENSOR: AirSensorData = {
  temp: 23.5,
  humidity: 45,
  co2: 450,
  pm25: 12,
}

// --- WC Occupancy Sensor ---
export interface WcSensorData {
  room: string
  occupied: number
  total: number
}

// --- Human Presence Sensor (meeting rooms) ---
export interface HumanSensorData {
  room: string
  online: number[]
  status: string[]
}

// --- Blinds / Curtains ---
export interface BlindDevice {
  id: string
  name: string
  status: Record<string, any>
}

export interface BlindState {
  devices: BlindDevice[]
  position: number // 0-100
}

export const DEFAULT_BLIND: BlindState = {
  devices: [],
  position: 50,
}

// --- Fresh Air ---
export type FreshAirMode = 'auto' | 'low' | 'medium' | 'high'

export interface FreshAirState {
  power: boolean
  mode: FreshAirMode
}

export const DEFAULT_FRESH_AIR: FreshAirState = {
  power: false,
  mode: 'auto',
}

// --- Socket ---
export interface SocketState {
  id: string
  name: string
  active: boolean
}

// --- Door ---
export interface DoorState {
  id: string
  name: string
  locked: boolean
}

// --- Screen ---
export interface ScreenState {
  id: string
  name: string
  power: boolean
  source?: string
}

// --- Camera ---
export interface CameraState {
  id: string
  name: string
  preset?: number
}

// --- Audio ---
export interface AudioChannel {
  name: string
  volume: number
}

export interface AudioState {
  channels: AudioChannel[]
}

// --- Matrix ---
export interface MatrixState {
  activeInput: string
  activeOutput: string
  inputs: string[]
  outputs: string[]
}

// --- Union type for all device payloads ---
export type DevicePayload =
  | { type: 'light'; data: Partial<LightState> }
  | { type: 'ac'; data: Partial<AcState> }
  | { type: 'airsensor'; data: Partial<AirSensorData> }
  | { type: 'wcsensor'; data: WcSensorData }
  | { type: 'humansensor'; data: HumanSensorData }
  | { type: 'blind'; data: Partial<BlindState> }
  | { type: 'freshair'; data: Partial<FreshAirState> }
  | { type: 'socket'; data: Partial<SocketState> }
  | { type: 'door'; data: Partial<DoorState> }
  | { type: 'screen'; data: Partial<ScreenState> }
  | { type: 'camera'; data: Partial<CameraState> }
  | { type: 'audio'; data: Partial<AudioState> }
  | { type: 'matrix'; data: Partial<MatrixState> }
