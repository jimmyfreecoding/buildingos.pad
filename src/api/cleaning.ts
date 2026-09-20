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

export interface CleanCheckInResponse {
  success?: boolean | number | string
  timestamp?: number
  [key: string]: unknown
}

// 会议室门牌「卫生打卡」——原项目 buildingos_meetingpad/src/components/clearTime.vue 的请求原样保留：
//   GET /setCleanTime?spaceCode={space}_{floorarea}_{floor}_{code}&time={YYYY-MM-DD HH:mm}
// 走 Node-RED（VITE_APP_BASE_URL），响应 { success, timestamp }
export function cleanCheckIn(spaceCode: string, time: string): Promise<CleanCheckInResponse> {
  return request({
    url: '/setCleanTime',
    method: 'get',
    params: { spaceCode, time },
    skipErrorMessage: true,
  })
}
