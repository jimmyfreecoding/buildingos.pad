import request from '@/utils/request'

// 会议室门牌 pad 信息（原项目 buildingos_meetingpad/src/api/meeting.ts 的处理方式保留）：
// 返回 pad 的 name / code / layer / gateway / password / logo / imgs，
// 其中 logo 与 imgs 由前端拼 `${baseURL}/fileManager/download/${file}` 使用。
// 后端暂未提供新端点，因此继续沿用该接口与请求体。
export interface PadInfoResponse {
  id: number | string
  name?: string
  code?: string
  layer?: string
  password?: string
  logo?: string
  imgs?: string | string[]
  [key: string]: unknown
}

export function getPadInfoByCode(data: { code: string; layer: string }): Promise<PadInfoResponse> {
  return request({
    url: '/pad/getPadInfoByCode',
    method: 'post',
    data,
  })
}
