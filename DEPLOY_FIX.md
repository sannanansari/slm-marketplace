# URGENT DEPLOYMENT FIX — Read This First

## What Went Wrong

Cloudflare deployed your project as a **Worker** instead of **Pages**.
- Workers don't serve static files → every URL 404s
- The `wrangler.toml` file in the repo caused this
- Cloudflare saw `wrangler.toml` and treated it as a Worker project

**wrangler.toml is now in .gitignore — it will never push again.**

---

## Fix in 4 Steps (do these now)

### Step 1 — Delete the broken Worker

1. Go to **dash.cloudflare.com**
2. Left sidebar → **Workers & Pages**
3. You'll see `slm-marketplace` listed as a **Worker** (not Pages)
4. Click it → **Settings** → scroll to bottom → **Delete**
5. Confirm deletion

### Step 2 — Push the fixed code to GitHub

On your computer in the project folder:

```bash
# Remove wrangler.toml from git history
git rm --cached wrangler.toml
git add .gitignore
git commit -m "fix: remove wrangler.toml from repo, gitignore it"
git push
```

### Step 3 — Create a NEW Cloudflare Pages project

1. **dash.cloudflare.com** → **Workers & Pages**
2. Click **Create application** → choose **Pages** tab (not Workers)
3. Click **Connect to Git**
4. Select your `slm-marketplace` GitHub repository
5. Configure build settings:

| Setting | Value |
|---------|-------|
| Project name | `slm-marketplace` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | *(leave completely empty)* |
| Build output directory | `/` |

6. Click **Save and Deploy**

### Step 4 — Add environment variables

After deploy succeeds:
1. Pages project → **Settings** → **Environment variables**
2. Add these 3 variables for **Production**:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (your anon key) |
| `SITE_URL` | `https://slm-market.sannan.app` |

3. Click **Save**
4. Go to **Deployments** → three dots on latest → **Retry deployment**

---

## How to Verify It Worked

Visit these URLs after deploy:

```
✅ https://slm-market.sannan.app/           → home page loads
✅ https://slm-market.sannan.app/explore    → explore page loads
✅ https://slm-market.sannan.app/config.js  → shows your Supabase URL
```

If `/config.js` shows your real Supabase URL — everything is working.

---

## Why This Happened

| File | Purpose | Should be in git? |
|------|---------|-------------------|
| `_worker.js` | Cloudflare Pages edge function (auto-detected by Pages) | ✅ YES |
| `_headers` | HTTP security headers for Pages | ✅ YES |
| `_redirects` | URL redirects for Pages | ✅ YES |
| `wrangler.toml` | Local dev config — **breaks Pages if pushed** | ❌ NO (now gitignored) |

The `_worker.js` in the root is how Cloudflare Pages knows to run custom logic.
It is NOT the same as a standalone Worker. Pages detects it automatically.
You never specify it in any config file.

---

## Worker vs Pages — The Difference

```
Cloudflare WORKER (what you had — wrong):
  → Runs custom code only
  → Does NOT serve static files
  → URL: workers.dev/...
  → Result: 404 on every HTML/CSS/JS file

Cloudflare PAGES (what you need — correct):
  → Serves static files from your GitHub repo
  → ALSO runs _worker.js for /config.js
  → URL: pages.dev/... or your custom domain
  → Result: site works correctly
```

---

## Local Development (after the fix)

```bash
# wrangler.toml exists locally (gitignored) for this command only
wrangler pages dev . --port 8788

# Visit http://localhost:8788
```

The `wrangler.toml` file exists on your computer for local dev.
It is gitignored so it never reaches Cloudflare again.
