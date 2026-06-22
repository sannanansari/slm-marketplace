/**
 * supabase.js
 * Reads window.__SLM_CONFIG (injected by _worker.js at /config.js)
 * and creates the Supabase client once, on demand.
 *
 * Load order in HTML (all defer):
 *   1. config.js   — sets window.__SLM_CONFIG
 *   2. supabase CDN — defines window.supabase
 *   3. supabase.js — reads both, creates client
 *   4. global.js, page.js — use getSupabaseClient()
 *
 * All scripts are defer so they run in DOM order after parse.
 * This file therefore always runs AFTER config.js and supabase CDN.
 */

(function () {
  'use strict';

  let _client = null;

  function getConfig() {
    const cfg = window.__SLM_CONFIG;
    if (!cfg || !cfg.url || !cfg.key ||
        cfg.url.includes('YOUR_PROJECT') || cfg.key.includes('YOUR_ANON') ||
        cfg.url === '' || cfg.key === '') {
      return null;
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
        autoRefreshToken:  true,
        persistSession:    true,
        detectSessionInUrl: true,
        storageKey:        'slm-auth',
        flowType:          'pkce',        // required for OAuth on custom domains
      },
    });
    return _client;
  }

  function getSupabaseClient() {
    return _client || initSupabase();
  }

  window.initSupabase      = initSupabase;
  window.getSupabaseClient = getSupabaseClient;

  // Init immediately — by the time this deferred script runs,
  // config.js and supabase CDN (both earlier in <head>) are already done.
  initSupabase();
})();
