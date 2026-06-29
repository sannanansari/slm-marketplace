# Complete Configuration Checklist
# slm-market.sannan.app — Cloudflare Pages + Supabase

---

## CLOUDFLARE PAGES

### Environment Variables
CF Pages → slm-marketplace → Settings → Environment variables → Add variables

| Variable Name     | Value                            | Encrypt |
|-------------------|----------------------------------|---------|
| SUPABASE_URL      | https://xxxx.supabase.co         | No      |
| SUPABASE_ANON_KEY | eyJhbGci...                      | YES     |

Add for BOTH Production AND Preview environments.
After saving → Deployments → Retry deployment.

### Verify config.js works
Open: https://slm-market.sannan.app/config.js

Must show:
  window.__SLM_CONFIG = { url: "https://xxxx.supabase.co", key: "eyJ..." };

If it shows url:"" → env vars not saved or deployment not retried.

### _worker.js (in project root)
The _worker.js file intercepts /config.js and injects env vars.
It MUST be committed to your repo root.
No functions/ directory — _worker.js replaces it entirely.

### _redirects (in project root)
Must be EMPTY (no rules).
CF Pages handles clean URLs natively — rules cause redirect loops.

---

## SUPABASE — AUTH SETTINGS

### Step 1 — URL Configuration
Supabase → Authentication → URL Configuration

Site URL:
  https://slm-market.sannan.app

Redirect URLs (add EACH one separately):
  https://slm-market.sannan.app
  https://slm-market.sannan.app/auth
  https://slm-market.sannan.app/auth.html
  https://slm-market.sannan.app/index.html
  http://localhost:8788
  http://localhost:3000

Click SAVE.

### Step 2 — Email Auth Settings
Supabase → Authentication → Providers → Email

Ensure:
  Enable Email provider        → ON
  Confirm email                → ON (users must verify email)
  Secure email change          → ON

### Step 3 — GitHub OAuth
Supabase → Authentication → Providers → GitHub

a) Create GitHub OAuth App:
   Go to: https://github.com/settings/developers → OAuth Apps → New OAuth App

   Application name:       SLM Marketplace
   Homepage URL:           https://slm-market.sannan.app
   Authorization callback: https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback

   (YOUR_PROJECT_REF = the subdomain in your Supabase URL, e.g. abcdefghijk)

b) After creating app:
   Click "Generate a new client secret"
   Copy Client ID and Client Secret

c) In Supabase GitHub provider page:
   Paste Client ID → Client ID field
   Paste Client Secret → Client Secret field
   Click SAVE

### Step 4 — Email Templates
Supabase → Authentication → Email Templates → Confirm signup

In the template, the confirmation URL should contain:
  {{ .SiteURL }}/auth

If it shows /auth.html change to /auth
(The _redirects file maps /auth → auth.html automatically via CF Pages native routing)

### Step 5 — Run Database Schema
Supabase → SQL Editor → New query

Paste the ENTIRE contents of supabase-schema.sql → Click Run

This creates:
  Tables:   users, models, reviews, bookmarks, downloads, activity, follows
  Policies: RLS on all tables
  Triggers: rating recalc, score recalc, updated_at
  RPCs:     increment_view_count, increment_download_count,
            recalc_engineer_score, follow_engineer, unfollow_engineer

---

## VERIFY AUTH WORKS — Test Sequence

### Test 1: config.js loads
  URL: https://slm-market.sannan.app/config.js
  Expected: window.__SLM_CONFIG = { url: "https://...", key: "eyJ..." };
  If fails: Env vars not set in CF Pages

### Test 2: Email signup
  1. Go to https://slm-market.sannan.app/auth
  2. Click Sign Up tab
  3. Fill name, email, password (8+ chars), confirm password
  4. Click Create Account
  5. Expected: "Check your email for a confirmation link" toast
  6. Check email → click confirmation link
  7. Expected: Redirected to /auth → "Email confirmed!" toast → redirected to /
  8. Expected: Header shows your initial letter instead of "Sign Up"

  If step 5 fails: Supabase email provider not enabled
  If step 7 redirects wrongly: Check Redirect URLs in Supabase Auth settings
  If step 8 shows Sign Up: Session not persisting — check config.js is loading

### Test 3: Email login
  1. Go to https://slm-market.sannan.app/auth
  2. Enter email + password
  3. Click Log In
  4. Expected: Redirect to / with avatar in header

  If nothing happens after click: DOMContentLoaded bug (fixed in this build)
  If "Invalid credentials": Wrong password or email not confirmed yet

### Test 4: GitHub OAuth
  1. Go to https://slm-market.sannan.app/auth
  2. Click "Continue with GitHub"
  3. Expected: Redirect to github.com for authorization
  4. Authorize → redirect back to /auth
  5. Expected: Redirect to / with avatar in header

  If "provider is not enabled": Enable GitHub in Supabase Auth → Providers
  If redirect fails: Check GitHub OAuth App callback URL is your SUPABASE URL

### Test 5: Session persists across pages
  1. Log in (any method)
  2. Navigate to /explore, /leaderboard, /
  3. Header should show avatar (not Sign Up) on EVERY page

  If Sign Up reappears: storageKey bug (fixed in this build — no more custom key)

### Test 6: Logout
  Click avatar in header → Sign Out
  Expected: Redirect to / with Sign Up button back in header

---

## COMMON ERRORS AND FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| /config.js returns empty | Env vars not set in CF | Set SUPABASE_URL + SUPABASE_ANON_KEY in CF Pages env vars |
| "provider is not enabled" | GitHub OAuth not enabled | Supabase → Auth → Providers → GitHub → Enable |
| Redirect loop on /explore | Bad _redirects rule | _redirects must be empty |
| Login does nothing | DOMContentLoaded bug | Fixed in this build |
| Session lost on page nav | Custom storageKey | Fixed in this build |
| Email link goes to wrong page | Wrong redirect URL | Add /auth to Supabase redirect URLs |
| "Email not confirmed" error | User skipped verification | User must click email link |
| 404 on /auth | CF Pages routing | Fixed — CF handles .html stripping natively |
| JWT expired | Token not refreshing | Fixed — autoRefreshToken: true in supabase.js |

---

## GITHUB PUSH COMMANDS

After downloading the zip, replacing your repo files, run:

  git add .
  git commit -m "fix: auth session persistence, DOMContentLoaded defer bug, storageKey"
  git push

CF Pages auto-deploys in ~60 seconds.
