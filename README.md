<div align="center">

[<img src="banner.png" alt="宫水.com — pixel art banner" width="100%" />](https://xn--3bts89a.com/)

[![简体中文](https://img.shields.io/badge/lang-简体中文-16A34A?style=flat-square)](README.md)
[![日本語](https://img.shields.io/badge/lang-日本語-9CA3AF?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.8-2563EB?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-181717?style=flat-square)](https://xn--3bts89a.com/)
[![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JavaScript-F97316?style=flat-square)](#技术栈)

</div>

---

## 项目简介

宫水.com 是一个个人网页作品集与交互实验项目，包含作品展示、收藏、账号系统、像素风地球投稿者展示及多语言界面。

## 项目结构

以下列出项目主要文件。资源目录中的同类文件按用途合并说明。

```text
gongshui-pages/
├── index.html                 # 网站首页与作品展示入口
├── login.html                 # 登录、注册与账号验证页面
├── admin.html                 # 管理后台页面
├── privacy.html               # 隐私政策页面
├── banner.png                 # README 顶部封面图
├── README.md                  # 中文项目说明
├── README.ja.md               # 日文项目说明
├── CHANGELOG.md               # 版本更新记录
├── CNAME                      # 自定义域名配置
├── vercel.json                # 部署响应头与安全策略配置
│
├── styles/
│   ├── style.css              # 网站主要界面样式
│   ├── admin.css              # 管理后台样式
│   ├── globe.css              # 地球视图样式
│   └── orbit-art.css          # Orbit 作品视觉样式
│
├── scripts/
│   ├── main.js                # 首页核心逻辑、作品发现与收藏状态
│   ├── home-page.js           # 首页设置面板及页面交互
│   ├── auth.js                # Supabase 账号认证客户端
│   ├── auth-config.js         # 认证服务配置入口
│   ├── account.js             # 账号菜单、资料与关联账号管理
│   ├── login-page.js          # 登录注册页面逻辑
│   ├── admin.js               # 管理后台业务逻辑
│   ├── admin-liquid-glass.js  # 管理后台视觉交互
│   ├── globe.js               # 投稿者地球渲染与交互
│   ├── compare.js              # 作品对比功能
│   ├── nav-history.js         # 页面导航历史管理
│   ├── scroll-ui.js           # 滚动相关界面交互
│   ├── orbit-versions.js      # Orbit 版本相关逻辑
│   ├── sync.js                # 用户数据同步
│   ├── risk.js                # 注册与登录风险控制
│   ├── fingerprint.js         # 设备标识辅助逻辑
│   ├── privacy-cleanup.js     # 本地隐私数据清理
│   └── vendor/
│       └── globe.gl.min.js    # 地球可视化依赖库
│
├── assets/
│   ├── earth/                 # 地球纹理与背景图片
│   └── flags/                 # 国家与地区 SVG 旗帜
│
├── data/
│   ├── contributors.json      # 投稿者及地理位置数据
│   └── ne_110m_admin_0_countries.geojson # 国家边界数据
│
├── auth/
│   ├── confirm.html           # 邮箱确认入口
│   └── confirm/index.html     # 邮箱确认落地页
│
└── supabase/
    ├── schema.sql             # 核心数据表与 RLS 结构
    ├── account-usernames.sql  # 用户名相关数据库结构
    ├── linked-accounts.sql    # 关联账号数据库结构
    ├── admin.sql              # 管理功能数据库结构
    ├── risk.sql               # 风险控制数据库结构
    ├── security-audit.sql     # 安全检查 SQL
    ├── functions/             # Edge Functions：用户名登录、账号关联、密码策略及管理操作
    └── migrations/            # 数据库结构与策略变更记录
```

## 核心功能

- **作品展示**：浏览网页作品与交互实验。
- **收藏**：收藏作品，并同步用户数据。
- **账号系统**：邮箱、用户名、Google 与 GitHub 登录。
- **多语言**：中文、英文、日文界面。
- **投稿者地球**：在地球视图中展示投稿者位置与旗帜。
- **管理后台**：管理用户及相关数据。

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 前端 | HTML、CSS、JavaScript |
| 认证与数据库 | Supabase Auth、PostgreSQL、Row Level Security |
| 服务端功能 | Supabase Edge Functions |
| 版本管理 | Git、GitHub |
| 部署配置 | Vercel |

## 账号与安全

账号认证由 Supabase Auth 提供；用户数据通过数据库权限策略（RLS）控制，部分登录、账号关联及管理操作由 Supabase Edge Functions 处理。具体策略以 `supabase/` 下的 SQL 和函数代码为准。

## 开发与发布

修改代码后提交到 GitHub。部署行为由仓库关联的托管平台及其配置决定；`vercel.json` 用于配置响应头与安全策略。

## 更新记录

版本变更见 [CHANGELOG.md](CHANGELOG.md)。
