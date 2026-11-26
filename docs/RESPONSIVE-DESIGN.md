# Responsive design system

宫水.com uses a content-first responsive layout. Breakpoints describe available layout space, not specific device models. A browser window, tablet split-screen, rotation, and desktop resizing must all follow the same rules.

## Layout bands

| Band | CSS viewport width | Layout behavior |
| --- | ---: | --- |
| Compact | 0–760px | Single-column-first page layout. The artwork is followed by the full editorial poster in normal page flow; no bottom drawer. Controls and content use compact spacing. |
| Medium | 761–1099px | Work artwork and editorial details sit flush edge-to-edge as one composition when the available width supports both. Gallery density is tuned for tablet-sized windows. |
| Expanded | 1100px and above | Full side-by-side work viewer, flexible gallery density, and wider content rhythm. |
| Wide | 1600px and above | Increase gutters and gaps while keeping the content measure bounded. |

These are starting bands, not device guarantees. If a component's own container becomes narrow, it should reflow even when the viewport is wide.

## Shared implementation

- `styles/responsive.css` is the final responsive layer for the portfolio and account pages.
- `styles/admin.css` owns the management console's responsive layout.
- `scripts/main.js` uses the same 760px compact threshold as the work-viewer CSS.
- Gallery columns are measured from the gallery container and available width. Touch tablets retain a comfortable default density.
- Safe-area insets are respected on pages that can reach the screen edge.
- Dynamic viewport units are used for compact-height work sheets; `100vh` remains as a fallback.
- Components should use `min-width: 0`, fluid sizing, Grid/Flexbox, and wrapping rather than fixed widths that can force horizontal overflow.

## Verification checklist

Test the home gallery, work detail, expanded artwork, comparison mode, bookmarks, account page, privacy page, and management console at:

- 360 × 800 and 390 × 844 (compact portrait)
- 740 × 390 (compact landscape / narrow window)
- 768 × 1024 (medium portrait)
- 1024 × 768 (medium landscape)
- 1280 × 800 and 1440 × 900 (expanded desktop)
- 1920 × 1080 (wide desktop)

Also test browser zoom, split-screen resizing, long translated labels, keyboard focus, reduced motion, and safe-area devices. A successful syntax check is not a substitute for visual browser testing.
