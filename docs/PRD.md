复刻这样一个高保真、跨端适配的智能座舱/大屏 UI 界面，核心挑战在于**响应式布局策略**和**组件的高度抽象**。

以下是实现 Vue3 项目复原的完整路线图：

---

## 1. 响应式布局方案：Scale 适配与 Grid 布局

由于需要同时适配 Pad 和 电视机（分辨率差异巨大），本项目采用 **CSS Transform Scale + Flex/Grid** 混合方案。

*   **屏幕适配**：使用 `v-scale-screen` 插件。
    *   **原理**：开发时统一使用固定设计稿尺寸（**1920 x 1200**），页面加载时根据实际窗口比例进行等比缩放。
    *   **优点**：代码只需写一套固定像素，UI 还原度极高。
    *   **配置**：`AppConfig.design` 中配置基础宽高，组件中开启 `:fullScreen="true"`。

*   **布局规范**：
    *   **主框架**：使用 Tailwind CSS 的 Grid 系统。
        *   例：`grid grid-cols-12 gap-6` 用于将页面横向分为 12 栏。
    *   **模块对齐**：
        *   首页（HomePage）采用三栏布局（Lighting, Climate, Environment），每栏跨度 `col-span-4`。
        *   底部控制栏（Dock）独立于 Grid 之外或作为独立行。
        *   左右分栏布局（如新版 UI）：使用 `w-full flex` 配合 `flex-1` 实现严格的 50% / 50% 分割，内部元素使用 `flex flex-col justify-between` 进行垂直分布对齐。
    *   **字体缩放**：
        *   在 `App.vue` 中实现了基于设计稿宽度的 `rem` 动态计算。
        *   所有字体大小使用 Tailwind 的 `text-xl`, `text-2xl` 等工具类，确保随分辨率自动缩放。
    *   **字体家族**：
        *   全局统一使用 **LynkoType-Regular** 字体。
        *   字体文件位于 `public/fonts/`，并在 `style.css` 中声明，`tailwind.config.js` 中设为默认 sans 字体。

---

## 2. 视觉与背景层 (Theming)

*   **背景容器 (AppBackground.vue)**：
    *   支持图片和视频切换。
    *   视频资源：`public/video/*.mp4`。
    *   使用 `object-fit: cover` 确保资源铺满全屏。

*   **毛玻璃效果 (Glassmorphism)**：
    *   统一使用 `BaseCard` 组件。
    *   样式：`bg-white/5 backdrop-blur-md border border-white/5 rounded-3xl`。

---

## 3. 图标规范 (Icon System)

*   **图标库**：**Lucide Vue Next**
*   **官方网址**：[https://lucide.dev/icons/](https://lucide.dev/icons/)
*   **使用规范**：
    *   优先在 Lucide 官网查找语义化图标（如 `Zap`, `Fan`, `Droplet`）。
    *   引入方式：`import { IconName } from 'lucide-vue-next'`。
    *   特殊需求：对于无法用通用图标库满足的（如品牌 Logo），支持使用本地图片（`<img>`）作为回退方案。
    *   **动效**：支持为特定图标（如风扇 `Fan`）添加旋转动画 `animate-spin-slow`。

---

## 4. 组件架构

### A. 基础容器组件 (BaseCard)
所有功能模块的外层容器。
*   **Props**: `className` (用于覆盖默认样式或添加 padding)。
*   **Slots**: 默认插槽用于放置内容。
*   **设计原则**：标题（Title）应包含在卡片内部，作为卡片的第一个子元素，保持视觉一体性。

### B. 核心业务组件
1.  **Bottom Dock**: 底部导航栏，半透明黑色背景 (`bg-black/70`)，支持图标、文本、图片混排。
2.  **MonitorWidget**: 环境数据展示组件，包含数值、单位和渐变进度条。

---

## 5. 开发规范总结

*   **框架**: Vue 3 (Composition API) + TypeScript
*   **构建**: Vite
*   **样式**: Tailwind CSS (核心)
    *   **布局**: 优先使用 Flexbox (`flex`, `justify-between`, `items-center`) 和 Grid (`grid`, `grid-cols-12`)。
    *   **尺寸**: 使用 Tailwind 的 rem 比例类（如 `h-40` = 10rem, `w-14` = 3.5rem）。
    *   **颜色**: 使用带透明度的白色/黑色（如 `text-white/60`, `bg-black/70`）来适应深色背景。
*   **字体**: 全局 LynkoType-Regular。
*   **状态管理**: Pinia (存储 Cockpit 状态)。

---

## 6. 关键细节：光效处理

这张 UI 的质感来自于**渐变**和**投影**。

* **进度条渐变**：使用 `linear-gradient`。
* **点击反馈**：为按钮添加微弱的内发光（`box-shadow: inset ...`）模拟物理质感。

**需要我为你写一个基础的 `MonitorWidget`（右侧环境监测卡片）的 Vue3 代码原型作为参考吗？**