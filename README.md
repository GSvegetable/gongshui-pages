<div align="center">

[<img src="banner.png" alt="宫水.com" width="100%" />](https://xn--3bts89a.com/)

[![简体中文](https://img.shields.io/badge/lang-简体中文-16A34A?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-9CA3AF?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-9CA3AF?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.9-2563EB?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-181717?style=flat-square)](https://xn--3bts89a.com/)

</div>

---

## 项目简介

宫水.com 是一个展示个人作品与网页交互实验的在线空间。

## 项目结构

以下为项目主要文件与目录，均对应仓库中的实际路径。

```text
gongshui-pages/
├── index.html
├── login.html
├── admin.html
├── privacy.html
├── banner.png
├── README.md
├── README.en.md
├── README.ja.md
├── CHANGELOG.md
├── CNAME
├── vercel.json
│
├── styles/
│   ├── style.css
│   ├── admin.css
│   ├── globe.css
│   └── orbit-art.css
│
├── scripts/
│   ├── main.js
│   ├── home-page.js
│   ├── auth.js
│   ├── auth-config.js
│   ├── auth-landing.js
│   ├── account.js
│   ├── login-page.js
│   ├── admin.js
│   ├── admin-liquid-glass.js
│   ├── globe.js
│   ├── compare.js
│   ├── nav-history.js
│   ├── scroll-ui.js
│   ├── orbit-versions.js
│   ├── sync.js
│   ├── risk.js
│   ├── fingerprint.js
│   ├── privacy-cleanup.js
│   └── vendor/
│       └── globe.gl.min.js
│
├── assets/
│   ├── earth/
│   └── flags/
│
├── data/
│   ├── contributors.json
│   └── ne_110m_admin_0_countries.geojson
│
├── auth/
│   ├── confirm.html
│   └── confirm/index.html
│
└── supabase/
    ├── schema.sql
    ├── account-usernames.sql
    ├── linked-accounts.sql
    ├── admin.sql
    ├── risk.sql
    ├── security-audit.sql
    ├── functions/
    └── migrations/
```

## 核心功能

- **投稿者地球**：以交互式地球呈现投稿者分布与地区信息。
- **网页交互实验**：探索具有独立视觉风格与交互方式的原创作品。
- **作品对比**：并列比较不同作品与版本。

## 技术栈

[![HTML5](assets/badges/html5.svg)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](assets/badges/css3.svg)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](assets/badges/javascript.svg)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Supabase](assets/badges/supabase.svg)](https://supabase.com/)
[![PostgreSQL](assets/badges/postgresql.svg)](https://www.postgresql.org/)
[![Vercel](assets/badges/vercel.svg)](https://vercel.com/)
[![GitHub](assets/badges/github.svg)](https://github.com/)

## 账号与隐私

我们重视每位用户的隐私。注册信息和账号数据仅用于提供网站服务，并采取必要措施加以保护；除服务运行所必需、用户主动授权或法律要求外，不会随意公开或向无关第三方披露。

详细说明请参阅 [隐私政策](privacy.html)。

## 更新记录

版本变更见 [CHANGELOG.md](CHANGELOG.md)。
