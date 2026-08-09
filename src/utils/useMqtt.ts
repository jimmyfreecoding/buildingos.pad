import { onScopeDispose } from 'vue'
import {
  isConnected,
  subscribe as mqSubscribe,
  unsubscribe as mqUnsubscribe,
  publish as mqPublish,
  onMessage as mqOnMessage,
  offMessage as mqOffMessage,
  connectMqtt,
} from './mqtt'
import type { MqttMessageHandler } from './mqttRouter'

export function useMqtt() {
  const handlerPairs: Array<{ topic: string; handler: MqttMessageHandler }> = []
  const subscribedTopics = new Set<string>()

  connectMqtt()

  const subscribe = (topic: string): void => {
    subscribedTopics.add(topic)
    mqSubscribe(topic)
  }

  const unsubscribe = (topic: string): void => {
    subscribedTopics.delete(topic)
    mqUnsubscribe(topic)
  }

  const onMessage = (topic: string, handler: MqttMessageHandler): (() => void) => {
    mqOnMessage(topic, handler)
    const pair = { topic, handler }
    handlerPairs.push(pair)

    return () => {
      mqOffMessage(topic, handler)
      const idx = handlerPairs.indexOf(pair)
      if (idx !== -1) handlerPairs.splice(idx, 1)
    }
  }

  const offMessage = (topic: string, handler: MqttMessageHandler) => {
    mqOffMessage(topic, handler)
    const idx = handlerPairs.findIndex((p) => p.topic === topic && p.handler === handler)
    if (idx !== -1) handlerPairs.splice(idx, 1)
  }

  onScopeDispose(() => {
    for (const { topic, handler } of handlerPairs) {
      mqOffMessage(topic, handler)
    }
    handlerPairs.length = 0

    for (const topic of subscribedTopics) {
      mqUnsubscribe(topic)
    }
    subscribedTopics.clear()
  })

  return {
    isConnected,
    subscribe,
    unsubscribe,
    publish: mqPublish,
    onMessage,
    offMessage,
    connect: connectMqtt,
  }
}
