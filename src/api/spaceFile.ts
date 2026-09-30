import request from '@/utils/request'
import { getServerConfig } from '@/config/servers'
import type { SpaceContext } from '@/utils/mqttTopics'

// 边缘网关同步的该 pad 绑定空间素材（见 devDocs/edge空间地图文件端点-开发指南.md）
// 注意：边端在 floorCode 非空时会按「文件名必须正好是楼层码」过滤，会把 `{时间戳}_{原名}` 里
// 带额外后缀的合法素材筛掉；mapViewer 因此传 floorCode='' 取全空间清单，
// 再用 display_json.materialId 精确关联（files[].id = `f_{file_asset.id}`），兜底才按楼层码 token 匹配。
export interface SpaceFile {
  id: string | number
  name: string
  /**
   * 边端 file_asset.asset_type 原样回传（2026-09 起不再只返回地图类）：
   * map / mapImage / bookingqrcode / logo / buildingImg / homeImage / homeVideo …
   * 地图区只用 'map' 与 'mapimage'；门牌按 materialId 定位，不依赖 type。
   */
  type: string
  url: string
  size?: number
  md5?: string
}

export interface SpaceFilesResponse {
  code: number
  message?: string
  data?: {
    files?: SpaceFile[]
  }
}

export function getSpaceFiles(ctx: SpaceContext): Promise<SpaceFilesResponse> {
  // 走边缘端端点；未配置 VITE_EDGE_BASE_URL 时回退 apiBaseUrl（边端 Node-RED）
  const edgeBaseUrl = getServerConfig().edgeBaseUrl
  return request({
    url: '/api/space/getSpaceFiles',
    method: 'get',
    params: {
      spaceCode: ctx.spaceCode,
      floorAreaCode: ctx.floorAreaCode,
      floorCode: ctx.floorCode,
      deviceCode: ctx.deviceCode,
    },
    skipErrorMessage: true,
    ...(edgeBaseUrl ? { baseURL: edgeBaseUrl } : {}),
  })
}
