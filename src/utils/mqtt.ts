import mqtt from 'mqtt'
import { ref, type Ref } from 'vue'
import { MqttRouter, type MqttMessageHandler } from './mqttRouter'
import { getMqttConfig, isMockMode } from '@/config/servers'
import { topics, type SpaceContext } from './mqttTopics'

const router = new MqttRouter()
let client: mqtt.MqttClient | null = null

const subscribedTopics = new Set<string>()
const connectListeners: Array<() => void> = []
const disconnectListeners: Array<() => void> = []

export const isConnected: Ref<boolean> = ref(false)

function resolveClientId(): string | undefined {
  try {
    const raw = localStorage.getItem('initData')
    if (!raw) return undefined
    const data = JSON.parse(raw)
    const ctx: Partial<SpaceContext> = {
      spaceCode: data.spaceId || data.code,
      floorAreaCode: data.floorAreaCode,
      floorCode: data.floorCode,
      deviceCode: data.roomCode || data.roomId,
    }
    if (!ctx.spaceCode || !ctx.floorAreaCode || !ctx.floorCode) return undefined
    return `mroom_${ctx.spaceCode}_${ctx.floorAreaCode}_${ctx.floorCode}_${ctx.deviceCode ?? 'unbound'}`
  } catch {
    return undefined
  }
}

function doConnect(): void {
  const cfg = getMqttConfig()
  if (!cfg.url) {
    console.warn('[MQTT] No broker URL configured — running in mock mode')
    return
  }

  const clientId = resolveClientId()

  client = mqtt.connect(cfg.url, {
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    username: cfg.username || undefined,
    password: cfg.password || undefined,
  })

  client.on('error', (err: Error) => {
    console.error('[MQTT] Connection error:', err.message)
  })

  client.on('connect', () => {
    console.log('[MQTT] Connected, clientId:', client!.options.clientId)
    isConnected.value = true

    if (subscribedTopics.size > 0) {
      const topicList = Array.from(subscribedTopics)
      console.log('[MQTT] Re-subscribe topics:', topicList)
      client!.subscribe(topicList, (err) => {
        if (err) console.error('[MQTT] Re-subscribe error:', err)
        else console.log('[MQTT] Re-subscribe OK:', topicList.join(', '))
      })
    } else {
      console.log('[MQTT] Connected but no topics registered yet')
    }

    connectListeners.forEach((fn) => fn())
  })

  client.on('close', () => {
    console.log('[MQTT] Disconnected')
    isConnected.value = false
    disconnectListeners.forEach((fn) => fn())
  })

  client.on('offline', () => {
    console.log('[MQTT] Offline')
    isConnected.value = false
  })

  client.on('message', (topic: string, payload: Buffer) => {
    const raw = payload.toString()
    const matched = router.dispatch(topic, payload)
    let parsed: unknown = raw
    try { parsed = JSON.parse(raw) } catch { /* 非 JSON 保留原文 */ }
    console.log(`[MQTT] Message${matched ? '' : ' (NO HANDLER)'} ${topic}:`, parsed)
  })
}

export function connectMqtt(): void {
  if (client) return
  if (isMockMode()) {
    console.log('[MQTT] connectMqtt skipped — mock mode (no broker URL)')
    return
  }
  console.log('[MQTT] connectMqtt — connecting to', getMqttConfig().url)
  doConnect()
}

export function disconnectMqtt(): void {
  if (client) {
    // Set client to null first so the close handler doesn't auto-reconnect
    const c = client
    client = null
    c.end(true)
    subscribedTopics.clear()
    router.clear()
    isConnected.value = false
  }
}

export function subscribe(topic: string): void {
  if (isMockMode()) {
    console.log('[MQTT] subscribe skipped (mock mode):', topic)
    return
  }
  if (subscribedTopics.has(topic)) {
    console.log('[MQTT] subscribe skipped (duplicate):', topic)
    return
  }
  subscribedTopics.add(topic)

  if (client && isConnected.value) {
    client.subscribe(topic, (err) => {
      if (err) console.error(`[MQTT] Subscribe error for ${topic}:`, err)
      else console.log('[MQTT] Subscribe OK:', topic)
    })
  } else {
    console.log('[MQTT] subscribe queued (not connected yet):', topic)
  }
}

export function unsubscribe(topic: string): void {
  if (!subscribedTopics.has(topic)) {
    console.log('[MQTT] unsubscribe skipped (not subscribed):', topic)
    return
  }
  subscribedTopics.delete(topic)
  console.log('[MQTT] unsubscribe:', topic)

  if (client && isConnected.value) {
    client.unsubscribe(topic, undefined, (err) => {
      if (err) console.error(`[MQTT] Unsubscribe error for ${topic}:`, err)
      else console.log('[MQTT] Unsubscribe OK:', topic)
    })
  }
}

export function publish(topic: string, message: string | object): void {
  if (isMockMode() || !client) {
    console.log('[MQTT Mock] publish:', topic, message)
    return
  }
  const payload = typeof message === 'string' ? message : JSON.stringify(message)
  console.log('[MQTT] Publish:', topic, payload)
  client.publish(topic, payload, { qos: 0 }, (err) => {
    if (err) console.error(`[MQTT] Publish error for ${topic}:`, err)
  })
}

export function onMessage(topic: string, handler: MqttMessageHandler): () => void {
  return router.on(topic, handler)
}

export function offMessage(topic: string, handler: MqttMessageHandler): void {
  router.off(topic, handler)
}

export function onConnect(fn: () => void): () => void {
  connectListeners.push(fn)
  return () => {
    const idx = connectListeners.indexOf(fn)
    if (idx !== -1) connectListeners.splice(idx, 1)
  }
}

export function onDisconnect(fn: () => void): () => void {
  disconnectListeners.push(fn)
  return () => {
    const idx = disconnectListeners.indexOf(fn)
    if (idx !== -1) disconnectListeners.splice(idx, 1)
  }
}

export { topics }
export type { SpaceContext }
