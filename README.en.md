<div align="center">

[<img src="assets/readme/banner.png" alt="Gongshui.com" width="100%" />](https://xn--3bts89a.com/)

</div>

<a id="project-preview"></a>

<div align="center">

<img src="assets/badges/tech-stack.svg" alt="Tech stack" width="100%" />

[![简体中文](https://img.shields.io/badge/lang-简体中文-16A34A?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-2563EB?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-D94841?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.15.0-7C3AED?style=flat-square)](docs/CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-0D9488?style=flat-square)](https://xn--3bts89a.com/)

</div>

---

<a id="project-structure"></a>

## Project Structure

```text
gongshui-pages/
├── index.html                 # Website homepage and main showcase
├── login.html                 # User sign-in and registration page
├── admin.html                 # Administration dashboard
├── privacy.html               # Privacy policy page
├── README.md                  # Chinese project documentation and directory index
├── README.en.md               # English project documentation
├── README.ja.md               # Japanese project documentation
├── LICENSE                    # MIT open-source license
├── CNAME                      # GitHub Pages custom-domain configuration
├── vercel.json                # Vercel deployment and routing configuration
├── docs/
│   ├── CHANGELOG.md           # Project release history
│   └── ARCHITECTURE.md       # Repository boundaries and work ownership
├── assets/
│   ├── badges/
│   │   └── tech-stack.svg     # Technology-stack badge displayed in the README
│   ├── readme/
│   │   ├── banner.png         # README header banner
│   │   ├── scene-gallery.png  # Project scene preview image
│   │   └── readme-banner.svg  # X account banner at the bottom of the README
├── auth/
│   ├── confirm.html          # Email verification callback page
│   └── confirm/
│       └── index.html        # Email verification callback route entry
├── scripts/
│   ├── account.js            # Account profile and account operations
│   ├── admin-liquid-glass.js # Liquid-glass effects for the admin dashboard
│   ├── admin.js              # Admin dashboard interactions and logic
│   ├── auth-config.js        # Client-side authentication configuration
│   ├── auth-landing.js       # Sign-in/sign-up landing page logic
│   ├── auth.js               # Authentication and registration flows
│   ├── compare.js            # Comparison feature logic
│   ├── fingerprint.js        # Browser/device fingerprint collection
│   ├── home-page.js          # Homepage interactions
│   ├── login-page.js         # Login page interactions
│   ├── main.js               # Main site initialization and shared logic
│   ├── nav-history.js        # Page navigation history management
│   ├── orbit-versions.js     # Orbit/version showcase logic
│   ├── portfolio-actions.js  # Portfolio detail actions for site views
│   ├── portfolio-preview.js  # Standalone project iframes and host data bridge
│   ├── privacy-cleanup.js    # Privacy data cleanup logic
│   ├── risk.js               # Registration and login risk detection
│   ├── scroll-ui.js          # Scroll-related interface interactions
│   └── sync.js               # User data synchronization
├── styles/
│   ├── admin.css             # Administration dashboard styles
│   ├── orbit-art.css         # Orbit visual-effect styles
│   ├── portfolio-works.css   # Portfolio previews and navigation demo styles
│   └── style.css             # Global website styles
├── supabase/
│   ├── account-usernames.sql # Database definitions for usernames and accounts
│   ├── admin.sql             # Administration database objects
│   ├── linked-accounts.sql   # Linked-account schema and logic
│   ├── risk.sql              # Risk-detection database objects
│   ├── schema.sql            # Base database schema
│   ├── security-audit.sql    # Database security audit and checks
│   ├── functions/
│   │   ├── admin-user-action/index.ts  # Admin user-action Edge Function
│   │   ├── link-account/index.ts       # Account-linking Edge Function
│   │   ├── password-policy/index.ts    # Password-policy validation Edge Function
│   │   └── username-login/index.ts    # Username-login Edge Function
│   └── migrations/
│       └── *.sql             # 14 incremental database migrations covering retention, privacy, analytics, session checks, rate limiting, and permission hardening
└── vendor/
    └── vitrio/
        ├── LICENSE           # Vitrio third-party component license
        └── vitrio.umd.js     # Bundled Vitrio third-party component
```

## Where the works live

All five showcased works are sourced exclusively from [gongshui-open-source](https://github.com/GSvegetable/gongshui-open-source). This repository owns the website platform: UI, navigation, authentication, accounts, bookmark persistence and folders, search, settings, portfolio catalog, and host-side iframe adapters. The works are embedded from their own GitHub Pages URLs; their core renderers are not duplicated here.

The Bookmark Hall receives normalized bookmark records through an origin-checked `postMessage` bridge. The website remains responsible for accounts, bookmark persistence, and opening detail views. The black bookmark navigation handoff page is a separate platform page, not the Bookmark Hall artwork. See [Repository boundaries and work ownership](docs/ARCHITECTURE.md).

## Privacy

User information is used only to provide website services and is protected by security measures.
See the [Privacy Policy](privacy.html), [source code](https://github.com/GSvegetable/gongshui-pages/tree/main/scripts), and [server-side and database implementation](https://github.com/GSvegetable/gongshui-pages/tree/main/supabase).
Click the image below to visit the X account.

[![Rapidly evolving · X @gsyxyc](assets/readme/readme-banner.svg)](https://x.com/gsyxyc)
## License

This project is licensed under the [MIT License](LICENSE).
