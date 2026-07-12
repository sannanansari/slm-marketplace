# SLM Marketplace — Production Memory Card
**Read this before every deployment. Read this when anything breaks.**

---

## THE ONE THING THAT KILLS EVERYTHING

Visit your live site. Open a new tab. Go to:
```
https://slm-market.sannan.app/config.js
```

You must see:
```javascript
window.__SLM_CONFIG = { url: "https://xxxx.supabase.co", key: "eyJ...", siteUrl: "https://slm-market.sannan.app" };
```

If you see `url: ""` — **the entire site is running on mock data.**  
Auth doesn't work. DB doesn't work. Nothing is real.  
Fix: Cloudflare Pages → Settings → Environment variables → add the 3 vars → Redeploy.

---

## THE 3 ENV VARS (memorise these)

| Variable | Example value | If missing |
|----------|--------------|------------|
| `SUPABASE_URL` | `https://abcdefgh.supabase.co` | Site runs on mock data |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Site runs on mock data |
| `SITE_URL` | `https://slm-market.sannan.app` | OAuth + email links broken |

Set in: **Cloudflare Pages → your project → Settings → Environment variables**  
Set for both **Production** and **Preview** environments.

The anon key is safe to expose. It is not a secret. RLS handles security.  
Never put the `service_role` key anywhere in this codebase.

---

## THE SCRIPT LOAD ORDER (break this = nothing works)

Every HTML page loads scripts in this exact order:

```html
<!-- 1. SYNC — must be first, sets window.__SLM_CONFIG -->
<script src="config.js"></script>

<!-- 2. SYNC — must be second, needs config already set -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/..."></script>

<!-- 3. DEFER — reads __SLM_CONFIG, creates Supabase client singleton -->
<script src="js/supabase.js" defer></script>

<!-- 4. DEFER — all shared utilities, requires getSupabaseClient() to exist -->
<script src="js/global.js" defer></script>

<!-- 5. DEFER — page-specific logic, calls functions from global.js -->
<script src="js/auth.js" defer></script>
```

Rules:
- `config.js` and supabase CDN are **sync** (no defer, no async). This blocks parsing deliberately.
- Everything else is **defer**. Defer runs in order after DOM is parsed.
- Never add `async` to any of these. Async = random execution order = broken.
- `config.js` is not a real file in the repo. It is generated at runtime by `_worker.js`.

---

## SUPABASE AUTH SETTINGS (if login breaks)

Three places in Supabase must match your domain exactly:

**1. Auth → Settings → Site URL:**
```
https://slm-market.sannan.app
```

**2. Auth → Settings → Additional Redirect URLs (add ALL of these):**
```
https://slm-market.sannan.app/auth
https://slm-market.sannan.app/auth.html
http://localhost:8788/auth
http://localhost:8788/auth.html
```

**3. Auth → Email Templates (both templates):**
- Confirm signup button URL: `{{ .SiteURL }}/auth`
- Password reset button URL: `{{ .SiteURL }}/auth?mode=reset`

If GitHub OAuth is enabled:
- GitHub → Settings → Developer settings → OAuth Apps → your app
- Authorization callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- This must be the Supabase URL, NOT your site URL.

---

## WHAT EACH FILE DOES (one line each)

| File | Does |
|------|------|
| `_worker.js` | Cloudflare Worker. Serves `/config.js` with env vars injected. Routes `/docs` → `/docs/`. Everything else → static. |
| `_headers` | HTTP headers on every response. Security (CSP, X-Frame), caching (1yr for CSS/JS, no-cache for HTML/config). |
| `_redirects` | Empty intentionally. CF Pages handles `.html` stripping natively. |
| `wrangler.toml` | Local dev config for `wrangler pages dev`. Not used in production. |
| `.dev.vars` | Local dev secrets. Gitignored. Fill with real Supabase values for local auth testing. |
| `config.example.js` | Documents the shape of `config.js`. Commit this. Never put real values here. |
| `supabase-schema.sql` | Complete database schema. Run once in Supabase SQL Editor. Idempotent (`IF NOT EXISTS`). |
| `supabase-schema-fixes.sql` | Run after main schema. Adds missing columns, fixes functions, grants anon access. |
| `js/supabase.js` | Creates the Supabase JS client singleton. Reads `window.__SLM_CONFIG`. |
| `js/global.js` | All shared code: utilities, header, footer, session check, mock data, `handleLogout`. |
| `js/auth.js` | All auth flows: login, signup, OAuth, password reset. Loaded on auth.html only. |
| `js/explore.js` | Explore page: search, filter, sort, paginate. Full-text search via Supabase `textSearch`. |
| `js/upload.js` | Upload form: validation, tag management, Supabase insert. |
| `js/model.js` | Individual model page: load data, reviews, bookmarks, download tracking. |
| `js/profile.js` | Profile page: user data, their models, activity feed. |
| `js/leaderboard.js` | Leaderboard: ranked users by score. |

---

## THE DATABASE TRIGGER CHAIN (automatic, never call manually)

When a review is inserted/updated/deleted:
```
INSERT into reviews
  → trg_recalc_rating fires
  → recalc_model_rating() runs
    → AVG(rating) over all reviews for that model → UPDATE models.rating
    → COUNT(reviews) for that engineer → UPDATE users.review_count
    → CALL recalc_engineer_score(engineer_id)
      → SUM(download_count), AVG(rating), COUNT(models)
      → UPDATE users.score, total_downloads, model_count, avg_rating
```

When a model is inserted/updated/deleted:
```
INSERT/UPDATE/DELETE on models
  → trg_model_score fires
  → trg_recalc_score() runs
  → CALL recalc_engineer_score(engineer_id)
  → UPDATE users.score, total_downloads, model_count, avg_rating
```

When a model is updated:
```
UPDATE models
  → trg_models_updated_at fires
  → set_updated_at() runs
  → models.updated_at = now()
```

**You never need to manually update `models.rating`, `users.score`, `users.total_downloads`,  
`users.model_count`, `users.avg_rating`, or `users.review_count`. Triggers handle all of it.**

---

## RLS — WHO CAN DO WHAT (memorise this)

```
ANONYMOUS (not logged in):
  CAN read:  published models, all users, all reviews, all activity
  CANNOT:    read drafts, read bookmarks, write anything except downloads

AUTHENTICATED (logged in):
  CAN read:  everything anon can + their own bookmarks + their own drafts
  CAN write: only rows where auth.uid() matches the owner column

OWNER (engineer who created something):
  CAN update/delete: their own models, reviews, bookmarks, activity

NOBODY:
  CAN bypass RLS: not even with the anon key
  The service_role key bypasses RLS — never use it in frontend code
```

If a page is showing empty when it should show data:
1. Check the user is logged in
2. Check `status = 'published'` on models (drafts are hidden from others)
3. Check RLS policies haven't been dropped: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'`

---

## PROTECTED ROUTES (redirect to auth if not logged in)

These pages call `requireAuth()` on load:
- `upload.html` — must be logged in to upload
- `profile.html` — must be logged in to view own profile

`requireAuth()` does:
```javascript
const user = await checkSession();
if (!user) {
  window.location.href = `auth.html?redirect=${encodeURIComponent(currentPath)}`;
}
```

After login, user is sent back to the original page via `safeRedirect(getParam('redirect'), 'index.html')`.  
`safeRedirect` only allows paths starting with `/` — prevents open redirect attacks.

---

## SESSION LIFECYCLE

```
Signup/Login → Supabase creates session
  → Stored in localStorage: "sb-{PROJECT_REF}-auth-token"
  → Contains: access_token (1hr), refresh_token (~1yr)

Every page load:
  → checkSession() → client.auth.getSession()
  → If access_token expired: SDK silently refreshes using refresh_token
  → If refresh_token expired: returns null → user must log in again

Logout:
  → client.auth.signOut() → server invalidates refresh_token
  → localStorage key deleted
  → Redirect to index.html
```

Users stay logged in for up to a year without re-entering their password.  
Logging out on one device does not log out other devices (each has its own refresh token).

---

## WHAT MOCK DATA MODE LOOKS LIKE

If `getSupabaseClient()` returns `null` (env vars missing or Supabase down):

| Page | What user sees |
|------|---------------|
| Explore | 6 hardcoded model cards (Legal-SLM-3B, Med-SLM-4B, etc.) |
| Model page | Hardcoded model detail |
| Leaderboard | 5 hardcoded engineers |
| Auth | "Running in demo mode" toast, login/signup buttons disabled |
| Upload | Form shows but submit does nothing real |

Mock data is defined in `global.js` as `MOCK_MODELS`, `MOCK_ENGINEERS`, `MOCK_REVIEWS`.  
This is intentional — the site always looks real even when Supabase is misconfigured.  
**Do not remove the mock data.** It is the fallback that prevents a blank broken page.

---

## DEPLOYMENT STEPS (every time you push)

```
1. Push to GitHub main branch
   git add . && git commit -m "your message" && git push

2. Cloudflare Pages auto-deploys (watch at dash.cloudflare.com)
   Build takes ~15 seconds
   No build command — it just copies static files

3. Verify after deploy:
   → Visit /config.js → real URL appears
   → Visit /explore → real models load (not mock data)
   → Open DevTools → Console → no errors
   → Open DevTools → Network → check /config.js response header X-Config-Mode = production

4. If CSS/JS not updating (immutable cache):
   → CSS and JS are cached for 1 year in browser
   → Add a query string to bust cache: style.css?v=2
   → Or rename the file (best practice)
   → HTML files are never cached, so new HTML picks up old CSS/JS
     unless you change the filename

5. If you change environment variables:
   → Must trigger a new deployment for them to take effect
   → Go to Deployments → ... → Retry deployment
```

---

## LOCAL DEV (how to run it properly)

```bash
# Install wrangler once
npm install -g wrangler

# Fill in your real values
nano .dev.vars
# SUPABASE_URL=https://xxxx.supabase.co
# SUPABASE_ANON_KEY=eyJ...
# SITE_URL=http://localhost:8788

# Run
wrangler pages dev . --port 8788

# Visit http://localhost:8788
# /config.js will be served by the worker using .dev.vars values
# This exactly mirrors production — the only correct way to test auth locally
```

Do not use `python3 -m http.server` for auth testing.  
Without the worker, `/config.js` won't be served, auth won't work, you'll be in mock mode.

---

## WHEN SOMETHING BREAKS — DIAGNOSIS ORDER

**Step 1 — Check /config.js**
```
https://your-domain.com/config.js
```
- Real URL + key → Supabase is configured correctly
- Empty strings → env vars missing in CF Pages
- File not found → `_worker.js` not deployed or CF Pages not in Advanced Mode

**Step 2 — Check browser console**
Open DevTools → Console  
Common errors and what they mean:

| Error | Cause | Fix |
|-------|-------|-----|
| `supabase is not defined` | Supabase CDN blocked by CSP or network | Check _headers CSP, check internet |
| `getSupabaseClient is not defined` | `supabase.js` loaded before `global.js` or failed | Check script order in HTML |
| `Failed to fetch` on Supabase calls | Wrong URL or CORS | Check SUPABASE_URL is correct |
| `JWT expired` | Access token expired, refresh failed | User session ended, log in again |
| `new row violates row-level security` | RLS policy blocking insert | Check user is logged in + engineer_id = auth.uid() |
| `duplicate key value` on reviews | User already reviewed this model | Expected — show "already reviewed" message |
| `null` from `checkSession()` | User not logged in | Expected on public pages |

**Step 3 — Check Supabase dashboard**
- Authentication → Users: is the test user there?
- Table Editor → models: is the data there?
- Logs → API: what requests are coming in and what errors?

**Step 4 — Check Cloudflare**
- Workers & Pages → your project → Deployments: did the latest deploy succeed?
- Functions → your project: is the worker running? Any errors in real-time logs?

---

## SUPABASE FREE TIER LIMITS (watch these)

| Limit | Value | Check at |
|-------|-------|---------|
| Monthly Active Users | 50,000 | Supabase → Settings → Usage |
| Database size | 500 MB | Supabase → Settings → Usage |
| Storage | 1 GB | Supabase → Storage |
| Concurrent connections | 60 | Supabase → Settings → Database |

When database hits ~400MB, run:
```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

Upgrade path: Supabase Pro = $25/month. Gets you 8GB DB, 100K MAU.

---

## CLOUDFLARE WORKER LIMIT (watch this one)

The `_worker.js` runs on Cloudflare's free Workers tier:  
**100,000 requests/day** free.

Every single page load hits `/config.js` once = 1 worker invocation.  
100,000 page loads/day on free tier.

At 5 pages/session = 20,000 sessions/day.  
Average session = 1 user = 20,000 daily active users max on free tier.

Upgrade: Cloudflare Workers Paid = $5/month. Gets you 10 million requests/day.

---

## THINGS THAT DO NOT EXIST AS STATIC FILES

These look like static files but aren't:

| URL | What it is |
|-----|-----------|
| `/config.js` | Generated at edge by `_worker.js` on every request |
| `/explore` | CF Pages serves `explore.html` (strips .html automatically) |
| `/auth` | CF Pages serves `auth.html` |
| `/model` | CF Pages serves `model.html` |

So `/config.js` will never appear in your repo's file listing. That is correct.  
If you create a real `config.js` in the repo, it will be served as a static file and  
override the worker — **your Supabase key will be in git and visible to everyone.**

---

## THE ANON KEY IS SAFE — HERE'S WHY

The Supabase anon key is designed to be public. It only grants access  
that RLS policies explicitly allow. Without RLS it would be dangerous.  
With RLS (which this schema has on all tables), it does:

- Lets anyone read published models and public profiles → correct
- Lets authenticated users write their own rows only → correct
- Blocks any write without a valid JWT → correct
- Blocks reads of private data (drafts, others' bookmarks) → correct

The `service_role` key bypasses all RLS. It is the dangerous one.  
It is not in this codebase anywhere. Keep it that way.

---

## KNOWN THINGS TO FIX BEFORE SCALING

In priority order, fix these as you grow:

1. **Bookmark state not pre-loaded** — bookmarks always show unsaved on Explore page even if user already saved. Fix: load user's bookmarks on page init and mark saved ones.

2. **Profile page has no pagination** — loads all models at once. Fix: add `.limit(20).range()` in `profile.js`.

3. **`engineer_name` drifts** — stored at upload time, never updated if user changes their name. Fix: JOIN `users` table instead of reading the denormalised `engineer_username` field.

4. **No signup CAPTCHA** — bots can create unlimited accounts. Fix: add Cloudflare Turnstile (free, privacy-friendly).

5. **Mock data in global.js** — 6 mock models + 5 mock engineers loaded on every page. Move to `js/mock-data.js`, loaded conditionally only when Supabase returns null.

6. **Docs sidebar in 49 files** — any nav change needs 49 edits. Fix: inject sidebar from `docs.js` using a data array.

7. **Full-text search English only** — `to_tsvector('english',...)` won't find non-English titles well. Fix: change to `'simple'` for language-agnostic search.

---

## THE COMPLETE PRODUCTION CHECKLIST

Run through this before every public announcement:

```
ENV VARS
[ ] SUPABASE_URL set in CF Pages (production)
[ ] SUPABASE_ANON_KEY set in CF Pages (production)
[ ] SITE_URL set in CF Pages (production) = your actual domain

VERIFY LIVE
[ ] /config.js → real URL appears (not empty string)
[ ] /config.js → X-Config-Mode header = "production" (not "demo")
[ ] Explore page → real models from DB (not mock data)
[ ] Sign up with test email → confirmation email arrives
[ ] Click confirmation link → lands on /auth, session created
[ ] Log in with test account → redirect to home, session persists on refresh
[ ] Log out → session cleared, back to logged-out header
[ ] Upload a model → appears in Explore, appears in profile
[ ] Submit a review → model rating updates (trigger working)
[ ] Password reset → reset email arrives, link works, password updates
[ ] GitHub OAuth → redirects to GitHub, back to site, profile created
[ ] /config.js never appears in GitHub repo (gitignored)

SECURITY
[ ] No console errors mentioning security or CSP violations
[ ] X-Frame-Options: DENY visible in Network tab response headers
[ ] CSP header present in Network tab response headers
[ ] service_role key is NOT anywhere in codebase or git history

PERFORMANCE
[ ] CSS/JS files have Cache-Control: immutable in Network tab
[ ] HTML files have Cache-Control: must-revalidate in Network tab
[ ] config.js has Cache-Control: no-store in Network tab
[ ] Explore page loads in under 2 seconds on mobile (test with throttling)

DATABASE
[ ] All tables have RLS enabled
[ ] Anon can read published models without logging in
[ ] Auth-only pages redirect correctly when not logged in

YOU'RE LIVE ✅
```
