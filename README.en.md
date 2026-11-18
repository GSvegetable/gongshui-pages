<div align="center">

[<img src="banner.png" alt="Gongshui.com" width="100%" />](https://xn--3bts89a.com/)

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

## Project Structure

```text
gongshui-pages/
├── index.html / login.html / admin.html / privacy.html   # Site entry pages
├── README*.md / CHANGELOG.md / LICENSE                    # Project documentation
├── CNAME / vercel.json                                    # Domain and deployment config
├── banner.png / scene-gallery.png / readme-banner.svg    # README visuals
├── styles/                                                # Page stylesheets
├── scripts/                                               # Frontend logic (auth, accounts, admin, security, UI, etc.)
│   └── vendor/                                            # Third-party scripts
├── assets/                                                # Static assets (earth, flags, badges)
├── data/                                                  # JSON and GeoJSON data
├── auth/                                                  # Account verification callback pages
└── supabase/                                              # Database schema, Edge Functions, and migrations
```



## Privacy

User information is used solely to provide the website’s services and is protected in accordance with applicable requirements.

See our [Privacy Policy](privacy.html), or [view the source](https://github.com/GSvegetable/gongshui-pages/tree/main/scripts) for frontend authentication logic and the [server-side and database implementation](https://github.com/GSvegetable/gongshui-pages/tree/main/supabase).

[![Rapidly evolving · X @gsyxyc](readme-banner.svg)](https://x.com/gsyxyc)

## License

This project is licensed under the [MIT License](LICENSE).
