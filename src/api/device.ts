import request from '@/utils/request'

export interface DeviceControlLog {
  spaceId?: string | number
  floorAreaId?: string | number
  floorId?: string | number
  deviceId?: string | number
  deviceType?: string
  action?: string
  value?: unknown
}

export function addDeviceControlLog(params: DeviceControlLog): Promise<void> {
  return request({
    url: '/api/device/doAddDeviceControlLog',
    method: 'post',
    data: params,
  })
}
