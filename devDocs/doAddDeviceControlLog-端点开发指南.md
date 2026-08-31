# doAddDeviceControlLog 端点开发指南（边缘端侧）

> 适用：buildingos.pad 操作日志链路。Pad 端已完成（`src/utils/logClk.ts` → `GET {VITE_EDGE_BASE_URL}/api/device/doAddDeviceControlLog`，未配置时回退 `{VITE_APP_BASE_URL}` 即边端 Node-RED）。**Pad 直连边缘端端点，边缘端经其自有云通道转发云端落库；云端不与 Pad 直接通信。**

## 1. 架构

```
Pad (前端)
  └─ GET {VITE_EDGE_BASE_URL}/api/device/doAddDeviceControlLog?{query 参数}
        ↓
边缘端端点（边缘端服务，非 Node-RED）
        ↓（边缘端自有云通道，如 HTTP 转发 / SDK / 网关）
云端后端（最终落库）
```

- `VITE_EDGE_BASE_URL` 为空时回退到 `VITE_APP_BASE_URL`（边端 Node-RED），仅用于开发环境联调，生产必须配置为边缘端服务地址。
- 获取空间接口 `/iot/setting/get/structure` 仍走 `VITE_APP_BASE_URL`（边端 Node-RED 提供），与日志端点互不影响。

## 2. 接口契约（Pad → 边缘端）

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
  "sourceName": "/智谱园区/北区/1F/茶水间/大厅墙面屏/light/单控",
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
| sourceName | string | 操作来源，按第 3 节规则动态拼接 |
| floorCode | string | 楼层 code（如 3F） |
| floorAreaCode | string | 楼层区域 code（如 ZB） |
| areaCode | string | 设备区/房间 code，即 MQTT 主题的 deviceCode 段 |
| deviceType | string | 设备域，当前 `light`、`airconditioning`、`blind`、`door`、`freshair`、`socket`，后续可能继续扩展，勿做白名单强校验（或做成可扩展枚举） |
| actionTopic | string | **实际发布的 MQTT 控制主题**（原始完整 topic，群控含逗号拼接的 names 段） |
| actionData | string | **实际发布的 MQTT payload 的 JSON 字符串**（原样记录，勿解析） |

## 3. sourceName 拼接规则

sourceName 按实际名称动态拼接：

```
/{spaceName}/{floorAreaName}/{floorName}/{areaName}/{padName}/{deviceType}/{群控|单控}
```

- 名称取自 pad 绑定信息（initData），某段名称缺失时回退对应 code（保证各段非空）；
- `padName` 为设备配置中 pad 的名称（与心跳主题 `/iot/status/pad/...` 末段一致），设备配置未到达时该段为空；
- 末段：群控操作（照明全开/全关、空调开关）为「群控」，其余（单灯、空调温度/模式/风速/单机开关、窗帘、门禁、新风、插座）为「单控」；
- 示例：`/智谱园区/北区/1F/茶水间/大厅墙面屏/light/单控`。

## 4. 群控语义（重要）

- Pad 对群控**只发送 1 条日志记录**（与受控设备数无关），`actionTopic` 为**实际群控主题**（含逗号拼接的 names 段，不拆成单设备主题），`sourceName` 为对应的「群控」值。
- 后端按条入库即可，不需要聚合、不需要去重拆分。

## 5. Pad 端行为约定（边缘端实现需知）

- Pad 每条控制指令发出后**同步发一条日志请求**，失败静默、不弹窗、**不重试**。
- 因此日志允许少量丢失（断网瞬间、边缘端不可达），但不允许影响控制指令本身。

## 6. 边缘端实现要求

1. 实现端点 `GET /api/device/doAddDeviceControlLog`。
2. 必填校验（query 参数缺一返回 400）：`spaceCode`、`sourceName`、`deviceType`、`actionTopic`、`actionData`。
3. **CORS**：Pad 页面 origin（现场部署地址，如 `http://10.80.142.27:1880`）与边缘端服务地址通常不同源，边缘端需配置跨域：
   - GET 响应带 `Access-Control-Allow-Origin`（按现场 pad origin 精确配置，或 `*`）；
   - Pad 的 axios 实例默认携带 `Content-Type: application/json;charset=UTF-8`（非简单头），浏览器会先发 **OPTIONS 预检**——边缘端对 OPTIONS 需返回 200/204 并带 `Access-Control-Allow-Methods: GET, OPTIONS`、`Access-Control-Allow-Headers: Content-Type`；
   - Pad 请求当前不带 Authorization；如需鉴权请先另行约定（不推荐把凭据放进 pad 配置）。
4. **转发云端**：边缘端收到后经**其自有云通道**转发云端落库（query 参数原样透传，勿解析、勿重组）。转发可异步、可重试，与 Pad 请求响应解耦。
5. 返回 `{"code":0,"message":"ok"}`（先响应 Pad，再异步转发云端）。
6. 云端侧实现同样的落库端点（服务端到服务端调用，无 CORS 问题），建议表结构：

```sql
CREATE TABLE device_control_log (
  id             BIGSERIAL PRIMARY KEY,
  space_code     VARCHAR(64),
  source_type    VARCHAR(16),
  source_name    VARCHAR(256),
  floor_code     VARCHAR(64),
  floor_area_code VARCHAR(64),
  area_code      VARCHAR(64),
  device_type    VARCHAR(32),
  action_topic   TEXT,
  action_data    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

7. Pad 不重试、无幂等要求；如边缘端补发机制导致重复，允许重复记录（可选按 action_topic + action_data + created_at 窗口去重）。

## 7. 边端生产配置（VITE_EDGE_BASE_URL）

现场 pad 通过 `public/config.js`（部署时以 ConfigMap 挂载，**无需重新构建镜像**）覆盖构建期变量：

```js
window.config = {
  VITE_APP_BASE_URL: "http://10.80.142.27:1880",   // 边端 Node-RED（空间结构接口，保持不变）
  VITE_EDGE_BASE_URL: "http://<边缘端服务地址>",     // 日志端点走这里（边缘端再经自有通道转发云端）
  // VITE_MQTT_URL: "ws://...",
  // VITE_MQTT_USERNAME: "...",
  // VITE_MQTT_PASSWORD: "...",
}
```

- 修改后 pad 页面**刷新即生效**（`index.html` 加载 `config.js` 带时间戳参数防缓存），无需重启 pad、无需重启开发/生产服务。
- `VITE_EDGE_BASE_URL` 末尾不要带 `/api/...` 路径，只填根地址；pad 会拼 `{根地址}/api/device/doAddDeviceControlLog`。
- 不配置该项时日志请求回退到 `VITE_APP_BASE_URL`（边端 Node-RED，未实现该端点时会 404 并静默丢弃）。

## 8. 联调验收清单

1. **curl 模拟 Pad → 边缘端**：

```bash
curl -G "http://<edge-host>/api/device/doAddDeviceControlLog" \
  --data-urlencode "spaceCode=SMART" \
  --data-urlencode "sourceType=PAD" \
  --data-urlencode "sourceName=/智谱园区/北区/1F/茶水间/大厅墙面屏/light/单控" \
  --data-urlencode "floorCode=3F" \
  --data-urlencode "floorAreaCode=ZB" \
  --data-urlencode "areaCode=3FBNW" \
  --data-urlencode "deviceType=light" \
  --data-urlencode "actionTopic=/iot/action/light/SMART/ZB/3F/3FBNW/灯1" \
  --data-urlencode 'actionData={"action":"on"}'
```

预期：边缘端返回 200；云端落库一条，字段与 query 参数一一对应。

2. **浏览器跨域预检**（pad 页面 origin 与边缘端不同源时必测）：

```bash
curl -i -X OPTIONS "http://<edge-host>/api/device/doAddDeviceControlLog" \
  -H "Origin: http://10.80.142.27:1880" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type"
```

预期：返回 200/204，且带 `Access-Control-Allow-Origin` / `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers`。

3. **Pad 实测**：
   - 单控一盏灯 → 1 条日志，sourceName 按第 3 节规则拼接、末段「单控」，浏览器 Network 里请求直发 `VITE_EDGE_BASE_URL` 域名；
   - 照明全开/全关（N 盏灯）→ 1 条日志，sourceName 末段「群控」，actionTopic 为实际群控主题（含 names）；
   - 空调开关 → sourceName 末段「群控」；调温/调风速 → 末段「单控」。
4. **异常路径**：停掉边缘端 → pad 控制不受影响，日志静默失败（console 有 `[logClk] failed to post control log` 警告），恢复后下一条正常。
