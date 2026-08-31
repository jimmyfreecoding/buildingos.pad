import request from '@/utils/request'

// 与老项目 logClk（doAddDeviceControlLog）对齐的字段结构
export interface DeviceControlLog {
  spaceCode?: string | number
  sourceType?: string
  sourceName?: string
  floorCode?: string
  floorAreaCode?: string
  areaCode?: string
  deviceType?: string
  actionTopic?: string
  actionData?: string
}

export function addDeviceControlLog(params: DeviceControlLog): Promise<void> {
  return request({
    url: '/api/device/doAddDeviceControlLog',
    method: 'get',
    params,
    skipErrorMessage: true,
  })
}
