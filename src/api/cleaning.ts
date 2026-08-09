import request from '@/utils/request'

export interface CleaningRecord {
  areaCode?: string
  cleanTime?: string
  cleaner?: string
}

export function setCleanTime(params: CleaningRecord): Promise<unknown> {
  return request({
    url: '/setCleanTime',
    method: 'post',
    data: params,
  })
}
