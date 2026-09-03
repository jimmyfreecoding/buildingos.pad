import request from '@/utils/request'
import { getServerConfig } from '@/config/servers'

// 拉取本 pad 的动态界面配置 display_json（边缘端 /api/pad/display，返回 iot_device.display_json 物化结果）。
// display_json 结构：{ [materialType]: { type, title, subtitle, imageUrl/url, materialId, configSource, isInherited }, ... }
// 地图区只认 map / mapImage 两个类型：分配了才显示，未分配走默认图。
export function getPadDisplay(spaceCode: string, deviceCode: string): Promise<any> {
  const edgeBaseUrl = getServerConfig().edgeBaseUrl
  return request({
    url: '/api/pad/display',
    method: 'get',
    params: { spaceCode, deviceCode },
    skipErrorMessage: true,
    ...(edgeBaseUrl ? { baseURL: edgeBaseUrl } : {}),
  })
}
