```markdown
# 🗂️ 宫水 · UI Archive (Specimen)

一个持续更新的个人 UI 收藏与交互作品展示站。本项目采用**原生 HTML/CSS/JS**，无需构建，专为高质量 2D/WebGL 交互作品打造的现代化展示框架。

## 🌐 在线体验

- **正式域名**：[宫水.com](https://宫水.com)
- **部署方式**：GitHub Pages 自动部署。

---

## ✨ 核心特性：万能展示框架

项目已完成 **3.0.0 架构重构**，底层剥离了所有冗余的业务代码，提供一套极度纯粹的 **Work Controller（作品控制器）**。

- **绝对解耦**：加新作品无需编写任何动画、占位、缩放逻辑。
- **物理防塌陷**：打开卡片时自动插入占位符，完美锁定 Grid 布局，周围作品绝不乱跑。
- **层级与遮罩同步**：关闭动画期间自动接管 Z-index 与遮罩层，解决内容被遮挡/变黑的问题。
- **精准缩放防抖**：动画结束瞬间自动剥离 JS 缩放计算，强制回流，彻底消除亚像素级抖动与错位。

---

## 🎮 当前收录作品

| 作品名称 | 技术栈 | 交互方式 | 源码仓库 |
| :--- | :--- | :--- | :--- |
| **海边灯塔 / Pixel Daylight Switch** | WebGL2 / Canvas 2D | 拖动、触控、键盘、多场景切换 | [Github](https://github.com/GSvegetable/pixel-daylight-switch) |
| **像素圆环 / Pixel Orbit** | Canvas 2D | 圆环拖动、时间滑块、场景预设 | [Github](https://github.com/GSvegetable/-pixel-orbit) |

---

## 🛠️ 如何添加新作品？（极简指南）

得益于万能框架，接入新作品只需两步。**⚠️ 注意：请勿修改 `main.js` 中 `WorkController` 的核心逻辑。**

### 第一步：在 `index.html` 中添加卡片
在 `<main>` -> `<div class="grid">` 内部复制并修改：

```html
<article class="preview-card" id="your-work-card" data-id="your-work-id" tabindex="0" aria-label="打开新作品详情">
  <div class="preview-mount">
    <!-- 可以放 iframe、img 或特定的挂载点 (script/canvas) -->
    <iframe src="你的体验链接" loading="lazy"></iframe>
  </div>
  <div class="card-info"><span class="card-title">新作品名称</span></div>
</article>
```

第二步：在 scripts/main.js 顶部注册

在 WORKS_CONFIG 数组中追加一行配置：

```javascript
const WORKS_CONFIG = [
  // ... 现有的作品 ...
  { 
    id: 'your-work-id',             // 与 HTML 的 data-id 一致
    cardId: 'your-work-card',       // 与 HTML 的 id 一致
    contentSelector: 'iframe',      // 内部核心内容的 CSS 选择器（如 '.my-canvas' 或 'iframe'）
    fallbackRatio: 1.6439           // 容器宽高比，防止加载慢时布局跳动
  }
];
```

补充：如果新作品有独立的详情面板 (Detail Panel)，需要在 index.html 中增加对应面板，并在 JS 中监听 AppState.activeWorkId 来显示/隐藏。

---

📁 目录结构

```text
.
├── index.html          # 主页与详情页的 DOM 结构
├── styles/
│   ├── style.css       # 核心布局、卡片样式、动画过渡、响应式
│   └── motion.css      # 针对 will-change 和低端设备/降级动画的优化
├── scripts/
│   └── main.js         # 核心引擎（搜索、导航、万能 Work Controller）
└── README.md
```

---

📝 版本记录 (Changelog)

v3.0.0 (Current)

· 底层架构重构：提取 WorkController 万能展示引擎，彻底移除重复的动画代码。
· Bug 修复：解决动画结束瞬间的内容微小抖动（强制同步布局）。
· Bug 修复：解决打开/关闭动画时，周围静止卡片因遮罩层被遮挡或网格塌陷而消失的问题。
· 新增：README 开发规范，提供极简的二次开发指南。

v2.8.0

· 修正海边灯塔关闭时的遮挡关系，让圆环在灯塔缩回过程中显现。

v2.5.0 - v2.7.0

· 尝试统一海边灯塔关闭时的详情面板、操作按钮与作品卡片回归时序，调整 Z-index 层级。

v2.3.0

· 优化关闭遮罩时的显现逻辑，避免字体大小突变。

v1.0.0

· 基础展示站上线，收录海边灯塔。

```

直接覆盖 `README.md`。没有废话了，收工。
