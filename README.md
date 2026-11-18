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
├── index.html / login.html / admin.html / privacy.html   # 网站页面入口
├── README*.md / CHANGELOG.md / LICENSE                    # 项目文档
├── CNAME / vercel.json                                    # 部署与域名配置
├── banner.png / scene-gallery.png / readme-banner.svg    # README 展示图片
├── styles/                                                # 页面样式
├── scripts/                                               # 前端交互与业务逻辑（认证、账号、管理、风控等）
│   └── vendor/                                            # 第三方脚本
├── assets/                                                # 静态资源（earth、flags、badges）
├── data/                                                  # JSON 与 GeoJSON 数据
├── auth/                                                  # 账号验证回调页面
└── supabase/                                              # 数据库结构、Edge Functions 与迁移记录
```



## 账号与隐私

用户信息仅用于提供网站服务，并依法采取安全措施予以保护。

详情请参阅 [隐私政策](privacy.html)，或 [查看源码](https://github.com/GSvegetable/gongshui-pages/tree/main/scripts)（前端认证逻辑）及 [服务端与数据库实现](https://github.com/GSvegetable/gongshui-pages/tree/main/supabase)。

[![快速迭代 · X @gsyxyc](readme-banner.svg)](https://x.com/gsyxyc)

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。
