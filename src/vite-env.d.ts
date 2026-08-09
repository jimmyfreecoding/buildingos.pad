/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_APP_BASE_URL?: string
  readonly VITE_MQTT_URL?: string
  readonly VITE_MQTT_USERNAME?: string
  readonly VITE_MQTT_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
