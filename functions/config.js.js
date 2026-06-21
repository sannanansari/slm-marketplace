/**
 * functions/config.js.js
 * Cloudflare Pages Function that serves /config.js at runtime.
 * Injects SUPABASE_URL and SUPABASE_ANON_KEY from CF Pages env vars
 * so the anon key is NEVER in git or the static bundle.
 *
 * Set these in: CF Pages Dashboard → Settings → Environment Variables
 *   SUPABASE_URL       = https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY  = eyJhbGci...
 *
 * This function runs at the edge on every request for /config.js.
 * It is NOT cached — the config is always fresh.
 */
export async function onRequest(context) {
  const { env } = context;

  const url  = env.SUPABASE_URL        || '';
  const key  = env.SUPABASE_ANON_KEY   || '';

  if (!url || !key) {
    // Return a no-op config so the site still works in demo mode
    return new Response(
      '/* Supabase not configured — running in demo mode */\nwindow.__SLM_CONFIG = { url: "", key: "" };',
      {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Config-Source': 'cf-function',
        },
      }
    );
  }

  const body = `window.__SLM_CONFIG = { url: "${url}", key: "${key}" };`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Config-Source': 'cf-function',
    },
  });
}
