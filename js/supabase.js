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

  let client = null;

  function getConfig() {
    const cfg = window.__SLM_CONFIG;

    if (!cfg) {
      console.error('Supabase config not found');
      return null;
    }

    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.error('Supabase config incomplete');
      return null;
    }

    return cfg;
  }

  function initSupabase() {
    if (client) {
      return client;
    }

    const cfg = getConfig();

    if (!cfg) {
      return null;
    }

    if (typeof supabase === 'undefined') {
      console.error('Supabase SDK not loaded');
      return null;
    }

    client = supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );

    return client;
  }

  function getSupabaseClient() {
    return client || initSupabase();
  }

  window.initSupabase = initSupabase;
  window.getSupabaseClient = getSupabaseClient;

  initSupabase();
})();
