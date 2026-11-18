<div align="center">

[<img src="banner.png" alt="宫水.com" width="100%" />](https://xn--3bts89a.com/)

</div>

<a id="project-preview"></a>

<div align="center">

<img src="assets/badges/tech-stack.svg" alt="Tech stack" width="100%" />

[![简体中文](https://img.shields.io/badge/lang-简体中文-16A34A?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-2563EB?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-D94841?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.9-7C3AED?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-0D9488?style=flat-square)](https://xn--3bts89a.com/)

</div>

---

<a id="project-structure"></a>

## 项目结构

```text
gongshui-pages/
├── index.html                                  # 网站入口与主页，包含作品卡片、详情面板及页面基础结构。
├── login.html                                  # 账号登录与注册页面。
├── admin.html                                  # 站点管理后台页面。
├── privacy.html                                # 隐私政策页面。
├── banner.png                                  # README 顶部使用的项目横幅图片。
├── scene-gallery.png                           # 像素昼夜开关的多场景预览图，点击可直接打开对应作品的放大详情。
├── readme-banner.svg                           # README 底部使用的社交媒体与更新提示横幅。
├── README.md                                   # 简体中文项目说明文档。
├── README.en.md                                # 英文项目说明文档。
├── README.ja.md                                # 日文项目说明文档。
├── CHANGELOG.md                                # 记录版本更新内容与变更历史。
├── CNAME                                       # GitHub Pages 自定义域名配置文件。
├── vercel.json                                 # Vercel 部署与路由等平台配置。
│
├── styles/                                     # 存放网站各页面与组件的样式文件。
│   ├── style.css                               # 主页及通用界面的主要样式。
│   ├── admin.css                               # 管理后台专用样式。
│   ├── globe.css                               # 地球与指南针视图的样式。
│   └── orbit-art.css                           # 像素圆环作品展示区域的样式。
│
├── scripts/                                    # 存放页面交互、业务逻辑与功能模块脚本。
│   ├── main.js                                 # 作品卡片、详情展开、放大展示及相关交互的核心逻辑。
│   ├── home-page.js                            # 主页导航、搜索及首页界面行为。
│   ├── auth.js                                 # 用户身份验证与登录流程。
│   ├── auth-config.js                          # 身份验证服务的客户端配置。
│   ├── auth-landing.js                         # 登录相关的落地页交互逻辑。
│   ├── account.js                              # 账号资料、账户状态等前端逻辑。
│   ├── login-page.js                           # 登录与注册页面的交互逻辑。
│   ├── admin.js                                # 管理后台的功能与交互逻辑。
│   ├── admin-liquid-glass.js                   # 管理后台液态玻璃界面效果。
│   ├── globe.js                                # 地球视图、地点与贡献者相关交互。
│   ├── compare.js                              # 作品版本或视图对比功能。
│   ├── nav-history.js                          # 站内视图导航与历史状态管理。
│   ├── scroll-ui.js                            # 滚动相关的界面行为与控制。
│   ├── orbit-versions.js                       # 像素圆环作品的版本切换逻辑。
│   ├── sync.js                                 # 用户偏好与账号数据同步逻辑。
│   ├── risk.js                                 # 风险识别与安全校验相关逻辑。
│   ├── fingerprint.js                          # 浏览器环境识别相关功能。
│   ├── privacy-cleanup.js                      # 隐私清理与本地数据处理逻辑。
│   └── vendor/                                 # 存放第三方或压缩后的依赖脚本。
│       └── globe.gl.min.js                     # 地球三维可视化所使用的 globe.gl 库。
│
├── assets/                                     # 存放网站使用的图片、图标及其他静态资源。
│   ├── earth/                                  # 地球视图使用的纹理与地图资源。
│   ├── flags/                                  # 国家与地区旗帜图片资源。
│   └── badges/                                 # README 徽章与技术栈图形资源。
│       └── tech-stack.svg                      # 低饱和单色技术栈图，展示项目使用的主要技术。
│
├── data/                                       # 存放网站使用的结构化数据文件。
│   ├── contributors.json                       # 作品贡献者及相关信息数据。
│   └── ne_110m_admin_0_countries.geojson       # 地球视图使用的国家与地区边界数据。
│
├── auth/                                       # 存放身份验证回调与确认页面。
│   ├── confirm.html                            # 账号验证或确认流程页面。
│   └── confirm/index.html                      # 兼容目录式访问的账号确认页面入口。
│
└── supabase/                                   # 存放 Supabase 数据库结构、函数与迁移文件。
    ├── schema.sql                              # 数据库基础结构定义。
    ├── account-usernames.sql                   # 账号用户名相关的数据结构或约束。
    ├── linked-accounts.sql                     # 关联账号功能的数据结构。
    ├── admin.sql                               # 管理后台相关数据库定义。
    ├── risk.sql                                # 风险控制相关数据库定义。
    ├── security-audit.sql                      # 安全审计相关数据库定义。
    ├── functions/                              # 存放 Supabase Edge Functions 等服务端函数。
    └── migrations/                             # 存放数据库结构变更与迁移记录。
```


## 账号与隐私

我们重视每位用户的隐私。注册信息和账号数据仅用于提供网站服务，并采取必要措施加以保护；除服务运行所必需、用户主动授权或法律要求外，不会随意公开或向无关第三方披露。

详细说明请参阅 [隐私政策](privacy.html)。

[![快速迭代 · X @gsyxyc](readme-banner.svg)](https://x.com/gsyxyc)

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。
