import { computed, onScopeDispose } from 'vue'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'
import { isCompleteSpaceContext, type SpaceContext } from '@/utils/mqttTopics'
import { getPadName } from '@/utils/logClk'

// 云端下发 pad 指令（原项目 /iot/action/pad/{space}/#，见老项目 AppOld.vue 的寻址逻辑）。
// 所有 pad 类型统一在此订阅并响应：
//   - action === "refresh"  → 整页刷新（重新拉取设备配置 / 心跳 / 订阅）
//   - play / stop / fullscreen → 老项目保留的媒体动作（此处仅打日志，避免误触发）
export function usePadCommand() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const unsubs: Array<() => void> = []

  // 按主题段判断指令是否寻址到本 pad
  // /iot/action/pad/{space}/{floorArea}/{floor}/{device}[/{padName}]
  const isTarget = (topic: string, c: SpaceContext): boolean => {
    const parts = topic.split('/')
    if (parts[3] !== 'pad') return false
    if (parts[4] !== c.spaceCode) return false
    if (parts[5] !== c.floorAreaCode) return false
    if (parts[6] !== c.floorCode) return false

    const rest = parts.slice(7)
    // 楼层级：/iot/action/pad/{space}/{area}/{floor}（无 code 段）或带尾斜杠（空 code 段）
    if (rest.length === 0) return true
    if (rest.length === 1) {
      if (rest[0] === '') return true // 尾斜杠楼层级
      return rest[0] === c.deviceCode // 区域/房间级
    }
    // 指定 pad：/iot/action/pad/{space}/{area}/{floor}/{device}/{padName}
    if (rest.length === 2) {
      if (rest[0] !== c.deviceCode) return false
      // pad 名来自设备配置；配置未到达时不做 padName 精确匹配（回退到房间级，刷新同房间所有 pad 亦可接受）
      const padName = getPadName()
      if (padName && rest[1] !== padName) return false
      return true
    }
    return false
  }

  const setup = () => {
    if (!ctx.value || !isCompleteSpaceContext(ctx.value)) return
    const c = ctx.value
    const topic = topics.padActionWildcard(c)
    mqtt.subscribe(topic)
    unsubs.push(() => mqtt.unsubscribe(topic))
    unsubs.push(mqtt.onMessage(topic, (payload, rawTopic) => {
      if (!ctx.value) return
      if (!isTarget(rawTopic, ctx.value)) return
      const msg = (payload ?? {}) as Record<string, any>
      const action = msg.action
      console.log(`[PadCommand] ${rawTopic} -> action=${action}`)
      if (action === 'refresh') {
        // 整页刷新：重新拉取设备配置、重发心跳、重建订阅（覆盖重配置后的状态）
        location.reload()
      } else if (action === 'play' || action === 'stop' || action === 'fullscreen') {
        // 老项目保留动作；如需触发媒体下发可在各自模板实现
        console.log(`[PadCommand] media action received (${action}), not handled by this pad`)
      }
    }))
  }

  setup()

  onScopeDispose(() => {
    for (const unsub of unsubs) unsub()
    unsubs.length = 0
  })
}
