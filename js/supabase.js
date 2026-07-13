/**
 * supabase.js
 * Creates the Supabase client from window.__SLM_CONFIG
 * (injected by _worker.js at /config.js on Cloudflare Pages).
 *
 * DIAGNOSTIC: Open browser DevTools → Console to see connection status.
 */
(function () {
  'use strict';

  var _client = null;

  function getConfig() {
    var cfg = window.__SLM_CONFIG;

    // Detailed console diagnostics — helps debug connection issues
    if (!cfg) {
      console.error('[SLM] window.__SLM_CONFIG is undefined. config.js did not load.');
      console.error('[SLM] Fix: make sure the site is deployed as Cloudflare PAGES (not Workers).');
      return null;
    }
    if (!cfg.url || cfg.url === '') {
      console.error('[SLM] SUPABASE_URL is empty. Set it in Cloudflare Pages → Settings → Environment variables.');
      return null;
    }
    if (!cfg.key || cfg.key === '') {
      console.error('[SLM] SUPABASE_ANON_KEY is empty. Set it in Cloudflare Pages → Settings → Environment variables.');
      return null;
    }
    if (cfg.url.includes('YOUR_PROJECT') || cfg.key.includes('YOUR_ANON')) {
      console.error('[SLM] config.js still has placeholder values. Replace with real Supabase credentials.');
      return null;
    }

    console.log('[SLM] Supabase config loaded. URL:', cfg.url.substring(0, 30) + '...');
    return cfg;
  }

  function initSupabase() {
    if (_client) return _client;

    if (typeof window.supabase === 'undefined') {
      console.error('[SLM] Supabase CDN script failed to load. Check internet connection and CSP headers.');
      return null;
    }

    var cfg = getConfig();
    if (!cfg) {
      console.warn('[SLM] Running in demo mode — mock data only, auth disabled.');
      return null;
    }

    _client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: true,
      },
    });

    console.log('[SLM] Supabase client created successfully.');
    return _client;
  }

  function getSupabaseClient() {
    return _client || initSupabase();
  }

  window.initSupabase      = initSupabase;
  window.getSupabaseClient = getSupabaseClient;

  // Init on script execution (after config.js and CDN are both loaded)
  initSupabase();
}());
