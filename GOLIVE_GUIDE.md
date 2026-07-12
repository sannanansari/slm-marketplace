# SLM Marketplace — Complete Go-Live Guide
**Last updated:** July 2026  
**Status after this guide:** Production-ready, fully live

---

## Overview — What You Need

| Service | Cost | What it does |
|---------|------|-------------|
| Supabase | Free (up to 500MB, 50K MAU) | Database, Auth, Storage |
| Cloudflare Pages | Free (unlimited requests) | Hosting + Edge config injection |
| GitHub | Free | Version control + deploy trigger |
| Custom domain (optional) | ~$10/yr | Your own URL |

**Total cost to launch: $0.**

---

## PART 1 — SUPABASE SETUP

### Step 1.1 — Create Project

1. Go to **[supabase.com](https://supabase.com)** → Sign in with GitHub
2. Click **New Project**
3. Fill in:
   - **Name:** `slm-marketplace`
   - **Database Password:** Generate a strong one — save it somewhere safe
   - **Region:** Choose closest to your users (e.g. `us-east-1` for USA)
4. Click **Create new project** — wait ~2 minutes for provisioning

### Step 1.2 — Get Your Credentials

In your Supabase project dashboard:

1. Click **Settings** (gear icon, left sidebar)
2. Click **API**
3. Copy these two values — you will need them in Part 3:

```
Project URL:    https://xxxxxxxxxxxx.supabase.co
anon public:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Use the `anon public` key, NOT the `service_role` key.**  
The anon key is safe to expose. The service_role key bypasses RLS — never put it in frontend code.

### Step 1.3 — Run the Database Schema

1. In Supabase dashboard: click **SQL Editor** (left sidebar)
2. Click **New query**
3. Open `supabase-schema.sql` from the project root
4. Paste the **entire file** into the SQL editor
5. Click **Run** (or Ctrl+Enter)

You should see: `Success. No rows returned.`

**What this creates:**
- `users` table — engineer profiles
- `models` table — uploaded models with full-text search index
- `reviews` table — user reviews with unique constraint
- `bookmarks` table — user saved models
- `downloads` table — download tracking
- `activity` table — activity feed
- `follows` table — follow/unfollow engineers
- All **Row Level Security (RLS)** policies
- All **triggers** (auto-update rating, score, updated_at)
- All **RPC functions** (increment_view_count, increment_download_count, follow/unfollow)

### Step 1.4 — Fix Missing Column (Schema Bug)

The `total_downloads` column is referenced in `recalc_engineer_score()` but NOT declared in the `users` table. Run this fix:

```sql
-- In Supabase SQL Editor — run this AFTER the main schema
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_downloads integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS model_count integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
```

### Step 1.5 — Configure Authentication

In Supabase dashboard → **Authentication** → **Settings**:

**Site URL** (critical for OAuth and email links):
```
https://slm-market.sannan.app
```
Replace with your actual domain. This is where Supabase redirects after email confirmation and OAuth.

**Additional Redirect URLs** — add all of these:
```
https://slm-market.sannan.app/auth
https://slm-market.sannan.app/auth.html
http://localhost:8788/auth
http://localhost:8000/auth
http://localhost:8788/auth.html
http://localhost:8000/auth.html
```

**Auth settings to configure:**
- **Enable email confirmations:** ✅ ON (recommended for production)
- **Enable phone confirmations:** OFF (not needed)
- **Disable signup:** OFF (leave users able to register)
- **JWT expiry:** 3600 (1 hour — default is fine)
- **Refresh token rotation:** ✅ ON

### Step 1.6 — Configure Email Templates

Go to **Authentication** → **Email Templates**.

**Confirm signup template** — update the button URL to:
```
{{ .SiteURL }}/auth
```

**Reset password template** — update the button URL to:
```
{{ .SiteURL }}/auth?mode=reset
```

**Magic link template** — update to:
```
{{ .SiteURL }}/auth
```

This ensures email links land on the correct page for your domain.

### Step 1.7 — Enable GitHub OAuth (Optional)

1. Go to **[github.com/settings/developers](https://github.com/settings/developers)**
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** SLM Marketplace
   - **Homepage URL:** `https://slm-market.sannan.app`
   - **Authorization callback URL:** `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`
     (Use your actual Supabase project URL — found in Settings → API)
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**
6. In Supabase: **Authentication** → **Providers** → **GitHub**
7. Toggle **Enable GitHub provider** → ON
8. Paste Client ID and Client Secret → **Save**

### Step 1.8 — Create Storage Bucket

If you plan to allow model file uploads (not just HuggingFace links):

1. Go to **Storage** (left sidebar)
2. Click **New bucket**
3. Name: `models`
4. **Public bucket:** OFF (use signed URLs)
5. Click **Create bucket**
6. Go to **Policies** → create:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "users can upload models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read of published model files
CREATE POLICY "public can read models"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'models');
```

### Step 1.9 — Verify RLS is Working

Run this in SQL Editor to confirm all tables have RLS enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

Every table should show `rowsecurity = true`. If any shows `false`, run:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

---

## PART 2 — CLOUDFLARE PAGES SETUP

### Step 2.1 — Push to GitHub

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit — SLM Marketplace"

# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/slm-marketplace.git
git branch -M main
git push -u origin main
```

Make sure `.gitignore` contains (it should already):
```
config.js
.dev.vars
node_modules/
.DS_Store
```

### Step 2.2 — Connect to Cloudflare Pages

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. Click **Workers & Pages** → **Create application** → **Pages**
3. Click **Connect to Git** → authorise GitHub
4. Select your `slm-marketplace` repository
5. Configure the build:

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | *(leave empty)* |
| Build output directory | `/` (just a slash) |

6. Click **Save and Deploy**

Cloudflare will deploy in ~30 seconds and give you a URL like:
`https://slm-marketplace.pages.dev`

### Step 2.3 — Add Environment Variables (Critical)

This is how your Supabase keys get into the app without going into git.

1. In Cloudflare Pages → your project → **Settings** → **Environment variables**
2. Click **Add variable** for each:

| Variable name | Value | Environment |
|--------------|-------|-------------|
| `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` | Production + Preview |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (the anon key) | Production + Preview |

3. Click **Save**
4. Go to **Deployments** → click the three dots on latest deployment → **Retry deployment**

The app will now inject these values via `_worker.js` at `/config.js` on every request.

### Step 2.4 — Verify the Worker is Running

Visit: `https://slm-marketplace.pages.dev/config.js`

You should see:
```javascript
window.__SLM_CONFIG = { url: "https://xxxxxxxxxxxx.supabase.co", key: "eyJhbGci..." };
```

If you see `url: ""` — your env vars aren't set. Go back to Step 2.3.

### Step 2.5 — Add `siteUrl` to Worker Config (Required for Auth)

The `_worker.js` currently only injects `url` and `key`. It needs to also inject `siteUrl` so `getSiteUrl()` in `auth.js` returns the correct production domain (not `localhost`).

Open `_worker.js` and update the config injection:

```javascript
// In _worker.js — update the body generation (around line 20-30):
const supabaseUrl = env.SUPABASE_URL      || '';
const supabaseKey = env.SUPABASE_ANON_KEY || '';
const siteUrl     = env.SITE_URL          || url.origin;  // ADD THIS

const body = supabaseUrl && supabaseKey
  ? `window.__SLM_CONFIG = { url: "${supabaseUrl}", key: "${supabaseKey}", siteUrl: "${siteUrl}" };`
  : `window.__SLM_CONFIG = { url: "", key: "", siteUrl: "${url.origin}" };`;
```

Then add `SITE_URL` to Cloudflare env vars:

| Variable | Value |
|----------|-------|
| `SITE_URL` | `https://slm-market.sannan.app` |

This ensures OAuth redirects and email confirmation links always point to the right domain even if the Cloudflare preview URL changes.

### Step 2.6 — Add Custom Domain (Optional)

1. Cloudflare Pages → your project → **Custom domains** → **Set up a custom domain**
2. Enter: `slm-market.sannan.app` (or your domain)
3. Cloudflare auto-configures DNS if domain is on Cloudflare
4. If domain is elsewhere: add a CNAME record pointing to `slm-marketplace.pages.dev`

SSL is automatic. DNS propagates in 1–5 minutes on Cloudflare.

---

## PART 3 — LOCAL DEVELOPMENT SETUP

### Step 3.1 — Install Wrangler

```bash
npm install -g wrangler
wrangler --version  # should show 3.x.x
```

### Step 3.2 — Configure `.dev.vars`

```bash
# Edit .dev.vars (already gitignored)
cat > .dev.vars << 'DEVEOF'
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SITE_URL=http://localhost:8788
DEVEOF
```

Replace with your actual values from Step 1.2.

### Step 3.3 — Run Local Dev Server

```bash
# From project root
wrangler pages dev . --port 8788

# Visit: http://localhost:8788
# config.js will be served by the worker with your .dev.vars values
```

### Step 3.4 — Test Auth Locally

1. Visit `http://localhost:8788/config.js` — should show your Supabase URL
2. Visit `http://localhost:8788/auth.html` — sign up with a test email
3. Check Supabase dashboard → **Authentication** → **Users** — your user should appear
4. Check **Table Editor** → `users` — your profile row should be there

---

## PART 4 — VERIFICATION CHECKLIST

Run through every item before announcing launch:

### Database
- [ ] All 7 tables visible in Supabase Table Editor
- [ ] `total_downloads`, `model_count`, `avg_rating`, `review_count` columns added to `users`
- [ ] RLS enabled on all tables (`rowsecurity = true` in pg_tables)
- [ ] Triggers working: insert a review → model rating updates automatically
- [ ] RPC functions callable: test `increment_view_count` from SQL Editor:
  ```sql
  -- Insert a test model first, then:
  SELECT increment_view_count(1);
  SELECT view_count FROM models WHERE id = 1;  -- should be 1
  ```

### Authentication
- [ ] Email signup works — confirmation email received
- [ ] Email login works after confirmation
- [ ] Password reset email works — reset link redirects to `/auth?mode=reset`
- [ ] Password can be updated via reset flow
- [ ] Session persists on page refresh
- [ ] Logout works from header (calls `handleLogout()` in `global.js`)
- [ ] Protected pages redirect to `/auth.html` when not logged in
- [ ] After login, redirect returns to originally-requested page (via `?redirect=` param)
- [ ] GitHub OAuth works (if enabled) — redirects back correctly, profile created
- [ ] `config.js` at production URL returns real Supabase URL (not placeholder)

### Core Features
- [ ] Explore page loads models from Supabase (or shows mock data in demo mode)
- [ ] Model page loads individual model details
- [ ] Upload form creates a record in `models` table
- [ ] Review submission creates record in `reviews` table, model rating updates
- [ ] Bookmark saves to `bookmarks` table
- [ ] Profile page shows user's models and activity
- [ ] Leaderboard loads from `users` table ordered by score

### Performance & Security
- [ ] `https://your-domain.com/config.js` → shows your Supabase URL
- [ ] `https://your-domain.com/config.js` response has `Cache-Control: no-store`
- [ ] CSS/JS assets return `Cache-Control: immutable`
- [ ] CSP header present (check in browser DevTools → Network → any page → Response Headers)
- [ ] `X-Frame-Options: DENY` present
- [ ] No `service_role` key anywhere in frontend code or git history

### Docs
- [ ] All sidebar links in docs resolve (0 broken links — verified)
- [ ] Dark mode works on docs pages
- [ ] Search works in docs
- [ ] Code copy buttons work

---

## PART 5 — COMMON ISSUES & FIXES

### "Running in demo mode" / mock data showing instead of real data

**Cause:** `config.js` is returning empty URL/key.

**Fix:**
1. Visit `https://your-domain.com/config.js` in browser
2. If it shows `url: ""` → env vars not set in Cloudflare Pages
3. Go to CF Pages → Settings → Environment variables → add `SUPABASE_URL` and `SUPABASE_ANON_KEY`
4. Redeploy (Deployments → Retry deployment)

---

### GitHub OAuth redirects to wrong URL after login

**Cause:** Site URL in Supabase doesn't match your actual domain.

**Fix:**
1. Supabase → Authentication → Settings → **Site URL** → set to `https://your-domain.com`
2. Add `https://your-domain.com/auth` to **Additional Redirect URLs**
3. In GitHub OAuth App settings → update **Authorization callback URL** to `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`

---

### Email confirmation link says "Token expired" or "Invalid token"

**Cause:** User clicked the link more than once, or the email template URL is wrong.

**Fix:**
1. Supabase → Authentication → Email Templates → **Confirm signup**
2. Make sure the action URL ends with `?token_hash={{ .TokenHash }}&type=signup`
3. Make sure redirect URL is `{{ .SiteURL }}/auth`
4. Increase **JWT expiry** in Auth settings if users take too long to confirm

---

### `total_downloads` column error on profile page

**Cause:** Column not in schema (see Step 1.4).

**Fix:** Run the ALTER TABLE statements in Step 1.4 in Supabase SQL Editor.

---

### Upload fails with "permission denied" or 403

**Cause:** RLS policy on `models` table blocking insert.

**Fix:** Check the user is logged in. The policy `models_insert_own` requires:
```sql
engineer_id = auth.uid()
```
Make sure upload.js sets `engineer_id` to the logged-in user's UUID, not null.

---

### CSP blocking Supabase realtime websocket

**Cause:** `_headers` `connect-src` doesn't include `wss://`.

The current `_headers` already includes `wss://*.supabase.co` — if you're seeing this error, check that you haven't modified `_headers`.

---

### "New version available" — users see stale JS after deploy

**Cause:** `Cache-Control: immutable` on JS files means browsers don't re-fetch.

**Fix:** This is handled — HTML files have `max-age=0, must-revalidate`, so the HTML always fetches fresh, and since JS filenames don't have hashes, they'll be re-fetched. No action needed unless you add a cache-busting strategy later.

---

## PART 6 — PRODUCTION MONITORING

### Check your Supabase usage

Supabase free tier limits:
- Database: 500MB
- Auth: 50,000 monthly active users
- Storage: 1GB
- API requests: Unlimited (but rate-limited)

Monitor at: **Supabase dashboard** → **Settings** → **Usage**

### Set up error alerting (optional but recommended)

Add to `js/global.js` after the existing error boundary:

```javascript
// Simple error reporting to your own endpoint
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && event.reason.message) {
    // Log to your analytics or a simple Supabase table
    const client = getSupabaseClient();
    if (client) {
      client.from('error_logs').insert({
        message: event.reason.message,
        url: window.location.href,
        ts: new Date().toISOString()
      }).then(() => {});
    }
  }
});
```

Create the `error_logs` table:
```sql
CREATE TABLE IF NOT EXISTS error_logs (
  id bigint generated always as identity primary key,
  message text,
  url text,
  ts timestamptz default now()
);
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_anon" ON error_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
```

---

## PART 7 — DEPLOY CHECKLIST (FINAL)

Copy this and check everything before going live:

```
PRE-LAUNCH CHECKLIST

SUPABASE
[ ] Project created and provisioned
[ ] supabase-schema.sql run successfully
[ ] Missing columns added (total_downloads, model_count, avg_rating, review_count)
[ ] Site URL set to production domain
[ ] Redirect URLs configured (production + localhost)
[ ] Email templates updated with correct redirect paths
[ ] GitHub OAuth configured (if using it)
[ ] RLS verified on all tables

CLOUDFLARE PAGES
[ ] Repository connected
[ ] SUPABASE_URL env var set (production)
[ ] SUPABASE_ANON_KEY env var set (production)
[ ] SITE_URL env var set (production)
[ ] _worker.js updated to inject siteUrl
[ ] Custom domain configured (if using one)
[ ] /config.js returns real Supabase credentials

LOCAL DEV
[ ] .dev.vars filled with real values
[ ] wrangler pages dev working
[ ] Auth flow tested locally (signup, login, logout)
[ ] Upload flow tested locally

VERIFICATION
[ ] Signup email received and confirmation works
[ ] Login works
[ ] GitHub OAuth works (if enabled)
[ ] Password reset works end-to-end
[ ] Upload creates model in DB
[ ] Explore page shows real models
[ ] Profile page loads without errors
[ ] No console errors in browser DevTools
[ ] /config.js returns correct values in production

GO LIVE ✅
```

---

## Quick Reference — Supabase URLs

| What | Where |
|------|-------|
| Project URL | Settings → API → Project URL |
| Anon key | Settings → API → Project API keys → anon public |
| Auth settings | Authentication → Settings |
| Email templates | Authentication → Email Templates |
| GitHub OAuth | Authentication → Providers → GitHub |
| SQL Editor | Left sidebar → SQL Editor |
| Table data | Left sidebar → Table Editor |
| Storage | Left sidebar → Storage |
| Logs | Left sidebar → Logs |
