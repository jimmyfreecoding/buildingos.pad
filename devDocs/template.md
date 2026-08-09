# Pad 模板插件系统设计

## 概述

每种 padType（wallPad、meetingControl 等）可以有多个界面模板，例如不同客户可能有不同的品牌风格。模板与后端完全解耦——无论使用哪种模板，都通过统一的 MQTT 接口完成设备交互。

模板采用**目录约定优于配置**的插件机制：在 `src/templates/` 下按规范创建目录，构建时自动注册，无需修改路由或任何配置文件。

---

## 目录结构

```
src/templates/
├── wallPad/                       # padType
│   ├── default/                   # 内置默认模板
│   │   ├── index.vue              # 模板主组件（必须）
│   │   ├── manifest.json          # 模板元信息（必须）
│   │   ├── preview.png            # 预览图（可选）
│   │   └── components/            # 模板内部组件（可选）
│   └── zeekr-premium/             # 某个客户的定制模板
│       ├── index.vue
│       └── manifest.json
├── meetingControl/
│   └── default/
│       ├── index.vue
│       └── manifest.json
├── roomControl/
│   └── default/
│       ├── index.vue
│       └── manifest.json
├── tolitePad/
│   └── default/
├── doorPad/
│   └── default/
├── switchPad/
│   └── default/
├── twins/
│   └── default/
└── registry.ts                    # 模板自动注册
```

---

## Manifest 规范

每个模板目录下必须有一个 `manifest.json`：

```json
{
  "name": "Zeekr 极简白",
  "description": "白色简约风格墙面中控",
  "version": "1.0.0",
  "author": "BuildingOS",
  "preview": "./preview.png",
  "padType": "wallPad"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 模板展示名称，在初始化选择界面显示 |
| `description` | 否 | 模板简介 |
| `version` | 否 | 语义化版本号 |
| `author` | 否 | 作者/团队名 |
| `preview` | 否 | 预览图路径，相对于 manifest.json |
| `padType` | 是 | 所属 pad 类型，必须与父目录名一致 |

---

## 自动注册机制

利用 Vite 的 `import.meta.glob` 在构建时自动扫描所有模板：

```ts
// src/templates/registry.ts
import type { Component } from 'vue'

interface TemplateManifest {
  name: string
  description?: string
  version?: string
  author?: string
  preview?: string
  padType: string
}

interface TemplateInfo {
  id: string
  manifest: TemplateManifest
  component: () => Promise<Component>
}

const manifestModules = import.meta.glob('./**/manifest.json', { eager: true })
const componentModules = import.meta.glob('./**/index.vue')

const registry = new Map<string, Map<string, TemplateInfo>>()

for (const [path, mod] of Object.entries(manifestModules)) {
  const manifest = (mod as { default: TemplateManifest }).default
  const dir = path.replace('/manifest.json', '')
  const parts = dir.split('/')
  const padType = parts[1]             // e.g. 'wallPad'
  const templateId = parts[2]          // e.g. 'default' or 'zeekr-premium'
  const componentPath = `${dir}/index.vue`

  if (!registry.has(padType)) {
    registry.set(padType, new Map())
  }
  registry.get(padType)!.set(templateId, {
    id: templateId,
    manifest,
    component: componentModules[componentPath] as () => Promise<Component>,
  })
}

export function getTemplates(padType: string): TemplateInfo[] {
  return Array.from(registry.get(padType)?.values() ?? [])
}

export function getTemplate(padType: string, templateId: string): TemplateInfo | undefined {
  return registry.get(padType)?.get(templateId)
}

export function getAllPadTypes(): string[] {
  return Array.from(registry.keys())
}
```

**添加新模板只需两步**：
1. 在 `src/templates/{padType}/` 下新建目录
2. 放入 `index.vue` + `manifest.json`

构建时自动发现，无需修改路由、registry 或任何配置。

---

## 模板开发 Contract

### usePadContext()

每个模板通过 `usePadContext()` 获取标准化的上下文能力：

```ts
// src/composables/usePadContext.ts
export function usePadContext() {
  const spaceStore = useSpaceStore()

  return {
    // 空间绑定信息
    spaceContext: computed(() => spaceStore.spaceContext),

    // MQTT 底层操作
    mqtt: {
      subscribe: mqttClient.subscribe,
      unsubscribe: mqttClient.unsubscribe,
      publish: mqttClient.publish,
      onMessage: mqttClient.onMessage,
      isConnected: mqttClient.isConnected,
    },

    // Domain composables（可选，模板也可以直接用）
    useLightMqtt,
    useAcMqtt,
    useAirSensorMqtt,
    useWcSensorMqtt,
    useBlindMqtt,
    useFreshAirMqtt,
    useSocketMqtt,
    useDoorMqtt,
  }
}
```

### 模板最小示例

```vue
<!-- src/templates/wallPad/my-theme/index.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { usePadContext } from '@/composables/usePadContext'

const { spaceContext, mqtt, useAirSensorMqtt, useLightMqtt } = usePadContext()

// 使用封装好的 composable
const { airQuality } = useAirSensorMqtt()
const { lights, toggleLight } = useLightMqtt()

// 也可以直接订阅自定义 topic
onMounted(() => {
  mqtt.subscribe(`/iot/status/custom/${spaceContext.value.spaceCode}/#`)
  mqtt.onMessage(`/iot/status/custom/${spaceContext.value.spaceCode}/#`, (payload) => {
    console.log('custom data:', payload)
  })
})
</script>

<template>
  <div class="my-theme">
    <h1>{{ airQuality.temp }}°C</h1>
    <button
      v-for="l in lights"
      :key="l.id"
      @click="toggleLight(l.id)"
    >
      {{ l.name }}: {{ l.isOn ? 'ON' : 'OFF' }}
    </button>
  </div>
</template>
```

### Contract 规则

| 规则 | 说明 |
|------|------|
| 模板只 import `usePadContext` | 不直接依赖 `mqtt.ts`、`request.ts`、路由 |
| 模板自行决定 UI 框架 | 可用 Element Plus、原生 DOM、canvas 等 |
| 模板自行管理缩放 | 可用 `v-scale-screen` 或自行处理 |
| 模板内可用任何 domain composable | `useLightMqtt()` 等已封装好，开箱即用 |
| 生命周期和订阅自动清理 | `useMqtt()` 内部处理 `onScopeDispose` |
| 无后端配置时自动降级 | `isMockMode()` 为 true 时，composable 返回 mock 数据 |

---

## 路由设计

所有 pad 类型走一个动态路由，由 `TemplateLoader` 统一分发：

```ts
// src/router/index.ts
{
  path: '/:padType',
  name: 'pad',
  component: () => import('@/pages/TemplateLoader.vue'),
}
```

```vue
<!-- src/pages/TemplateLoader.vue -->
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { getTemplate } from '@/templates/registry'

const route = useRoute()
const padType = route.params.padType as string

const bound = computed(() => {
  try {
    const raw = localStorage.getItem('initData')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
})

const templateId = computed(() => bound.value?.template || 'default')

const component = computed(() => {
  const info = getTemplate(padType, templateId.value)
  if (!info) return null
  return defineAsyncComponent(info.component)
})
</script>

<template>
  <component v-if="component" :is="component" />
  <div v-else class="flex items-center justify-center h-full text-white bg-black">
    <p>模板未找到: {{ padType }} / {{ templateId }}</p>
  </div>
</template>
```

---

## 初始化流程（三步）

```
Step 1: 选择 padType + 屏幕比例
        │
        ▼
Step 2: 调用 /iot/setting/get/structure → 级联选择绑定空间
        │
        ▼
Step 3: 选择模板（展示该 padType 下所有模板的预览卡片）
        │  ┌─────────────────────────────────────────────┐
        │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
        │  │  │ preview  │  │ preview  │  │ preview  │  │
        │  │  │ 默认模板  │  │ 极简白   │  │ 品牌定制 │  │
        │  │  └──────────┘  └──────────┘  └──────────┘  │
        │  └─────────────────────────────────────────────┘
        │
        ▼
    localStorage.initData = {
      padType: "wallPad",
      ratio: "16:9",
      spaceId, code, floorAreaCode, floorCode, roomCode, ...
      template: "zeekr-premium"
    }
        │
        ▼
    router.push('/wallPad') → TemplateLoader → 加载对应模板
```

---

## 现有页面迁移计划

| 原页面 | 迁移目标 |
|--------|----------|
| `src/pages/HomePage.vue` | `src/templates/wallPad/default/index.vue` |
| `src/pages/MeetingControl.vue` | `src/templates/meetingControl/default/index.vue` |
| `src/pages/RoomControl.vue` | `src/templates/roomControl/default/index.vue` |
| `src/pages/TolitePad.vue` | `src/templates/tolitePad/default/index.vue` |
| `src/pages/DoorPad.vue` | `src/templates/doorPad/default/index.vue` |
| `src/pages/Twins.vue` | `src/templates/twins/default/index.vue` |
| `src/pages/SwitchPad.vue` | `src/templates/switchPad/default/index.vue` |
| 子页面（Light/Control/Space 等） | 由各模板自行引用或内置 |

子页面（Light.vue、Control.vue、Space.vue 等 drawer 组件）不再作为独立路由存在，而是作为可复用的组件放在 `src/components/` 下，由各模板自行决定是否使用。

---

## 整体架构图

```
┌──────────────────────────────────────────────────────────┐
│                      构建时                               │
│  import.meta.glob 扫描 src/templates/**/manifest.json    │
│  → 自动生成 registry Map<padType, TemplateInfo[]>        │
└──────────────────────────────────────────────────────────┘
                            │
┌──────────────────────────────────────────────────────────┐
│                       运行时                              │
│                                                          │
│  InitPage（三步流程）                                     │
│   Step 1: padType + ratio                                │
│   Step 2: POST /iot/setting/get/structure → 空间绑定      │
│   Step 3: registry.get(padType) → 模板预览卡片选择         │
│       ↓                                                  │
│  localStorage.initData                                   │
│       ↓                                                  │
│  router.push('/wallPad')                                 │
│       ↓                                                  │
│  TemplateLoader.vue                                      │
│       │                                                  │
│       ├─ 读 initData.template（缺省 'default'）           │
│       ├─ getTemplate('wallPad', templateId)               │
│       └─ defineAsyncComponent(component) → 渲染           │
│                                                          │
│  ┌──────────────────────────────────────┐                │
│  │  模板 index.vue                      │                │
│  │  const ctx = usePadContext()         │                │
│  │  const { airQuality } = ctx.useAirSensorMqtt()        │
│  │  ...自由渲染 UI ...                   │                │
│  └──────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────┘
```

---

## 关键设计决策

| 决策 | 理由 |
|------|------|
| 目录约定优于配置 | 添加模板只需新建目录 + 两个文件，零配置 |
| `import.meta.glob` 自动扫描 | Vite 构建时静态分析，无需运行时 registry |
| 模板与基础设施解耦 | `usePadContext()` 是唯一接触点，模板不直接依赖 mqtt.ts |
| 模板内可用 domain composable | `useLightMqtt()` 等复用封装好的逻辑，减少模板代码 |
| TemplateLoader 统一分发 | 路由逻辑集中，模板只需关心 UI |
| manifest.json 元信息 | 支持模板选择界面的预览、版本管理、未来兼容性检查 |
| Mock mode 自动降级 | 无后端时模板仍可渲染，使用 mock 默认数据 |

---

## MQTT 使用指南

### 方式一：通过 usePadContext() 操作 MQTT（推荐用于直接订阅）

模板通过 `usePadContext()` 获取 MQTT 操作接口：

```ts
import { usePadContext } from '@/composables/usePadContext'

const { spaceContext, mqtt } = usePadContext()
```

`mqtt` 对象提供以下方法：

| 方法 | 签名 | 说明 |
|------|------|------|
| `subscribe(topic)` | `(topic: string) => void` | 订阅一个 topic，重连自动重订阅 |
| `unsubscribe(topic)` | `(topic: string) => void` | 取消订阅 |
| `publish(topic, payload)` | `(topic: string, payload: string \| object) => void` | 发布消息，对象自动 JSON.stringify |
| `onMessage(topic, handler)` | `(topic: string, handler: MqttMessageHandler) => () => void` | 注册消息处理器，返回取消注册函数 |
| `isConnected` | `Ref<boolean>` | 当前 MQTT 连接状态 |

**`MqttMessageHandler` 回调签名：**
```ts
type MqttMessageHandler = (payload: unknown, topic: string, raw: string) => void
```

### 完整订阅示例

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { usePadContext } from '@/composables/usePadContext'
import { topics } from '@/utils/mqtt'

const { spaceContext, mqtt } = usePadContext()

const sensorData = ref<Record<string, unknown>>({})

const cleanupFns: Array<() => void> = []

onMounted(() => {
  if (!spaceContext.value) return

  // 1. 构造 topic
  const topic = topics.airSensor(spaceContext.value)
  //  → '/iot/status/airsensor/{spaceCode}/{floorAreaCode}/{floorCode}/{deviceCode}'

  // 2. 订阅
  mqtt.subscribe(topic)

  // 3. 注册消息处理器（返回取消函数）
  const off = mqtt.onMessage(topic, (payload) => {
    sensorData.value = payload as Record<string, unknown>
  })
  cleanupFns.push(off)
})

onUnmounted(() => {
  // 手动清理（useMqtt 的 onScopeDispose 也会自动清，但显式清理更安全）
  cleanupFns.forEach(fn => fn())
  cleanupFns.length = 0
})
</script>
```

### 发布指令示例

```ts
import { topics } from '@/utils/mqtt'
import { usePadContext } from '@/composables/usePadContext'

const { spaceContext, mqtt } = usePadContext()

function turnOnLight(deviceId: string) {
  if (!spaceContext.value) return
  const topic = topics.lightAction(spaceContext.value)
  //  → '/iot/action/light/{spaceCode}/{floorAreaCode}/{floorCode}/{deviceCode}'

  mqtt.publish(topic, {
    action: 'on',
    id: deviceId,
  })
}
```

### Mock Mode 行为

当 `public/config.js` 未配置 MQTT URL 时：
- `mqtt.subscribe()` / `mqtt.unsubscribe()` — 静默返回，不报错
- `mqtt.publish()` — 内容写入 `console.log` 方便调试
- `mqtt.onMessage()` — 回调永远不会触发
- `mqtt.isConnected` — 始终为 `false`

模板代码无需做任何 mock mode 判断，基础设施层自动降级。

---

### 方式二：使用 Domain Composable（推荐用于标准设备）

项目已封装 8 个设备域 composable，开箱即用：

| Composable | 文件 | 用途 |
|------------|------|------|
| `useLightMqtt()` | `@/composables/useLightMqtt` | 照明：开关、全开全关 |
| `useAcMqtt()` | `@/composables/useAcMqtt` | 空调：温度、模式、风速、开关 |
| `useAirSensorMqtt()` | `@/composables/useAirSensorMqtt` | 空气质量传感器 |
| `useWcSensorMqtt()` | `@/composables/useWcSensorMqtt` | 卫生间占位传感器 |
| `useBlindMqtt()` | `@/composables/useBlindMqtt` | 窗帘/百叶 |
| `useFreshAirMqtt()` | `@/composables/useFreshAirMqtt` | 新风系统 |
| `useSocketMqtt()` | `@/composables/useSocketMqtt` | 插座 |
| `useDoorMqtt()` | `@/composables/useDoorMqtt` | 门禁 |

每个 composable 内部自动处理订阅、消息解析、状态缓存和生命周期清理。模板只需调用即可：

```ts
import { useLightMqtt } from '@/composables/useLightMqtt'

const { lights, toggleLight, setAll } = useLightMqtt()
// lights: ComputedRef<{ devices: LightState[], allOn: boolean }>
// toggleLight(id) → publish action topic
// setAll(on) → publish action topic
```

---

## 添加新的 MQTT 发布/订阅

当后端新增设备域或协议变更时，按以下步骤添加：

### Step 1：在 `src/utils/mqttTopics.ts` 添加 Topic 定义

```ts
// 在 topics 对象中添加新的域
export const topics = {
  // ... 已有定义 ...

  // --- 新增：地暖 ---
  floorHeatStatus: (c: SpaceContext) =>
    `${IOT_STATUS}/floorheat/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}/#`,
  floorHeatAction: (c: SpaceContext) =>
    `${IOT_ACTION}/floorheat/${c.spaceCode}/${c.floorAreaCode}/${c.floorCode}/${c.deviceCode}`,
} as const
```

**命名约定：**
- 状态 topic（设备上报 → Pad）：`/iot/status/{domain}/{spaceCode}/{floorAreaCode}/{floorCode}/{deviceCode}/#`
- 指令 topic（Pad → 设备）：`/iot/action/{domain}/{spaceCode}/{floorAreaCode}/{floorCode}/{deviceCode}`
- 所有 topic 必须通过 `SpaceContext` 参数化，从 `localStorage.initData` 自动获取绑定信息
- 末尾 `/#` 表示匹配任意层级子 topic，`/+` 表示匹配单级

### Step 2：（可选）新建 Domain Composable

如果新设备域需要跨多个模板复用，建议封装 composable：

```ts
// src/composables/useFloorHeatMqtt.ts
import { computed, ref } from 'vue'
import { useSpaceStore } from '@/stores/space'
import { useMqtt } from '@/utils/useMqtt'
import { topics } from '@/utils/mqtt'

export function useFloorHeatMqtt() {
  const spaceStore = useSpaceStore()
  const mqtt = useMqtt()

  const ctx = computed(() => spaceStore.spaceContext)
  const temperature = ref(22)
  const isOn = ref(false)
  let unsub: (() => void) | null = null

  const setup = () => {
    if (!ctx.value) return
    const statusTopic = topics.floorHeatStatus(ctx.value)
    mqtt.subscribe(statusTopic)
    unsub = mqtt.onMessage(statusTopic, (payload) => {
      const msg = payload as Record<string, any>
      if (msg?.temp !== undefined) temperature.value = msg.temp
      if (msg?.isOn !== undefined) isOn.value = msg.isOn
    })
  }

  setup()

  function setTemp(temp: number) {
    if (!ctx.value) return
    mqtt.publish(topics.floorHeatAction(ctx.value), { action: 'setTemp', temp })
  }

  function togglePower() {
    if (!ctx.value) return
    mqtt.publish(topics.floorHeatAction(ctx.value), { action: isOn.value ? 'off' : 'on' })
  }

  return { temperature, isOn, setTemp, togglePower }
}
```

### Step 3：在模板中使用

```ts
// 模板内直接使用新 composable
import { useFloorHeatMqtt } from '@/composables/useFloorHeatMqtt'
const { temperature, isOn, setTemp, togglePower } = useFloorHeatMqtt()
```

跨模板共享的 composable 放在 `src/composables/`，模板专用的逻辑放在模板自己的 `components/` 目录。

---

## HTTP 请求端点指南

### 架构

```
模板 index.vue
    ↓ 直接 import
api/xxx.ts
    ↓ import
utils/request.ts（共享 axios 实例）
    ↓ baseURL 来自
config/servers.ts → window.config 或 .env
```

### 调用现有 API

模板直接 import API 模块即可，无需通过 `usePadContext`：

```ts
// 在模板内
import { getSpaceData } from '@/api/space'
import { addDeviceControlLog } from '@/api/device'
import { setCleanTime } from '@/api/cleaning'

// 获取空间结构
const spaceList = await getSpaceData({})

// 记录设备操作日志
await addDeviceControlLog({
  deviceType: 'light',
  action: 'toggle',
  value: true,
})

// 保洁打卡
await setCleanTime({
  areaCode: 'B1-001',
  cleanTime: new Date().toISOString(),
})
```

### 现有 API 端点总览

| 文件 | 函数 | 端点 | 方法 |
|------|------|------|------|
| `src/api/space.ts` | `getSpaceData(params)` | `/iot/setting/get/structure` | POST |
| `src/api/device.ts` | `addDeviceControlLog(params)` | `/api/device/doAddDeviceControlLog` | POST |
| `src/api/cleaning.ts` | `setCleanTime(params)` | `/setCleanTime` | POST |

---

## 添加新的 HTTP API 端点

当后端新增 REST 接口时：

### Step 1：在 `src/api/` 下新建或扩展 API 模块

```ts
// src/api/energy.ts
import request from '@/utils/request'

export interface EnergyQuery {
  spaceCode: string
  floorAreaCode: string
  floorCode: string
  deviceCode: string
  range: 'day' | 'week' | 'month'
}

export interface EnergyData {
  total: number        // kWh
  currentPower: number // W
  hourly: Array<{ hour: string; value: number }>
}

export function getEnergyData(params: EnergyQuery): Promise<EnergyData> {
  return request({
    url: '/iot/energy/getData',
    method: 'post',
    data: params,
  })
}

export function getEnergyAlarm(params: Partial<EnergyQuery>): Promise<unknown> {
  return request({
    url: '/iot/energy/getAlarm',
    method: 'post',
    data: params,
  })
}
```

### Step 2：在模板中调用

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePadContext } from '@/composables/usePadContext'
import { getEnergyData } from '@/api/energy'
import type { EnergyData } from '@/api/energy'

const { spaceContext } = usePadContext()
const energyData = ref<EnergyData | null>(null)
const loading = ref(false)

async function loadEnergy() {
  if (!spaceContext.value) return
  loading.value = true
  try {
    energyData.value = await getEnergyData({
      spaceCode: spaceContext.value.spaceCode,
      floorAreaCode: spaceContext.value.floorAreaCode,
      floorCode: spaceContext.value.floorCode,
      deviceCode: spaceContext.value.deviceCode,
      range: 'day',
    })
  } catch (e) {
    console.error('获取能耗数据失败:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <button @click="loadEnergy">加载能耗</button>
    <p v-if="energyData">今日用电：{{ energyData.total }} kWh</p>
  </div>
</template>
```

### 关键约束

| 规则 | 说明 |
|------|------|
| API 模块只 import `request.ts` | 共享 axios 实例自动读取 baseURL，无需传 URL |
| 类型定义与实现同文件 | 接口类型放在对应 `api/xxx.ts`，避免类型分散 |
| 错误由拦截器统一处理 | `request.ts` 的 response interceptor 已处理 HTTP 错误码和 toast 提示 |
| 模板内 try/catch 可选 | 如果需要特定降级逻辑（如展示错误占位），才需要 catch |

### request.ts 核心配置

```ts
// src/utils/request.ts — 共享 axios 实例
// - baseURL: 延迟从 getServerConfig().apiBaseUrl 读取（支持运行时配置）
// - timeout: 60s
// - Content-Type: application/json;charset=UTF-8
// - Response interceptor: 自动处理 HTTP 错误并弹出 ElMessage
// - Mock mode: 无 baseURL 配置时请求会失败，需在模板内处理错误
```
