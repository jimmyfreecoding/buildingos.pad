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

// pad 名称来自设备配置（pad[0].name，见 usePadHeartbeat），早于配置到达的打点该段留空
let cachedPadName = ''
export function setPadName(name: string): void {
  cachedPadName = name
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
// 名称缺失时回退对应 code，保证各段非空
function buildSourceName(deviceType: string, ctrl: LogCtrl): string {
  const d = readInitData()
  const segs = [
    d.spaceName || d.code || '',
    d.floorAreaName || d.floorAreaCode || '',
    d.floorName || d.floorCode || '',
    d.roomName || d.roomCode || '',
    cachedPadName || '',
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
