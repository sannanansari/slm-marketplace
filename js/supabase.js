/**
 * supabase.js
 * Creates the Supabase client from window.__SLM_CONFIG
 * (injected by _worker.js at /config.js).
 *
 * KEY FIXES:
 *   - No custom storageKey (use Supabase default: sb-PROJECT-auth-token)
 *   - No flowType override (Supabase auto-selects correct flow)
 *   - detectSessionInUrl: true handles OAuth ?code= callbacks
 *   - persistSession: true keeps user logged in across page loads
 */
(function () {
  'use strict';

  let _client = null;

  function getConfig() {
    const cfg = window.__SLM_CONFIG;
    if (!cfg || !cfg.url || !cfg.key ||
        cfg.url === '' || cfg.key === '' ||
        cfg.url.includes('YOUR_PROJECT') || cfg.key.includes('YOUR_ANON')) {
      return null; // not configured — mock data mode
    }
    return cfg;
  }

  function initSupabase() {
    if (_client) return _client;
    if (typeof window.supabase === 'undefined') return null;
    const cfg = getConfig();
    if (!cfg) return null;

    _client = window.supabase.createClient(cfg.url, cfg.key, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: true,
        // NO custom storageKey — use Supabase default
        // NO flowType override — Supabase picks correct one automatically
      },
    });
    return _client;
  }

  function getSupabaseClient() {
    return _client || initSupabase();
  }

  window.initSupabase      = initSupabase;
  window.getSupabaseClient = getSupabaseClient;

  // Runs synchronously when this deferred script executes.
  // By this point: config.js and supabase CDN are both done (they are sync).
  initSupabase();
})();
