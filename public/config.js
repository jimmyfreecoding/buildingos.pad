// 运行时覆盖配置（可选）
// 此文件在 Docker 部署时可作为 ConfigMap 挂载，无需重新构建镜像
// 如果不配置，默认使用构建时的 .env 环境变量
window.config = {
  // VITE_APP_BASE_URL: "http://10.205.66.7:1880",
  // VITE_EDGE_BASE_URL: "http://10.205.66.7:1880",
  // VITE_MQTT_URL: "ws://10.205.66.8:1884",
  // VITE_MQTT_USERNAME: "zeekr_iot_platform",
  // VITE_MQTT_PASSWORD: "",
}
