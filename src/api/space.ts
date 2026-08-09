import request from '@/utils/request'
import type { Space } from '@/types/space'

export function getSpaceData(data: Record<string, unknown> = {}): Promise<Space[]> {
  return request({
    url: '/iot/setting/get/structure',
    method: 'post',
    data,
  })
}
