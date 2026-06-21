/**
 * supabase.js — Production-safe Supabase client.
 *
 * CREDENTIALS: Never hardcode keys here.
 * Set these as environment variables in your host:
 *   Vercel:  Settings → Environment Variables
 *   Netlify: Site settings → Environment variables
 *   CF Pages: Settings → Environment variables
 *
 * For local dev, create a .env file (never commit it):
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY=eyJ...
 *
 * For Vanilla JS static sites (no build step), we use a
 * runtime config file (config.js) that IS gitignored:
 *   window.__SLM_CONFIG = { url: '...', key: '...' }
 *
 * config.js is loaded before this file in each HTML page.
 * config.example.js is committed as a safe template.
 */

(function () {
  'use strict';

  let _client = null;

  function getConfig() {
    const cfg = window.__SLM_CONFIG;
    if (!cfg || !cfg.url || cfg.url.includes('YOUR_PROJECT') ||
        !cfg.key || cfg.key.includes('YOUR_ANON')) {
      return null;   // not configured — fall back to mock data
    }
    return cfg;
  }

  function initSupabase() {
    if (_client) return _client;
    const cfg = getConfig();
    if (!cfg) return null;
    if (typeof supabase === 'undefined') {
      return null;
    }
    _client = supabase.createClient(cfg.url, cfg.key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    return _client;
  }

  function getSupabaseClient() {
    return _client || initSupabase();
  }

  // Expose to global scope (needed by other scripts on same page)
  window.initSupabase      = initSupabase;
  window.getSupabaseClient = getSupabaseClient;

  initSupabase();
})();
