export interface SpaceContext {
  spaceCode: string
  floorAreaCode: string
  floorCode: string
  deviceCode: string
}

const IOT_STATUS = '/iot/status'
const IOT_ACTION = '/iot/action'

export const topics = {
  // --- Lighting ---
  lightStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/light/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  lightAction: (c: SpaceContext) =>
    `${IOT_ACTION}/light/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Air Conditioner ---
  acStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/airconditioning/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  acAction: (c: SpaceContext) =>
    `${IOT_ACTION}/airconditioning/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Air Quality Sensor ---
  airSensor: (c: SpaceContext) =>
    `${IOT_STATUS}/airsensor/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  // Legacy backend publishes to exact topic (no sub-path), no wildcard
  areaAirSensor: (c: SpaceContext) =>
    `${IOT_STATUS}/areaairsensor/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,
  // Outdoor weather
  outdoorWeather: () => '/wallpad/outside',

  // --- WC Occupancy Sensor ---
  wcSensor: (c: SpaceContext, room: string) =>
    `${IOT_STATUS}/wcsensor/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${room}/#`,

  // --- WC Info (厕位配置，原项目 /iot/status/wcinfo/.../{room}) ---
  wcInfo: (c: SpaceContext, room: string) =>
    `${IOT_STATUS}/wcinfo/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${room}`,
  wcInfoAll: (c: SpaceContext) =>
    `${IOT_STATUS}/wcinfo/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/#`,

  // --- WC Air Sensor (per toilet room, original protocol) ---
  toiletAirSensor: (c: SpaceContext, room: string) =>
    `${IOT_STATUS}/airsensor/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${room}/#`,

  // --- Cleaning Status (保洁打卡记录) ---
  cleaningStatus: (c: SpaceContext, room: string) =>
    `${IOT_STATUS}/cleaning/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${room}/#`,

  // --- Human Presence Sensor (meeting rooms, per floor) ---
  humanSensorStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/humensensor/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/#`,

  // --- Blinds / Curtains ---
  blindStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/blind/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  blindAction: (c: SpaceContext) =>
    `${IOT_ACTION}/blind/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Fresh Air ---
  freshAirStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/freshair/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  freshAirAction: (c: SpaceContext) =>
    `${IOT_ACTION}/freshair/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Socket / Power ---
  socketStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/socket/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  socketAction: (c: SpaceContext) =>
    `${IOT_ACTION}/socket/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Door ---
  doorStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/door/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  doorAction: (c: SpaceContext) =>
    `${IOT_ACTION}/door/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Screen / Display ---
  screenStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/screen/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  screenAction: (c: SpaceContext) =>
    `${IOT_ACTION}/screen/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Camera ---
  cameraStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/camera/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  cameraAction: (c: SpaceContext) =>
    `${IOT_ACTION}/camera/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Audio ---
  audioStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/audio/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  audioAction: (c: SpaceContext) =>
    `${IOT_ACTION}/audio/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Matrix / Signal Switch ---
  matrixStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/matrix/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  matrixAction: (c: SpaceContext) =>
    `${IOT_ACTION}/matrix/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Cleaning ---
  cleaningAction: (c: SpaceContext) =>
    `${IOT_ACTION}/cleaning/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Pad (device discovery / management) ---
  padAction: (c: SpaceContext) =>
    `${IOT_ACTION}/pad/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,

  // --- Device config (original protocol) ---
  deviceConfigGet: () => '/iot/setting/get/device',
  deviceConfigResponse: (c: SpaceContext) =>
    `/iot/setting/device/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,
  deviceConfigAll: (c: SpaceContext) =>
    `/iot/setting/device/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/#`,
} as const
