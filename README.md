宫水 · UI Archive

一个自己用的 UI 收藏站，顺手也当作品展示页。收的都是 2D / WebGL 的交互小东西，点开卡片就地展开，关掉再收回去。

纯原生 HTML/CSS/JS，没有构建步骤，改完 push 就完事。

线上

· 宫水.com
· GitHub Pages 自动部署，推上去就更新

关于展开 / 关闭动画（3.1）

3.1 把动画整个重做了，核心就三件事：

· 作品内容不再跟着卡片重新布局。内容是一个固定像素尺寸的"舞台"，动画全程只用 scale 去贴合作品框，iframe / WebGL 从头到尾不会被 resize，所以不会白屏、不会闪。
· 动画用 FLIP：先拍下卡片现在的位置，再直接切到最终状态量出终点，然后从起点走到终点。终点本来就是真实样式，落地时没有"收尾替换"，所以不抖、不回弹。
· 卡片、遮罩、详情面板、导航、搜索框全部读 style.css 顶部的 --dur / --ease 这一套节奏，永远同速度同节奏。想整体变快变慢，只改这两个变量。

另外：

· 展开时原位放一张看不见的"影子卡片"（真卡片的克隆），布局一模一样，周围作品绝不会移位；关闭时它的实时位置就是动画终点。
· 锁滚动时会补上滚动条宽度，页面宽度不变，网格不会重排。
· 关闭时导航和搜索框一直站在遮罩下面，靠遮罩淡出自然显露，不会提前跳出来。
· 遮罩去掉了 backdrop-filter 模糊（本来就 92% 不透明，几乎看不出来，但每帧都在重新模糊整个屏幕，是掉帧的主要来源）。

现在收了什么

作品 技术栈 交互 源码
海边灯塔 / Pixel Daylight Switch WebGL2 / Canvas 2D 拖动、触控、键盘、多场景切换 GitHub
像素圆环 / Pixel Orbit Canvas 2D 圆环拖动、时间滑块、场景预设 GitHub

加新作品

只改 index.html，不用碰 JS 和 CSS。

1. 在 <div class="grid"> 里复制一张卡片

```html
<article class="preview-card" id="your-work-card" data-id="your-work-id" data-detail="your-work-detail" tabindex="0" aria-label="打开新作品详情">
  <div class="preview-mount">
    <!-- iframe 或者自己的挂载点都行 -->
    <iframe src="你的体验链接" title="作品名" loading="lazy"></iframe>
  </div>
  <div class="card-info"><span class="card-title">新作品名称</span></div>
</article>
```

· id、data-id 随便起，但不能和别的作品重复。
· data-detail 填这个作品详情面板的 id。
· 作品框(.preview-mount)的宽高比默认 1.6439，要改就在 article 上写 style="--mount-ratio: 1.78"。

2. 在 </main> 后面加详情面板

```html
<section class="work-detail" id="your-work-detail" role="dialog" aria-modal="true" aria-hidden="true">
  <!-- 详情内容，随便写 -->
</section>
```

面板必须带 work-detail 这个 class，它的出入场动画就自动和卡片同步了。

目录

```text
.
├── index.html          # 主页 + 详情页的 DOM
├── styles/
│   └── style.css       # 布局、卡片、过渡、响应式（动画节奏变量在最顶部）
├── scripts/
│   └── main.js         # 搜索、导航、作品展开/关闭控制器
└── README.md
```

更新记录

v3.1.0

· 展开 / 关闭 / 放大动画重写：内容只缩放不重排（不白屏），FLIP 落地（不抖动）
· 详情面板、遮罩、导航、搜索框和卡片共用同一套时长与曲线
· 新作品自动发现，不再需要在 main.js 里登记
· 修锁滚动时滚动条消失导致网格重排
· 去掉遮罩的 backdrop-filter
· 删掉不存在的 motion.css 引用

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
