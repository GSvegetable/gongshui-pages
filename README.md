<div align="center">

[<img src="assets/readme/banner.png" alt="宫水.com" width="100%" />](https://xn--3bts89a.com/)

</div>

<a id="project-preview"></a>

<div align="center">

<img src="assets/badges/tech-stack.svg" alt="Tech stack" width="100%" />

[![简体中文](https://img.shields.io/badge/lang-简体中文-16A34A?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-2563EB?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-D94841?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.9-7C3AED?style=flat-square)](docs/CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-0D9488?style=flat-square)](https://xn--3bts89a.com/)

</div>

---

<a id="project-structure"></a>

## 项目结构

```text
gongshui-pages/
├── index.html / login.html / admin.html / privacy.html
├── README.md / README.en.md / README.ja.md / LICENSE
├── CNAME / vercel.json
├── docs/
│   └── CHANGELOG.md
├── assets/
│   ├── badges/
│   │   └── tech-stack.svg
│   ├── readme/
│   │   ├── banner.png
│   │   ├── scene-gallery.png
│   │   └── readme-banner.svg
│   ├── earth/
│   │   ├── earth-blue-marble.jpg
│   │   ├── earth-night.jpg
│   │   ├── earth-topology.png
│   │   └── night-sky.jpg
│   └── flags/
│       └── AE.svg / AR.svg / AT.svg / AU.svg / BD.svg / BE.svg / BR.svg / CA.svg / CH.svg / CL.svg / CN.svg / CO.svg / CZ.svg / DE.svg / DK.svg / EG.svg / ES.svg / FI.svg / FR.svg / GB.svg / GR.svg / HK.svg / HU.svg / ID.svg / IE.svg / IL.svg / IN.svg / IR.svg / IS.svg / IT.svg / JP.svg / KE.svg / KR.svg / KZ.svg / MA.svg / MN.svg / MO.svg / MX.svg / MY.svg / NG.svg / NL.svg / NO.svg / NP.svg / NZ.svg / PE.svg / PH.svg / PK.svg / PL.svg / PT.svg / RO.svg / RU.svg / SA.svg / SE.svg / SG.svg / TH.svg / TR.svg / TW.svg / UA.svg / US.svg / VN.svg / ZA.svg
├── auth/
│   ├── confirm.html
│   └── confirm/
│       └── index.html
├── data/
│   ├── contributors.json
│   └── ne_110m_admin_0_countries.geojson
├── scripts/
│   ├── account.js
│   ├── admin-liquid-glass.js
│   ├── admin.js
│   ├── auth-config.js
│   ├── auth-landing.js
│   ├── auth.js
│   ├── compare.js
│   ├── fingerprint.js
│   ├── globe.js
│   ├── home-page.js
│   ├── login-page.js
│   ├── main.js
│   ├── nav-history.js
│   ├── orbit-versions.js
│   ├── privacy-cleanup.js
│   ├── risk.js
│   ├── scroll-ui.js
│   ├── sync.js
│   └── vendor/
│       └── globe.gl.min.js
├── styles/
│   ├── admin.css
│   ├── globe.css
│   ├── orbit-art.css
│   └── style.css
├── supabase/
│   ├── account-usernames.sql
│   ├── admin.sql
│   ├── linked-accounts.sql
│   ├── risk.sql
│   ├── schema.sql
│   ├── security-audit.sql
│   ├── functions/
│   │   ├── admin-user-action/index.ts
│   │   ├── link-account/index.ts
│   │   ├── password-policy/index.ts
│   │   └── username-login/index.ts
│   └── migrations/
│       ├── 20261114_cron_history_retention.sql
│       ├── 20261114_privacy_minimize_signup_risk.sql
│       ├── 20261114_signup_risk_retention.sql
│       ├── 20261115090000_admin_user_analytics.sql
│       ├── 20261115093000_merge_admin_analytics_into_overview.sql
│       ├── 20261115132520_enforce_active_auth_sessions_for_user_data.sql
│       ├── 20261115132619_guard_security_definer_rpcs_with_active_sessions.sql
│       ├── 20261115132807_throttle_username_login_and_reduce_account_enumeration.sql
│       ├── 20261115132826_fix_username_login_rate_limit_attempt_window.sql
│       ├── 20261115133037_merge_linked_account_groups_atomically.sql
│       ├── 20261115133917_make_private_schema_api_denials_explicit.sql
│       ├── 20261115134508_move_privileged_rpcs_to_private_schema.sql
│       ├── 20261115134642_cache_active_session_rls_predicate_per_statement.sql
│       └── 20261115_admin_console_user_detail.sql
├── vendor/
│   └── vitrio/
│       ├── LICENSE
│       └── vitrio.umd.js
```

## 账号与隐私

用户信息仅用于提供网站服务，并依法采取安全措施予以保护。

详情请参阅 [隐私政策](privacy.html)，或 [查看源码](https://github.com/GSvegetable/gongshui-pages/tree/main/scripts)（前端认证逻辑）及 [服务端与数据库实现](https://github.com/GSvegetable/gongshui-pages/tree/main/supabase)。

[![快速迭代 · X @gsyxyc](assets/readme/readme-banner.svg)](https://x.com/gsyxyc)

## 许可证

本项目采用 [MIT License](LICENSE) 开源协议。
