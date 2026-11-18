<div align="center">

[<img src="assets/readme/banner.png" alt="宫水.com" width="100%" />](https://xn--3bts89a.com/)

</div>

<a id="project-preview"></a>

<div align="center">

<img src="assets/badges/tech-stack.svg" alt="Tech stack" width="100%" />

[![简体中文](https://img.shields.io/badge/lang-简体中文-16A34A?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-2563EB?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-D94841?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.12-7C3AED?style=flat-square)](docs/CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-0D9488?style=flat-square)](https://xn--3bts89a.com/)

</div>

---

<a id="project-structure"></a>

## 项目结构

```text
gongshui-pages/
├── index.html                 # 网站首页与主要展示入口
├── login.html                 # 用户登录与注册页面
├── admin.html                 # 管理后台页面
├── privacy.html               # 隐私政策说明页面
├── README.md                  # 中文项目说明与目录索引
├── README.en.md               # English project documentation
├── README.ja.md               # 日本語プロジェクト説明
├── LICENSE                    # MIT 开源许可证
├── CNAME                      # GitHub Pages 自定义域名配置
├── vercel.json                # Vercel 部署与路由配置
├── docs/
│   └── CHANGELOG.md           # 项目版本更新记录
├── assets/
│   ├── badges/
│   │   └── tech-stack.svg     # README 顶部技术栈徽章图
│   ├── readme/
│   │   ├── banner.png         # README 顶部横幅
│   │   ├── scene-gallery.png  # 项目场景预览图
│   │   └── readme-banner.svg  # README 底部 X 账号宣传图
│   ├── earth/
│   │   ├── earth-blue-marble.jpg   # 地球白昼纹理
│   │   ├── earth-night.jpg         # 地球夜间灯光纹理
│   │   ├── earth-topology.png      # 地球地形/拓扑纹理
│   │   └── night-sky.jpg           # 星空背景素材
│   └── flags/
│       └── *.svg              # 61 个国家和地区的旗帜矢量图，按代码命名
├── auth/
│   ├── confirm.html          # 邮箱验证回调页面
│   └── confirm/
│       └── index.html        # 邮箱验证回调路径入口
├── data/
│   ├── contributors.json     # 项目贡献者数据
│   └── ne_110m_admin_0_countries.geojson  # 世界国家与地区地理边界数据
├── scripts/
│   ├── account.js            # 账户资料与账户相关操作
│   ├── admin-liquid-glass.js # 管理后台液态玻璃视觉效果
│   ├── admin.js              # 管理后台交互与管理逻辑
│   ├── auth-config.js        # 身份认证客户端配置
│   ├── auth-landing.js       # 登录/注册落地页逻辑
│   ├── auth.js               # 登录、注册及认证流程
│   ├── compare.js            # 对比功能逻辑
│   ├── fingerprint.js        # 浏览器设备特征采集
│   ├── globe.js              # 交互式地球与地图展示
│   ├── home-page.js          # 首页交互逻辑
│   ├── login-page.js         # 登录页面交互逻辑
│   ├── main.js               # 网站主要初始化与通用逻辑
│   ├── nav-history.js        # 页面导航历史管理
│   ├── orbit-versions.js     # 轨道/版本展示逻辑
│   ├── privacy-cleanup.js    # 隐私数据清理逻辑
│   ├── risk.js               # 注册与登录风险识别逻辑
│   ├── scroll-ui.js          # 滚动相关界面交互
│   ├── sync.js               # 用户数据同步逻辑
│   └── vendor/
│       └── globe.gl.min.js   # 第三方 globe.gl 地球渲染库
├── styles/
│   ├── admin.css             # 管理后台样式
│   ├── globe.css             # 地球与地图组件样式
│   ├── orbit-art.css         # 轨道视觉效果样式
│   └── style.css             # 网站全局基础样式
├── supabase/
│   ├── account-usernames.sql # 用户名与账户数据相关数据库定义
│   ├── admin.sql             # 管理后台数据库对象
│   ├── linked-accounts.sql   # 关联账户数据结构与逻辑
│   ├── risk.sql              # 风险识别相关数据库对象
│   ├── schema.sql            # 数据库基础结构定义
│   ├── security-audit.sql    # 数据库安全审计与检查脚本
│   ├── functions/
│   │   ├── admin-user-action/index.ts  # 管理员用户操作 Edge Function
│   │   ├── link-account/index.ts       # 账户关联 Edge Function
│   │   ├── password-policy/index.ts    # 密码策略校验 Edge Function
│   │   └── username-login/index.ts    # 用户名登录 Edge Function
│   └── migrations/
│       └── *.sql             # 14 个数据库增量迁移文件，涵盖数据保留、隐私最小化、管理分析、会话校验、登录限流及权限收紧
└── vendor/
    └── vitrio/
        ├── LICENSE           # Vitrio 第三方组件许可证
        └── vitrio.umd.js     # Vitrio 第三方组件打包文件
```

## 账号与隐私

用户信息仅用于提供网站服务，采取安全措施予以保护。
详情请参阅 [隐私政策](privacy.html)、[查看源码](https://github.com/GSvegetable/gongshui-pages/tree/main/scripts)、[服务端与数据库实现](https://github.com/GSvegetable/gongshui-pages/tree/main/supabase)。
点击下方图片查看 X 账号

[![快速迭代 · X @gsyxyc](assets/readme/readme-banner.svg)](https://x.com/gsyxyc)
## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。
