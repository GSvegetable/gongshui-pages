<div align="center">

[<img src="assets/readme/banner.png" alt="宮水.com" width="100%" />](https://xn--3bts89a.com/)

</div>

<a id="project-preview"></a>

<div align="center">

<img src="assets/badges/tech-stack.svg" alt="Tech stack" width="100%" />

[![简体中文](https://img.shields.io/badge/lang-简体中文-16A34A?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-2563EB?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-D94841?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.11-7C3AED?style=flat-square)](docs/CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-0D9488?style=flat-square)](https://xn--3bts89a.com/)

</div>

---

<a id="project-structure"></a>

## プロジェクト構成

```text
gongshui-pages/
├── index.html                 # ウェブサイトのホームページ・メイン展示画面
├── login.html                 # ログイン・新規登録ページ
├── admin.html                 # 管理ダッシュボード
├── privacy.html               # プライバシーポリシー
├── README.md                  # 中国語のプロジェクト説明・ディレクトリ一覧
├── README.en.md               # 英語のプロジェクト説明
├── README.ja.md               # 日本語のプロジェクト説明
├── LICENSE                    # MIT オープンソースライセンス
├── CNAME                      # GitHub Pages のカスタムドメイン設定
├── vercel.json                # Vercel のデプロイ・ルーティング設定
├── docs/
│   └── CHANGELOG.md           # プロジェクトの更新履歴
├── assets/
│   ├── badges/
│   │   └── tech-stack.svg     # README 上部に表示する技術スタックバッジ
│   ├── readme/
│   │   ├── banner.png         # README 上部のバナー画像
│   │   ├── scene-gallery.png  # プロジェクトのシーンプレビュー画像
│   │   └── readme-banner.svg  # README 下部の X アカウント紹介画像
│   ├── earth/
│   │   ├── earth-blue-marble.jpg   # 昼間の地球テクスチャ
│   │   ├── earth-night.jpg         # 夜の地球の光のテクスチャ
│   │   ├── earth-topology.png      # 地形・トポロジーテクスチャ
│   │   └── night-sky.jpg           # 星空の背景素材
│   └── flags/
│       └── *.svg              # 国・地域の旗を表す SVG 画像 61 点（コード名で管理）
├── auth/
│   ├── confirm.html          # メール認証コールバックページ
│   └── confirm/
│       └── index.html        # メール認証コールバックのルート入口
├── data/
│   ├── contributors.json     # プロジェクト貢献者データ
│   └── ne_110m_admin_0_countries.geojson  # 世界の国・地域の境界データ
├── scripts/
│   ├── account.js            # アカウント情報・アカウント操作
│   ├── admin-liquid-glass.js # 管理画面のリキッドグラス効果
│   ├── admin.js              # 管理画面の操作・管理ロジック
│   ├── auth-config.js        # クライアント側の認証設定
│   ├── auth-landing.js       # ログイン・登録ランディングページの処理
│   ├── auth.js               # ログイン・登録・認証フロー
│   ├── compare.js            # 比較機能の処理
│   ├── fingerprint.js        # ブラウザー・デバイス特性の収集
│   ├── globe.js              # インタラクティブ地球・地図の表示
│   ├── home-page.js          # ホームページの操作処理
│   ├── login-page.js         # ログインページの操作処理
│   ├── main.js               # サイト全体の初期化・共通処理
│   ├── nav-history.js        # ページ遷移履歴の管理
│   ├── orbit-versions.js     # 軌道・バージョン展示の処理
│   ├── privacy-cleanup.js    # プライバシーデータのクリーンアップ
│   ├── risk.js               # 登録・ログイン時のリスク検出
│   ├── scroll-ui.js          # スクロール関連の UI 操作
│   ├── sync.js               # ユーザーデータの同期
│   └── vendor/
│       └── globe.gl.min.js   # サードパーティ製 globe.gl 描画ライブラリ
├── styles/
│   ├── admin.css             # 管理画面のスタイル
│   ├── globe.css             # 地球・地図コンポーネントのスタイル
│   ├── orbit-art.css         # 軌道ビジュアル効果のスタイル
│   └── style.css             # サイト全体の基本スタイル
├── supabase/
│   ├── account-usernames.sql # ユーザー名・アカウント関連の DB 定義
│   ├── admin.sql             # 管理機能用 DB オブジェクト
│   ├── linked-accounts.sql   # アカウント連携のデータ構造・処理
│   ├── risk.sql              # リスク検出関連の DB オブジェクト
│   ├── schema.sql            # データベースの基本構造
│   ├── security-audit.sql    # DB セキュリティ監査・確認スクリプト
│   ├── functions/
│   │   ├── admin-user-action/index.ts  # 管理者ユーザー操作 Edge Function
│   │   ├── link-account/index.ts       # アカウント連携 Edge Function
│   │   ├── password-policy/index.ts    # パスワードポリシー検証 Edge Function
│   │   └── username-login/index.ts    # ユーザー名ログイン Edge Function
│   └── migrations/
│       └── *.sql             # 保持期間、プライバシー、管理分析、セッション検証、ログイン制限、権限強化を扱う DB 変更ファイル 14 件
└── vendor/
    └── vitrio/
        ├── LICENSE           # Vitrio サードパーティコンポーネントのライセンス
        └── vitrio.umd.js     # Vitrio サードパーティコンポーネントのバンドル
```

## アカウントとプライバシー

ユーザー情報はサイトサービスの提供にのみ使用し、セキュリティ対策を講じて保護します。
詳細は[プライバシーポリシー](privacy.html)、[ソースコード](https://github.com/GSvegetable/gongshui-pages/tree/main/scripts)、[サーバー側・データベースの実装](https://github.com/GSvegetable/gongshui-pages/tree/main/supabase)をご覧ください。
下の画像をクリックすると X アカウントを確認できます。

[![快速迭代 · X @gsyxyc](assets/readme/readme-banner.svg)](https://x.com/gsyxyc)
## ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。
