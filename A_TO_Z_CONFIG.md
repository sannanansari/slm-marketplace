# SLM Marketplace — Complete A to Z Configuration Guide

## slm-market.sannan.app · Cloudflare Pages + Supabase

---

## OVERVIEW — How all pieces connect

```
Browser
  │
  ├─ visits slm-market.sannan.app
  │         │
  │    [Cloudflare DNS]
  │         │ CNAME → slm-marketplace-xxx.pages.dev
  │         │
  │    [Cloudflare Pages]
  │         │ _worker.js intercepts /js/config.js
  │         │   → reads SUPABASE_URL + SUPABASE_ANON_KEY from CF env vars
  │         │   → returns: window.__SLM_CONFIG = { url, key }
  │         │
  │         │ All other requests → serve static files
  │         │ (_headers applies security headers to everything)
  │
  ├─ loads js/config.js (sync)  → window.__SLM_CONFIG set
  ├─ loads supabase.min.js (sync) → window.supabase available
  ├─ loads supabase.js (defer) → creates Supabase client
  ├─ loads global.js (defer) → injects header/footer, checks session
  └─ loads page.js (defer)   → page-specific logic runs
           │
      [Supabase]
           ├─ auth.signInWithPassword()   → email/password login
           ├─ auth.signInWithOAuth()      → GitHub OAuth
           ├─ auth.getSession()           → reads stored session
           └─ from('models').select()     → database queries
```

---

# PART 1 — SUPABASE SETUP

## Step 1.1 — Create Supabase Project

1. Go to **https://supabase.com**
2. Click **New Project**
3. Fill in:
   - **Organization**: your org (or create one)
   - **Project name**: `slm-marketplace`
   - **Database password**: generate a strong one, save it somewhere
   - **Region**: pick closest to your users
4. Click **Create new project**
5. Wait ~2 minutes for provisioning

**Note your Project URL and anon key** — you need these for Cloudflare.
They are at: **Project Settings → API**

```
Project URL:   https://abcdefghijk.supabase.co
Anon key:      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 1.2 — Run the Database Schema

1. Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **New query**
3. Open `supabase-schema.sql` from your project zip
4. Select ALL the text (Ctrl+A / Cmd+A)
5. Paste into SQL Editor
6. Click **Run** (green button, top right)

Expected: `Success. No rows returned`

This creates:

- `users` table (profiles)
- `models` table (SLMs)
- `reviews` table
- `bookmarks` table
- `downloads` table
- `activity` table
- `follows` table
- All RLS policies (security)
- Triggers (auto-update ratings, scores)
- RPCs (follow, download count, view count)

**Verify tables created:**
Left sidebar → **Table Editor** → you should see all 7 tables listed.

---

## Step 1.3 — Authentication Settings

### 1.3a — URL Configuration (CRITICAL — auth breaks without this)

**Supabase → Authentication → URL Configuration**

**Site URL** field:

```
https://slm-market.sannan.app
```

**Redirect URLs** — click **Add URL** for EACH one:

```
https://slm-market.sannan.app
https://slm-market.sannan.app/auth
https://slm-market.sannan.app/auth.html
https://slm-market.sannan.app/index.html
http://localhost:8788
http://localhost:3000
```

Click **Save** at the bottom.

### 1.3b — Email Provider Settings

**Supabase → Authentication → Providers → Email**

Settings:
| Setting | Value |
|---------|-------|
| Enable Email provider | **ON** |
| Confirm email | **ON** |
| Secure email change | **ON** |
| Enable email signup | **ON** |

Click **Save**.

### 1.3c — GitHub OAuth Setup

**Part A — Create GitHub OAuth App:**

1. Go to **https://github.com/settings/developers**
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in exactly:

| Field                      | Value                                                   |
| -------------------------- | ------------------------------------------------------- |
| Application name           | `SLM Marketplace`                                       |
| Homepage URL               | `https://slm-market.sannan.app`                         |
| Authorization callback URL | `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` |

> Replace `YOUR_PROJECT_REF` with the part before `.supabase.co` in your Project URL.
> Example: if URL is `https://abcdefghijk.supabase.co` → use `abcdefghijk`
> So callback = `https://abcdefghijk.supabase.co/auth/v1/callback`

4. Click **Register application**
5. On the next page, click **Generate a new client secret**
6. Copy both values:
   - **Client ID** (e.g. `Ov23li...`)
   - **Client Secret** (shown ONCE — copy immediately)

**Part B — Enable in Supabase:**

1. **Supabase → Authentication → Providers → GitHub**
2. Toggle **Enable GitHub** → **ON**
3. Paste **Client ID** → Client ID field
4. Paste **Client Secret** → Client Secret field
5. Click **Save**

---

## Step 1.4 — Email Templates

**Supabase → Authentication → Email Templates → Confirm signup**

Check the confirmation email template. The link inside should redirect to:

```
{{ .SiteURL }}/auth
```

If it shows `{{ .SiteURL }}/auth.html` change to `{{ .SiteURL }}/auth`

**Supabase → Authentication → Email Templates → Reset password**

Same — redirect should go to:

```
{{ .SiteURL }}/auth?mode=reset
```

---

## Step 1.5 — SMTP (Optional but Recommended)

Default Supabase email limit: **4 emails per hour**.
For production use, set up custom SMTP.

**Supabase → Project Settings → Authentication → SMTP Settings**

Toggle **Enable Custom SMTP** → ON

Recommended free tier options:

- **Resend** (resend.com) — 100 emails/day free, easy setup
- **SendGrid** — 100 emails/day free

Fill in:
| Field | Value |
|-------|-------|
| Host | smtp.resend.com |
| Port | 465 |
| Username | resend |
| Password | your Resend API key |
| Sender email | noreply@sannan.app |
| Sender name | SLM Marketplace |

Click **Save**.

---

# PART 2 — CLOUDFLARE PAGES SETUP

## Step 2.1 — Push Code to GitHub

On your computer, open Terminal in the project folder:

```bash
cd slm-marketplace

# First time setup:
git init
git add .
git commit -m "initial: SLM Marketplace production"
git branch -M main

# Create repo on github.com/new first, then:
git remote add origin https://github.com/sannanansari/slm-marketplace.git
git push -u origin main

# Future updates (just these two lines):
git add .
git commit -m "your message"
git push
```

---

## Step 2.2 — Connect to Cloudflare Pages

1. Go to **https://dash.cloudflare.com**
2. Left sidebar → **Workers & Pages**
3. Click **Create** → **Pages**
4. Click **Connect to Git**
5. **Connect GitHub** → Authorize Cloudflare
6. Select `slm-marketplace` repo
7. Click **Begin setup**

**Build settings:**
| Setting | Value |
|---------|-------|
| Project name | `slm-marketplace` |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | _(leave empty)_ |
| Build output directory | `/` |
| Root directory | _(leave empty)_ |

8. Click **Save and Deploy**

Wait ~60 seconds. You get a URL: `https://slm-marketplace-abc.pages.dev`

---

## Step 2.3 — Environment Variables (CRITICAL)

**CF Pages → slm-marketplace → Settings → Environment variables**

Click **Add variable** and add BOTH:

| Variable name       | Value                              | Encrypt                 |
| ------------------- | ---------------------------------- | ----------------------- |
| `SUPABASE_URL`      | `https://abcdefghijk.supabase.co`  | No                      |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (your full anon key) | **YES — click Encrypt** |

Set **Environment** to **Production** for both.

Click **Save**.

**IMPORTANT:** After saving, trigger a new deployment:
→ **Deployments** tab → Click **Retry deployment** on the latest one.

---

## Step 2.4 — Connect Custom Domain

**CF Pages → slm-marketplace → Custom domains → Set up a custom domain**

1. Type: `slm-market.sannan.app`
2. Click **Continue**
3. CF detects `sannan.app` is on your account → click **Activate domain**

**Verify DNS was created:**
CF Dashboard → `sannan.app` → **DNS** → look for:

| Type  | Name         | Content                         | Proxy               |
| ----- | ------------ | ------------------------------- | ------------------- |
| CNAME | `slm-market` | `slm-marketplace-abc.pages.dev` | ✅ Proxied (orange) |

If not there, add it manually with those values.
**Proxy MUST be ON** (orange cloud) — if it's grey, click it to turn orange.

---

## Step 2.5 — SSL Settings

**CF Dashboard → sannan.app → SSL/TLS → Overview**

Set encryption mode to: **Full (strict)**
(Not "Flexible" — that causes redirect loops)

**CF Dashboard → sannan.app → SSL/TLS → Edge Certificates**

| Setting                 | Value         |
| ----------------------- | ------------- |
| Always Use HTTPS        | **ON**        |
| Minimum TLS Version     | **TLS 1.2**   |
| TLS 1.3                 | **ON**        |
| HSTS → Enable           | **ON**        |
| HSTS Max Age            | **12 months** |
| HSTS Include Subdomains | **ON**        |

---

## Step 2.6 — Speed Settings

**CF Dashboard → sannan.app → Speed → Optimization**

| Setting                | Value               |
| ---------------------- | ------------------- |
| Auto Minify JavaScript | **ON**              |
| Auto Minify CSS        | **ON**              |
| Auto Minify HTML       | **ON**              |
| Brotli                 | **ON**              |
| Rocket Loader          | **OFF** (breaks JS) |
| Early Hints            | **ON**              |

---

## Step 2.7 — Security Settings

**CF Dashboard → sannan.app → Security → Settings**

| Setting                 | Value      |
| ----------------------- | ---------- |
| Security Level          | **Medium** |
| Bot Fight Mode          | **ON**     |
| Browser Integrity Check | **ON**     |

**WAF Rules (rate limiting):**
CF Dashboard → sannan.app → **Security → WAF → Rate limiting rules → Create**

Rule 1 — Protect auth:
| Field | Value |
|-------|-------|
| Rule name | `Block auth brute force` |
| Field | URI Path |
| Operator | contains |
| Value | `/auth` |
| Rate | 10 requests per 1 minute |
| Action | Block for 1 hour |

---

# PART 3 — VERIFY EVERYTHING WORKS

Run these checks in order after deployment.

## Check 1 — js/config.js is working

Open in browser:

```
https://slm-market.sannan.app/js/config.js
```

**Must see:**

```javascript
window.__SLM_CONFIG = { url: "https://abcdefghijk.supabase.co", key: "eyJ..." };
```

**If you see** `url: ""` → env vars not set in CF Pages (redo Step 2.3)
**If you see** 404 → `_worker.js` not in repo root (check your git push)

---

## Check 2 — Site loads

```
https://slm-market.sannan.app
```

Must show: homepage with models, orange header, search bar.

---

## Check 3 — Clean URLs work

All of these must load without `.html`:

```
https://slm-market.sannan.app/explore
https://slm-market.sannan.app/leaderboard
https://slm-market.sannan.app/upload
https://slm-market.sannan.app/auth
```

---

## Check 4 — 404 page works

```
https://slm-market.sannan.app/anything-random-xyz
```

Must show your custom 404 page (not a Cloudflare error page).

---

## Check 5 — Email signup

1. Go to `/auth` → Sign Up tab
2. Enter: name, email, password (8+ chars), confirm
3. Click **Create Account**
4. ✅ See toast: "Check your email for a confirmation link"
5. Open your email → click the confirmation link
6. ✅ Redirected to `/auth` → toast: "Email confirmed!"
7. ✅ Redirected to `/` → header shows your initial (not "Sign Up")

**If step 4 fails** → Supabase email provider not enabled (redo Step 1.3b)
**If step 6 redirects to wrong page** → Redirect URLs wrong (redo Step 1.3a)
**If step 7 still shows Sign Up** → js/config.js returning empty (redo Step 2.3)

---

## Check 6 — Email login

1. Go to `/auth` → Log In tab
2. Enter email + password
3. Click **Log In**
4. ✅ Redirected to `/` with avatar initial in header

**If nothing happens on click** → DOMContentLoaded bug (this build is fixed)
**If "Email not confirmed"** → User must click email link first

---

## Check 7 — GitHub OAuth

1. Go to `/auth`
2. Click **Continue with GitHub**
3. ✅ Redirected to `github.com` for authorization
4. Click Authorize
5. ✅ Redirected back to `/auth`
6. ✅ Automatically redirected to `/` with avatar in header

**If "provider is not enabled"** → Enable GitHub in Supabase (redo Step 1.3c)
**If callback URL error** → GitHub OAuth App callback URL wrong (redo Step 1.3c Part A)
**If stuck on `/auth`** → Redirect URL missing in Supabase (redo Step 1.3a)

---

## Check 8 — Session persists

1. Log in with any method
2. Click **Explore** in nav
3. Click **Leaderboard** in nav
4. Click **SLM** logo to go home
5. ✅ Avatar stays in header on EVERY page (never reverts to Sign Up)

**If Sign Up reappears** → storageKey bug (this build is fixed — if still happening, clear browser localStorage and re-login)

---

## Check 9 — Security headers

Go to: **https://securityheaders.com/?q=slm-market.sannan.app**
Expected grade: **A** or **A+**

---

## Check 10 — SSL grade

Go to: **https://www.ssllabs.com/ssltest/analyze.html?d=slm-market.sannan.app**
Expected grade: **A+**

---

# PART 4 — ADD YOUR FIRST MODELS

## Option A — Via SQL (fastest)

Supabase → SQL Editor → New query:

```sql
-- Get your user ID first
SELECT id FROM auth.users WHERE email = 'your@email.com';

-- Then insert a model (replace YOUR_UUID with the id from above)
INSERT INTO models (
  title, short_description, full_description, category,
  engineer_id, engineer_username, github_url, tags,
  accuracy, f1_score, response_time,
  model_size, context_window, quantized,
  base_model, languages, license, status
) VALUES (
  'MedCoder-SLM-1B',
  'Assigns ICD-10-CM and CPT codes from clinical notes. 69% exact match.',
  'Fine-tuned Llama-3.2-1B for medical coding using QLoRA on MIMIC-IV data.',
  'healthcare',
  'YOUR_UUID_HERE',
  'your_username',
  'https://github.com/your-username/medcoder-slm',
  ARRAY['ICD-10', 'CPT', 'Medical Coding', 'Clinical NLP'],
  69.2, 87.2, 280,
  '1B', '1K tokens', true,
  'Llama-3.2-1B-Instruct', 'English', 'Apache 2.0', 'published'
);
```

## Option B — Via Upload form

Go to `/upload` when logged in → fill the form → click **Continue**.

---

# PART 5 — ONGOING MAINTENANCE

## Deploy new code

```bash
git add .
git commit -m "describe your change"
git push
```

CF auto-deploys in ~60 seconds. No manual steps.

## Check deployment status

CF Pages → slm-marketplace → **Deployments** tab
Green = deployed. Red = check build logs.

## View real-time logs

CF Pages → slm-marketplace → **Functions** tab → **Real-time Logs**
(Shows \_worker.js requests including js/config.js calls)

## Monitor auth issues

Supabase → **Authentication** → **Users** tab
Shows all registered users, confirmation status, last sign in.

Supabase → **Logs** → **Auth logs**
Shows all auth events including failures.

---

# QUICK REFERENCE

## Your URLs

| URL                                          | What it does           |
| -------------------------------------------- | ---------------------- |
| `https://slm-market.sannan.app`              | Homepage               |
| `https://slm-market.sannan.app/explore`      | Browse models          |
| `https://slm-market.sannan.app/auth`         | Login / Sign up        |
| `https://slm-market.sannan.app/upload`       | Upload a model         |
| `https://slm-market.sannan.app/js/config.js` | Verify Supabase config |
| `https://slm-market.sannan.app/leaderboard`  | Leaderboard            |

## Your Supabase URLs

| URL                                               | What it's for  |
| ------------------------------------------------- | -------------- |
| `https://supabase.com/dashboard/project/YOUR_REF` | Dashboard      |
| `https://YOUR_REF.supabase.co/auth/v1/callback`   | OAuth callback |

## CF Pages env vars required

```
SUPABASE_URL       = https://YOUR_REF.supabase.co
SUPABASE_ANON_KEY  = eyJhbGci...
```

## Git commands

```bash
git add . && git commit -m "update" && git push   # deploy
git log --oneline -5                              # check recent commits
```

---

# TROUBLESHOOTING TABLE

| Problem                       | Most likely cause        | Fix                                                  |
| ----------------------------- | ------------------------ | ---------------------------------------------------- |
| `/js/config.js` returns empty | Env vars not set         | CF Pages → Settings → Env vars → Save → Retry deploy |
| Login button does nothing     | Old DOMContentLoaded bug | Download latest zip and push                         |
| Session lost on page change   | Old storageKey bug       | Download latest zip and push                         |
| GitHub OAuth error            | Provider not enabled     | Supabase → Auth → Providers → GitHub → Enable        |
| GitHub callback fails         | Wrong callback URL       | Must be `supabase.co/auth/v1/callback` not your site |
| Email link wrong page         | Redirect URL missing     | Supabase → Auth → URL Config → add `/auth`           |
| Redirect loop                 | Bad \_redirects rule     | Clear all rules from `_redirects` file               |
| 404 on /explore               | Wrong \_redirects        | Clear all rules — CF handles routing natively        |
| Sign Up always shows          | Supabase not connected   | Check `/js/config.js` — must show real URL           |
| CORS error                    | CSP blocking             | Check `_headers` — supabase.co in connect-src        |
| Email not received            | Supabase rate limit      | Add custom SMTP (Step 1.5)                           |
