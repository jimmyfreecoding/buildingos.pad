/** 云起 4 寸屏模板内部类型 */

/** 照明页的一路开关（筒灯/灯带…） */
export interface LightRow {
  id: string
  name: string
  on: boolean
  pending: boolean
  /** 无设备时的占位行，不可点 */
  disabled?: boolean
}
