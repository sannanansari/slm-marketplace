/**
 * config.example.js — COMMIT this file. DO NOT put real values here.
 *
 * ─────────────────────────────────────────────────────────────
 * ON CLOUDFLARE PAGES (production / preview):
 * ─────────────────────────────────────────────────────────────
 *   js/config.js is served by _worker.js at runtime.
 *   It injects your env vars from CF Pages → Settings → Environment Variables.
 *   You do NOT need to create js/config.js manually.
 *
 *   Required env vars (set in CF Pages dashboard):
 *     SUPABASE_URL      = https://xxxx.supabase.co
 *     SUPABASE_ANON_KEY = eyJhbGci...
 *     SITE_URL          = https://slm-market.sannan.app
 *
 * ─────────────────────────────────────────────────────────────
 * FOR LOCAL DEVELOPMENT (recommended):
 * ─────────────────────────────────────────────────────────────
 *   1. npm i -g wrangler
 *   2. Fill .dev.vars with your real values
 *   3. wrangler pages dev . --port 8788
 *   4. Visit http://localhost:8788
 *
 *   The worker reads .dev.vars and serves /js/config.js automatically.
 *   This exactly mirrors what happens in production.
 *
 * ─────────────────────────────────────────────────────────────
 * FALLBACK — plain static server (demo/mock data only):
 * ─────────────────────────────────────────────────────────────
 *   1. cp config.example.js js/config.js
 *   2. Fill in real values below (js/config.js is gitignored)
 *   3. python3 -m http.server 8000
 *
 *   Note: OAuth and email redirects will not work correctly
 *   with this method because there is no edge worker.
 *   Use wrangler for any auth testing.
 * ─────────────────────────────────────────────────────────────
 */
window.__SLM_CONFIG = {
  url:     'https://YOUR_PROJECT_REF.supabase.co',
  key:     'YOUR_SUPABASE_ANON_KEY',
  siteUrl: 'http://localhost:8000',
};
