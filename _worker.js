/**
 * _worker.js — Cloudflare Pages Advanced Mode Worker
 *
 * This handles ONE route: GET /config.js
 * It injects SUPABASE_URL and SUPABASE_ANON_KEY from CF Pages env vars
 * so the Supabase key is never in git.
 *
 * Everything else is passed through to static assets normally.
 *
 * Set env vars in: CF Pages → Settings → Environment Variables
 *   SUPABASE_URL      = https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY = eyJhbGci...
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Intercept only /config.js
    if (url.pathname === '/config.js') {
      const supabaseUrl = env.SUPABASE_URL      || '';
      const supabaseKey = env.SUPABASE_ANON_KEY || '';

      const body = supabaseUrl && supabaseKey
        ? `window.__SLM_CONFIG = { url: "${supabaseUrl}", key: "${supabaseKey}" };`
        : `/* Supabase env vars not set — running in demo mode */\nwindow.__SLM_CONFIG = { url: "", key: "" };`;

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type':  'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Config-Mode': supabaseUrl ? 'production' : 'demo',
        },
      });
    }

    // /docs without trailing slash → redirect to /docs/
    if (url.pathname === '/docs') {
      return Response.redirect(url.origin + '/docs/', 301);
    }

    // Everything else → serve static asset normally
    return env.ASSETS.fetch(request);
  },
};
