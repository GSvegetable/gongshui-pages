<div align="center">

[<img src="banner.png" alt="宮水.com" width="100%" />](https://xn--3bts89a.com/)

[![简体中文](https://img.shields.io/badge/lang-简体中文-9CA3AF?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-9CA3AF?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-16A34A?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.9-2563EB?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-181717?style=flat-square)](https://xn--3bts89a.com/)

</div>

---

## プロジェクト概要

宮水.com は、個人作品と Web インタラクションの実験を紹介するサイトです。

## プロジェクト構成

以下はリポジトリ内の実際の主要ファイルとディレクトリです。

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

## 主な特徴

- **投稿者地球**：インタラクティブな地球で投稿者の分布を表示。
- **Web インタラクション実験**：独自のビジュアルと操作性を持つ作品を紹介。
- **作品比較**：異なる作品やバージョンを並べて比較。

## 技術スタック

<div align="center">

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=222)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/)

</div>

## アカウントとプライバシー

ユーザーのプライバシーを大切にしています。登録情報とアカウントデータはサイトのサービス提供のためにのみ使用し、適切な対策を講じて保護します。サービス運営上必要な場合、ユーザーの許可がある場合、または法令に基づく場合を除き、無関係な第三者に公開・提供することはありません。

詳細は[プライバシーポリシー](privacy.html)をご覧ください。

## 更新履歴

バージョンごとの変更は [CHANGELOG.md](CHANGELOG.md) を参照してください。
