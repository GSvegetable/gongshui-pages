# 仓库职责与作品代码归属

> 适用版本：gongshui-pages v2.14.2  
> 最后核对：2026-11-26

## 一、两个仓库分别负责什么

### `GSvegetable/gongshui-pages`

这是宫水.com 的网站平台本体，负责 UI、页面布局、导航与路由、登录注册、账号、收藏数据与文件夹、搜索、设置、国际化、Supabase、作品目录、作品详情，以及宿主侧 iframe / 数据通信适配器。

网站保留所有平台业务能力，但不再保存第三至第五个作品的核心渲染实现。

### `GSvegetable/gongshui-open-source`

这是所有独立作品的唯一源码仓库，负责作品实现、素材、数据、依赖、独立入口、项目文档、版本、测试与发布。

网站通过各作品发布的 `embed.js` 两行加载器挂载独立 iframe；需要网站数据的作品通过公开且有来源校验的通信协议接收数据。网站不复制作品渲染器。

## 二、五个作品的源码归属

| # | 作品 | 唯一源码位置 | 网站集成方式 |
|---|---|---|---|
| 1 | Pixel Daylight Switch | `gongshui-open-source/projects/pixel-daylight-switch/` | iframe |
| 2 | Pixel Orbit | `gongshui-open-source/projects/pixel-orbit/` | iframe |
| 3 | 投稿者地球 / Contributors Globe | `gongshui-open-source/projects/contributors-globe/` | iframe；独立数据、地图边界、国旗与贴图 |
| 4 | 收藏长廊 / The Bookmark Hall | `gongshui-open-source/projects/bookmark-hall/` | iframe；网站通过 postMessage 传入收藏作品记录 |
| 5 | 导航交互系统 / Navigation Interaction System | `gongshui-open-source/projects/navigation-interaction/` | iframe；仅展示独立按钮交互样本 |

第三至第五个作品的部署入口分别为：

- `https://gsvegetable.github.io/gongshui-open-source/contributors-globe/`
- `https://gsvegetable.github.io/gongshui-open-source/bookmark-hall/`
- `https://gsvegetable.github.io/gongshui-open-source/navigation-interaction/`

## 三、宿主与作品的边界

网站仓库可以保留：
- 作品卡片、详情面板、收藏按钮与收藏夹管理；
- 用户身份、云同步、搜索、路由、设置与国际化；
- 通过作品的 `embed.js` 加载器挂载 iframe、整理公开数据和订阅来源校验后的作品事件；
- 收到作品发出的公开事件后执行网站导航。

网站仓库不应保留：
- 地球或长廊的 Canvas / WebGL 渲染实现；
- 作品专属贴图、国旗、地图边界和独立数据文件；
- 导航交互作品的样本按钮 DOM 与其交互脚本；
- 与作品相同的第二份核心实现。

## 四、收藏导航页与收藏长廊的区别

网站的「收藏」导航页是平台功能页面，之前按要求清空为黑色交接画布；它仍由网站仓库负责，不属于收藏长廊作品。

作品集中的「收藏长廊」是独立作品，部署在 `gongshui-open-source/projects/bookmark-hall/`。它不持有账号或收藏持久化逻辑。网站宿主读取自己的收藏夹状态，将排序后的公开作品记录通过 `gongshui:bookmark-hall:data` 消息发送给 iframe。长廊在用户打开某件作品时发送 `gongshui:bookmark-hall:open`，网站校验来源后自行打开相应详情。

## 五、作品通信协议

### Bookmark Hall

宿主发送：

```js
{
  type: 'gongshui:bookmark-hall:data',
  items: [{
    id, title, en, desc, github, src, ratio, folder
  }]
}
```

作品发出：

```js
{ type: 'gongshui:bookmark-hall:open', id }
```

宿主必须同时验证 `event.source` 和 `event.origin`。渲染器不直接访问网站 AppState、localStorage、作品卡片 DOM 或 Supabase。

### Contributors Globe

作品拥有自己的贡献者 JSON、GeoJSON、国旗和地球贴图。宿主可通过 `gongshui:contributors-globe:select-work` 发送需要选中的作品 ID；作品自行完成贡献者定位。

### Navigation Interaction System

该项目是按钮视觉与交互状态的独立样本，不是网站真实导航。网站真实路由、导航历史和可访问性行为继续由网站仓库负责。

### 3_sy 双轨卡片空间

第六个作品，形态与前五个不同：它不做成格子卡片，而是整层铺在首页作品网格底下，被五个作品卡片盖住。源码归属 [GSvegetable/3_sy](https://github.com/GSvegetable/3_sy)（唯一实现），站点仓库里的 `3-sy/` 只放构建产物。

嵌入模式 `?embed=1`：点卡片不翻面；作品自带的搜索框与状态标签隐藏，让位给站点导航；底色透明，纵向滚动让给宿主页面（作品不再吞滚轮，触摸改 `pan-y`）；横向手势由宿主捕获后通过 `postMessage`（`{ type: '3sy:swipe', phase, dx }`）转发给作品，作品只接受来自宿主窗口的消息。

键盘：方向键监听挂在 `document` 上（焦点落在页边、标题栏时也能收到），已处理的按键、输入框、作品详情打开状态一律让位。

## 六、版本、缓存与发布

- 网站版本以首页角落版本号、三份 README 徽章和 `docs/CHANGELOG.md` 为准；本次升级为 **v2.16.1**。
- `?v=` 是资源缓存标识。只有真正修改的资源才更新对应缓存号。
- 每个作品维护自己的版本、CHANGELOG、依赖许可说明和测试。
- 根目录 GitHub Actions workflow 将五个项目分别组装到 Pages 对应 URL；源码路径中的 `projects/` 不出现在最终 URL 中。
- 不允许只复制源码而不切换唯一所有权，也不允许网站仓库和作品仓库长期维护两份活动实现。
