/**
 * _worker.js — Cloudflare Pages Advanced Mode Worker
 *
 * Handles ONE route: GET /config.js
 * Injects SUPABASE_URL, SUPABASE_ANON_KEY, and SITE_URL from CF Pages
 * env vars so no secrets ever appear in git.
 *
 * Set in CF Pages → Settings → Environment Variables:
 *   SUPABASE_URL      = https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY = eyJhbGci...
 *   SITE_URL          = https://slm-market.sannan.app
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── Inject runtime config ──────────────────────────────────
    if (url.pathname === '/config.js') {
      const supabaseUrl = env.SUPABASE_URL      || '';
      const supabaseKey = env.SUPABASE_ANON_KEY || '';
      const siteUrl     = env.SITE_URL          || url.origin;

      const isConfigured = supabaseUrl && supabaseKey &&
        !supabaseUrl.includes('YOUR_PROJECT');

      const body = isConfigured
        ? `window.__SLM_CONFIG = { url: "${supabaseUrl}", key: "${supabaseKey}", siteUrl: "${siteUrl}" };`
        : `/* Supabase env vars not set — running in demo mode */\nwindow.__SLM_CONFIG = { url: "", key: "", siteUrl: "${siteUrl}" };`;

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type':  'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Config-Mode': isConfigured ? 'production' : 'demo',
        },
      });
    }

    // ── /docs without trailing slash → redirect ────────────────
    if (url.pathname === '/docs') {
      return Response.redirect(url.origin + '/docs/', 301);
    }

    // ── Everything else → static asset ────────────────────────
    return env.ASSETS.fetch(request);
  },
};
