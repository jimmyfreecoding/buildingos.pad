# Pad 心跳机制调研文档（老项目 → buildingos.pad 实现依据）

> 调研对象：`C:\cnb\zeekrpad`（wallPad：`views/index.vue`、`AppOld.vue`、`ceo/index.vue`）与 `C:\cnb\bxbuildingmeetingpad`（meetingPad：`src/App.vue`）。
> 用途：buildingos.pad 实现 pad 心跳的完整依据。实现位于 `src/composables/usePadHeartbeat.ts`。

## 1. 心跳发送契约（两端一致）

| 项 | 值 |
|---|---|
| 主题 | `/iot/status/pad/{space}/{floorarea}/{floor}/{code}/{padName}` |
| Payload | `[padObj]`（对象包一层数组） |
| 节奏 | `setInterval(link, 30000)` 每 30s 一次；**首包在挂载后 30s**，不是立即发 |
| 兜底 | 心跳 tick 时若 `padObj.name` 为空，改为重新发布 `/iot/setting/get/device` 请求设备配置，本周期不发心跳 |

示例（用户提供）：

```
/iot/status/pad/HGH-WC/A3/31F/C/C区中控屏
[{"name":"C区中控屏","code":"WALLPAD-31F-C","gateway":"52484b4a1705","layer":"a397a4ba62e34095","status":{"online":1,"status":"busy"}}]

/iot/status/pad/HGH-WC/A3/31F/M3101/3101会议室门牌
[{"name":"3101会议室门牌","code":"MEETINGPAD-31F-M3101","gateway":"52484b4a1705","layer":"a397a4ba62e34095","status":{"online":1,"status":"busy","padStatus":0}}]
```

## 2. padObj 身份来源（两端一致）

挂载时发布 `/iot/setting/get/device`（body：`{spaceCode, floorAreaCode, floorCode, areaCode}`），订阅响应主题 `/iot/setting/device/{space}/{floorarea}/{floor}/{code}`，从响应 `devices.pad[0]` 提取：

| padObj 字段 | 来源 |
|---|---|
| name | `devices.pad[0].name` 直接透传 |
| code | `devices.pad[0].code` 直接透传 |
| gateway | `devices.pad[0].gatewayMac`（**注意字段名转换**） |
| layer | `devices.pad[0].layer` 直接透传 |
| status | pad 本地硬编码 `{online: 1, status: "busy"}` |

code 命名规则（老项目注释原话）：

```
WALLPAD-{floor}-{code}
MEETINGPAD-{floor}-{roomCode}
TOILETPAD-{floor}-{code}
```

## 3. status 字段（wallPad 与 meetingPad 的区别）

- **wallPad**：`status` 恒为 `{online:1, status:"busy"}`，永远 busy。老项目全文搜索 `"free"` 无任何逻辑——平台只靠这个心跳判在线。
- **meetingPad**：同样硬编码 `{online:1, status:"busy"}`，另追加 `status.padStatus` 字段（见第 4 节）。

## 4. padStatus 计算（仅 meetingPad）

语义（老项目注释原话）：`0 无会无人  1 有会有人  2 无会有人  3 有会无人`

### 4.1 输入 1：会议状态 flag

订阅 `/iot/meeting/mroom/{space}/{floorarea}/{floor}/{code}`（后端推送，pad 不主动请求）。

消息结构：房间数组，每个房间含 `roomCode` 与 `meetingList: [{startTime:"HH:mm", endTime:"HH:mm", name}]`。

处理：过滤 `roomCode === 本机 code`，逐场比较当天 start/end 与当前时刻：`startT <= now < endT` → 正在进行 → `flag = 1`。整条消息重新计算（有会置 1，无会置 0）。

### 4.2 输入 2：人体状态 person

订阅 `/iot/status/humensensor/{space}/{floorarea}/{floor}/{code}/#`（房间级通配）。

消息结构：传感器数组，每项 `{code, status: {online, status:"busy"|"free"}}`。按 code 存入传感器 map，收到后重算：

- 只统计 `online == 1` 的传感器
- 任一 `status == "busy"` → 有人（1）；全部 `"free"` → 无人（0）
- 全部离线 → **保持上次值**（老项目注释掉了 60s 过期判断，实际无过期）

### 4.3 映射（心跳 tick 时计算）

| 会议状态 | 人体状态 | padStatus |
|---|---|---|
| 无会（flag=0） | 无人 | 0 |
| 无会（flag=0） | 有人 | 2 |
| 有会（flag=1） | 有人 | 1 |
| 有会（flag=1） | 无人 | 3 |

### 4.4 老项目 bug（新实现已修复）

老项目 `App.vue:435-437` 用字符串比较 `status.value === "1"` / `=== "0"`，而 `status` 是 `ref(0)` 且只被赋数字 0/1 → 比较永远 false → **有会状态下 padStatus 恒为 0**（1 和 3 实际永远发不出去）。新实现按上表语义用数字比较，此 bug 不复现。

## 5. 云端消费方式（bxbuildingos/src/views/device/inspection/meetingroom.vue）

- `padStatus ∈ [1,2]` → 有人（d-busy）；`∈ [0,3]` → 无人（d-empty）
- 一致性校验：padStatus 报有人但云端人体传感器非 busy，或报无人但传感器非 free → 巡检页提示「门牌、传感器状态不一致」
- 云端校验用其自有的 humensensor 数据，与 pad 端传感器 map 是独立两路

## 6. 老项目实现注意点（新项目不沿用）

meetingPad 的 `subscribe()` 把每个 callback 都挂在 MQTT 客户端全局 `message` 事件上（`bxbuildingmeetingpad/src/utils/mqtt.ts:99-103`），导致一个大 handler 里用 if 检查所有 topic。能跑但低效易错；buildingos.pad 按 topic 分发（mqttRouter），不沿用此写法。

## 7. buildingos.pad 实现对照

| 老项目 | buildingos.pad |
|---|---|
| `link()` 30s tick | `usePadHeartbeat` 的 tick 定时器 |
| padObj 提取 | 订阅 `topics.deviceConfigResponse(c)`，读 `raw.pad[0]` |
| 心跳接入点 | `src/pages/TemplateLoader.vue` 统一接入：`HEARTBEAT_KINDS` 映射 padType → kind，覆盖全部 pad 类型（wallPad/tolitePad/roomControl/doorPad/twins/switchPad/meetingControl） |
| meetingPad | `usePadHeartbeat('meetingControl')`：订阅会议列表 + 人体传感器，计算 padStatus |
| 其他 pad 类型 | 各自以自身类型名为 kind（`'wallPad'`/`'tolitePad'`/`'roomControl'`/`'doorPad'`/`'twins'`/`'switchPad'`）：无 padStatus，恒为 `{online:1, status:"busy"}` |
| padStatus bug | 已修复（数字比较） |

## 8. 扩展：会议室类 switchPad 的 padStatus 与云端下发刷新

- **会议室门牌（模板类型 `DoorPad` + 绑定 `type === 'meetingRoom'`）**：心跳需带 `padStatus`（与 meetingPad 相同），否则云端会议巡检无状态数据。`TemplateLoader.vue` 的 `HEARTBEAT_KINDS` 解析时，仅当 `padType === 'doorPad'` 且 `initData.type === 'meetingRoom'` 时按 `'meetingControl'` kind 处理（订阅会议列表 + 人体传感器，计算 padStatus）。**其余 pad 类型（含 switchPad、tolitePad、wallPad 等）一律普通心跳 `{online:1, status:"busy"}`，不计算 padStatus。**
- **云端下发 pad 指令（原项目 `/iot/action/pad/{space}/#`）**：所有 pad 类型统一在 `TemplateLoader.vue` 通过 `usePadCommand()` 订阅并响应：
  - `action === "refresh"` → `location.reload()`（整页刷新，重新拉取配置/心跳/订阅）；
  - 寻址：按 `{space}/{floorArea}/{floor}/{device}[/{padName}]` 段匹配本 pad（楼层级/区域级/指定pad），pad 名来自设备配置 `pad[0].name`（`getPadName()`），配置未到达时回退区域级匹配。
  - 老项目保留的 `play`/`stop`/`fullscreen` 视为媒体动作，此处仅打日志不触发（可在各自模板自行实现）。

## 9. 其他说明

- 心跳 tick 每个周期都重新请求设备配置（`/iot/setting/get/device`），以便后端重新配置 pad 名称后，`padObj` 与心跳主题随之切换；配置响应若无 `pad[0]` 身份，会 `console.warn` 提示，便于现场排查。
