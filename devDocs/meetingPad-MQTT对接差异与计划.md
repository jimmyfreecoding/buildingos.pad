# 会议门牌 MQTT 对接：老项目 vs buildingos.pad 差异分析与实施计划

> 对比对象：老项目 `C:\cnb\bxbuildingmeetingpad`（橙，生产参考）与 `C:\project\buildingos_meetingpad`（蓝，后一代）；
> 新实现：`src/templates/meetingPad/shared/useMeetingPadData.ts`、`src/composables/usePadHeartbeat.ts`、`src/utils/mqttTopics.ts`、`src/composables/usePadCommand.ts`。
> 已有依据文档：`devDocs/pad心跳-调研文档.md`（心跳与 padStatus 的权威说明）。

---

## 0. 结论速览

1. **主题覆盖是完整的**：老项目用到的 10 条 MQTT 主题，新实现全部有对应，且寻址段（space/floorArea/floor/device）一致。
2. **真正会「没数据」的头号风险不是代码，而是连接配置**：老项目硬编码了公网 EMQX（`wss://z650480e.ala.cn-hangzhou.emqxsl.cn:8084/mqtt`，账号 buildingos/Dvdv1205）；新项目走 `config.js` 的 `VITE_MQTT_URL/USERNAME/PASSWORD`。若站点 `pad-config.js` 没指向**推送预约会议的那台 broker**，门牌不会有任何反应。
3. **代码层面确有三处功能差异**（不是等价改写）：
   - 预约会议的 **容量 capacity** 老项目接入并显示「可容纳 N 人」，新实现完全没有；
   - 会议列表的 **预约部门 dept 列** 老项目（橙）显示，新实现没有；
   - 二维码语义/来源不同：老项目是**按房间号打包的静态图 + 「码上预约」**，新实现是 **wechat 动态接口 + （已按需求改为）「保洁打卡」**。
4. **心跳 padStatus 是新实现主动「修 bug」的地方**，与生产历史行为不同：老项目有会时恒发 0，新实现按语义发 1/3。云端按 `padStatus ∈ [1,2] = 有人` 消费，需与云端确认这次行为变化可接受。
5. **一个边界行为需要修**：从未收到人体传感器数据时（`personPresent === null`），新实现把「未知」当「无人」，有会时报 3（有会无人）→ 云端可能与自有 humensensor 比对出「状态不一致」误报。老项目此时报 0。
6. **每周期都重发 `/iot/setting/get/device`**、**稳定 clientId** 两处与老项目不同，前者无害，后者在「同房间多块屏」场景有被 broker 踢线的潜在风险。

---

## 1. 主题级对照

| # | 方向 | 老项目主题 | 新实现 | 结论 |
|---|---|---|---|---|
| 1 | pub | `/iot/setting/get/device` body `{spaceCode,floorAreaCode,floorCode,areaCode}` | `topics.deviceConfigGet()` 同一 body（心跳 30s 一次 + 模板挂载 1 次） | **一致**（新项目多发一次，无害） |
| 2 | sub | `/iot/setting/device/{s}/{fa}/{f}/{c}` → `pad[0]` | `topics.deviceConfigResponse(c)` → `raw.pad[0]` | **一致** |
| 3 | pub | `/iot/status/pad/{s}/{fa}/{f}/{c}/{padName}` payload `[padObj]`，30s | `topics.padHeartbeat(c, pad.name)` `[pad]`，30s（首包 30s） | **一致** |
| 4 | sub | `/iot/meeting/mroom/{s}/{fa}/{f}/{c}`（预约会议推送） | `topics.meetingMroom(c)` | 主题一致，**处理逻辑见 §3.2** |
| 5 | sub | `/iot/status/humensensor/{s}/{fa}/{f}/{c}/#` | `topics.humanSensorRoom(c)` | **一致** |
| 6 | sub | `/iot/status/cleaning/{s}/{fa}/{f}/{c}`（精确） | `topics.cleaningStatus(c, deviceCode)` = `.../{room}/#` | **等价**（`#` 匹配父级，见 mqttRouter 通配实现） |
| 7 | sub | `/iot/mroom/busystatus/{...}` | `topics.meetingBusyStatus(c)` | **一致**（老项目橙：空实现；蓝：仅 `console.info`；新：仅日志） |
| 8 | sub | `/iot/mroom/lastbusytime/{...}` | `topics.meetingLastBusyTime(c)` | **新 = 蓝项目行为**（橙项目该回调为空，从不处理） |
| 9 | sub | `/iot/action/pad/{space}/#` → refresh / **bind** / play / stop / fullscreen | `usePadCommand`：refresh 已实现；play/stop/fullscreen 仅日志；**bind 未实现** | **差 bind** |
| 10 | pub | `/iot/action/door/{...}` `{action:'on'}`（蓝项目：密码后开门） | 已按需求移除 | 有意差异 |

---

## 2. 分项差异

### 2.1 会议状态（padStatus，心跳携带）

老项目语义（`devDocs/pad心跳-调研文档.md` §4）：`0 无会无人 / 1 有会有人 / 2 无会有人 / 3 有会无人`。

| 情况 | 老项目实发 | 新实现实发 | 差异 |
|---|---|---|---|
| 无会 + 无人 | 0 | 0 | 无 |
| 无会 + 有人 | 2 | 2 | 无 |
| 有会 + 有人 | **0**（字符串比较 bug） | 1 | **行为变化** |
| 有会 + 无人 | **0**（同上） | 3 | **行为变化** |
| 有会 + 无任何传感器数据 | 0 | 0 | ✅ **本轮已对齐老项目**（未知不再当「无人」） |
| 无会 + 无任何传感器数据 | 0 | 0 | 无 |

- **A1（✅ 本轮已修）**：`personPresent === null`（从未收到人体传感器数据）不再按「无人」处理——有会时退化为 **0**，与老项目该场景的实发值一致；不会出现「有会无人=3」的误报。已测量到 `free` 时仍按语义发 3。
- **A2（保持语义表，待云端确认）**：有会时按语义发 **1/3**（老项目因 `status.value === "1"` 字符串比较 bug 恒发 0，1/3 从未发出）。用户答复「对齐老项目」——本实现对该场景的**未知态**已对齐（→0），但**已测量的有会+有人仍发 1**（语义正确、云端判定才准）。若要求严格复刻老项目实际输出（只发 0/2），改 `usePadHeartbeat.computePadStatus` 4 行即可。
- **A3（等价，无需改）**：老项目在**任意一条** MQTT 消息后都会重跑「整体界面状态」块；新实现只在会议列表 / 人体传感器 / 最近占用时间三类消息后重跑。输入未变，结果一致。
- **A4（健壮性小修）**：新实现 3s 的 `booksCheck()` 只更新 `next`/`bookList`，不再调用 `applyOverallStatus()` → 「下一场会议：HH:mm」可能滞后到下一次 MQTT 消息才刷新。建议在 `booksCheck()` 末尾补一次 `applyOverallStatus()`。

### 2.2 预约会议（`/iot/meeting/mroom/...`）

**生产实际 payload（2026-09-20 Node-RED debug 351 抓取，用户提供）**：

```
topic: /iot/meeting/mroom/JIXING/A/8F/M803      payload: array[1]
[{
  roomId: 92,
  roomCode: "M803",
  roomName: "803",
  capacity: "6",                 // 字符串
  meetingList: [{
    name: "徐开",
    dept: "行政协同域",
    status: 1,                   // 后端预约状态（非「进行中」：该样本 15:06 抓取，会议 15:30 才开始却是 1）
    startTime: "15:30", endTime: "16:30"
  }]
}]
```

要点：① **主题/寻址段与实现完全一致**；② 房间对象含 `roomId/roomCode/roomName/capacity`，**本样本无 `downType`**（实现已按可选处理）；
③ 会议条目的 `status` 是后端预约状态，**不能**当作「进行中」——实现与老项目一致，一律按本地时间重算并覆盖；④ `capacity` 是字符串，需要 `Number()`。

新实现处理：数组校验 → 取 `list[0].downType` → `find(roomCode === deviceCode)` → 逐场比较当天 start/end 与当前时刻（进行中 status=1 且 flag=1）→ `booksCheck()` 生成 15 分钟切片 + 空闲段 → `bookList`。**与老项目算法一致**（仅把 moment 换成原生 Date 计算秒）。

| 编号 | 差异 | 老项目 | 新实现 | 影响 |
|---|---|---|---|---|
| B1 | **容量 capacity** | `item.capacity` → `localStorage.capacity`；`meetRoom.vue` 显示「可容纳 N 人」（珊瑚色数字，`v-if="capacity!=0"`） | ✅ **本轮已按老项目接入**：`useMeetingPadData` 取 `room.capacity`（Number）+ 存 localStorage；`PadMeetRoom` 右对齐显示「可容纳 N 人」（数字 coral） | 已对齐 |
| B2 | 会议室名呈现 | `data.code.substring(1)`（如 `M4201`→`4201`）+ 单独小字「会议室」 | 保持用 `initData.roomName`（绑定结构里的原名），**不切换到 MQTT 的 `roomName`** | ✅ 决策：**先用原名、不切换**（2026-09）；payload 的 `roomName` 继续只作为可选字段保留，不参与显示 |
| B3 | **预约部门列** | meetList 有「预约部门」列（`dept`，宽 260） | ✅ **本轮已补列**（`dept`，宽 200 以适配 706px 表格） | 已对齐 |
| B4 | **二维码语义与来源** | 静态图 `/meetingpad/images/{code.substring(1)}.png`，文案**「码上预约」** | ✅ **本轮已改为：文案「保洁打卡」+ 图片来源改为「云端下发素材」**（与 logo 同一条 wallPad 发布内容链路：`/api/pad/display` 的 display_json 素材 → imageUrl/url，或 materialId ↔ `/api/space/getSpaceFiles` 清单定位）；未配置/加载失败 → 内置「扫码无效」图。原 `/wechat/getQRCode` 动态二维码已移除（需要时可从 git 恢复） | 已按决策实施 |
| B5 | downType | `allmeetinglist[0].downType` → `isDown` | 同 | 一致 |
| B6 | 会议条目 status | 老项目用本地计算值覆盖 payload 的 `status` | 同 | 一致 |
| B7 | 会议时间轴/「下一场」 | `booksCheck`（08:00–23:00，15 分钟切片，空闲段合并） | 同（秒级重算） | 一致 |

### 2.3 保洁

| 编号 | 差异 | 老项目 | 新实现 | 影响 |
|---|---|---|---|---|
| C1 | 保洁状态订阅 | `/iot/status/cleaning/{s}/{fa}/{f}/{c}`（精确） | `topics.cleaningStatus(c, deviceCode)`（`/#`） | 等价 |
| C2 | payload 处理 | `{empName, endTime, updateTime}`，与 `localStorage.BAOJIE_TIME` 取大后赋给 `baojie.endTime` | 同（用 `Number()` 取大） | 一致 |
| C3 | **打卡请求** | `fetch('http://10.205.66.7:1880/setCleanTime?spaceCode=&time=')`（**硬编码** Node-RED；HTTP 4xx 不 reject） | `cleanCheckIn()` → axios，baseURL = `VITE_EDGE_BASE_URL \|\| VITE_APP_BASE_URL`，`skipErrorMessage`；非 2xx 会 reject 并被 catch 静默 | **需确认线上该端点在哪台服务**；否则打卡静默失败（无提示，与老项目「看起来成功」表现不同） |
| C4 | 打卡后本地时间 | `baojie.endTime` 存格式化字符串，localStorage 存原始 timestamp | `baojie.endTime` 存原始 ms，显示时格式化；localStorage 存原始 timestamp | 显示等价，5 分钟防重复判据等价 |
| C5 | 保洁 UI | **橙项目模板是启用的**（「最近保洁时间：…」+ 点击展开 15s → 立即清扫 → 打卡成功） | 已按同样交互实现 | 一致（此前我误判为两版都注释） |

### 2.4 心跳

| 编号 | 差异 | 老项目 | 新实现 | 影响 |
|---|---|---|---|---|
| D1 | 首包时机 | `setInterval(link,30000)` → 30s；挂载时先发一次 get device | setup 时发 get device；timer 每 30s 发心跳 → 首包同样 30s | 一致 |
| D2 | 身份字段 | `pad[0].name/code/gatewayMac→gateway/layer`，status 本地 `{online:1,status:"busy"}` | 同 | 一致 |
| D3 | 配置拉取频率 | 仅当 `padObj.name` 为空才发 get device | **每周期都发** get device | 每 30s 多一条；更稳，无害 |
| D4 | **clientId** | meetingpad **不传 clientId**（随机） | 稳定 `mroom_{space}_{floorArea}_{floor}_{device}` | **潜在风险**：同房间多块屏（如 doorPad + meetingPad 绑同一房间）会共用 clientId，EMQX 同 clientId 互踢 → 需确认或加 pad 名后缀 |
| D5 | padStatus | 见 §2.1 | 见 §2.1 | 行为变化 + 未知态待修 |
| D6 | 心跳主题末段 | `padObj.name`（设备配置下发） | 同 | 一致 |

### 2.5 连接与寻址（补充，非四类但会直接导致「没数据」）

- **E1（P0 风险）**：老项目 broker/账号硬编码；新项目读 `config.js`。线上 `pad-config.js` 必须指向推送预约会议的那台 broker，否则门牌静默无数据。
- **E2**：老项目 `subscribe()` 把每个回调挂在全局 `message` 事件上（所有消息进所有回调，靠 `if (topic===...)` 兜）；新项目按 topic 路由分发（调研文档 §6 明确不沿用）。等价但更正确。
- **E3**：老项目还读了 `spaceObject.mqttstring`（base64 的 url/username/password）但随后被硬编码覆盖，仅打印——新项目不读它，**无实际损失**。
- **E4**：新项目 `usePadCommand` 未实现 `bind`（老项目 `action==='bind'` → `localStorage.clear()` + reload）。

---

## 3. 差异清单（按优先级）

| 编号 | 差异 | 类型 | 优先级 | 处理 |
|---|---|---|---|---|
| E1 | 线上 MQTT 配置是否指向推送预约会议的 broker | 配置 | **P0** | 现场核对 `pad-config.js` |
| — | 生产实际 payload 主题/字段未取证 | 取证 | **P0** | ✅ 已拿到预约会议实际 payload（见 §2.2）；humensensor / cleaning 样本待补 |
| A1 | padStatus 未知态被当无人（有会→3） | 行为缺陷 | P1 | ✅ 本轮已修（未知 → 0） |
| A2 | padStatus 修复（有会 1/3）与云端历史预期不同 | 行为变化 | P1 | 保持语义表；若要严格复刻老项目（只发 0/2）改 4 行 |
| B1 | `capacity` 未接入、无「可容纳 N 人」 | 功能缺失 | P1 | ✅ 本轮已接入并展示 |
| D4 | 稳定 clientId 在同房间多屏场景可能互踢 | 风险 | P1 | 待确认同房间是否多屏 |
| B3 | 会议列表缺「预约部门」列 | 功能缺失 | P2 | ✅ 本轮已补列 |
| B4 | 二维码语义与来源 | 产品决策 | P2 | ✅ 决策：文案「保洁打卡」+ 云端下发素材；已实施 |
| C3 | 打卡请求 baseURL / 错误可见性 | 配置+健壮性 | P2 | 待确认端点落点 |
| D6/#9 | 云端 `bind` 指令未响应 | 功能缺失 | P2 | ✅ 已确认**不响应 bind，只响应 refresh**（当前实现即如此，无需改） |
| A4 | `booksCheck` 后不再算整体状态 →「下一场会议」文案滞后 | 健壮性 | P3 | booksCheck 末尾补调用 |
| B2 | 会议室名呈现（`code.substring(1)`+「会议室」 vs `roomName`） | 视觉 | P3 | ✅ 决策：保持 `initData.roomName` 原名，不切换（无需改代码） |
| D3 | 每周期重发 get device | 无害差异 | P3 | 保留 |

---

## 4. 决策记录（用户答复）

| # | 问题 | 答复 | 落地 |
|---|---|---|---|
| 1 | 生产推送样本 | 开发机抓不到，**已提供预约会议实际 payload**；humensensor / cleaning 样本后续提供 | §2.2 已按实际字段对齐 |
| 2 | 站点 `pad-config.js` 是否指向推送预约会议的 broker | **是** | E1 风险解除（仍需现场确认配置已下发） |
| 3 | `capacity` | **按老项目对齐** | ✅ 已接入 + 显示「可容纳 N 人」 |
| 4 | 二维码 | **保洁打卡**；二维码是**云端下发的素材**，参考 wallpad | ✅ 改为 display_json 素材链路 + wallPad 式白框渲染；兜底「扫码无效」图 |
| 5 | padStatus | **对齐老项目** | ✅ 未知态已退化为 0；有会时的 1/3 保留语义表（见 A2 说明） |
| 6 | 是否需要响应 `bind` | **不响应 bind，只响应 refresh** | 当前实现即如此，无需改 |

**已定**：B2 会议室名 —— **先用原名（`initData.roomName`）、不切换到 MQTT `roomName`**，当前实现即符合，无需改代码。

**仍待确认**：① humensensor / cleaning 的实际 payload 样本；② 有会时是否必须严格复刻老项目的 `0`（A2）；③ 同一房间是否会同时挂 doorPad 与 meetingPad（D4 clientId）。

---

## 5. 实施计划

### P0 现场取证与配置核对（0.5 天）
- 用 pad（或 Node/mosquitto 脚本）订阅生产 broker 的上述主题 5–10 分钟，落盘原始样本。
- 核对 `pad-config.js` 指向的 broker 是否为该数据源。
- 产出：`devDocs/会议门牌-生产MQTT样本.md`（脱敏后的 topic + 字段清单）。

### P1 会议状态 + 预约会议 + 心跳对齐（0.5–1 天）
- 按样本修正字段/时间格式/数组-对象形态：`useMeetingPadData.handleMeetingMessage`、`usePadHeartbeat.recomputeMeeting/recomputePerson`。
- **A1**：`personPresent === null` 时保持上次有效值（首次无数据退化为 0）——改 `usePadHeartbeat.computePadStatus`。
- **A2**：与云端确认后决定是否保留修复（默认保留）。
- **B1**：`item.capacity` → 存 ref（+ localStorage 兼容）→ `PadMeetRoom` 显示「可容纳 N 人」。
- **A4**：`booksCheck()` 末尾补 `applyOverallStatus()`。
- **D4**：确认后决定 clientId 是否加 pad 名后缀（`src/utils/mqtt.ts`）。
- 验收：门牌「当前会议 / 下一场 / 时间轴 / 容量」与云端一致；心跳 4 组合（0/1/2/3）人工可复现。

### P2 保洁对齐（0.25 天）
- 确认 `/iot/status/cleaning/...` 在生产是否推送（老项目橙项目该订阅回调为空，实际靠打卡后本地时间）。
- 核对 `/setCleanTime` 的实际服务地址与响应结构；失败时给出可见提示（可选）。
- 验收：打卡后「最近保洁时间」立即更新，5 分钟内重复点击被拦。

### P3 UI 差异补齐（0.25 天，按确认结果）
- 预约部门列（B3）、二维码语义/来源（B4）、会议室名呈现（B2）、`bind` 指令（D6）。

### P4 回归与提交
- `npm run check` + `npm run build`；空绑定 / 无传感器 / 断网 三种降级路径回归。
- 分提交：`fix(meetingPad): padStatus 未知态…`、`feat(meetingPad): 接入会议室容量…`、`feat(meetingPad): 会议列表补预约部门列…`。

---

## 6. 风险与回滚

- padStatus 属于**云端消费数据**，改错会造成会议巡检页大面积误报 → 先用 1 个房间灰度验证 4 组合，再全量。
- 二维码语义变更会影响现场使用习惯（预约 vs 保洁），需产品确认后再改。
- 若生产 payload 与老项目字段有实质变化（尤其 `startTime/endTime` 变为带日期的 ISO），需同时改 `booksCheck` 的切片算法与 padStatus 的进行中判定，两块共用同一套时间解析（建议抽出 `meetingTime.ts`）。

---

## 7. 本轮已实施（按实际 payload + 决策）

| 项 | 文件 | 内容 |
|---|---|---|
| 会议 payload 字段对齐 | `src/templates/meetingPad/shared/useMeetingPadData.ts` | 房间类型补 `roomId/roomName/capacity/downType?`；**status 仍按本地时间重算**（后端 status 非「进行中」）；注明实际 payload 结构 |
| 容量 B1 | 同上 + `components/PadMeetRoom.vue` | `room.capacity`（字符串→Number）存 ref + `localStorage.capacity`；名称右侧显示「可容纳 N 人」（数字 coral，`v-if="capacity>0"`） |
| 预约部门列 B3 | `components/PadMeetList.vue` | 补 `dept` 列（宽 200，适配 706px） |
| 二维码 B4 | 新增 `shared/usePadPublishedContent.ts`（logo + 二维码统一）；`components/PadErweima.vue`；`MeetingPadScreen.vue` | 二维码改为云端下发素材：`/api/pad/display` display_json 的 qr 素材 → `imageUrl/url`，或 `materialId` ↔ `/api/space/getSpaceFiles` 清单（与 mapViewer 两级定位一致）；文案「保洁打卡」；未配置/失败 → 内置「扫码无效」图；原 `usePadPublishedLogo.ts` 被其取代（已删除），wechat 动态二维码移除 |
| padStatus A1 | `src/composables/usePadHeartbeat.ts` | `personPresent === null`（从未有传感器数据）时退化为 0，不再当「无人」报 3 |
| bind | — | 确认不响应 `bind`，只响应 `refresh`；当前实现即如此，未改 |

**未做**（待确认/无样本）：humensensor、cleaning 的字段级核对；A2 严格复刻老项目 padStatus；D4 clientId 策略；C3 打卡端点落点；A4 文案滞后小修。

**明确不改**：B2 会议室名 —— 保持 `initData.roomName` 原名，不切换到 MQTT `roomName`（用户 2026-09 决策）。
