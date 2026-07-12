# SLM Marketplace — Technical Debt Register
**Updated:** July 2026

## Priority 1 — Should Fix Before Scaling

| ID | Issue | Impact | Effort | Fix |
|----|-------|--------|--------|-----|
| TD-01 | `global.js` includes 300+ lines of mock data | Bloats every page load | Low | Move to `js/mock-data.js`, loaded conditionally |
| TD-02 | Docs sidebar duplicated in every HTML file (29 copies) | Nav changes require 29 edits | Medium | Inject sidebar via `docs.js` from a single data source |
| TD-03 | `engineer_name` in models table denormalized | Name drift when user updates profile | Medium | Join `users` table at query time; remove stored field |
| TD-04 | No global `window.onerror` reporting | Prod errors vanish silently | Low | Add Sentry or basic error logging endpoint |
| TD-05 | `renderTags()` uses inline `onclick` built from user input | XSS vector via attribute injection | Medium | Replace with `addEventListener` after DOM insertion |

## Priority 2 — Quality of Life

| ID | Issue | Impact | Effort |
|----|-------|--------|--------|
| TD-06 | No build/minification step | 21KB global.js ships unminified | Medium (add esbuild step) |
| TD-07 | No automated tests | Regressions are invisible until reported | High (add Playwright) |
| TD-08 | `activity` table in SQL schema has no RLS policies | Any authenticated user can read all activity | Low (add RLS policies) |
| TD-09 | No staging environment config | Only production URL is configured | Low (add `.dev.vars.staging`) |
| TD-10 | `wrangler.toml` missing | Local dev requires manual config steps | Low (add wrangler.toml) |

## Priority 3 — Future Improvements

| ID | Issue | Impact |
|----|-------|--------|
| TD-11 | No image optimization pipeline | User avatars and model cover images unoptimized |
| TD-12 | No rate limiting on signup form | Supabase's built-in rate limiting is sole protection |
| TD-13 | 22 docs pages still to write (stubs exist in sidebar) | Broken links damage credibility |
| TD-14 | No dark mode toggle in main app (only docs) | User preference ignored |
| TD-15 | No WebSocket-based live notification for model updates | Requires page refresh to see new reviews |

## Already Fixed in This Audit

- ✅ A1: PKCE race condition (`setTimeout(500)` → `waitForSession()`)
- ✅ A2: `handleLogout()` only available on auth page → moved to `global.js`
- ✅ A3: `SITE_URL` hardcoded → reads from `window.__SLM_CONFIG` or `location.origin`
- ✅ A4: Password update without session check → added session verification
- ✅ Dark mode added to `docs.css`
- ✅ FAQ toggles added to all docs pages
- ✅ Tab groups added to all docs pages
- ✅ Reading progress bar working on all docs pages
- ✅ 6-month roadmap written (1,329 lines, full day-by-day curriculum)
- ✅ 7 major docs pages fully rewritten with code, diagrams, FAQs, exercises
- ✅ `STRUCTURE.md` added to clarify project layout for contributors
