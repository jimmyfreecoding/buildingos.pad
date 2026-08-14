# Pad 部署与运行时配置方案

## 架构概述

```
buildingos.pad 代码仓库
        │
        │  git push to main
        ▼
┌──────────────────────────────────┐
│  GitHub Actions deploy.yml       │
│  npm build → dist/ → pad.zip    │
│  FROM scratch ADD pad.zip        │
│  push → pad-zip:latest (CNB)     │
└──────────────────────────────────┘
        │
        │  触发
        ▼
┌──────────────────────────────────────────────────────┐
│  buildingos.ai GitHub Actions                        │
│                                                      │
│  ┌─ build-web.yml (统一部署)                          │
│  │  Dockerfile.web: pad-zip ─┐                       │
│  │  合并 os/meetingpad/wallpad/h5/pad → nginx 镜像    │
│  │  push → buildingos-web:latest                     │
│  │                                                    │
│  └─ build-edge-frontend.yml (边缘端)                  │
│     Dockerfile.frontend: pad-zip ─┐                   │
│     合并 edge-web + pad → nginx 镜像                   │
│     push → edge-frontend:latest                      │
└──────────────────────────────────────────────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐     ┌───────────────────┐
│  统一部署       │     │  边缘端部署         │
│  buildingos-   │     │  edge-frontend    │
│  web:latest    │     │  :latest          │
│  端口 80       │     │  端口 7828         │
└───────────────┘     └───────────────────┘
```

核心原则：**同一镜像 + 外部配置注入**。镜像中的 `config.js` 为注释状态的默认值，运行时由部署平台注入各站点专属配置。

---

## 运行时配置机制

### 前端代码读取顺序

`src/config/servers.ts`：

```
window.config (运行时注入) → import.meta.env (构建时) → 空值
```

### 配置模板

部署时在宿主机创建 `pad-config.js`，由容器运行时挂载到 `/usr/share/nginx/html/pad/config.js`：

```js
// configs/pad-config.js — 各站点独立维护
window.config = {
  VITE_APP_BASE_URL: "http://10.205.66.7:1880",
  VITE_MQTT_URL: "ws://10.205.66.8:1884",
  VITE_MQTT_USERNAME: "zeekr_iot_platform",
  VITE_MQTT_PASSWORD: "your_password_here",
}
```

镜像内置的 `public/config.js` 中所有值均为注释状态，只有被外部 `pad-config.js` bind-mount 覆盖后才生效。

---

## 部署模式一：统一部署 (docker-compose.1nodes.yml)

### 适用场景

云端一体机部署，所有前端（os/meetingpad/wallpad/h5/pad）共用一个 nginx 容器。

### 镜像构建

`docker/Dockerfile.web` 新增 pad 步骤：

```dockerfile
FROM docker.cnb.cool/geeqee2025/buildingos.img/pad-zip:latest AS pad-zip

# 在 nginx 阶段:
COPY --from=pad-zip /pad.zip /tmp/
RUN unzip -q /tmp/pad.zip -d /usr/share/nginx/html/pad
```

### nginx.conf 新增

```nginx
# ============================================================
# Pad (开关屏 / 智能面板)
# ============================================================
location = /pad/config.js {
    alias /usr/share/nginx/html/pad/config.js;
    add_header Cache-Control "no-store";
}

location = /pad { return 301 /pad/; }
location /pad/ {
    alias /usr/share/nginx/html/pad/;
    location ~* /pad/assets/ {
        alias /usr/share/nginx/html/pad/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /pad/index.html {
        alias /usr/share/nginx/html/pad/index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    try_files $uri $uri/ /pad/index.html;
}
```

> **说明**：`location = /pad/config.js` 放在外层 server block，nginx 的 `=` 精确匹配优先于 `/pad/` 前缀匹配，config.js 不经过 SPA fallback 逻辑。

### docker-compose.1nodes.yml 新增

```yaml
# web 服务 volumes 新增:
- ./configs/pad-config.js:/usr/share/nginx/html/pad/config.js:ro
```

### 部署流程

```bash
# 初次部署
cd /opt/buildingos/buildingos.ai
cat > docker/configs/pad-config.js << 'EOF'
window.config = {
  VITE_APP_BASE_URL: "http://10.205.66.7:1880",
  VITE_MQTT_URL: "ws://10.205.66.8:1884",
  VITE_MQTT_USERNAME: "zeekr_iot_platform",
  VITE_MQTT_PASSWORD: "",
}
EOF

docker compose -f docker/docker-compose.1nodes.yml pull web
docker compose -f docker/docker-compose.1nodes.yml up -d web
```

### 部署后修改配置

```bash
# 1. 编辑宿主机配置文件
vi /opt/buildingos/buildingos.ai/docker/configs/pad-config.js

# 2. 重载 nginx 使新配置生效
docker exec buildingos-web-1node nginx -s reload

# 3. 验证
curl http://localhost/pad/config.js
```

> **无需重建镜像，无需重启容器。** config.js 通过 bind-mount 实时反映宿主机文件内容，nginx reload 即可。

### 自动更新机制

```
buildingos.pad push main
  → pad-zip:latest 镜像更新
  → 触发 buildingos.ai build-web.yml
  → buildingos-web:latest 重建（包含最新 pad）
  → 服务器执行: docker compose pull web && docker compose up -d web
```

---

## 部署模式二：边缘端部署 (edge/docker/docker-compose.yml)

### 适用场景

独立边缘端服务器，运行 edge-frontend 镜像（Vue 管理后台 + pad 面板合一）。

### 镜像构建

`edge/docker/Dockerfile.frontend` 改为多阶段：

```dockerfile
# 阶段 1: pad 静态文件（从 zip 镜像提取）
FROM docker.cnb.cool/geeqee2025/buildingos.img/pad-zip:latest AS pad-zip

# 阶段 2: edge 前端构建
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 阶段 3: nginx 运行时
FROM nginx:stable-alpine
RUN apk add --no-cache unzip

# edge 前端
COPY --from=build-stage /app/dist /usr/share/nginx/html

# pad 面板
COPY --from=pad-zip /pad.zip /tmp/
RUN unzip -q /tmp/pad.zip -d /usr/share/nginx/html/pad && rm /tmp/pad.zip

COPY nginx.conf /etc/nginx/conf.d/default.conf

# CentOS 7.4 老内核兼容
RUN sed -i 's|/var/run/nginx.pid|/tmp/nginx.pid|g' /etc/nginx/nginx.conf

EXPOSE 80
USER root
CMD ["nginx", "-g", "daemon off;"]
```

### edge/web/nginx.conf 新增

```nginx
# ============================================================
# Pad (开关屏 / 智能面板)
# ============================================================
location = /pad/config.js {
    alias /usr/share/nginx/html/pad/config.js;
    add_header Cache-Control "no-store";
}

location = /pad { return 301 /pad/; }
location /pad/ {
    alias /usr/share/nginx/html/pad/;
    location ~* /pad/assets/ {
        alias /usr/share/nginx/html/pad/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /pad/index.html {
        alias /usr/share/nginx/html/pad/index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    try_files $uri $uri/ /pad/index.html;
}
```

### edge/docker/docker-compose.yml 新增

```yaml
# frontend 服务 volumes 新增:
- ./configs/pad-config.js:/usr/share/nginx/html/pad/config.js:ro
```

### pad-config.js 维护方式

`edge/docker/configs/pad-config.js` **随代码仓库提交**（与统一部署模式不同），edge 端 `git pull` 后经 bind-mount 直接生效，不走 deploy 脚本传输。

**部署新边缘站点前必须手动修改该文件**，再提交代码：

- `VITE_MQTT_URL`：指向该站点 EMQX WebSocket，格式 `ws://<edge-ip>:8083/mqtt`（edge EMQX 默认 ws 监听 8083）
- `VITE_MQTT_USERNAME` / `VITE_MQTT_PASSWORD`：与该站点 EMQX 用户库一致（edge 默认 `buildingos` / `buildingos_edge_2024`，见 `emqx-bootstrap-users.csv`）
- `VITE_APP_BASE_URL`：`/api`，经 edge nginx 反代到 edge 后端，无需修改

> **无需赋权**：edge-frontend 镜像内 nginx worker 以 root 运行（Dockerfile.frontend 已处理），宿主机 git pull 生成的文件权限不影响读取，不产生手工 chmod 步骤。

当前站点（edge 主机 10.80.142.27）配置示例：

```js
// edge/docker/configs/pad-config.js
window.config = {
  VITE_APP_BASE_URL: "/api",
  VITE_MQTT_URL: "ws://10.80.142.27:8083/mqtt",
  VITE_MQTT_USERNAME: "buildingos",
  VITE_MQTT_PASSWORD: "buildingos_edge_2024",
}
```

### 部署流程

```bash
# 1. 按上文修改仓库中 edge/docker/configs/pad-config.js（VITE_MQTT_URL 指向新站点）

# 2. 提交代码

# 3. 边缘端拉取代码并部署
cd /opt/buildingos/buildingos.ai/edge/docker
git pull
docker compose pull frontend
docker compose up -d frontend
```

### 部署后修改配置

```bash
# 1. 编辑宿主机文件（bind-mount 实时生效，nginx 对 config.js 设 no-store，刷新浏览器即可）
vi /opt/buildingos/buildingos.ai/edge/docker/configs/pad-config.js

# 2. 改动必须提交回代码仓库，避免下次 git pull 被覆盖

# 3. 验证
curl http://localhost:7828/pad/config.js
```

> **同样无需重建镜像。**

### 自动更新机制

```
buildingos.pad push main
  → pad-zip:latest 镜像更新
  → 触发 buildingos.ai build-edge-frontend.yml
  → edge-frontend:latest 重建（包含最新 pad + 最新 edge web）
  → 边缘端执行: docker compose pull frontend && docker compose up -d frontend
```

Edge 前端 CI 触发条件需新增 `repository_dispatch` 或由 pad workflow 通过 `gh workflow run` 触发：

```yaml
# build-edge-frontend.yml 新增触发
on:
  push:
    paths: [edge/web/**, edge/docker/Dockerfile.frontend]
  repository_dispatch:
    types: [pad-updated]
  workflow_dispatch:
```

pad 的 deploy.yml 在推送 pad-zip 后额外调用：

```bash
gh workflow run build-edge-frontend.yml --repo jimmyfreecoding/buildingos.ai --ref main
```

---

## 部署模式三：Kubernetes

### 适用场景

K8s 集群部署，通过 ConfigMap + Deployment 实现配置注入和滚动更新。

### 资源清单

#### 1. ConfigMap — pad-config

```yaml
# k8s/pad-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pad-config
  namespace: buildingos
data:
  config.js: |
    window.config = {
      VITE_APP_BASE_URL: "http://api.buildingos.svc.cluster.local:3000",
      VITE_MQTT_URL: "ws://emqx.buildingos.svc.cluster.local:8083/mqtt",
      VITE_MQTT_USERNAME: "zeekr_iot_platform",
      VITE_MQTT_PASSWORD: "",
    }
```

#### 2. Deployment — 挂载 ConfigMap 到 pad 子路径

```yaml
# k8s/pad-deployment.yaml (统一部署 web Deployment 的片段)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: buildingos-web
  namespace: buildingos
spec:
  replicas: 2
  selector:
    matchLabels:
      app: buildingos-web
  template:
    metadata:
      labels:
        app: buildingos-web
    spec:
      containers:
        - name: web
          image: docker.cnb.cool/geeqee2025/buildingos.img/buildingos-web:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 80
          volumeMounts:
            # 统一部署: 挂载到 os/
            - name: os-config
              mountPath: /usr/share/nginx/html/os/config.js
              subPath: config.js
            # 统一部署: 挂载到 h5/
            - name: h5-config
              mountPath: /usr/share/nginx/html/h5/config.js
              subPath: config.js
            # pad 配置注入点
            - name: pad-config
              mountPath: /usr/share/nginx/html/pad/config.js
              subPath: config.js
      volumes:
        - name: os-config
          configMap:
            name: web-config
        - name: h5-config
          configMap:
            name: web-config
        - name: pad-config
          configMap:
            name: pad-config
```

#### 3. Edge 前端 Deployment

```yaml
# k8s/edge-frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-frontend
  namespace: buildingos
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edge-frontend
  template:
    spec:
      containers:
        - name: frontend
          image: docker.cnb.cool/geeqee2025/buildingos.img/edge-frontend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 80
          volumeMounts:
            - name: pad-config
              mountPath: /usr/share/nginx/html/pad/config.js
              subPath: config.js
      volumes:
        - name: pad-config
          configMap:
            name: pad-config
```

> **关键**：使用 `subPath: config.js` 挂载单个文件而非整个目录。ConfigMap 更新后 K8s 会自动同步到挂载点（默认约 60-90 秒）。

### 部署流程

```bash
# 初次部署
kubectl apply -f k8s/pad-configmap.yaml
kubectl apply -f k8s/pad-deployment.yaml

# 或使用 Helm / Kustomize
kubectl apply -k k8s/overlays/production/
```

### 部署后修改配置

```bash
# 方式一：直接编辑 ConfigMap
kubectl edit configmap pad-config -n buildingos
# 修改 VITE_MQTT_URL 等值，保存即生效

# 方式二：从文件更新
kubectl create configmap pad-config \
  --from-file=config.js=pad-config.js \
  --namespace buildingos \
  --dry-run=client -o yaml | kubectl apply -f -

# 等待 ConfigMap 同步到 Pod（约 60-90 秒）
# 然后滚动重启 Pod 使 nginx 重新读取配置
kubectl rollout restart deployment/buildingos-web -n buildingos
```

```bash
# 方式三（零停机）：在 Pod 内直接 reload nginx
# 适用于只需要刷新配置不需更换镜像的场景
for pod in $(kubectl get pods -n buildingos -l app=buildingos-web -o name); do
  kubectl exec -n buildingos $pod -- nginx -s reload
done
```

> **注意**：如果使用的是 `imagePullPolicy: Always`，Pod 重启时会自动拉取最新镜像，实现镜像 + 配置同步更新。

### 自动更新机制

```
buildingos.pad push main
  → pad-zip:latest 更新
  → buildingos-web:latest / edge-frontend:latest 重建

K8s 拉取策略:
  imagePullPolicy: Always → 新 Pod 自动拉最新镜像
  imagePullPolicy: IfNotPresent → 需手动触发

推荐方案:
  1. CI 最后一步通过 kubectl 或 Keel/Flux 自动触发滚动更新
  2. 或使用 imagePullPolicy: Always + 定期重启（适合低频更新）
  3. 或引入 GitOps (ArgoCD/Flux) 监听镜像 tag 变化自动同步
```

---

## 三种模式对比

| | 统一部署 | 边缘端 | Kubernetes |
|---|---|---|---|
| **镜像** | buildingos-web | edge-frontend | buildingos-web / edge-frontend |
| **配置注入** | bind-mount 宿主机文件 | bind-mount 宿主机文件 | ConfigMap subPath 挂载 |
| **修改配置** | 改宿主机文件 → nginx reload | 改宿主机文件 → nginx reload | `kubectl edit configmap` → rollout restart |
| **需重建镜像** | 否 | 否 | 否 |
| **自动拉取** | `docker compose pull` | `docker compose pull` | `imagePullPolicy: Always` |
| **访问地址** | `http://host/pad/` | `http://edge-ip:7828/pad/` | `https://domain/pad/` |
| **多站点差异** | 每个宿主机有自己的 pad-config.js | 每个边缘端有自己的 pad-config.js（仓库随码维护，新站点部署前手动修改） | 每个集群/namespace 有自己的 ConfigMap |

---

## 安全注意事项

1. **统一部署/K8s 的 `pad-config.js` 不入库**：包含站点凭据，仅存在于部署宿主机或 K8s Secret 中。**例外**：边缘部署模式的 `edge/docker/configs/pad-config.js` 随仓库提交（含 edge 默认凭据），部署新边缘站点前按站点修改；生产站点应替换默认凭据
2. **推荐使用 K8s Secret 替代 ConfigMap**（生产环境）：将 `pad-config.js` 内容 base64 编码存入 Secret
3. **配置文件权限**：宿主机 `chmod 600 configs/pad-config.js`
4. **nginx 禁止直接访问配置文件**：确保 nginx.conf 中 `location = /pad/config.js` 仅允许内网访问或限制请求频率

---

## 涉及仓库及改动清单

| 仓库 | 文件 | 操作 |
|------|------|------|
| `buildingos.pad` | `.github/workflows/deploy.yml` | 新建 |
| `buildingos.ai` | `docker/Dockerfile.web` | 修改 (+pad-zip) |
| `buildingos.ai` | `nginx.conf` | 修改 (+/pad/ location) |
| `buildingos.ai` | `docker/docker-compose.1nodes.yml` | 修改 (+pad-config.js mount) |
| `buildingos.ai` | `edge/docker/Dockerfile.frontend` | 修改 (+pad-zip) |
| `buildingos.ai` | `edge/web/nginx.conf` | 修改 (+/pad/ location) |
| `buildingos.ai` | `edge/docker/docker-compose.yml` | 修改 (+pad-config.js mount) |
| `buildingos.ai` | `.github/workflows/build-edge-frontend.yml` | 修改 (+触发条件) |
