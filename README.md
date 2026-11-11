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
