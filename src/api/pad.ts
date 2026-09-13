import request from '@/utils/request'
import { getServerConfig } from '@/config/servers'

// 拉取本 pad 的动态界面配置 display_json（边缘端 /api/pad/display，返回 iot_device.display_json 物化结果）。
// display_json 结构：{ [materialType]: { type, title, subtitle, imageUrl/url, materialId, configSource, isInherited }, ... }
// 地图区用 map / mapImage 两项决定显示优先级，并用 materialId 在边端素材清单里精确定位素材
// （同一园区可能有多栋楼都叫 3F，靠文件名无法区分）。
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
