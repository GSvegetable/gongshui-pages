<div align="center">

[<img src="banner.png" alt="Gongshui.com — pixel art banner" width="100%" />](https://xn--3bts89a.com/)

[![简体中文](https://img.shields.io/badge/lang-简体中文-9CA3AF?style=flat-square)](README.md)
[![English](https://img.shields.io/badge/lang-English-16A34A?style=flat-square)](README.en.md)
[![日本語](https://img.shields.io/badge/lang-日本語-9CA3AF?style=flat-square)](README.ja.md)
[![Version](https://img.shields.io/badge/version-v2.12.9-2563EB?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Web-181717?style=flat-square)](https://xn--3bts89a.com/)
[![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JavaScript-F97316?style=flat-square)](#tech-stack)

</div>

---

## Overview

Gongshui.com is a personal web portfolio and interaction lab featuring project showcases, favorites, account services, a pixel-art contributor globe, and multilingual interfaces.

## Project Structure

The tree below highlights the main files. Related assets are grouped by purpose.

```text
gongshui-pages/
├── index.html                 # Homepage and project showcase
├── login.html                 # Sign-in, registration, and account verification
├── admin.html                 # Admin dashboard
├── privacy.html               # Privacy policy
├── banner.png                 # README cover image
├── README.md                  # Chinese documentation
├── README.en.md               # English documentation
├── README.ja.md               # Japanese documentation
├── CHANGELOG.md               # Release history
├── CNAME                      # Custom domain
├── vercel.json                # Response headers and security policies
│
├── styles/
│   ├── style.css              # Main site styles
│   ├── admin.css              # Admin dashboard styles
│   ├── globe.css              # Globe view styles
│   └── orbit-art.css          # Orbit visual styles
│
├── scripts/
│   ├── main.js                # Homepage logic, project discovery, and favorites
│   ├── home-page.js           # Homepage settings and interactions
│   ├── auth.js                # Supabase authentication client
│   ├── auth-config.js         # Authentication service configuration
│   ├── account.js             # Account menu, profile, and linked accounts
│   ├── login-page.js          # Sign-in and registration logic
│   ├── admin.js               # Admin dashboard logic
│   ├── admin-liquid-glass.js  # Admin dashboard visual interactions
│   ├── globe.js               # Contributor globe rendering and interaction
│   ├── compare.js             # Project comparison
│   ├── nav-history.js         # Navigation history
│   ├── scroll-ui.js           # Scroll-related interface behavior
│   ├── orbit-versions.js      # Orbit version handling
│   ├── sync.js                # User data synchronization
│   ├── risk.js                # Sign-up and sign-in risk controls
│   ├── fingerprint.js         # Device identification helpers
│   ├── privacy-cleanup.js     # Local privacy data cleanup
│   └── vendor/
│       └── globe.gl.min.js    # Globe visualization library
│
├── assets/
│   ├── earth/                 # Globe textures and backgrounds
│   └── flags/                 # Country and region flag SVGs
│
├── data/
│   ├── contributors.json      # Contributor and location data
│   └── ne_110m_admin_0_countries.geojson # Country boundary data
│
├── auth/
│   ├── confirm.html           # Email confirmation entry
│   └── confirm/index.html    # Email confirmation page
│
└── supabase/
    ├── schema.sql             # Core tables and RLS structure
    ├── account-usernames.sql  # Username-related database schema
    ├── linked-accounts.sql    # Linked-account database schema
    ├── admin.sql              # Admin database schema
    ├── risk.sql               # Risk-control database schema
    ├── security-audit.sql     # Security audit SQL
    ├── functions/             # Edge Functions for sign-in, account linking, password policy, and admin actions
    └── migrations/            # Database and policy change history
```

## Features

- **Project showcase:** Browse web projects and interaction experiments.
- **Favorites:** Save projects and synchronize user data.
- **Accounts:** Sign in with email, username, Google, or GitHub.
- **Localization:** Chinese, English, and Japanese interfaces.
- **Contributor globe:** Explore contributor locations and flags on an interactive globe.
- **Admin dashboard:** Manage users and related data.

## Tech Stack

| Area | Technology |
| --- | --- |
| Front end | HTML, CSS, JavaScript |
| Authentication and database | Supabase Auth, PostgreSQL, Row Level Security |
| Server-side functions | Supabase Edge Functions |
| Version control | Git, GitHub |
| Deployment configuration | Vercel |

## Accounts and Security

Authentication is handled by Supabase Auth. Database access is governed by Row Level Security (RLS), while selected sign-in, account-linking, and administrative operations run through Supabase Edge Functions. See the SQL files and functions under `supabase/` for implementation details.

## Development

Commit code changes to GitHub. Deployment is handled by the hosting service connected to the repository. The `vercel.json` file defines response headers and security policies.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release updates.
