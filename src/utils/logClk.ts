import { addDeviceControlLog, type DeviceControlLog } from '@/api/device'

export type LogCtrl = '群控' | '单控'

export interface LogClkParams {
  ctrl: LogCtrl
  deviceType: string
  actionTopic: string
  actionData: string
  spaceCode: string | number
  floorCode: string
  floorAreaCode: string
  areaCode: string
}

// pad 名称/编码来自设备配置（pad[0].name/code，见 usePadHeartbeat），早于配置到达的为空
let cachedPadName = ''
let cachedPadCode = ''
export function setPadName(name: string): void {
  cachedPadName = name
}
// 供 pad 指令寻址（usePadCommand 判断是否为指定本 pad）读取当前 pad 名
export function getPadName(): string {
  return cachedPadName
}
// 本 pad 设备编码（pad[0].code，如 WALLPAD-...），用于拉取本 pad 的 display_json（/api/pad/display）
export function setPadCode(code: string): void {
  cachedPadCode = code
}
export function getPadCode(): string {
  return cachedPadCode
}

function readInitData(): Record<string, any> {
  try {
    const raw = localStorage.getItem('initData')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// sourceName 拼接规则：/spaceName/floorAreaName/floorName/areaName/padName/deviceType/群控|单控
// 名称缺失时回退对应 code；padName 尚未从设备配置到达时回退 roomName/roomCode，
// 避免 sourceName 出现空段被云端校验拒绝（否则 switchPad 等 pad 的控制日志会整体丢失）
function buildSourceName(deviceType: string, ctrl: LogCtrl): string {
  const d = readInitData()
  const segs = [
    d.spaceName || d.code || '',
    d.floorAreaName || d.floorAreaCode || '',
    d.floorName || d.floorCode || '',
    d.roomName || d.roomCode || '',
    cachedPadName || d.roomName || d.roomCode || '',
    deviceType,
    ctrl,
  ]
  return '/' + segs.join('/')
}

// 控制指令操作日志打点（对齐老项目 logClk → GET /api/device/doAddDeviceControlLog）
// 静默失败：日志链路故障不影响控制流程
export function logClk(params: LogClkParams): void {
  const { ctrl, ...rest } = params
  const payload: DeviceControlLog = {
    ...rest,
    sourceType: 'PAD',
    sourceName: buildSourceName(rest.deviceType, ctrl),
  }
  addDeviceControlLog(payload).catch(() => {
    console.warn('[logClk] failed to post control log:', payload.actionTopic)
  })
}
