# 宫水 · UI Archive

一个持续更新的个人 UI 收藏与交互作品展示站。

## 在线体验

- GitHub Pages：由 GitHub Pages 自动部署。
- 正式域名：宫水.com。

## 当前收录

- **海边灯塔 / Pixel Daylight Switch**：像素昼夜开关作品，支持场景切换、触控交互和独立详情介绍。
- **像素圆环**：像素圆环昼夜互动作品，支持圆环拖动、时间滑块与场景预设。

## 展示交互规范

所有作品共用同一套作品卡片、黑色预览边框、详情面板、打开/关闭动画和浮动操作按钮。桌面端采用左侧作品展示、右侧详情面板；移动端沿用海边灯塔的侧边详情布局。每个作品仍保留自己的渲染器和内部交互。

- **2.7.0**：尝试通过三层级设置调整关闭海边灯塔时像素圆环的显现时序。

## 版本记录

- **2.8.0**：修正海边灯塔关闭时的遮挡关系：将像素圆环置于正在缩回的灯塔卡片上方，让圆环在灯塔缩回过程中即可显现。
- **2.6.0**：尝试调整海边灯塔关闭期间像素圆环的显现层级。
- **2.5.0**：统一海边灯塔关闭时的详情面板、操作按钮与作品卡片回归时序。


直接用浏览器打开 `index.html`。项目使用原生 HTML、CSS 与 JavaScript，无需安装依赖或构建。

## 目录结构

```text
.
├── index.html
├── styles/
│   ├── style.css
│   └── motion.css
├── scripts/
│   └── main.js
└── README.md
```

## 外部作品依赖

- Pixel Daylight Switch：<https://github.com/GSvegetable/pixel-daylight-switch>
- Pixel Orbit：<https://github.com/GSvegetable/-pixel-orbit>

展示站只负责作品索引、预览与详情交互；各作品源码和渲染逻辑由对应独立仓库维护。
