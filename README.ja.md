<div align="center">

[<img src="banner.png" alt="宮水.com" width="100%" />](https://xn--3bts89a.com/)

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

## プロジェクト構成

```text
gongshui-pages/
├── index.html / login.html / admin.html / privacy.html   # サイトの各ページ
├── README*.md / CHANGELOG.md / LICENSE                    # プロジェクト文書
├── CNAME / vercel.json                                    # ドメイン・デプロイ設定
├── banner.png / scene-gallery.png / readme-banner.svg    # README 用画像
├── styles/                                                # ページのスタイル
├── scripts/                                               # フロントエンド処理（認証、アカウント、管理、セキュリティ等）
│   └── vendor/                                            # サードパーティ製スクリプト
├── assets/                                                # 静的アセット（earth、flags、badges）
├── data/                                                  # JSON・GeoJSON データ
├── auth/                                                  # アカウント確認用コールバックページ
└── supabase/                                              # DB スキーマ、Edge Functions、マイグレーション
```



## アカウントとプライバシー

ユーザー情報はサイトサービスの提供にのみ使用し、法令に従って適切に保護します。

詳細は[プライバシーポリシー](privacy.html)、[フロントエンド認証ロジックのソースコード](https://github.com/GSvegetable/gongshui-pages/tree/main/scripts)、および[サーバー側・データベースの実装](https://github.com/GSvegetable/gongshui-pages/tree/main/supabase)をご覧ください。

[![快速迭代 · X @gsyxyc](readme-banner.svg)](https://x.com/gsyxyc)

## ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。
