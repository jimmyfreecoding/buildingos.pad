import request from '@/utils/request'
import { getServerConfig } from '@/config/servers'

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
  // 走边缘端端点（见 devDocs/doAddDeviceControlLog-端点开发指南.md）：
  // 边缘端经其自有通道转发云端落库；
  // 未配置 VITE_EDGE_BASE_URL 时回退边端 Node-RED（VITE_APP_BASE_URL）
  const edgeBaseUrl = getServerConfig().edgeBaseUrl
  return request({
    url: '/api/device/doAddDeviceControlLog',
    method: 'get',
    params,
    skipErrorMessage: true,
    ...(edgeBaseUrl ? { baseURL: edgeBaseUrl } : {}),
  })
}
