import request from '@/utils/request'

// 会议室门牌 pad 信息（原项目 buildingos_meetingpad/src/api/meeting.ts 的接口原样保留）
//
// ⚠️ 当前**未被调用**：这个端点是老的云端 Node-RED 端点（/pad/getPadInfoByCode），
//    边端部署里 VITE_APP_BASE_URL 指向的是边端 Node-RED(1880)，并未实现该端点；
//    且 pad 页面在 7828，请求 1880 属跨源，会被 CORS 直接拦掉。
//    背景图 / logo / 二维码已统一改走 edge 的 /api/pad/display（display_json 素材，同源），
//    见 src/templates/meetingPad/shared/usePadPublishedContent.ts。
//    若将来边端按 /api/pad/getPadInfoByCode 提供该接口（或 Node-RED 补齐 CORS），
//    可在此加 baseURL: getServerConfig().edgeBaseUrl 重新启用。
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
