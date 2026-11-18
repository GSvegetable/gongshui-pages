<div align="center">

[<img src="banner.png" alt="宫水.com — pixel art banner" width="100%" />](https://xn--3bts89a.com/)

[![简体中文](https://img.shields.io/badge/lang-简体中文-9CA3AF?style=flat-square)](README.md)
[![日本語](https://img.shields.io/badge/lang-日本語-16A34A?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.9-2563EB?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-181717?style=flat-square)](https://xn--3bts89a.com/)
[![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JavaScript-F97316?style=flat-square)](#技術スタック)

</div>

---

## プロジェクト概要

宫水.com は、Web 作品のポートフォリオとインタラクション実験のプロジェクトです。作品展示、お気に入り、アカウント機能、ドット絵の投稿者地球、多言語 UI を備えています。

## プロジェクト構成

主要ファイルを掲載しています。同じ用途のリソースはまとめて説明しています。

```text
gongshui-pages/
├── index.html                 # トップページと作品一覧
├── login.html                 # ログイン・登録・認証ページ
├── admin.html                 # 管理画面
├── privacy.html               # プライバシーポリシー
├── banner.png                 # README のカバー画像
├── README.md                  # 中国語 README
├── README.ja.md               # 日本語 README
├── CHANGELOG.md               # バージョン変更履歴
├── CNAME                      # カスタムドメイン設定
├── vercel.json                # レスポンスヘッダーとセキュリティ設定
│
├── styles/
│   ├── style.css              # サイト共通スタイル
│   ├── admin.css              # 管理画面のスタイル
│   ├── globe.css              # 地球ビューのスタイル
│   └── orbit-art.css          # Orbit のビジュアルスタイル
│
├── scripts/
│   ├── main.js                # トップページの中核処理・作品検出・お気に入り
│   ├── home-page.js           # 設定パネルとページ操作
│   ├── auth.js                # Supabase 認証クライアント
│   ├── auth-config.js         # 認証サービス設定
│   ├── account.js             # アカウントメニュー・プロフィール・連携
│   ├── login-page.js          # ログイン・登録画面の処理
│   ├── admin.js               # 管理画面の処理
│   ├── admin-liquid-glass.js  # 管理画面のビジュアル操作
│   ├── globe.js               # 投稿者地球の描画と操作
│   ├── compare.js              # 作品比較機能
│   ├── nav-history.js         # ページ移動履歴
│   ├── scroll-ui.js           # スクロール関連 UI
│   ├── orbit-versions.js      # Orbit のバージョン関連処理
│   ├── sync.js                # ユーザーデータ同期
│   ├── risk.js                # 登録・ログインのリスク制御
│   ├── fingerprint.js         # 端末識別の補助処理
│   ├── privacy-cleanup.js     # ローカルのプライバシーデータ整理
│   └── vendor/
│       └── globe.gl.min.js    # 地球可視化ライブラリ
│
├── assets/
│   ├── earth/                 # 地球テクスチャと背景画像
│   └── flags/                 # 国・地域の SVG 旗
│
├── data/
│   ├── contributors.json      # 投稿者と位置情報
│   └── ne_110m_admin_0_countries.geojson # 国境データ
│
├── auth/
│   ├── confirm.html           # メール確認の入口
│   └── confirm/index.html     # メール確認ページ
│
└── supabase/
    ├── schema.sql             # 基本テーブルと RLS 構成
    ├── account-usernames.sql  # ユーザー名関連の DB 構成
    ├── linked-accounts.sql    # アカウント連携用 DB 構成
    ├── admin.sql              # 管理機能用 DB 構成
    ├── risk.sql               # リスク制御用 DB 構成
    ├── security-audit.sql     # セキュリティ確認 SQL
    ├── functions/             # Edge Functions：ユーザー名ログイン、連携、パスワード方針、管理操作
    └── migrations/            # DB 構造・ポリシーの変更履歴
```

## 主な機能

- **作品展示**：Web 作品とインタラクション実験を閲覧。
- **お気に入り**：作品を保存し、ユーザーデータを同期。
- **アカウント**：メールアドレス、ユーザー名、Google、GitHub でログイン。
- **多言語 UI**：中国語・英語・日本語。
- **投稿者地球**：地球ビューに投稿者の位置と旗を表示。
- **管理画面**：ユーザーと関連データを管理。

## 技術スタック

| 分野 | 技術 |
| --- | --- |
| フロントエンド | HTML、CSS、JavaScript |
| 認証・データベース | Supabase Auth、PostgreSQL、Row Level Security |
| サーバー機能 | Supabase Edge Functions |
| バージョン管理 | Git、GitHub |
| デプロイ設定 | Vercel |

## アカウントとセキュリティ

認証には Supabase Auth を使用します。ユーザーデータはデータベースの RLS で制御し、一部のログイン・アカウント連携・管理操作は Supabase Edge Functions で処理します。詳細は `supabase/` 内の SQL と関数を参照してください。

## 開発と公開

コードを変更したら GitHub にコミットします。デプロイ方法はリポジトリに接続されたホスティングサービスとその設定に従います。`vercel.json` はレスポンスヘッダーとセキュリティ設定を管理します。

## 更新履歴

バージョンごとの変更は [CHANGELOG.md](CHANGELOG.md) を参照してください。
