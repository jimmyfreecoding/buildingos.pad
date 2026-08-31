export interface MqttConfig {
  url: string
  username: string
  password: string
}

export interface ServerConfig {
  apiBaseUrl: string
  edgeBaseUrl: string
  mqtt: MqttConfig
}

function buildConfig(): ServerConfig {
  const mqttUrl = window.config?.VITE_MQTT_URL ?? import.meta.env.VITE_MQTT_URL ?? ''
  const mqttUser = window.config?.VITE_MQTT_USERNAME ?? import.meta.env.VITE_MQTT_USERNAME ?? ''
  const mqttPass = window.config?.VITE_MQTT_PASSWORD ?? import.meta.env.VITE_MQTT_PASSWORD ?? ''

  return {
    apiBaseUrl: window.config?.VITE_APP_BASE_URL ?? import.meta.env.VITE_APP_BASE_URL ?? '',
    // 操作日志等走边缘端服务的基础地址；为空时回退 apiBaseUrl（边端 Node-RED）
    edgeBaseUrl: window.config?.VITE_EDGE_BASE_URL ?? import.meta.env.VITE_EDGE_BASE_URL ?? '',
    mqtt: {
      url: mqttUrl,
      username: mqttUser,
      password: mqttPass,
    },
  }
}

let _config: ServerConfig | null = null

export function getServerConfig(): ServerConfig {
  if (!_config) {
    _config = buildConfig()
  }
  return _config
}

export function getMqttConfig(): MqttConfig {
  return getServerConfig().mqtt
}

export function isMockMode(): boolean {
  return !getServerConfig().mqtt.url
}
