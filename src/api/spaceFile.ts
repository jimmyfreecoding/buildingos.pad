import request from '@/utils/request'
import { getServerConfig } from '@/config/servers'
import type { SpaceContext } from '@/utils/mqttTopics'

// 边缘网关同步的该 pad 绑定空间文件（见 devDocs/edge空间地图文件端点-开发指南.md）
export interface SpaceFile {
  id: string | number
  name: string
  type: 'map' | 'mapimage'
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
