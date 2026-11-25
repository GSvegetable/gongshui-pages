# 仓库职责与作品代码归属

> 适用版本：gongshui-pages v2.12.20  
> 最后核对：2026-11-26

本文是两个仓库之间的代码归属说明。判断代码位置以实际源码为准，不以作品卡片是否出现在网站上来判断。

## 一、两个仓库分别负责什么

### `GSvegetable/gongshui-pages`

这是 **宫水.com 网站本体**，负责网站框架、作品集、账号与认证、收藏数据、设置、国际化、Supabase 接入，以及依赖这些网站能力的交互作品。

网站仓库不仅有网站外壳，也包含尚未抽离成独立项目的作品组件。这是当前有意保留的边界，不应把所有作品卡片都误认为来自另一个仓库。

### `GSvegetable/gongshui-open-source`

这是 **独立作品源码与发布仓库**，用于存放具备独立运行入口、资源边界、文档、测试或发布流程的项目。

目前其中正式整理的独立作品有两个：Pixel Daylight Switch 和 Pixel Orbit。它不是宫水.com 全部作品的镜像仓库，也不代表网站上的每个作品都必须在这里有一份副本。

## 二、网站前五个作品的真实归属

| # | 作品 | 源码归属 | 关键文件 / 入口 | 网站如何展示 |
|---|---|---|---|---|
| 1 | Pixel Daylight Switch | `gongshui-open-source` | `projects/pixel-daylight-switch/` | 首页 iframe 指向独立仓库的 GitHub Pages 预览 |
| 2 | Pixel Orbit | `gongshui-open-source` | `projects/pixel-orbit/` | 首页 iframe 指向独立仓库的 `showcase.html` |
| 3 | 投稿者地球 / Contributors Globe | `gongshui-pages` | `scripts/globe.js`、`styles/globe.css`、`data/contributors.json`、`data/ne_110m_admin_0_countries.geojson`、`assets/earth/`、`assets/flags/`、`scripts/vendor/globe.gl.min.js` | 网站自己的预览 iframe 以 `?portfolio-preview=globe` 模式启动同一套地球组件 |
| 4 | 收藏长廊 / The Bookmark Hall | `gongshui-pages` | `scripts/bookmarks-corridor.js`、`styles/bookmarks-corridor.css`，并依赖 `scripts/main.js` 中的 `AppState.bookmarks` / `AppState.bookmarkFolders`、首页作品卡片 DOM | 网站自己的预览 iframe 以 `?portfolio-preview=corridor` 模式启动长廊 |
| 5 | 导航交互系统 / Navigation Interaction System | `gongshui-pages` | 展示结构在 `index.html`；交互在 `scripts/portfolio-preview.js`；样式在 `styles/portfolio-works.css` | 直接作为网站作品卡片中的交互样例渲染 |

## 三、特别说明：收藏页与收藏长廊不是同一件事

网站的「收藏」导航页在 v2.12.19 中被清空为黑色交接画布；这是收藏管理页面本身的状态。

作品集里的「收藏长廊」则是另一项作品预览。它通过 `index.html?portfolio-preview=corridor` 在隔离 iframe 中启动，使用 `bookmarks-corridor.js` 渲染，并读取宿主网站的收藏夹与作品信息。因此，清空收藏导航页并不等于删除收藏长廊作品，也不代表长廊已经成为独立仓库项目。

同理，投稿者地球的预览 iframe 只是把网站现有地球组件切换到作品展示模式，并没有把地球源码迁到 `gongshui-open-source`。

## 四、为什么第三至第五个作品暂时留在网站仓库

- **投稿者地球** 使用网站内置的投稿者数据、地图边界、国旗和纹理资源，并复用网站语言状态。要独立发布，需要先确定独立的数据更新方式、资源路径、语言接口和无 WebGL 降级入口。
- **收藏长廊** 直接读取网站的收藏夹状态和作品卡片 DOM。若直接复制到独立仓库，会产生两份数据来源，容易出现收藏内容、排序和作品链接不一致。迁移前必须先设计明确的宿主通信 API。
- **导航交互系统** 当前是作品集页面里的按钮状态演示，结构和样式与网站设计系统绑定。它目前更像网站内部组件示例，而不是一个完整独立应用。

在完成独立入口、依赖隔离、数据接口、资源路径、测试和发布配置之前，保留在网站仓库比复制一份到独立仓库更可靠。

## 五、以后新增作品的归属规则

符合以下条件时，优先放进 `gongshui-open-source/projects/<project-name>/`：

1. 有自己的独立入口，可以脱离宫水.com 运行。
2. 不直接读取网站的全局变量、DOM 结构或 localStorage 私有键。
3. 资源路径、配置和数据来源可独立维护。
4. 有自己的 README、许可证说明、版本记录；需要时配套测试和 CI。
5. 宿主网站只通过稳定的 URL、iframe 参数或公开嵌入 API 集成，不复制源码。

如果作品依赖网站账号、收藏、同步、后台或导航状态，则先留在 `gongshui-pages`，并在本文登记清楚依赖关系。不要为了让仓库目录看起来整齐而复制同一份实现。

## 六、版本号与缓存参数

- 网站发布版本以首页角落版本标识、三份 README 版本徽章和 `docs/CHANGELOG.md` 最新条目为准；本次统一为 **v2.12.20**。
- HTML 中每个 CSS / JavaScript 的 `?v=` 是资源级缓存标识，不是网站整体版本。只修改了文档时，不应无意义地给所有运行时代码改缓存号。
- Pixel Daylight Switch 使用自己的 npm 包版本（当前 `package.json` 为 **3.1.1**）。
- Pixel Orbit 使用自己的项目版本（当前 README / CHANGELOG 为 **1.2.3**）。
- `gongshui-open-source` 是多项目仓库，没有一个能替代各项目版本号的统一产品版本。

任何版本更新都应同时检查对应 CHANGELOG、README 徽章或项目版本说明，以及真正发生变化的资源缓存标识。
