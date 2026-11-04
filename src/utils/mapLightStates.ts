import type { LightDevice } from '@/types/device'

/** 灯是否开着（和 useLightMqtt 的 isDeviceOn 同一个判断） */
const isOn = (d: LightDevice) => d.status?.status === 'on' || d.status?.status === 1

/**
 * 灯列表 → 地图要的状态 { key: 开 / 关 }。
 * key = 设备编号（LightDevice.id，就是设备 code）和设备名，对应 .h2z 点位上绑定的设备 device.code / device.name。
 * 设备名可能重名：先写名字、再写编号，编号唯一，会盖掉同名的——地图上绑了设备的点位优先按设备编号对。
 */
export function lightStatesOf(list: LightDevice[]): Record<string, boolean> {
  const states: Record<string, boolean> = {}
  for (const d of list) if (d.name) states[String(d.name)] = isOn(d)
  for (const d of list) if (d.id) states[String(d.id)] = isOn(d)
  return states
}
