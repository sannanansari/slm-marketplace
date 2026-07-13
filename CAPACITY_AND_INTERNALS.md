# SLM Marketplace — Complete Capacity, Internals & Memory Guide

**Everything the system does, every limit it has, every flow from click to database.**

---

## PART 1 — HOW MANY USERS CAN IT HANDLE?

### Free Tier Limits (what you're on at launch)

| Service                             | Limit                                                 | What breaks when hit                                       |
| ----------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| **Supabase — MAU**                  | 50,000 monthly active users                           | New logins stop working; existing sessions still work      |
| **Supabase — Database size**        | 500 MB                                                | Inserts fail with storage errors                           |
| **Supabase — API requests**         | Unlimited, but rate-limited at ~500 req/s per project | Requests queue then timeout under extreme burst            |
| **Supabase — Realtime connections** | 200 concurrent                                        | Not currently used — no realtime in this app               |
| **Supabase — Storage**              | 1 GB                                                  | File uploads fail (model files not stored here currently)  |
| **Cloudflare Pages — Requests**     | Unlimited                                             | Nothing — CF Pages has no request cap                      |
| **Cloudflare Pages — Bandwidth**    | Unlimited                                             | Nothing                                                    |
| **Cloudflare Workers — Requests**   | 100,000/day free, then $0.50/million                  | `/js/config.js` is served by the worker on every page load |

### Realistic Concurrent User Capacity

**Static pages (index, explore, docs):** Unlimited.  
Cloudflare serves these from its CDN edge. 1 user and 1,000,000 users hit the same cached HTML.

**Authenticated actions (login, upload, review, bookmark):**  
Limited by Supabase API throughput (~500 req/s on free tier).  
At 1 request per action, that is ~500 authenticated actions per second = ~30,000/minute.  
In practice: comfortably handles **5,000–10,000 daily active users** with normal usage patterns.

**The `/js/config.js` Cloudflare Worker:**  
Every page load hits this once. At 100K requests/day free tier that is ~70 page loads/minute continuously.  
At typical 5 pages/session: ~14 sessions/minute = ~840 sessions/hour = **~20,000 daily sessions on free**.  
Upgrade to Cloudflare Workers Paid ($5/month): unlimited.

### When to Upgrade

| Milestone               | Action                                     |
| ----------------------- | ------------------------------------------ |
| 1,000 MAU               | Still on free — no action                  |
| 10,000 MAU              | Watch Supabase dashboard — still free      |
| 20,000 daily page loads | Upgrade Cloudflare Workers to Paid ($5/mo) |
| 50,000 MAU              | Upgrade Supabase to Pro ($25/mo)           |
| Database hits 400MB     | Upgrade Supabase or archive old data       |

---

## PART 2 — EVERY DATA FLOW, START TO FINISH

### Flow 1 — Page Load (Any Page)

```
Browser requests https://slm-market.sannan.app/explore.html
        │
        ▼
Cloudflare edge server (nearest to user)
  → Cache hit? Serve HTML from CF edge (< 20ms)
  → Cache miss? Fetch from Pages origin, cache it

Browser parses HTML, encounters scripts in this order:

  1. <script src="js/config.js">          ← SYNC, blocks parsing
     → Cloudflare Worker intercepts /js/config.js
     → Reads env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL
     → Returns: window.__SLM_CONFIG = { url: "...", key: "...", siteUrl: "..." }
     → Cache-Control: no-store (always fresh)

  2. <script src="cdn.jsdelivr.net/supabase.min.js"> ← SYNC
     → Loads Supabase JS SDK 2.49.4
     → Creates window.supabase object

  3. <script src="js/supabase.js" defer>
     → Runs after DOM parsed
     → Reads window.__SLM_CONFIG
     → Calls window.supabase.createClient(url, key, options)
     → Stores client as _client (module singleton)
     → Exposes window.getSupabaseClient()

  4. <script src="js/global.js" defer>
     → Runs after supabase.js
     → Defines ALL shared utilities:
        sanitize(), formatNumber(), formatDate(), debounce()
        renderBadge(), renderStars(), renderModelIcon()
        getParam(), safeRedirect()
        checkSession(), requireAuth()
        initHeader(), initFooter()
        showToast()
        handleLogout()
     → Exposes all to window.*

  5. <script src="js/explore.js" defer>  (or page-specific JS)
     → Calls initExplorePage()
     → initHeader() → checkSession() → Supabase getSession()
     → loadModels() → Supabase query
     → renderCards() → innerHTML update

Total time to interactive: ~200–800ms (CDN hit) or ~1–3s (cold start)
```

### Flow 2 — User Signs Up

```
User fills form: name, email, password, confirm
        │
        ▼ [auth.js: handleSignup()]

1. Client-side validation
   - name not empty
   - email format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   - password >= 8 chars
   - confirm === password

2. getSupabaseClient().auth.signUp({
     email, password,
     options: {
       emailRedirectTo: getSiteUrl() + '/auth',   ← reads __SLM_CONFIG.siteUrl
       data: { name, username: "name_1234" }
     }
   })
   → Supabase creates row in auth.users (internal, you don't control this table)
   → Supabase sends confirmation email via its SMTP service
   → Returns: { data: { user, session }, error }

3. If no error AND user returned:
   ensureUserProfile(user, client, name)
   → client.from('users').upsert([{
       id: user.id,          ← same UUID as auth.users
       name, email, username,
       avatar_letter: name[0].toUpperCase(),
       avatar_color: random from 8 colors,
       join_date: now()
     }], { onConflict: 'id', ignoreDuplicates: true })
   → RLS CHECK: auth.uid() = id  ← passes because Supabase sets this on signup

4. showToast('Check your email for a confirmation link.')
   switchTab('login')

5. User clicks email link → lands on /auth?code=... OR /auth#access_token=...

6. handleAuthCallback() runs on boot:
   CASE: ?code= in URL (GitHub OAuth PKCE callback)
     → waitForSession(client, 8000)
       → onAuthStateChange listener waits for SIGNED_IN event
       → OR getSession() returns immediately if already resolved
       → Resolves with session within 8 seconds or returns null
     → ensureUserProfile(session.user, client)
     → cleanUrl() removes ?code= from browser URL
     → redirect to index.html

   CASE: #access_token= in URL hash (email confirmation)
     → getSession() → session exists
     → ensureUserProfile(session.user, client)
     → showToast('Email confirmed!')
     → redirect to index.html after 1.5s

7. User now logged in. Session stored in localStorage:
   Key: "sb-{PROJECT_REF}-auth-token"
   Value: { access_token, refresh_token, expires_at, user }
   Expires: 1 hour (access), 1 year (refresh — auto-rotated)
```

### Flow 3 — User Logs In (Email/Password)

```
User enters email + password
        │
        ▼ [auth.js: handleLogin()]

1. Validate: email not empty, password not empty
2. client.auth.signInWithPassword({ email, password })
   → Supabase validates credentials against auth.users
   → Returns: { data: { user, session }, error }
3. If error: friendlyAuthError(err) → display human message
   - "invalid login credentials" → "Incorrect email or password."
   - "email not confirmed" → "Check your email..."
   - "rate limit" → "Too many attempts..."
4. If success: redirect to safeRedirect(getParam('redirect'), 'index.html')
   safeRedirect() checks the redirect URL starts with /
   → prevents open redirect attacks

Session now in localStorage. All subsequent page loads:
  checkSession() → client.auth.getSession() → returns cached session
  If access_token expired: autoRefreshToken:true → Supabase silently refreshes
  using refresh_token → stores new access_token
```

### Flow 4 — GitHub OAuth Login

```
User clicks "Continue with GitHub"
        │
        ▼ [auth.js: handleGitHubOAuth()]

1. client.auth.signInWithOAuth({
     provider: 'github',
     options: {
       redirectTo: getSiteUrl() + '/auth',
       scopes: 'read:user user:email'
     }
   })
   → Browser redirects to github.com/login/oauth/authorize
   → User authorises on GitHub
   → GitHub redirects to Supabase: https://xxxx.supabase.co/auth/v1/callback?code=...
   → Supabase exchanges code for GitHub access token
   → Supabase creates/updates auth.users row
   → Supabase redirects to: getSiteUrl() + '/auth?code=PKCE_CODE'

2. /auth page loads, handleAuthCallback() detects ?code=
3. waitForSession(client, 8000) → onAuthStateChange fires SIGNED_IN
4. session.user.user_metadata contains:
   { full_name, avatar_url, user_name (GitHub username), email }
5. ensureUserProfile(user, client):
   → upsert into users table with GitHub metadata
   → avatar_url set to GitHub profile picture
6. Redirect to index.html
```

### Flow 5 — Password Reset

```
User clicks "Forgot password"
        │
1. handleForgotPassword():
   → Gets email from login-email input
   → client.auth.resetPasswordForEmail(email, {
       redirectTo: getSiteUrl() + '/auth?mode=reset'
     })
   → Supabase sends password reset email
   → Email contains link: /auth?mode=reset#access_token=...

2. User clicks email link → /auth?mode=reset#access_token=...

3. handleAuthCallback() detects #access_token with type='recovery'
4. cleanUrl(), showResetPasswordForm() renders new password form

5. handlePasswordUpdate():
   → Validate: pw >= 8 chars, matches confirm
   → client.auth.getSession() → verify session exists (FIX A4)
   → client.auth.updateUser({ password: newPassword })
   → showToast('Password updated!')
   → redirect to index.html after 1.5s
```

### Flow 6 — Model Upload

```
Logged-in user fills upload form
        │
        ▼ [upload.js: handleContinue()]

1. validateForm():
   - model name: /^[a-zA-Z0-9\-_.]*$/, min 3 chars
   - category: must be selected
   - short_description: required, max 150 chars
   - github_url: optional, but if set must be https://github.com/user/repo

2. checkSession() → must be logged in (requireAuth already checked on load)

3. collectFormData('published', user):
   {
     title: "LegalEagle-1B",
     category: "legal",
     short_description: "Contract analysis SLM...",
     github_url: "https://github.com/...",
     tags: ["Legal", "NLP", "Contracts"],
     status: "published",
     created_at: ISO timestamp,
     engineer_id: user.id,          ← UUID from auth
     engineer_username: "alex_1234",
     engineer_name: "Alex Chen"
   }

4. submitModel(payload):
   → client.from('models').insert([data]).select('id').single()
   → RLS CHECK: engineer_id = auth.uid()  ← must match or insert rejected
   → Returns: { id: 42 }

5. Activity log (non-blocking, caught silently):
   → client.from('activity').insert([{
       user_id: user.id,
       action_type: 'upload',
       target_id: 42,
       target_name: "LegalEagle-1B"
     }])

6. DB triggers fire automatically:
   → trg_model_score → recalc_engineer_score(user.id)
     → counts models, sums downloads, averages rating
     → updates users.score, total_downloads, model_count, avg_rating

7. showToast('Model published!')
8. redirect to model.html?id=42
```

### Flow 7 — Explore Page / Search

```
User types "legal contract" in search box
        │ debounce(400ms)
        ▼ [explore.js: loadModels()]

1. state = { query: 'legal contract', categories: [], minRating: 0,
             sortField: 'created_at', sortDir: 'desc', page: 1, pageSize: 10 }

2. loadModelsFromSupabase(client):
   → client.from('models')
       .select('*', { count: 'exact' })
       .eq('status', 'published')
       .textSearch('search_vector', 'legal contract', {
           type: 'websearch', config: 'english'
         })
       .order('created_at', { ascending: false })
       .range(0, 9)   ← page 1, items 0-9

   search_vector is a GENERATED ALWAYS column:
     to_tsvector('english', title || ' ' || short_description)
   Uses GIN index for O(log n) search even with millions of models.

3. Supabase returns: { data: [10 models], count: 47, error: null }

4. state.totalCount = 47

5. renderCards(data) → model cards injected into #models-grid

6. updateResultCount(47, 1, 10) → "Showing 1–10 of 47 models"

7. renderPagination(5) → 5 page buttons rendered

8. User clicks page 3:
   → state.page = 3
   → .range(20, 29)
   → Fresh Supabase query, same filters

Without Supabase (demo mode):
   → MOCK_MODELS array (6 items in global.js)
   → buildFilterQuery() filters in-memory
   → Same render flow
```

### Flow 8 — Logout

```
User clicks avatar → "Sign Out"
        │
        ▼ [global.js: handleLogout()]

1. client.auth.signOut()
   → Supabase invalidates the refresh token server-side
   → Removes "sb-{PROJECT_REF}-auth-token" from localStorage
   → Returns: { error: null }

2. window.location.href = 'index.html'
   → New page load → checkSession() → getSession() → null
   → Header renders as logged-out state
```

### Flow 9 — Review Submission

```
User writes review, clicks Submit
        │
1. client.from('reviews').insert([{
     model_id: 42,
     user_id: auth.uid(),
     rating: 5,
     comment: "Excellent accuracy on legal text."
   }])
   → RLS: auth.uid() = user_id  ← must match
   → UNIQUE constraint: (model_id, user_id) ← one review per user per model
   → If duplicate: error "duplicate key value violates unique constraint"

2. DB trigger fires:
   trg_recalc_rating → recalc_model_rating()
   → AVG(rating) over all reviews for model_id=42
   → UPDATE models SET rating = 4.8 WHERE id = 42
   → Gets engineer_id from model
   → UPDATE users SET review_count = N WHERE id = engineer_id
   → PERFORM recalc_engineer_score(engineer_id)

3. UI refreshes review list, shows new average
```

---

## PART 3 — SESSION PERSISTENCE (What Stays, What Doesn't)

### What localStorage Contains

```
Key: "sb-PROJECTREF-auth-token"
Value (JSON):
{
  "access_token": "eyJhbGci...",    ← expires in 1 hour
  "token_type": "bearer",
  "expires_in": 3600,
  "expires_at": 1735000000,         ← Unix timestamp
  "refresh_token": "v1.abc123...",  ← expires in ~1 year
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "user_metadata": {
      "name": "Alex Chen",
      "username": "alex_1234",
      "avatar_url": null
    },
    "app_metadata": { "provider": "email" }
  }
}
```

### How Auto-Refresh Works

```
Page loads → checkSession() → client.auth.getSession()

If expires_at < now():
  Supabase SDK automatically calls:
  POST https://xxxx.supabase.co/auth/v1/token?grant_type=refresh_token
  Body: { refresh_token: "v1.abc123..." }
  Response: new access_token + new refresh_token (rotation)
  localStorage updated silently

If refresh_token is also expired (after ~1 year):
  getSession() returns null
  User is redirected to /auth.html

This is why users stay logged in for months without re-entering their password.
```

### What Gets Cleared on Logout

```
localStorage: "sb-PROJECTREF-auth-token" → deleted
Server-side: refresh token invalidated → can't be used again
Result: complete logout, no residual auth state
```

---

## PART 4 — DATABASE: EVERY TABLE AND RELATIONSHIP

```
auth.users (Supabase internal — cannot query directly with anon key)
  id (uuid) ← PRIMARY KEY
  email
  created_at
  user_metadata (jsonb)
  ↕
  FK (on delete cascade)
  ↕
users (your public table)
  id (uuid PK) → references auth.users(id)
  username (unique)
  name
  email (unique)
  avatar_letter, avatar_color
  title, bio, location
  avatar_url, github_url
  join_date, is_verified
  follower_count, score
  total_downloads ← recalculated by trigger
  model_count     ← recalculated by trigger
  avg_rating      ← recalculated by trigger
  review_count    ← recalculated by trigger
  created_at, updated_at
  │
  ├── models (engineer_id FK)
  │     id (bigint, auto-increment)
  │     title, short_description, full_description
  │     category (enum: legal|healthcare|coding|finance|general|education|multilingual|security)
  │     engineer_id, engineer_username (denormalized)
  │     tags (text[])
  │     accuracy, f1_score, response_time, model_size, context_window
  │     quantized, base_model, languages, license, training_data
  │     download_count, view_count
  │     rating ← auto-maintained by trigger
  │     status (draft|published|archived)
  │     search_vector (tsvector GENERATED) ← full-text search
  │     created_at, updated_at ← auto-maintained by trigger
  │     │
  │     ├── reviews (model_id FK, user_id FK)
  │     │     id, model_id, user_id, rating (1-5), comment
  │     │     UNIQUE(model_id, user_id) ← one review per user per model
  │     │
  │     ├── bookmarks (model_id FK, user_id FK)
  │     │     id, model_id, user_id, saved_at
  │     │     UNIQUE(model_id, user_id)
  │     │
  │     └── downloads (model_id FK, user_id FK nullable)
  │           id, model_id, user_id, downloaded_at
  │           (user_id is nullable — anonymous downloads tracked)
  │
  ├── activity (user_id FK)
  │     id, user_id, action_type, target_id, target_name, created_at
  │     action_type: upload|update|review_received|follow|milestone
  │
  └── follows (follower_id FK, following_id FK)
        id, follower_id, following_id, created_at
        UNIQUE(follower_id, following_id)
```

### RLS — Who Can See What

```
TABLE: users
  SELECT: everyone (anon + authenticated)   ← public profiles
  INSERT: only insert your own row (auth.uid() = id)
  UPDATE: only update your own row (auth.uid() = id)
  DELETE: not allowed by any policy

TABLE: models
  SELECT: published models = everyone, drafts = owner only
          (status = 'published' OR engineer_id = auth.uid())
  INSERT: authenticated, must own the row (engineer_id = auth.uid())
  UPDATE: owner only
  DELETE: owner only

TABLE: reviews
  SELECT: everyone
  INSERT: authenticated, must be your own review (auth.uid() = user_id)
  UPDATE: your own reviews only
  DELETE: your own reviews only

TABLE: bookmarks
  SELECT: your own only (auth.uid() = user_id)
  INSERT: your own only
  DELETE: your own only

TABLE: downloads
  SELECT: no policy (no client-side reads needed)
  INSERT: anyone, including anon (tracks downloads without requiring login)

TABLE: activity
  SELECT: everyone (public activity feeds on profiles)
  INSERT: your own only

TABLE: follows
  SELECT: everyone
  INSERT: you can only follow (follower_id = auth.uid())
  DELETE: you can only unfollow your own follows
```

---

## PART 5 — EVERY CONFIG VALUE AND WHERE IT COMES FROM

```
Runtime config chain:
  Cloudflare env var SUPABASE_URL
    → _worker.js reads it at edge
    → Serves /js/config.js with:
        window.__SLM_CONFIG = { url, key, siteUrl }
    → supabase.js reads window.__SLM_CONFIG
    → Creates Supabase client with url + key
    → auth.js reads getSiteUrl() = __SLM_CONFIG.siteUrl
    → Used in emailRedirectTo and OAuth redirectTo

For local dev with wrangler:
  .dev.vars (gitignored) → same chain as above

For local dev without wrangler (demo mode):
  No js/config.js served → __SLM_CONFIG = { url:"", key:"", siteUrl:"" }
  → getSupabaseClient() returns null
  → All pages fall back to MOCK_MODELS
  → Auth forms show "Demo mode" toasts
```

### Full Environment Variable Reference

| Variable            | Required     | Where set                       | Used by                                                |
| ------------------- | ------------ | ------------------------------- | ------------------------------------------------------ |
| `SUPABASE_URL`      | Yes          | CF Pages env vars + `.dev.vars` | `_worker.js` → `js/config.js` → `supabase.js`          |
| `SUPABASE_ANON_KEY` | Yes          | CF Pages env vars + `.dev.vars` | `_worker.js` → `js/config.js` → `supabase.js`          |
| `SITE_URL`          | Yes for auth | CF Pages env vars + `.dev.vars` | `_worker.js` → `js/config.js` → `auth.js getSiteUrl()` |

### Supabase Auth Settings That Must Match

| Setting                 | Value                                       | Where                             |
| ----------------------- | ------------------------------------------- | --------------------------------- |
| Site URL                | `https://slm-market.sannan.app`             | Supabase → Auth → Settings        |
| Redirect URLs           | `https://slm-market.sannan.app/auth`        | Supabase → Auth → Settings        |
| Redirect URLs           | `http://localhost:8788/auth`                | Supabase → Auth → Settings        |
| GitHub callback         | `https://xxxx.supabase.co/auth/v1/callback` | GitHub OAuth App settings         |
| Email confirm redirect  | `{{ .SiteURL }}/auth`                       | Supabase → Auth → Email Templates |
| Password reset redirect | `{{ .SiteURL }}/auth?mode=reset`            | Supabase → Auth → Email Templates |

---

## PART 6 — PERFORMANCE: WHAT'S CACHED AND WHAT ISN'T

```
CACHED BY CLOUDFLARE (edge CDN):
  *.html              → Cache-Control: max-age=0, must-revalidate
                        Effectively not cached — always fresh from origin
                        But served from CF edge, so still fast (~50ms)

  /css/*, /js/*       → Cache-Control: max-age=31536000, immutable
                        Cached for 1 year at edge AND in browser
                        Only busted if you rename the file

  /assets/*           → Same as CSS/JS — 1 year immutable
  /docs/docs.css      → 1 year immutable
  /docs/docs.js       → 1 year immutable

NOT CACHED:
  /js/config.js          → Cache-Control: no-store
                        Fetched fresh on every single page load
                        This is correct — it contains the Supabase key

NOT SERVED BY CF (goes directly to Supabase API):
  All auth calls      → https://xxxx.supabase.co/auth/v1/*
  All DB queries      → https://xxxx.supabase.co/rest/v1/*
  All RPC calls       → https://xxxx.supabase.co/rest/v1/rpc/*

CACHED BY BROWSER (localStorage):
  Session token       → Persists across page reloads, browser restarts
  Nothing else        → No browser caching of data

SUPABASE QUERY PERFORMANCE (with indexes):
  explore page search → GIN index on search_vector → O(log n)
  sort by downloads   → B-tree index on download_count → O(log n)
  category filter     → B-tree index on category → O(log n)
  user profile load   → B-tree on id (PK) → O(1)
  bookmarks by user   → B-tree on user_id → O(log n)
```

---

## PART 7 — WHAT HAPPENS WHEN SUPABASE IS DOWN

Every Supabase call is inside a try/catch. The fallback chain:

```
getSupabaseClient() returns null
  → No client configured (env vars missing) OR
  → Supabase CDN failed to load (network error)

In explore.js:
  try { loadModelsFromSupabase(client) }
  catch { /* fall through */ }
  → Renders MOCK_MODELS (6 hardcoded models)
  → User sees content, not an error page

In auth.js:
  if (!client) {
    showToast('Supabase not connected. Check your config.', 'error')
    return
  }
  → Auth does NOT fall back to mock
  → This is correct — you cannot mock authentication

In model.js, profile.js, upload.js:
  Each has try/catch that surfaces a user-friendly error
  or falls back to mock data with a console.warn()
```

---

## PART 8 — SECURITY CHECKLIST (WHAT PROTECTS WHAT)

| Attack                       | Protection                                                         | Where                      |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------- |
| XSS via user content         | `sanitize(str)` escapes all HTML before innerHTML                  | `global.js:sanitize()`     |
| Open redirect after login    | `safeRedirect()` only allows paths starting with `/`               | `global.js:safeRedirect()` |
| CSRF on API calls            | Supabase uses Bearer token auth (not cookies) — CSRF doesn't apply | Supabase design            |
| Supabase key in git          | Key never in repo — injected at edge by `_worker.js`               | `_worker.js`               |
| Anon key exposure (expected) | Anon key is safe by design — RLS enforces authorization            | Supabase RLS               |
| Row access without auth      | RLS on every table — queries return only permitted rows            | `supabase-schema.sql`      |
| Clickjacking                 | `X-Frame-Options: DENY`                                            | `_headers`                 |
| MIME sniffing                | `X-Content-Type-Options: nosniff`                                  | `_headers`                 |
| XSS via external scripts     | CSP `script-src 'self' cdn.jsdelivr.net` only                      | `_headers`                 |
| Supabase WS hijack           | CSP `connect-src *.supabase.co wss://*.supabase.co`                | `_headers`                 |
| Password brute force         | Supabase built-in rate limiting on `/auth/v1/token`                | Supabase                   |
| Replay with expired token    | `autoRefreshToken: true`, server invalidates on signOut            | Supabase SDK               |
| User uploads bad model data  | Form validation + Supabase column constraints                      | `upload.js` + schema       |
| SQL injection                | Supabase JS SDK uses parameterised queries — not possible          | Supabase SDK               |

---

## PART 9 — KNOWN LIMITATIONS TO REMEMBER

1. **`engineer_name` drifts** — stored in models table at upload time. If user changes their name in profile, existing models show the old name. Fix: JOIN users table at query time instead.

2. **No image uploads** — avatars and model cover images are URLs only. Supabase Storage bucket exists in the schema but upload flow uses GitHub URL only.

3. **Mock data ships to production** — `MOCK_MODELS`, `MOCK_ENGINEERS`, `MOCK_REVIEWS` are in `global.js` and always loaded. They're only shown when Supabase is unavailable, but they add ~8KB to every page.

4. **No rate limiting on signup form** — A bot can create thousands of accounts. Supabase's built-in rate limiting is the only protection. Add a honeypot field or Turnstile CAPTCHA if spam becomes an issue.

5. **Full-text search English only** — `search_vector` uses `to_tsvector('english', ...)`. Non-English model titles won't be searchable. Fix: change to `simple` config or add language column.

6. **Docs sidebar hardcoded** — changing a sidebar link requires updating every docs HTML file. 49 HTML files × 1 sidebar = 49 edits per nav change.

7. **No email after signup via GitHub OAuth** — `engineer_name` may be null if GitHub doesn't share it. The fallback chain handles this: `full_name → name → user_name → email prefix`.

8. **`js/config.js` loaded synchronously** — blocks HTML parsing on every page load. It's a ~100-byte file served from CF edge so it's fast, but it's a render-blocking script by design (required so Supabase SDK has config before it loads).

9. **No pagination on profile page** — a user with 500 models will load all 500 at once. Add `.limit(20)` and pagination in `profile.js` before this becomes a problem.

10. **Bookmark state not loaded on Explore** — bookmark buttons show as unsaved even if user already bookmarked a model. The toggle works but doesn't reflect existing state on load.

---

## QUICK REFERENCE — JS Functions by File

### global.js (available on every page)

```
sanitize(str)              → escape HTML for safe innerHTML
formatNumber(n)            → 1500 → "1.5K"
formatDate(isoString)      → "3 days ago"
debounce(fn, ms)           → delay function execution
getParam(name)             → read URL ?param=value
safeRedirect(raw, fallback)→ validate redirect URL is local
checkSession()             → Promise<user|null> from Supabase
requireAuth()              → redirect to auth if not logged in
initHeader(opts)           → inject nav + avatar into page
initFooter()               → inject footer into page
showToast(msg, type, ms)   → bottom-right notification
handleLogout()             → sign out + redirect home
renderBadge(category)      → colored category pill HTML
renderStars(rating)        → star SVG HTML
renderModelIcon(letter, cat)→ colored avatar square HTML
```

### supabase.js (available on every page)

```
getSupabaseClient()        → Supabase client | null
initSupabase()             → create client from __SLM_CONFIG
```

### auth.js (auth.html only)

```
handleLogin()              → email/password sign in
handleSignup()             → create account
handleGitHubOAuth()        → GitHub OAuth flow
handleForgotPassword(e)    → send reset email
handlePasswordUpdate()     → update password via recovery session
waitForSession(client, ms) → wait for SIGNED_IN event
ensureUserProfile(user)    → upsert users table row
getSiteUrl()               → reads __SLM_CONFIG.siteUrl
```

### explore.js (explore.html only)

```
initExplorePage()          → boot: header, filters, load
loadModels()               → Supabase query or mock fallback
buildFilterQuery(models)   → client-side filter for mock mode
loadModelsFromSupabase(c)  → server-side filter+sort+paginate
renderCards(models)        → inject model cards into grid
handlePagination(page)     → change page, reload
handleBookmark(btn, id)    → toggle bookmark
clearAllFilters()          → reset all state + reload
```

### upload.js (upload.html only)

```
initUploadPage()           → boot: header, requireAuth, wireForm
validateForm()             → returns { valid, errors }
collectFormData(status, u) → builds payload object
submitModel(payload)       → Supabase insert
handleContinue()           → validate → submit → redirect
handleSaveDraft()          → submit with status='draft'
handleTagInput(value)      → sanitize + add tag
renderTags()               → re-render tag pills
```
