# 前后端对接配置说明

## 概述

本项目通过两种方式与后端通信：

- **HTTP** — REST API 请求（axios），用于空间数据查询、设备操作日志等
- **MQTT** — 实时双向通信（mqtt.js），用于设备状态订阅和控制指令下发

所有后端地址通过 **构建时环境变量（`.env`）** 配置，部署时无需动态修改。同时保留 `public/config.js` 作为可选运行时覆盖，支持 Docker ConfigMap 免重建场景。

---

## 配置架构

```
开发时：  .env.development  ──┐
                              ├──▶ import.meta.env.VITE_* ──┐
生产时：  .env.production  ───┘                              │
                                                             ├──▶ getServerConfig()
可选覆盖： public/config.js ──▶ window.config ───────────────┘
```

优先级：**`window.config` > `import.meta.env`**

### 环境变量清单

| 变量名 | 用途 | 示例 |
|--------|------|------|
| `VITE_APP_BASE_URL` | HTTP API 基础地址 | `http://10.205.66.7:1880` |
| `VITE_MQTT_URL` | MQTT Broker 地址 | `ws://10.205.66.8:1884` |
| `VITE_MQTT_USERNAME` | MQTT 用户名 | `zeekr_iot_platform` |
| `VITE_MQTT_PASSWORD` | MQTT 密码 | `jp2cJFJ1AEeOFUPYcWLF` |

> 所有变量必须以 `VITE_` 前缀命名，Vite 才会暴露给客户端代码。

---

## HTTP 请求链路

```
页面组件 / composable
    │
    ▼
src/api/space.ts           → POST /pad/getSpaceData
src/api/device.ts          → POST /api/device/doAddDeviceControlLog
src/api/cleaning.ts        → POST /setCleanTime
    │
    ▼
src/utils/request.ts       → axios 实例
    │  └─ 请求拦截器：延迟解析 baseURL = getServerConfig().apiBaseUrl
    │  └─ 响应拦截器：统一错误处理（ElMessage 弹窗）
    │
    ▼
src/config/servers.ts      → getServerConfig()
    │  └─ window.config.VITE_APP_BASE_URL ?? import.meta.env.VITE_APP_BASE_URL
    │
    ▼
后端 HTTP 服务
```

### 关键文件

| 文件 | 职责 |
|------|------|
| `src/utils/request.ts` | axios 实例，请求/响应拦截器，延迟解析 baseURL |
| `src/config/servers.ts` | 配置解析、缓存，`getServerConfig()` / `getMqttConfig()` |
| `.env.development` | 开发环境配置 |
| `.env.production` | 生产构建配置 |

---

## MQTT 连接链路

```
页面组件
    │
    ▼
src/composables/use*Mqtt.ts     → 业务 composable（useLightMqtt, useAcMqtt 等）
    │  └─ subscribe(topic) / publish(topic, payload)
    │
    ▼
src/utils/useMqtt.ts            → 组件级生命周期管理
    │  └─ onScopeDispose 自动清理 handlers
    │  └─ 首次调用时触发 connectMqtt()
    │
    ▼
src/utils/mqtt.ts               → 模块级单例 MQTT 客户端
    │  └─ 唯一 client.on('message') → MqttRouter.dispatch()
    │  └─ 重连自动重订阅 subscribedTopics
    │  └─ 连接参数来自 getMqttConfig()
    │
    ▼
src/utils/mqttRouter.ts         → 路由表分发
    │  └─ 精确匹配 O(1)（Map）+ 通配符正则
    │  └─ 一次 JSON.parse，多 handler 共享
    │
    ▼
src/utils/mqttTopics.ts         → Topic 常量工厂（所有 topic 字符串的唯一源）
    │  └─ topics.lightStatus(ctx), topics.acAction(ctx), ...
    │
    ▼
src/stores/device.ts            → 设备状态缓存（引用计数订阅）
    │  └─ acquire(key) / release(key)
    │  └─ 首次订阅建立 MQTT 连接，refCount 归零取消订阅
    │
    ▼
MQTT Broker
```

### 关键文件

| 文件 | 职责 |
|------|------|
| `src/utils/mqtt.ts` | MQTT 单例客户端，连接/重连/订阅/发布 |
| `src/utils/mqttRouter.ts` | Topic → Handler 路由表分发 |
| `src/utils/mqttTopics.ts` | 全部 topic 模板的参数化工厂 |
| `src/utils/useMqtt.ts` | Vue composable，组件级 handler 生命周期 |
| `src/utils/mqttCommand.ts` | 指令-响应关联（correlationId + Promise 超时） |
| `src/stores/device.ts` | 设备状态缓存，引用计数 MQTT 订阅 |
| `src/composables/use*Mqtt.ts` | 各设备域的封装 composable |

---

## Mock Mode

当 `VITE_MQTT_URL` 未配置（空字符串）时，系统自动进入 **Mock Mode**：

- MQTT 不建立连接，`publish()` 仅打印 `console.log`
- 所有 `subscribe()` 为 no-op
- Device Store 使用默认 mock 值
- 未接入真实数据的页面继续使用本地硬编码数据

此机制保证**无后端配置时原型仍可正常运行**，所有页面不会白屏或报错。

---

## 部署方式

### 方式一：构建时配置（推荐）

1. 编辑 `.env.production`，填入生产环境地址：
   ```env
   VITE_APP_BASE_URL=http://10.205.66.7:1880
   VITE_MQTT_URL=ws://10.205.66.8:1884
   VITE_MQTT_USERNAME=zeekr_iot_platform
   VITE_MQTT_PASSWORD=jp2cJFJ1AEeOFUPYcWLF
   ```
2. 执行 `npm run build`
3. 部署 `dist/` 目录

### 方式二：运行时覆盖（Docker）

当不同环境共用同一个构建产物时：

1. 保持 `.env.production` 中地址为空
2. 编辑 `public/config.js`，取消注释并填入地址：
   ```js
   window.config = {
     VITE_APP_BASE_URL: "http://10.205.66.7:1880",
     VITE_MQTT_URL: "ws://10.205.66.8:1884",
     VITE_MQTT_USERNAME: "zeekr_iot_platform",
     VITE_MQTT_PASSWORD: "jp2cJFJ1AEeOFUPYcWLF",
   }
   ```
3. 在 K8s 中将 `config.js` 作为 ConfigMap 挂载到 `/pad/config.js`

---

## 开发环境

```bash
# 编辑 .env.development
VITE_APP_BASE_URL=http://127.0.0.1:3001
VITE_MQTT_URL=           # 留空 = Mock Mode

npm run dev              # 启动开发服务器 → http://localhost:5174
```

搭配 Mock Mode，无需后端即可进行前端 UI 开发。
