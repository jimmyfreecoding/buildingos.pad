import { addDeviceControlLog, type DeviceControlLog } from '@/api/device'

export interface LogClkParams {
  sourceName: string
  deviceType: string
  actionTopic: string
  actionData: string
  spaceCode: string | number
  floorCode: string
  floorAreaCode: string
  areaCode: string
}

// 控制指令操作日志打点（对齐老项目 logClk → GET /api/device/doAddDeviceControlLog）
// 静默失败：日志链路故障不影响控制流程
export function logClk(params: LogClkParams): void {
  const payload: DeviceControlLog = { ...params, sourceType: 'PAD' }
  addDeviceControlLog(payload).catch(() => {
    console.warn('[logClk] failed to post control log:', payload.actionTopic)
  })
}
