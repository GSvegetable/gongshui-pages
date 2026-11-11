宫水 · UI Archive

一个自己用的 UI 收藏站，顺手也当作品展示页。收的都是 2D / WebGL 的交互小东西，点开卡片就地展开，关掉再收回去。

纯原生 HTML/CSS/JS，没有构建步骤，改完 push 就完事。

线上

· 宫水.com
· GitHub Pages 自动部署，推上去就更新

关于 3.0 的框架

3.0 把之前每个作品各写一套的动画代码全删了，抽成一个 WorkController。现在加新作品只要塞张卡片、注册一行配置，剩下的它自己处理。

这版主要收拾了几个一直很烦的问题：

· 卡片展开时自动插占位符，Grid 不会塌，旁边的作品也不会跟着跳位置。
· 打开和关闭动画期间的 z-index 和遮罩层由控制器接管，不用再一个个手调层级，也不会出现内容被盖住、或者整块突然变黑。
· 动画结束那一瞬间会把 JS 算出来的缩放剥掉并强制回流。不这么做会有一两像素的抖动和错位，看着很难受，尤其在 Retina 屏上。

现在收了什么

作品 技术栈 交互 源码
海边灯塔 / Pixel Daylight Switch WebGL2 / Canvas 2D 拖动、触控、键盘、多场景切换 GitHub
像素圆环 / Pixel Orbit Canvas 2D 圆环拖动、时间滑块、场景预设 GitHub

加新作品

两步。main.js 里 WorkController 的逻辑别动，动了就得自己收拾烂摊子。

1. 在 index.html 加卡片

找 <main> 里的 <div class="grid">，复制一份改：

```html
<article class="preview-card" id="your-work-card" data-id="your-work-id" tabindex="0" aria-label="打开新作品详情">
  <div class="preview-mount">
    <!-- iframe、img 或者自己的挂载点都行 -->
    <iframe src="你的体验链接" loading="lazy"></iframe>
  </div>
  <div class="card-info"><span class="card-title">新作品名称</span></div>
</article>
```

2. 在 scripts/main.js 的 WORKS_CONFIG 里加一行

```javascript
const WORKS_CONFIG = [
  // ... 现有的
  {
    id: 'your-work-id',          // 跟 HTML 的 data-id 对上
    cardId: 'your-work-card',    // 跟 HTML 的 id 对上
    contentSelector: 'iframe',   // 内部真正要缩放的东西，如 '.my-canvas'
    fallbackRatio: 1.6439        // 宽高比，加载慢的时候撑住高度
  }
];
```

如果新作品还有独立的详情面板，那得自己在 index.html 里加面板，然后在 JS 里盯着 AppState.activeWorkId 决定显示还是隐藏。这块框架不管，因为每个作品的详情长得都不一样。

目录

```text
.
├── index.html          # 主页 + 详情页的 DOM
├── styles/
│   ├── style.css       # 布局、卡片、过渡、响应式
│   └── motion.css      # will-change 与低端设备降级
├── scripts/
│   └── main.js         # 搜索、导航、WorkController
└── README.md
```

更新记录

v3.0.0

· 抽出 WorkController，删掉各作品重复的动画代码
· 修动画结束时内容微小抖动（强制同步布局）
· 修开关动画期间周围卡片因遮罩遮挡、网格塌陷而消失
· 补开发规范

v2.8.0

· 修海边灯塔关闭时的遮挡，圆环能在灯塔缩回过程中露出来了

v2.5.0 – v2.7.0

· 反复调海边灯塔关闭时详情面板、操作按钮、卡片回归的时序和 z-index。这部分试了好几版才对

v2.3.0

· 优化关闭遮罩时的显现逻辑，避免字号突变

v1.0.0

· 上线，只有海边灯塔一个
