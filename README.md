# SLM Marketplace

A clean, personal portfolio-style marketplace for Small Language Models. 7 pages, vanilla JS, Supabase-ready.

## Run it locally
```
cd slm-marketplace
python3 -m http.server 8000
```
Open `http://localhost:8000`. Works immediately with built-in mock data — no setup required.

## Go live with real data (Supabase)
1. Create a project at supabase.com.
2. Open SQL Editor → paste & run `supabase-schema.sql` (creates all 6 tables, indexes, RLS policies, triggers).
3. In `js/supabase.js`, replace:
   ```js
   const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```
4. Enable GitHub OAuth (optional) in Supabase Dashboard → Authentication → Providers.
5. Every page already calls Supabase first and silently falls back to mock data if it fails — so you can flip this on per-page as you wire things up, nothing breaks in between.

## Architecture notes
- **No build step.** Plain HTML/CSS/JS — works on Vercel, Netlify, GitHub Pages, or any static host.
- **global.js** is the shared kernel: header/footer injection, formatters, category config, toasts, mock dataset. Every page script depends on it loading first.
- Each page has one CSS file + one JS file, named identically (`explore.html` → `explore.css` + `explore.js`).
- **SOLID applied practically:**
  - Single Responsibility — `renderHero`, `renderButtons`, `loadOverviewTab` etc. each touch one DOM region.
  - Open/Closed — new tabs/filters/categories are added by extending config objects (`CATEGORY_CONFIG`, `SUGGESTED_TAGS`), not by rewriting render logic.
  - Liskov — all tab-load functions and all filter-handlers share a consistent calling shape, so they're interchangeable.
  - Interface Segregation — bookmark logic, auth logic, and tab logic don't know about each other.
  - Dependency Inversion — pages depend on `getSupabaseClient()` abstraction; swapping the backend means editing one file.
- **Security**: all user-generated strings pass through `sanitize()` before being injected as HTML (prevents stored-XSS from model titles/descriptions/tags). RLS policies in the schema enforce ownership at the database level too — never trust client-side checks alone.
- **Mock-first fallback**: every data call tries Supabase, catches the error, and falls back to `MOCK_MODELS` / `MOCK_ENGINEERS` / `MOCK_REVIEWS` in `global.js`. This means the whole site is demoable before the backend exists, and won't crash mid-development if a table is missing a column.

## File map
```
index.html        → home.css   + home.js        Homepage, category pills, recent models
explore.html       → explore.css + explore.js    Filters, search, sort, pagination
model.html         → model.css  + model.js       Model detail, 4 tabs, download/view tracking
profile.html       → profile.css + profile.js    Engineer profile, 3 tabs
upload.html        → upload.css + upload.js      Form, validation, tags, draft/publish
leaderboard.html   → leaderboard.css + leaderboard.js   3 ranking tabs, score formula
auth.html          → auth.css + auth.js          Login/signup, GitHub OAuth, password strength
supabase-schema.sql                               All 6 tables + RLS + triggers, paste into Supabase SQL editor
```

## Known gaps to fill before production
- Replace the placeholder Inter font weights with your brand font if different.
- `handleReport()` in model.js currently just toasts — wire it to a `reports` table if you want real moderation.
- Pagination in explore.js currently filters the in-memory mock array; swap `buildFilterQuery` for a real `.range()` Supabase query when you connect live data (the function signature is already isolated for this).
- Auth page's "Forgot password?" link is a placeholder — wire to `supabase.auth.resetPasswordForEmail()`.
