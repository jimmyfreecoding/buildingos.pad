# 空间地图文件端点开发指南（边缘端侧）

> 适用：buildingos.pad wallPad 2.5D 地图加载链路，以及会议门牌等按 `materialId` 取云端素材的 pad（本清单接口 2026-09 起返回空间内**全部**素材类型）。Pad 端已完成（`src/api/spaceFile.ts` → `GET {VITE_EDGE_BASE_URL}/api/space/getSpaceFiles`，未配置时回退 `{VITE_APP_BASE_URL}` 即边端 Node-RED）。地图文件由**边缘网关同步**该 pad 绑定空间的类型为 `map` / `mapimage` 的文件，经本端点提供清单，文件字节由 Pad 按 `url` 直连下载。**Pad 直连边缘端端点，云端不与 Pad 直接通信。**

## 1. 架构

```
Pad (前端)
  ├─ GET {VITE_EDGE_BASE_URL}/api/space/getSpaceFiles?{query 参数}
  │       ↓
  │   边缘端端点（边缘端服务，非 Node-RED）→ 返回该 pad 绑定空间已同步的文件清单
  │
  └─ GET {file.url}（清单中返回的 url，Pad 直连下载文件字节）
          ↓
      边缘端静态文件服务（CORS 需放行 Pad 源，见第 3 节）
```

- `VITE_EDGE_BASE_URL` 为空时回退到 `VITE_APP_BASE_URL`（边端 Node-RED），仅用于开发环境联调，生产必须配置为边缘端服务地址。
- Pad 端对该链路**静默失败**：清单获取失败或文件下载失败时自动降级（见第 4 节兜底链），不弹窗、不重试风暴。

## 2. 接口契约（Pad → 边缘端）

### 2.1 文件清单查询

| 项 | 值 |
|---|---|
| Method | GET |
| Path | `/api/space/getSpaceFiles` |
| 参数位置 | URL query string（无请求体） |
| 成功响应 | HTTP 200，body `{"code":0,"message":"ok","data":{"files":[...]}}` |
| 失败响应 | 非 200（Pad 端失败静默、降级，见第 4 节） |

请求参数（GET query，Pad 实际发送的最终格式）：

```json
{
  "spaceCode": "SMART",
  "floorAreaCode": "ZB",
  "floorCode": "3F",
  "deviceCode": "3FBNW"
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| spaceCode | string/number | 属地编码（如 SMART） |
| floorAreaCode | string | 楼层区域 code（如 ZB），可能为空字符串 |
| floorCode | string | 楼层 code（如 3F），可能为空字符串 |
| deviceCode | string | 设备区/房间 code，即 MQTT 主题的 deviceCode 段，可能为空字符串 |

> 四字段均取自 pad 绑定信息（initData，与 `src/stores/space.ts` spaceContext 同构）。边缘端按这四段（可容忍某段为空）匹配该 pad 绑定空间已同步的文件，**返回结果以绑定空间（最细粒度取 deviceCode，缺省逐级向上）为准**。

成功响应 body：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "files": [
      {
        "id": "f_1001",
        "name": "3F.acmap",
        "type": "map",
        "url": "http://{edge-host}/files/space/SMART/ZB/3F/3FBNW/map/3F.acmap",
        "size": 40729,
        "md5": "a1b2c3d4e5f6..."
      },
      {
        "id": "f_1002",
        "name": "3F.png",
        "type": "mapimage",
        "url": "http://{edge-host}/files/space/SMART/ZB/3F/3FBNW/mapimage/3F.png",
        "size": 102400
      }
    ]
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| files | array | 该绑定空间已同步的文件列表；无文件时返回空数组 `[]`（仍为 code 0） |
| files[].id | string/number | 文件唯一标识 |
| files[].name | string | 文件名（含扩展名） |
| files[].type | string | **file_asset.asset_type 原样回传**。地图区只用两种：`map` = 2.5D 地图数据文件（.acmap 加密格式）；`mapimage` = 静态图片（jpg/png），2.5D 无法使用时的降级图。其余类型（`bookingqrcode` / `logo` / `buildingImg` / `homeImage` …，见 `filesync.controller.ts` 的 typeMap）同样出现在清单里，供会议门牌等按 `materialId` 定位素材 —— **2026-09 起不再筛成只剩地图两类**：筛掉会导致 Pad 只能退回 `display_json` 里的 url，而那是云端路径（edge 上 `/pad/` 是静态 SPA，取回 index.html，图片必然失败） |
| files[].url | string | 文件下载地址，**完整绝对 URL**（Pad 不做拼接），必须可被 Pad 浏览器直连 GET |
| files[].size | number | 字节数（可选，用于日志） |
| files[].md5 | string | 内容哈希（可选，建议提供，便于边缘端做缓存控制） |

### 2.2 Pad 显示配置查询（`/api/pad/display`）

Pad 先查这个接口判断"本 pad 有没有配地图素材"，再决定是否去拉 2.1 的素材清单。

| 项 | 值 |
|---|---|
| Method | GET |
| Path | `/api/pad/display` |
| 参数 | `spaceCode`（必填）、`deviceCode`（必填，= pad 设备 code，如 `WALLPAD-…`，由 MQTT 设备配置响应的 `pad[0].code` 提供） |
| 响应 | `{ code:'200', msg:'success', data:{ spaceCode, deviceCode, padType, displayJson, materialTypes, displaySource } }` |

**`displayJson` 与 `content_config` 的关系（易踩坑）**：这两张表不是同一个东西。

- `content_config`：**配置源表**（位置 × padType 的素材配置，`display_json` 是一个数组），云端保存配置时写入，并按行复制同步到边端；
- `iot_device.display_json`：**级联物化结果**（每台设备的最终结果，`{ [materialType]: {…} }`），由云端 `pad.service.materialize()` 计算后写入 iot_device；
- `/api/pad/display` 读的是 **`iot_device.display_json`**。因此「`content_config` 同步成功」**不等于**该 pad 的 display 有值——若云端物化没命中这台设备（如设备 `floorAreaType` 不在 `area/room` 内、`spaceCode/floorCode/floorAreaCode/areaCode` 与配置行对不上），或物化结果没复制到边端，display 就是空的，Pad 会显示默认图。

**边端兜底（2026-11 起）**：`iot_device.display_json` 为空时，边端用**已同步的 `content_config`** 现场级联计算，级联优先级 `global < space < floor < area < device`（与云端 `materialize` 的分级一致），并用 `displaySource` 标识来源：

| displaySource | 含义 |
|---|---|
| `iot_device` | 用了云端物化结果（正常路径） |
| `content_config` | 物化结果为空，边端用同步来的配置表现场级联 |
| `none` | 两边都没有该 pad 的地图配置 → Pad 显示默认图 |

实现位置：`edge/server/src/filesync/filesync.controller.ts` → `getPadDisplay()` / `resolvePadDisplay()`。

## 3. 文件下载与 CORS

- Pad 用原生 `fetch(url)` 下载 `map` 文件字节（.acmap 为 AES 加密二进制，**原样传输**，Pad 侧 SDK 自行解密），`mapimage` 直接作为 `<img src>` 加载。
- 文件服务必须对 Pad 所在源放行 CORS：
  - 响应头 `Access-Control-Allow-Origin` 按实际 Pad 部署源配置（开发环境如 `http://localhost:5174`，生产为 pad 页面部署域名）；
  - 若 Pad 的 fetch 触发预检（含自定义头时），需同时处理 `OPTIONS` 请求并返回 `Access-Control-Allow-Methods: GET`、`Access-Control-Allow-Headers` 及 `Access-Control-Max-Age`；
  - 建议文件 GET 请求本身不要求任何自定义头，避免预检，降低边缘端实现成本。
- 缓存控制建议：文件内容不变时返回 `ETag`/`Cache-Control`；Pad 侧每次会话仅下载一次，不会高频拉取。

## 4. Pad 端行为约定（边缘端实现需知）

- **兜底链**（严格按序）：
  1. 清单中存在 `type=map` 且下载 + 地图初始化成功 → 渲染 2.5D 地图；
  2. 否则清单中存在 `type=mapimage` → 显示该图片；
  3. 否则 → 显示 Pad 内置静态兜底（zeekr 模板内置楼层图 / default 模板 CSS 示意图）。
- **配置驱动（Pad 侧，2026-11 起）**：地图区只在**本 pad 已配置地图素材**时才加载——判断依据是 `/api/pad/display` 的 `displayJson` 里有没有 `map`/`mapImage`（即云端 `content_config` 级联物化到 `iot_device.display_json` 的结果）。未配置、或配置暂时取不到（pad code 未经 MQTT 到达 / 接口失败）→ 直接显示默认图，**不拉素材清单**、不去猜素材库里的其他素材（`mapViewer.ts` 的 `REQUIRE_ASSIGNED`，置 false 可退化为宽松模式）。
- **素材定位**：Pad **不再传 `floorCode`**（避免边端按「文件名必须正好是楼层码」把合法素材筛掉），改为取本 pad 绑定空间的**全量** `map/mapImage` 清单后自行定位：
  1. 配置里的 `materialId` ↔ `files[].id`（边端 id = `f_{file_asset.id}`，与云端 `content_config.materialId` 同源）→ 精确命中本 pad 配置的素材；**这是同名楼层的唯一可靠区分手段**（同一园区多栋楼都有 `3F`，文件名无法区分）；
  2. 配置里没有 `materialId`（旧数据）时才退回「文件名含本 pad 楼层码 token」（前后须为分隔符/边界，`1F` 不会命中 `11F`/`B1F`）；全空间只有一个地图素材时直接使用该素材；
  3. 配了素材但清单里没有 → 走默认图，并在 `mapState.reason/detail` 标记 `materialId-miss`（该素材尚未同步到边端）。
- 诊断：Pad 页面控制台会打印 `[mapViewer]` 决策日志；F12 执行 `copy(window.__wallpadMap)` 可导出 `{ status, reason, detail }`（`detail.displaySource` 标识 displayJson 来自 `iot_device` 还是边端现场级联的 `content_config`；`reason` 取值：`map-asset` / `image-asset` / `display-gate` / `display-unknown` / `no-asset` / `map-init-failed` / `map-timeout` / `image-load-failed` / `no-space-context` / `error`）。
- 显示优先级由 `displayJson` 决定：配了 `map` → 优先 2.5D（失败/20s 超时降级图片）；只配了 `mapImage` → 优先图片。
- 缓存：清单/配置结果 60s TTL，空清单与失败结果不缓存；每次打开子页最多 1 次请求，长开机的壁挂屏 1 分钟内自愈，不必整页刷新。
- Pad 端 20s 超时看门狗：地图初始化超过 20s 无结果（SDK 无错误回调）自动降级到静态兜底。

## 5. 边缘端实现要求

- 按 2.1 的四段绑定同步并组织文件；`map` 文件即原 2.5D 平台导出的 `.acmap`（加密格式，勿转码、勿压缩包装）。
- 同一绑定空间可同时存在 `map` 与 `mapimage`（Pad 端自选优先级），也可只有其一。
- 文件同步更新后（同名覆盖或新增），清单接口返回最新文件即可；Pad 每次会话仅取一次，如需立即生效可更换文件名/url。
- 接口不要求鉴权（与 doAddDeviceControlLog 端点一致，Pad 无登录态），如有安全要求请在边缘端网络层（内网隔离/防火墙）处理。

## 6. 联调验收清单

```bash
# 1. 清单查询
curl "http://{edge-host}/api/space/getSpaceFiles?spaceCode=SMART&floorAreaCode=ZB&floorCode=3F&deviceCode=3FBNW"
# 期望：HTTP 200，{"code":0,"message":"ok","data":{"files":[...]}}

# 2. 无文件场景（未同步该空间）
# 期望：HTTP 200，{"code":0,"message":"ok","data":{"files":[]}}（Pad 端走静态兜底）

# 3. 文件下载（含 CORS 预检模拟）
curl -i -X OPTIONS "http://{edge-host}/files/space/SMART/ZB/3F/3FBNW/map/3F.acmap" \
  -H "Origin: http://localhost:5174" -H "Access-Control-Request-Method: GET"
# 期望：返回 Allow-Origin/Methods/Headers 头

# 4. Pad 端联调
# - 清单含 map → wallPad 照明/空间/环境子页右侧显示 2.5D 地图，当前绑定房间高亮
# - 仅含 mapimage → 显示图片
# - 均无 → 显示内置静态兜底，页面无报错弹窗
```

## 7. 边缘端实现记录（2026-09，buildingos.ai edge/server）

- **已实现**：`edge/server/src/filesync/filesync.controller.ts` 新增 `GET /api/space/getSpaceFiles`（同文件中的 `/api/asset/file` 即文件字节端点）。
- **2026-09 变更**：清单查询去掉 `asset_type IN ('map','mapImage')` 过滤，改为返回该空间 `deleted = FALSE` 的全部素材；`files[].type` 改为 `file_asset.asset_type` 原样回传（此前非地图素材会被标成 `mapimage`，地图区「未配 materialId」的旧数据兜底会误选到二维码/logo）。字节仍由 `/api/asset/file` 提供；素材本地路径、sha256 校验、同步逻辑均未变。
- **匹配规则**（与上文 2.1 对齐，按现有 file_asset 数据模型落地）：
  - 数据源：边缘 PG `file_asset`（filesync 同步的 `map` / `mapImage`，`deleted=false`）；
  - 必选 `spaceCode`，缺失返回空清单（code 0）；
  - `floorCode` 非空时按文件名过滤：`{floorCode}.{ext}` 或 `{时间戳}_{floorCode}.{ext}`（正则 `^(?:\d+_)?{floorCode}\.[^.]+$`，大小写不敏感）；
  - `floorAreaCode` / `deviceCode` 当前仅作绑定上下文保留，不参与匹配（file_asset 无这两维）。
- **files[].url**：返回**相对路径** `/api/asset/file?spaceCode=&asset_type=&file=`，Pad 端 `resolveUrl` 会以 `VITE_EDGE_BASE_URL`（带端口，如 `http://<edge>:7828`）补全。**不要**用 req.host 拼绝对地址——边缘 nginx `proxy_set_header Host $host` 会丢端口，导致下载缺 `:7828`。
- **CORS**：边缘后端 `enableCors()` 全局开启，跨源开发（Pad dev 5174 → 边缘）亦可直连。
- **命名约定（建议，不再是硬前提）**：素材库上传地图文件时，建议文件名含楼层码（如 `3F.acmap`、`173..._3F.acmap`、`3F.png`）。**2026-11 起 Pad 侧已改为按 `materialId` 精确关联**（传空 `floorCode` 取全量清单），因此清洗后不等于楼层码的命名（如 `1758..._3F-平面图.png`）也能正常显示；楼层码匹配仅作为「未做配置」时的兜底。注意：云端上传会把文件名重命名为 `{时间戳}_{清洗后的原名}{扩展名}`（非 `\w` 字符替换为 `_`）。
