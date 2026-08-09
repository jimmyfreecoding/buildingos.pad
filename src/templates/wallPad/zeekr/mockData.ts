import { reactive, ref } from 'vue'

// ====== 空间信息 ======
export const obj = ref({
  floor: '42F',
  name: 'A区',
  type: 'office', // 'office' | 'wc' | 'wcw' | 'wc1' | 'wc2'
  code: 'GXBGQ2',
  floorarea: 'A3',
  floorAreaCode: 'GXBGQ2',
  areaCode: 'ZSDS',
  spaceCode: 'ZP',
})

// ====== 午休模式 ======
export const isWuxiui = ref(false)

// ====== 告警状态 ======
export const sosAnimate = ref(false)
export const sosAnimateDia = ref(false)
export const disabledSos = ref(false)

// ====== 室内环境数据 ======
export const inside = ref({
  co2: 552,
  formaldehyde: 0.015,
  humidity: 42.3,
  light: 35,
  online: 1,
  pm10: 37,
  pm25: 29,
  status: 'on',
  temperature: 24.1,
  tvoc: 408,
  // 额外字段 (h2s, nh3 用于兼容)
  h2s: 0.005,
  nh3: 2.1,
})

// ====== 室外环境数据 ======
export const outside = ref({
  humidity: '45%',
  temperature: 20,
  temperatureNum: 20,
  today: '晴 20~32℃',
  AIQ: 42,
  pm25: 32,
})

// ====== 背景参数 ======
export const bgParams = reactive({
  type: 'image' as 'image' | 'video',
  urls: [{ url: '' }],
})

// ====== 照明设备 ======
export const lights = ref([
  {
    id: '1',
    name: 'A区照明1',
    floorAreaCode: 'GXBGQ2',
    floorCode: '1F',
    areaCode: 'ZSDS',
    status: 1, // 0:关, 1:开
    online: 1,
    type: 'light',
  },
  {
    id: '2',
    name: 'A区照明2',
    floorAreaCode: 'GXBGQ2',
    floorCode: '1F',
    areaCode: 'ZSDS',
    status: 0,
    online: 1,
    type: 'light',
  },
])

export const lightobj = ref([
  { name: '照明 1', status: 1 },
  { name: '照明 2', status: 0 },
])

// ====== 空调 ======
export const acobj = ref([])

// ====== 窗帘 ======
export const blind = ref([])
export const blind2 = ref([])
export const air2 = ref([])

// ====== 会议室/空间使用 ======
export const meetingRooms = ref([
  { code: 'M4201' },
  { code: 'M4202' },
  { code: 'M4203' },
  { code: 'M4205' },
  { code: 'M4206' },
  { code: 'M4207' },
])

export const roomoSensorObj = ref({
  'M4201': { online: [1], status: 'busy' },
  'M4202': { online: [1], status: '' },
  'M4203': { online: [1], status: 'busy' },
  'M4205': { online: [1], status: '' },
  'M4206': { online: [1], status: '' },
  'M4207': { online: [1], status: 'busy' },
})

// ====== 卫生间占位 ======
export const wcmanStatusObj = ref({
  '1': 0,
  '2': 1,
  '3': 0,
  vip: 0,
})
export const wcwomanStatusObj = ref({
  '1': 0,
  '2': 0,
  '3': 1,
})
export const wcmanOtherFloorObj = ref({
  '1': 0,
  '2': 1,
  '3': 0,
  vip: 0,
})
export const wcwomanOtherFloorObj = ref({
  '1': 1,
  '2': 0,
  '3': 0,
})
export const wcmanOtherFloorObj2 = ref({
  '1': 0,
  '2': 0,
  '3': 1,
})
export const wcwomanOtherFloorObj2 = ref({
  '1': 0,
  '2': 1,
  '3': 0,
})
export const ceowcStatusObj = ref({})
export const ceowcStatusObj2 = ref({})

// ====== 保洁 ======
export const baojie = ref({
  endTime: '2025-01-15 14:30',
})

// ====== 地图数据 ======
export const mapData = ref(null)

// ====== 其他 ======
export const otherFloor = ref('41')
export const otherFloor2 = ref('43')
export const airsensorMap = ref(['GXBGQ2'])

// ====== 切换屏幕模式 ======
export function setScreenMode(mode: string) {
  if (mode === 'wc') {
    obj.value.type = 'wc'
    isWuxiui.value = false
  } else if (mode === 'wcw') {
    obj.value.type = 'wcw'
    isWuxiui.value = false
  } else if (mode === 'wc1') {
    obj.value.type = 'wc1'
    isWuxiui.value = false
  } else if (mode === 'wc2') {
    obj.value.type = 'wc2'
    isWuxiui.value = false
  } else if (mode === 'wuxiui') {
    obj.value.type = 'office'
    isWuxiui.value = true
  } else {
    obj.value.type = 'office'
    isWuxiui.value = false
  }
}
