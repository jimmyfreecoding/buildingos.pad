/**
 * 空调页 / 照明页共用的版式常量与自适应工具（640 设计稿）
 * —— 两屏的头部组（房间名 + 标题 / + 时间）采用同一套位移与自适应规则。
 */

/** 头部组整体上移量（客户微调：给可能变长的会议室名让位） */
export const HEADER_LIFT = 24

/** 房间名左沿 */
export const ROOM_LEFT = 74
/** 右上图标左沿（房间名 / 标题的可用宽度到这里为止） */
export const ICON_LEFT = 407
/** 文字与图标之间的安全间距 */
export const ROOM_GAP = 16
/** 房间名字号（实机）与缩放下限 */
export const ROOM_BASE_SIZE = 79
export const ROOM_MIN_SIZE = 48
/** 空调页标题（空调真实名称）字号与缩放下限 */
export const SUB_BASE_SIZE = 39
export const SUB_MIN_SIZE = 24

/** 房间名基线（各屏按实机照片标定，已扣除整体上移量） */
export const AC_ROOM_BASELINE = 204 - HEADER_LIFT
export const LIGHT_ROOM_BASELINE = 183 - HEADER_LIFT

/** 纯数字房间号（3601 这类才做横向收敛，中文名不收敛） */
export const isNumericRoom = (room: string) => /^[\d.\s]+$/.test(room || '')

/** 粗估文本宽度（em）：CJK/全角 1em，数字与拉丁字母 0.55em */
export function estimateEm(text: string): number {
  let em = 0
  for (const ch of (text || '').trim()) em += /[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.55
  return em
}

/** 超出可用宽度时等比缩字号（下限 minSize），保证不与右上图标重叠 */
export function fitTextSize(text: string, baseSize: number, availWidth: number, minSize = 0): number {
  const em = estimateEm(text)
  if (em <= 0) return baseSize
  const est = em * baseSize
  if (est <= availWidth) return baseSize
  return Math.max(minSize, Math.floor((baseSize * availWidth) / est))
}

/** 房间名字号 */
export const fitRoomSize = (room: string) =>
  fitTextSize(room, ROOM_BASE_SIZE, ICON_LEFT - ROOM_LEFT - ROOM_GAP, ROOM_MIN_SIZE)

/** 空调标题（真实空调名）字号：左沿 73 */
export const fitSubtitleSize = (name: string) =>
  fitTextSize(name, SUB_BASE_SIZE, ICON_LEFT - 73 - ROOM_GAP, SUB_MIN_SIZE)

/** 按基线定位：字号变化时基线不动（DIN / 方正兰亭 ascent 不同，用 0.885em 近似） */
export const roomTop = (baseline: number, size: number) => baseline - 0.885 * size

/**
 * 照明页多路灯的排布规则（客户要求：按设备名字数决定一行几个）
 *   名字 ≤2 字 → 一行 3 个；3 字 → 一行 2 个；≥4 字 → 一行 1 个；
 *   设备总数少于该列数时按实际数量占满（单灯 = 实机的整条胶囊）
 */
export function lightColumns(names: string[]): number {
  if (names.length <= 1) return 1
  const maxLen = Math.max(...names.map((n) => [...(n || '')].length))
  const byLen = maxLen <= 2 ? 3 : maxLen === 3 ? 2 : 1
  return Math.max(1, Math.min(byLen, names.length))
}
