# doAddDeviceControlLog 端点开发指南（边缘侧 + 云端侧）

> 适用：buildingos.pad 操作日志链路。Pad 端已完成（`src/utils/logClk.ts` → `GET {apiBaseUrl}/api/device/doAddDeviceControlLog`），本文档供边缘侧、云端侧两个团队按契约各自实现端点。

## 1. 架构

```
Pad (前端)
  └─ GET /api/device/doAddDeviceControlLog?{query 参数}
        ↓
边缘侧后端（Pad 的 apiBaseUrl 指向的服务，即 VITE_APP_BASE_URL）
  └─ 收到后转发：GET {CLOUD_BASE_URL}/api/device/doAddDeviceControlLog（query 原样透传）
        ↓
云端后端（最终落库）
```

- 两端实现**完全相同**的端点路径与入参，保证一体部署（云端=边缘同机，`CLOUD_BASE_URL` 指向本机）时行为一致。
- 云端地址由边缘侧配置（环境变量/配置项，建议 `CLOUD_BASE_URL`）。

## 2. 接口契约（两端一致）

| 项 | 值 |
|---|---|
| Method | GET |
| Path | `/api/device/doAddDeviceControlLog` |
| 参数位置 | URL query string（无请求体） |
| 成功响应 | HTTP 200，body 建议 `{"code":0,"message":"ok"}` |
| 失败响应 | 非 200（Pad 端失败静默、不重试，见第 5 节） |

请求参数（GET query，Pad 实际发送的最终格式）：

```json
{
  "spaceCode": "SMART",
  "sourceType": "PAD",
  "sourceName": "/运营/楼宇智控/照明/单控",
  "floorCode": "3F",
  "floorAreaCode": "ZB",
  "areaCode": "3FBNW",
  "deviceType": "light",
  "actionTopic": "/iot/action/light/SMART/ZB/3F/3FBNW/灯1",
  "actionData": "{\"action\":\"on\"}"
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| spaceCode | string/number | 属地编码（如 SMART） |
| sourceType | string | 固定 `PAD`（来源为 Pad） |
| sourceName | string | 操作来源，见第 3 节枚举 |
| floorCode | string | 楼层 code（如 3F） |
| floorAreaCode | string | 楼层区域 code（如 ZB） |
| areaCode | string | 设备区/房间 code，即 MQTT 主题的 deviceCode 段 |
| deviceType | string | 设备域，当前 `light`、`airconditioning`、`blind`、`door`、`freshair`、`socket`，后续可能继续扩展，勿做白名单强校验（或做成可扩展枚举） |
| actionTopic | string | **实际发布的 MQTT 控制主题**（原始完整 topic，群控含逗号拼接的 names 段） |
| actionData | string | **实际发布的 MQTT payload 的 JSON 字符串**（原样记录，勿解析） |

## 3. sourceName 约定（当前枚举）

| 操作 | sourceName |
|---|---|
| 照明单控 | `/运营/楼宇智控/照明/单控` |
| 照明群控 | `/运营/楼宇智控/照明/群控` |
| 空调开关群控 | `/运营/楼宇智控/空调/群控` |
| 空调温度/模式/风速/单机开关 | `/运营/楼宇智控/空调/单控` |
| 窗帘升降/暂停 | `/运营/楼宇智控/窗帘/单控` |
| 门禁开锁 | `/运营/楼宇智控/门禁/单控` |
| 新风开关/模式 | `/运营/楼宇智控/新风/单控` |
| 插座开关 | `/运营/楼宇智控/插座/单控` |

## 4. 群控语义（重要）

- Pad 对群控**按设备数发送多条日志记录**（N 台设备 = N 条），每条记录的 `actionTopic` 都是**实际群控主题**（不是拆成单设备主题），`sourceName` 为对应的「群控」值。
- 后端按条入库即可，不需要聚合、不需要去重拆分。
- 空调群控在设备列表未知时至少发送 1 条。

## 5. Pad 端行为约定（后端实现需知）

- Pad 每条控制指令发出后**同步发一条日志请求**，失败静默、不弹窗、**不重试**。
- 因此日志允许少量丢失（断网瞬间），但不允许影响控制指令本身。
- 边缘侧如做重试，可能产生重复记录——日志场景可接受重复，建议不做去重（或仅按 `actionTopic + actionData + created_at` 窗口做可选去重）。

## 6. 边缘侧实现要求

对外能力：

1. 暴露 `GET /api/device/doAddDeviceControlLog`（与云端同路径）。
2. 接收后**尽快返回 200**（Pad 不等待转发结果），转发异步进行。
3. 转发目标：`{CLOUD_BASE_URL}/api/device/doAddDeviceControlLog`，query 参数**原样透传**（字段名与值不变，注意 URL 编解码）。
4. 转发失败处理：重试 2 次（间隔 1s/5s 即可），仍失败则记录本地日志（文件/控制台）后丢弃。不要反压 Pad。
5. `CLOUD_BASE_URL` 可配置；一体部署时指向本机自己。
6. 鉴权：Pad ↔ 边缘端为内网，可不做；边缘 → 云端建议支持可选的 `Authorization` 头配置（云端无鉴权时留空）。

### Node-RED 实现参考（若边缘端为 Node-RED，如现场 10.205.66.7:1880）

```
[HTTP In] GET /api/device/doAddDeviceControlLog
   ├──(分支1，立即应答)
   │    [Change] msg.statusCode=200; msg.payload={"code":0,"message":"ok"}
   │    └─ [HTTP Response]
   └──(分支2，异步转发云端)
        [Function] 透传 query 并设置转发 URL
        └─ [HTTP Request] GET {CLOUD_BASE_URL}/api/device/doAddDeviceControlLog（超时 5s）
             ├─ 成功 → [Debug/忽略]
             └─ [Catch] → 重试/本地日志（可再用 delay + link 回 HTTP Request 节点做 2 次重试）
```

Function 节点参考代码：

```js
// query 即 Pad 发来的 GET 参数（HTTP In 节点已解析为 msg.payload 对象）
msg.url = env.get('CLOUD_BASE_URL') + '/api/device/doAddDeviceControlLog';
msg.method = 'GET';
// 保留 msg.payload 为 query 对象，HTTP Request 节点会自动拼成 URL 查询串
// 可选：msg.headers.Authorization = 'Bearer ' + env.get('CLOUD_TOKEN');
return msg;
```

## 7. 云端侧实现要求

1. 实现相同端点 `GET /api/device/doAddDeviceControlLog`。
2. 必填校验（query 参数缺一返回 400）：`spaceCode`、`sourceName`、`deviceType`、`actionTopic`、`actionData`。
3. 落库，建议表结构：

```sql
CREATE TABLE device_control_log (
  id             BIGSERIAL PRIMARY KEY,
  space_code     VARCHAR(64),
  source_type    VARCHAR(16),
  source_name    VARCHAR(128),
  floor_code     VARCHAR(64),
  floor_area_code VARCHAR(64),
  area_code      VARCHAR(64),
  device_type    VARCHAR(32),
  action_topic   TEXT,
  action_data    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

4. 返回 `{"code":0,"message":"ok"}`。
5. 如边缘侧做了重试，允许重复记录，不做强幂等（可选按 action_topic + action_data + created_at 窗口去重）。

## 8. 联调验收清单

1. **curl 模拟 Pad → 边缘端**：

```bash
curl -G "http://<edge-host>/api/device/doAddDeviceControlLog" \
  --data-urlencode "spaceCode=SMART" \
  --data-urlencode "sourceType=PAD" \
  --data-urlencode "sourceName=/运营/楼宇智控/照明/单控" \
  --data-urlencode "floorCode=3F" \
  --data-urlencode "floorAreaCode=ZB" \
  --data-urlencode "areaCode=3FBNW" \
  --data-urlencode "deviceType=light" \
  --data-urlencode "actionTopic=/iot/action/light/SMART/ZB/3F/3FBNW/灯1" \
  --data-urlencode 'actionData={"action":"on"}'
```

预期：边缘端返回 200；云端落库一条，字段与 query 参数一一对应。

2. **Pad 实测**：
   - 单控一盏灯 → 两端各见 1 条「照明/单控」日志；
   - 照明全开/全关（N 盏灯）→ 两端各见 N 条「照明/群控」日志，actionTopic 为实际群控主题（含 names）；
   - 空调开关 → 「空调/群控」日志；调温/调风速 → 「空调/单控」日志。
3. **异常路径**：停掉云端 → 边缘端仍对 Pad 返回 200，重试耗尽后本地记录日志，Pad 端无感知、控制不受影响。
4. **一体部署**：CLOUD_BASE_URL 指向本机，重复第 1、2 步结果一致。
