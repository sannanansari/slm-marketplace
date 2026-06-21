/**
 * config.example.js — COMMIT this file.
 *
 * ─────────────────────────────────────────────────────────────
 *  ON CLOUDFLARE PAGES (production):
 * ─────────────────────────────────────────────────────────────
 *  config.js is served by a Cloudflare Pages Function at
 *  functions/config.js.js — it injects your env vars at the
 *  edge. You do NOT need to create config.js manually.
 *
 *  Set these in CF Pages Dashboard → Settings → Environment Variables:
 *    SUPABASE_URL       = https://xxxx.supabase.co
 *    SUPABASE_ANON_KEY  = eyJhbGci...
 *
 * ─────────────────────────────────────────────────────────────
 *  FOR LOCAL DEVELOPMENT:
 * ─────────────────────────────────────────────────────────────
 *  Option A — wrangler (recommended, mirrors CF Pages exactly):
 *    npm i -g wrangler
 *    Fill in .dev.vars with your real values
 *    wrangler pages dev . --port 8788
 *
 *  Option B — plain static server (demo/mock data only):
 *    cp config.example.js config.js
 *    Fill in config.js with real values (it is gitignored)
 *    python3 -m http.server 8000
 * ─────────────────────────────────────────────────────────────
 */
window.__SLM_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  key: 'YOUR_SUPABASE_ANON_KEY',
};
