import request from '@/utils/request'

export function getSpaceData(data: any) {
  return request({
    url: '/pad/getSpaceData',
    method: 'post',
    data
  })
}