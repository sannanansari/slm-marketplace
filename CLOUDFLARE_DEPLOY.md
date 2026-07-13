# Deploy to Cloudflare Pages → slm-market.sannan.app

Complete step-by-step. Estimated time: 20 minutes.

---

## STEP 1 — Push to GitHub

```bash
cd slm-marketplace
git init
git add .
git commit -m "initial: SLM Marketplace production build"
git branch -M main

# Create a repo on github.com/new (public or private, both work)
git remote add origin https://github.com/YOUR_USERNAME/slm-marketplace.git
git push -u origin main
```

---

## STEP 2 — Connect to Cloudflare Pages

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create**
2. Choose **Pages** → **Connect to Git**
3. Select your `slm-marketplace` repo
4. Build settings:
   - **Framework preset**: None
   - **Build command**: _(leave empty)_
   - **Build output directory**: `/` (root)
5. Click **Save and Deploy**

Cloudflare will deploy in ~30 seconds and give you a URL like:
`https://slm-marketplace-abc.pages.dev`

---

## STEP 3 — Add Environment Variables

CF Pages → Settings → **Environment variables** → Add variables:

| Variable name       | Value                      | Environments        |
| ------------------- | -------------------------- | ------------------- |
| `SUPABASE_URL`      | `https://xxxx.supabase.co` | Production, Preview |
| `SUPABASE_ANON_KEY` | `eyJhbGci...`              | Production, Preview |

→ **Save** → trigger a new deployment (Pages → Deployments → Retry deployment)

---

## STEP 4 — Connect slm-market.sannan.app domain

### 4a. Add custom domain in CF Pages

CF Pages → Your project → **Custom domains** → **Set up a custom domain**

- Enter: `slm-market.sannan.app`
- CF will detect that slm-market.sannan.app is already on Cloudflare
- Click **Activate domain**

### 4b. DNS records (auto-created by CF, but verify)

Go to CF Dashboard → slm-market.sannan.app → **DNS**:

| Type  | Name | Content                         | Proxy |
| ----- | ---- | ------------------------------- | ----- |
| CNAME | `@`  | `slm-marketplace-abc.pages.dev` | ✓ ON  |

**Important:** Proxy must be ON (orange cloud) for HSTS + security headers to work.

### 4c. SSL/TLS settings

CF Dashboard → slm-market.sannan.app → **SSL/TLS** → **Overview**:

- Set to **Full (strict)** ← not just "Full"

CF → SSL/TLS → **Edge Certificates**:

- Always Use HTTPS: **ON**
- HTTP Strict Transport Security (HSTS): **Enable**
  - Max Age: 12 months
  - Include subdomains: ON
  - Preload: ON (only after you're confident — hard to undo)
- Minimum TLS Version: **TLS 1.2**
- TLS 1.3: **ON**

### 4d. No www redirect needed

Subdomains don't have a www prefix. `slm-market.sannan.app` is your canonical URL.

---

## STEP 5 — Cloudflare Security Settings

### WAF (Web Application Firewall)

CF Dashboard → slm-market.sannan.app → **Security** → **WAF**:

- **Managed Rules**: Turn on Cloudflare Managed Ruleset
- **Bot Fight Mode**: ON (blocks known bad bots)

### Rate Limiting Rules

Create rules under Security → WAF → Rate Limiting:

| Rule name        | Path       | Rate           | Action       |
| ---------------- | ---------- | -------------- | ------------ |
| Auth brute force | `/auth*`   | 10 req / 1 min | Block 1 hour |
| Upload spam      | `/upload*` | 5 req / 1 min  | Block 1 hour |

### Security Level

CF Dashboard → slm-market.sannan.app → **Security** → **Settings**:

- Security Level: **Medium**
- Challenge Passage: **30 minutes**
- Browser Integrity Check: **ON**

---

## STEP 6 — Performance Settings

### Caching

CF Dashboard → slm-market.sannan.app → **Caching** → **Configuration**:

- Caching Level: **Standard**
- Browser Cache TTL: **Respect Existing Headers** ← our \_headers already set this

### Speed

CF Dashboard → slm-market.sannan.app → **Speed** → **Optimization**:

- Auto Minify: check **JavaScript**, **CSS**, **HTML**
- Brotli: **ON**
- Rocket Loader: **OFF** ← breaks deferred scripts, leave off
- Early Hints: **ON**

### Page Rules (optional for even faster caching)

Rules → Page Rules → Create:

- URL: `slm-market.sannan.app/css/*`
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month

---

## STEP 7 — Analytics

CF Dashboard → slm-market.sannan.app → **Analytics** → **Web Analytics**:

- Enable Web Analytics (free, privacy-first, no cookies, GDPR compliant)
- Copy the JS snippet
- Add to `js/global.js` inside `initFooter()`:

```js
// CF Web Analytics — add just before closing footer tag
const analytics = document.createElement("script");
analytics.defer = true;
analytics.src = "https://static.cloudflareinsights.com/beacon.min.js";
analytics.dataset.cfBeacon = '{"token": "YOUR_CF_ANALYTICS_TOKEN"}';
document.head.append(analytics);
```

---

## STEP 8 — Verify everything is working

Run these checks after deploy:

```bash
# 1. Security headers
curl -I https://slm-market.sannan.app | grep -E "strict-transport|content-security|x-frame|x-content"

# 2. HTTPS redirect works
curl -I http://slm-market.sannan.app

# 4. 404 page
curl -I https://slm-market.sannan.app/nonexistent

# 5. Clean URLs work
curl -I https://slm-market.sannan.app/explore

# 6. js/config.js is served (check it has your URL)
curl https://slm-market.sannan.app/js/config.js
```

Check your security score at:

- https://securityheaders.com/?q=slm-market.sannan.app
- https://www.ssllabs.com/ssltest/analyze.html?d=slm-market.sannan.app

Target: **A+** on both.

---

## STEP 9 — Submit to Google Search Console

1. Go to https://search.google.com/search-console
2. Add property: `https://slm-market.sannan.app`
3. Verify via **URL prefix** → Cloudflare DNS TXT record (CF makes this easy)
4. Submit sitemap: `https://slm-market.sannan.app/sitemap.xml`

---

## Post-deploy checklist

- [ ] https://slm-market.sannan.app loads correctly
- [ ] http://slm-market.sannan.app redirects to https://slm-market.sannan.app
- [ ] https://slm-market.sannan.app/explore shows models
- [ ] https://slm-market.sannan.app/js/config.js returns your Supabase URL (not placeholder)
- [ ] Sign up flow works end to end
- [ ] Security headers score: A+
- [ ] SSL score: A+
- [ ] Google Search Console: sitemap submitted
- [ ] CF Web Analytics: receiving hits
