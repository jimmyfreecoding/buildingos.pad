import MQTT from './mqtt'
import { onUnmounted, ref } from 'vue'

export default function useMqtt() {
  const PublicMqtt = ref(MQTT)

  const startMqtt = () => {
    //设置订阅地址
    PublicMqtt.value = new MQTT('')
    //初始化mqtt
    PublicMqtt.value.init()
    //链接mqtt
    PublicMqtt.value.link()
  }
  const unsubscribe = (val: string) => {
    PublicMqtt.value?.unsubscribe(val)
  }
  const subscribe = (val: string, callback: any) => {
    PublicMqtt.value?.subscribe(val, callback)
  }
  const publish = (topic: string, message: string) => {
    PublicMqtt.value?.publish(topic, message)
  }
  onUnmounted(() => {
    //页面销毁结束订阅
    if (PublicMqtt.value) {
      //PublicMqtt.value.unsubscribes()
      //PublicMqtt.value.over()
    }
  })

  return {
    startMqtt,
    publish,
    subscribe,
    unsubscribe,
  }
}
