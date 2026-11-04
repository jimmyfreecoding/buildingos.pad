import { computed, watch } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { useSpaceStore } from '@/stores/space'
import { setMapStates } from '@/services/mapViewer'
import { lightStatesOf } from '@/utils/mapLightStates'
import type { LightDevice } from '@/types/device'

/**
 * 把灯的开关状态喂给 .h2z 地图（地图上只画有状态的灯点，见 services/h2zMap.ts）。
 *
 * 读设备 store 里 useLightMqtt 收到的灯（配置 + 实时状态），key 规则见 utils/mapLightStates.ts，
 * 对应 .h2z 点位上绑定的设备（BuildingOS「设备点位」页绑定、保存到楼层地图时写进去的）。
 * 只读 store、不订阅 MQTT：灯的数据由用到 useLightMqtt 的模板（zeekr 的 useZeekrData 等）去拿。
 * 地图还没起来也没关系：mapViewer 会记住状态，地图好了再补上。
 */
export function useMapLightStates() {
  const spaceStore = useSpaceStore()
  const deviceStore = useDeviceStore()
  const lights = computed<LightDevice[]>(() => {
    const ctx = spaceStore.spaceContext
    return ctx ? deviceStore.getLights(deviceStore.makeKey(ctx, 'light')).value.devices : []
  })

  watch(lights, (list) => setMapStates({ lights: lightStatesOf(list) }), { deep: true, immediate: true })
}
