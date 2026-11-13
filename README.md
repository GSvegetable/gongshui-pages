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

投稿者地球（指南针按钮）

首页第二个按钮是一个 3D 地球：每位作品投稿者可以在自己的国家，或者一个精确位置，插上自己的头像或国旗。点旗子会飞过去，弹出名字、所在地、一句话和他的作品，点作品能直接回到首页打开那张卡片。右下角可以切换白天 / 夜晚，"我要插旗"会跳到 GitHub 的新建投稿页。

· 地球用 globe.gl（three.js），第一次点指南针才加载，不拖慢首页。
· 没有 WebGL 或者库加载失败时，会降级成一份普通的投稿者名单。
· 数据全在 data/contributors.json，往 contributors 里加一条就多一面旗，不用改代码。

contributors.json 每条的字段

· name、country 必填。country 是两位国家代码，比如 CN / JP / US / NZ。
· github 可选，填了就自动取 GitHub 头像。avatar 可选，自己的头像图片链接（必须是 https）。
· lat、lng 可选。想插在精确位置才填，不填就插在国家中心。坐标会被取整到约 1 公里，建议只填到城市级别，别填门牌。
· city 可选，只用来显示。pin 可选，avatar 显示头像，flag 显示国旗；不写时有头像就显示头像。
· works 可选，对应 index.html 里卡片的 data-id，点开就是"看作品"按钮。note 可选，一句话，最多 120 字。
· 国家不在内置表里（见 scripts/globe.js 顶部的 COUNTRIES）时，必须同时写 lat 和 lng。
· 同一个地方挤了好几面旗，会自动绕着中心摆成一圈。

示例

```json
{ "name": "小明", "github": "xiaoming", "country": "JP", "city": "Tokyo", "lat": 35.68, "lng": 139.76, "works": ["pixel-orbit"], "note": "做了圆环的夜间版本" }
```

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
│   ├── style.css       # 布局、卡片、过渡、响应式（动画节奏变量在最顶部）
│   └── globe.css       # 投稿者地球的样式
├── scripts/
│   ├── main.js         # 搜索、导航、作品展开/关闭控制器
│   └── globe.js        # 投稿者地球（懒加载 globe.gl）
├── data/
│   └── contributors.json  # 投稿者名单
└── README.md
```

更新记录

v3.2.0

· 新增投稿者地球：指南针按钮现在是一个可旋转的 3D 地球，投稿者在国家或精确位置插头像 / 国旗
· 投稿数据放在 data/contributors.json，加一条就多一面旗
· 地球页没有 WebGL 时降级成投稿者名单

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
