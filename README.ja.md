<div align="center">

[<img src="banner.png" alt="宮水.com" width="100%" />](https://xn--3bts89a.com/)

</div>

<a id="project-preview"></a>

<div align="center">

[![简体中文](https://img.shields.io/badge/lang-简体中文-16A34A?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-2563EB?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-D94841?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.9-7C3AED?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-0D9488?style=flat-square)](https://xn--3bts89a.com/)

</div>

---

<a id="project-structure"></a>

## プロジェクト構成

```text
gongshui-pages/
├── index.html                                  # サイトのエントリーポイント。作品一覧、作品カード、詳細パネルなどを含みます。
├── login.html                                  # アカウントのログイン・登録ページ。
├── admin.html                                  # サイト管理用ダッシュボード。
├── privacy.html                                # プライバシーポリシー。
├── banner.png                                  # README の上部に表示するプロジェクトバナー。
├── scene-gallery.png                           # Pixel Daylight Switch の複数シーンのプレビュー画像。クリックすると作品の拡大詳細を直接開きます。
├── readme-directory002.svg                         # Pixel Daylight Switch の体験ページへ移動するアニメーション付きリンク画像。
├── readme-banner.svg                           # README の下部に表示する SNS・更新案内バナー。
├── README.md                                   # —
├── README.en.md                                # —
├── README.ja.md                                # —
├── CHANGELOG.md                                # バージョンごとの変更履歴。
├── CNAME                                       # GitHub Pages のカスタムドメイン設定ファイル。
├── vercel.json                                 # Vercel のデプロイ・ルーティング設定。
│
├── styles/                                     # 各ページ・コンポーネントのスタイルシート。
│   ├── style.css                               # ホームページと共通 UI のメインスタイル。
│   ├── admin.css                               # 管理画面専用のスタイル。
│   ├── globe.css                               # 地球・コンパス画面のスタイル。
│   └── orbit-art.css                           # Pixel Orbit の作品表示領域のスタイル。
│
├── scripts/                                    # ページ操作・アプリ機能を実装する JavaScript モジュール。
│   ├── main.js                                 # 作品カード、詳細表示、拡大表示などの中核ロジック。
│   ├── home-page.js                            # ホーム画面のナビゲーション、検索、UI 動作。
│   ├── auth.js                                 # ユーザー認証とログイン処理。
│   ├── auth-config.js                          # 認証サービスのクライアント設定。
│   ├── auth-landing.js                         # 認証関連ランディングページの処理。
│   ├── account.js                              # アカウント情報・状態に関するフロントエンド処理。
│   ├── login-page.js                           # ログイン・登録ページの操作処理。
│   ├── admin.js                                # 管理画面の機能・操作処理。
│   ├── admin-liquid-glass.js                   # 管理画面のリキッドグラス表現。
│   ├── globe.js                                # 地球ビュー、場所、コントリビューター関連の操作。
│   ├── compare.js                              # 作品のバージョン・表示比較機能。
│   ├── nav-history.js                          # サイト内ビューのナビゲーションと履歴状態管理。
│   ├── scroll-ui.js                            # スクロール関連の UI 動作と制御。
│   ├── orbit-versions.js                       # Pixel Orbit のバージョン切り替え処理。
│   ├── sync.js                                 # ユーザー設定とアカウントデータの同期処理。
│   ├── risk.js                                 # リスク検知とセキュリティ検証処理。
│   ├── fingerprint.js                          # ブラウザー環境の識別機能。
│   ├── privacy-cleanup.js                      # プライバシー関連のクリーンアップとローカルデータ処理。
│   └── vendor/                                 # サードパーティ製・圧縮済み依存スクリプト。
│       └── globe.gl.min.js                     # 地球の 3D 可視化に使用する globe.gl ライブラリ。
│
├── assets/                                     # 画像・アイコンなどの静的アセット。
│   ├── earth/                                  # 地球ビューで使用するテクスチャ・地図データ。
│   ├── flags/                                  # 国・地域の旗画像。
│   └── badges/                                 # README のバッジと技術スタック画像。
│       └── tech-stack.svg                      # 使用技術を示す控えめなモノクロ SVG。
│
├── data/                                       # サイトで使用する構造化データ。
│   ├── contributors.json                       # コントリビューター情報と関連メタデータ。
│   └── ne_110m_admin_0_countries.geojson       # 地球ビューで使用する国・地域の境界データ。
│
├── auth/                                       # 認証コールバック・確認ページ。
│   ├── confirm.html                            # アカウント認証・確認ページ。
│   └── confirm/index.html                      # ディレクトリ形式でアクセスするアカウント確認ページ。
│
└── supabase/                                   # Supabase のデータベース定義・関数・マイグレーション。
    ├── schema.sql                              # データベースの基本スキーマ。
    ├── account-usernames.sql                   # アカウントユーザー名関連の定義。
    ├── linked-accounts.sql                     # 連携アカウント機能の定義。
    ├── admin.sql                               # 管理機能向けデータベース定義。
    ├── risk.sql                                # リスク制御関連のデータベース定義。
    ├── security-audit.sql                      # セキュリティ監査関連のデータベース定義。
    ├── functions/                              # Supabase Edge Functions などのサーバー関数。
    └── migrations/                             # データベース変更・マイグレーション履歴。
```


## アカウントとプライバシー

ユーザーのプライバシーを大切にしています。登録情報とアカウントデータはサイトのサービス提供のためにのみ使用し、適切な対策を講じて保護します。サービス運営上必要な場合、ユーザーの許可がある場合、または法令に基づく場合を除き、無関係な第三者に公開・提供することはありません。

詳細は[プライバシーポリシー](privacy.html)をご覧ください。

[![快速迭代 · X @gsyxyc](readme-banner.svg)](https://x.com/gsyxyc)

## ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。
