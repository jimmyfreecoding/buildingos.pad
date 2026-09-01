# 空间地图文件端点开发指南（边缘端侧）

> 适用：buildingos.pad wallPad 2.5D 地图加载链路。Pad 端已完成（`src/api/spaceFile.ts` → `GET {VITE_EDGE_BASE_URL}/api/space/getSpaceFiles`，未配置时回退 `{VITE_APP_BASE_URL}` 即边端 Node-RED）。地图文件由**边缘网关同步**该 pad 绑定空间的类型为 `map` / `mapimage` 的文件，经本端点提供清单，文件字节由 Pad 按 `url` 直连下载。**Pad 直连边缘端端点，云端不与 Pad 直接通信。**

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
| files[].type | string | 文件类型，仅两种：`map` = 2.5D 地图数据文件（.acmap 加密格式）；`mapimage` = 静态图片（jpg/png），2.5D 无法使用时的降级图 |
| files[].url | string | 文件下载地址，**完整绝对 URL**（Pad 不做拼接），必须可被 Pad 浏览器直连 GET |
| files[].size | number | 字节数（可选，用于日志） |
| files[].md5 | string | 内容哈希（可选，建议提供，便于边缘端做缓存控制） |

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
- 两者同时存在时**优先 `map`**；`map` 下载或初始化失败自动落到 `mapimage`。
- 失败静默：清单获取失败不弹窗；清单**成功**的结果按会话缓存（同一绑定空间只查一次），清单**失败不缓存**（用户下次打开子页时重试一次，即每次打开页面最多 1 次请求，无重试风暴）。
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
- **匹配规则**（与上文 2.1 对齐，按现有 file_asset 数据模型落地）：
  - 数据源：边缘 PG `file_asset`（filesync 同步的 `map` / `mapImage`，`deleted=false`）；
  - 必选 `spaceCode`，缺失返回空清单（code 0）；
  - `floorCode` 非空时按文件名过滤：`{floorCode}.{ext}` 或 `{时间戳}_{floorCode}.{ext}`（正则 `^(?:\d+_)?{floorCode}\.[^.]+$`，大小写不敏感）；
  - `floorAreaCode` / `deviceCode` 当前仅作绑定上下文保留，不参与匹配（file_asset 无这两维）。
- **files[].url**：返回本端绝对地址 `http://{host}/api/asset/file?spaceCode=&asset_type=&file=`（同源，Pad 无需 CORS）；Pad 端 `resolveUrl` 对相对路径也有兼容。
- **CORS**：边缘后端 `enableCors()` 全局开启，跨源开发（Pad dev 5174 → 边缘）亦可直连。
- **命名约定（上线前提）**：素材库上传地图文件时，文件名必须含楼层码（如 `3F.acmap`、`173..._3F.acmap`、`3F.png`），否则匹配不到该楼层、Pad 走静态兜底。
