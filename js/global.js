/**
 * global.js — Shared utilities, IIFE-wrapped to prevent global scope pollution.
 * Only the minimum surface is exported to window for cross-script access.
 */
(function (window) {
  'use strict';

  /* ============================================================
     CONSTANTS
     ============================================================ */
  const CATEGORY_CONFIG = {
    legal:        { color: '#16A34A', bg: '#DCFCE7', text: '#166534', label: 'Legal' },
    healthcare:   { color: '#2563EB', bg: '#DBEAFE', text: '#1E40AF', label: 'Healthcare' },
    coding:       { color: '#D97706', bg: '#FEF3C7', text: '#92400E', label: 'Coding' },
    finance:      { color: '#7C3AED', bg: '#EDE9FE', text: '#5B21B6', label: 'Finance' },
    general:      { color: '#6B7280', bg: '#F3F4F6', text: '#374151', label: 'General' },
    education:    { color: '#DB2777', bg: '#FCE7F3', text: '#9D174D', label: 'Education' },
    multilingual: { color: '#0D9488', bg: '#CCFBF1', text: '#134E4A', label: 'Multilingual' },
    security:     { color: '#DC2626', bg: '#FEE2E2', text: '#991B1B', label: 'Security' },
  };

  const NAV_LINKS = [
    { href: 'explore.html',     label: 'Explore',      id: 'explore' },
    { href: 'index.html',       label: 'Categories',   id: 'categories' },
    { href: 'leaderboard.html', label: 'Leaderboard',  id: 'leaderboard' },
    { href: 'upload.html',      label: 'Upload Model', id: 'upload' },
    { href: 'docs/',            label: 'Docs',          id: 'docs' },
  ];

  /* ============================================================
     MOCK DATA (dev/fallback only — stripped in prod via config)
     ============================================================ */
  const MOCK_MODELS = [
    { id: 1, title: 'Legal-SLM-3B', category: 'legal', short_description: 'Specialized in legal document analysis and Q&A.', full_description: 'Legal-SLM-3B is a small language model fine-tuned for legal NLP tasks including document analysis, entity extraction, contract review, compliance checking, and legal question answering.', engineer_username: 'legalmind', engineer_name: 'Alex Chen', rating: 4.8, download_count: 8100, view_count: 15000, tags: ['Legal', 'Contracts', 'Compliance', 'Multilingual'], accuracy: 92.5, f1_score: 90.8, response_time: 120, model_size: '3B', context_window: '8K tokens', quantized: true, base_model: 'TinyLlama', languages: 'English', license: 'Apache 2.0', github_url: 'https://github.com/legalmind/Legal-SLM-3B', created_at: new Date(Date.now() - 5*86400000).toISOString(), is_verified: true },
    { id: 2, title: 'Med-SLM-4B', category: 'healthcare', short_description: 'Medical assistant model for clinical notes and patient Q&A.', engineer_username: 'health_ai', engineer_name: 'Sara Lin', rating: 4.7, download_count: 15700, view_count: 28000, tags: ['Medical', 'Healthcare', 'QA', 'Clinical'], accuracy: 91.0, f1_score: 89.2, response_time: 135, model_size: '4B', context_window: '12K tokens', quantized: false, base_model: 'Phi-2', languages: 'English', license: 'MIT', github_url: 'https://github.com/health_ai/Med-SLM-4B', created_at: new Date(Date.now() - 7*86400000).toISOString(), is_verified: false },
    { id: 3, title: 'TinyCoder-1B', category: 'coding', short_description: 'Lightweight code generation model.', engineer_username: 'coder_ai', engineer_name: 'Priya Nair', rating: 4.9, download_count: 5200, view_count: 9800, tags: ['Code', 'Python', 'Generation'], accuracy: 88.5, f1_score: 87.1, response_time: 80, model_size: '1B', context_window: '4K tokens', quantized: true, base_model: 'CodeLlama', languages: 'Python, JS, Go', license: 'Apache 2.0', github_url: 'https://github.com/coder_ai/TinyCoder-1B', created_at: new Date(Date.now() - 7*86400000).toISOString(), is_verified: true },
    { id: 4, title: 'FinGPT-SLM-3B', category: 'finance', short_description: 'Financial texts, reports and market analysis assistant.', engineer_username: 'fin_engineer', engineer_name: 'James Wu', rating: 4.5, download_count: 6300, view_count: 11200, tags: ['Finance', 'NLP', 'Analysis'], accuracy: 89.0, f1_score: 87.5, response_time: 110, model_size: '3B', context_window: '8K tokens', quantized: false, base_model: 'Mistral', languages: 'English', license: 'CC BY 4.0', github_url: 'https://github.com/fin_engineer/FinGPT-SLM-3B', created_at: new Date(Date.now() - 14*86400000).toISOString(), is_verified: false },
    { id: 5, title: 'MultiLingual-1B', category: 'multilingual', short_description: 'Multilingual model supporting 50+ languages.', engineer_username: 'polyglot_ai', engineer_name: 'Maria Santos', rating: 4.4, download_count: 5100, view_count: 8900, tags: ['Multilingual', 'NLP', 'Translation'], accuracy: 85.0, f1_score: 83.7, response_time: 150, model_size: '1B', context_window: '6K tokens', quantized: true, base_model: 'mBERT', languages: '50+ languages', license: 'MIT', github_url: 'https://github.com/polyglot_ai/MultiLingual-1B', created_at: new Date(Date.now() - 14*86400000).toISOString(), is_verified: false },
    { id: 6, title: 'SecureBot-2B', category: 'security', short_description: 'Cybersecurity assistant for threat analysis and detection.', engineer_username: 'sec_researcher', engineer_name: 'David Kim', rating: 4.6, download_count: 3800, view_count: 7200, tags: ['Security', 'Threat Analysis', 'SIEM'], accuracy: 90.2, f1_score: 88.9, response_time: 95, model_size: '2B', context_window: '8K tokens', quantized: true, base_model: 'Falcon', languages: 'English', license: 'Apache 2.0', github_url: 'https://github.com/sec_researcher/SecureBot-2B', created_at: new Date(Date.now() - 21*86400000).toISOString(), is_verified: true },
  ];

  const MOCK_ENGINEERS = [
    { id: 1, username: 'legalmind',    name: 'Alex Chen',    title: 'Legal AI Engineer',          location: 'USA',       github_url: 'github.com/legalmind',    join_date: '2024-01-15', bio: 'Building specialized AI models for the legal domain. Passionate about making legal information accessible to everyone.', model_count: 12, total_downloads: 52600, avg_rating: 4.9, review_count: 128, followers: 16, score: 1245, is_verified: true,  avatar_color: '#16A34A' },
    { id: 2, username: 'coder_ai',     name: 'Priya Nair',   title: 'ML Engineer',                location: 'India',     github_url: 'github.com/coder_ai',     join_date: '2024-02-10', bio: 'Focused on efficient code generation models. Open source contributor.',                                                  model_count: 9,  total_downloads: 41300, avg_rating: 4.8, review_count: 95,  followers: 12, score: 1098, is_verified: true,  avatar_color: '#D97706' },
    { id: 3, username: 'health_ai',    name: 'Sara Lin',     title: 'Healthcare AI Researcher',   location: 'UK',        github_url: 'github.com/health_ai',    join_date: '2024-03-01', bio: 'Medical NLP researcher focused on clinical applications.',                                                               model_count: 8,  total_downloads: 32500, avg_rating: 4.7, review_count: 74,  followers: 9,  score: 987,  is_verified: false, avatar_color: '#2563EB' },
    { id: 4, username: 'fin_engineer', name: 'James Wu',     title: 'Quant AI Engineer',          location: 'Singapore', github_url: 'github.com/fin_engineer', join_date: '2024-01-28', bio: 'Financial AI specialist. Building models for markets and analysis.',                                                     model_count: 7,  total_downloads: 28700, avg_rating: 4.6, review_count: 61,  followers: 8,  score: 865,  is_verified: false, avatar_color: '#7C3AED' },
    { id: 5, username: 'polyglot_ai',  name: 'Maria Santos', title: 'Multilingual NLP Engineer',  location: 'Brazil',    github_url: 'github.com/polyglot_ai',  join_date: '2024-04-05', bio: 'Championing language diversity in AI. Building for underrepresented languages.',                                       model_count: 6,  total_downloads: 21400, avg_rating: 4.6, review_count: 48,  followers: 7,  score: 732,  is_verified: false, avatar_color: '#0D9488' },
  ];

  const MOCK_REVIEWS = [
    { id: 1, model_id: 1, user_name: 'techlaw_pro',   rating: 5, comment: 'Excellent model for contract review. Handles complex clauses accurately.',                               created_at: new Date(Date.now() - 2*86400000).toISOString() },
    { id: 2, model_id: 1, user_name: 'legal_startup', rating: 5, comment: 'Integrated this into our compliance pipeline. Accuracy is impressive.',                                 created_at: new Date(Date.now() - 4*86400000).toISOString() },
    { id: 3, model_id: 1, user_name: 'jd_engineer',   rating: 4, comment: 'Very good for document summarization. Occasionally misses nuance in ambiguous clauses.',               created_at: new Date(Date.now() - 6*86400000).toISOString() },
  ];

  /* ============================================================
     FORMAT UTILITIES
     ============================================================ */
  function formatNumber(n) {
    if (typeof n !== 'number' || isNaN(n)) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const diff  = Date.now() - new Date(isoString).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days} day${days > 1 ? 's' : ''} ago`;
    if (weeks < 5)  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }

  function getCategoryConfig(category) {
    return CATEGORY_CONFIG[category?.toLowerCase()] || CATEGORY_CONFIG.general;
  }

  function renderBadge(category) {
    const cfg = getCategoryConfig(category);
    return `<span class="badge" style="background:${cfg.bg};color:${cfg.text}">${cfg.label}</span>`;
  }

  function renderModelIcon(letter, category, size) {
    const cfg = getCategoryConfig(category);
    const sizeClass = size ? `model-icon-${size}` : '';
    return `<div class="model-icon ${sizeClass}" style="background:${cfg.color}" aria-hidden="true">${(letter || '?').toUpperCase()}</div>`;
  }

  function renderStars(rating) {
    const filled = Math.round(rating);
    let html = '<span class="stars-display" aria-label="' + rating.toFixed(1) + ' out of 5 stars">';
    for (let i = 1; i <= 5; i++) {
      html += `<svg class="${i <= filled ? 'star-filled' : 'star-empty'}" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
    }
    return html + '</span>';
  }

  /** Strip HTML tags — prevents stored XSS when injecting into innerHTML */
  function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay || 300);
    };
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /* ============================================================
     OPEN REDIRECT GUARD
     ============================================================ */
  const ALLOWED_REDIRECT_PATHS = [
    'index.html', 'explore.html', 'model.html',
    'profile.html', 'upload.html', 'leaderboard.html', '/',
  ];

  function safeRedirect(rawRedirect, fallback) {
    fallback = fallback || 'index.html';
    if (!rawRedirect) return fallback;
    // Must be a relative path — block anything with :// or leading //
    if (/^(https?:)?\/\//.test(rawRedirect)) return fallback;
    // Must start with / or be a known page
    const base = rawRedirect.split('?')[0].replace(/^\//, '');
    if (ALLOWED_REDIRECT_PATHS.some(p => base === p || base === p.replace('.html', ''))) {
      return rawRedirect;
    }
    return fallback;
  }

  /* ============================================================
     SESSION / AUTH
     ============================================================ */
  async function checkSession() {
    try {
      const client = getSupabaseClient();
      if (!client) return null;
      const { data: { session } } = await client.auth.getSession();
      return session?.user ?? null;
    } catch {
      return null;
    }
  }

  async function requireAuth() {
    const user = await checkSession();
    if (!user) {
      window.location.href = `auth.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    return user;
  }

  /* ============================================================
     HEADER
     ============================================================ */
  function getActivePage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    if (path === 'explore.html')     return 'explore';
    if (path === 'leaderboard.html') return 'leaderboard';
    if (path === 'upload.html')      return 'upload';
    return 'categories';
  }

  /* ============================================================
     L5 FIX: Page loading state — body gets class 'js-loading'
     until header init completes, then it's removed.
     CSS can use this to suppress FOUC.
     ============================================================ */
  document.documentElement.classList.add('js-loading');

  async function initHeader(opts) {
    const showSearchBar = (opts && opts.showSearchBar) || false;
    let user = null;
    try { user = await checkSession(); } catch { /* non-blocking */ }

    const activePage = getActivePage();

    const navLinks = NAV_LINKS.map(link => {
      const isActive = link.id === activePage;
      return `<a href="${link.href}" class="nav-link ${isActive ? 'active' : ''}"${isActive ? ' aria-current="page"' : ''}>${link.label}</a>`;
    }).join('');

    const authSection = user
      ? `<div class="user-avatar" title="${sanitize(user.email)}" role="img" aria-label="Your account">${(user.email || 'U')[0].toUpperCase()}</div>`
      : `<a href="auth.html" class="btn btn-primary btn-sm">Sign Up</a>`;

    const searchSection = showSearchBar
      ? `<div class="header-search-bar">
           <svg class="header-search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
             <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
           </svg>
           <input type="search" id="header-search-input" placeholder="Search models, use cases, tags…" autocomplete="off" aria-label="Search models">
         </div>`
      : `<button class="header-search-btn" id="header-search-btn" aria-label="Search models">
           <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
             <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
           </svg>
         </button>`;

    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="header-inner">
        <a href="index.html" class="site-logo" aria-label="SLM Marketplace home">
          <span class="logo-mark" aria-hidden="true">SLM</span>
          <span class="logo-text">Marketplace</span>
        </a>
        <nav class="header-nav" aria-label="Main navigation">${navLinks}</nav>
        ${searchSection}
        <div class="header-actions">${authSection}</div>
      </div>
    `;
    document.body.prepend(header);

    // Skip nav link (a11y) — inserted before header
    const skip = document.createElement('a');
    skip.href = '#main-content';
    skip.className = 'skip-nav';
    skip.textContent = 'Skip to main content';
    document.body.insertBefore(skip, header);

    const searchInput = document.getElementById('header-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleSearch(e.target.value);
      });
      const q = getParam('q');
      if (q) searchInput.value = q;
    }
    const searchBtn = document.getElementById('header-search-btn');
    if (searchBtn) searchBtn.addEventListener('click', () => { window.location.href = 'explore.html'; });

    // L5: reveal page now that header is injected
    document.documentElement.classList.remove('js-loading');
  }

  function handleSearch(query) {
    const q = (query || '').trim();
    if (!q) return;
    window.location.href = `explore.html?q=${encodeURIComponent(q)}`;
  }

  /* ============================================================
     FOOTER
     ============================================================ */
  function initFooter() {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <a href="index.html" class="site-logo" aria-label="SLM Marketplace home">
          <span class="logo-mark" aria-hidden="true">SLM</span>
          <span class="logo-text">Marketplace</span>
        </a>
        <nav class="footer-links" aria-label="Footer links">
          <a href="explore.html">Explore</a>
          <a href="leaderboard.html">Leaderboard</a>
          <a href="upload.html">Upload Model</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </nav>
        <span class="footer-copy">© ${new Date().getFullYear()} SLM Marketplace</span>
      </div>
    `;
    document.body.append(footer);
  }

  /* ============================================================
     TOAST
     ============================================================ */
  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.append(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span aria-hidden="true">${icons[type] || '·'}</span><span>${sanitize(message)}</span>`;
    container.append(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  /* ============================================================
     TABS
     ============================================================ */
  function initTabs(barSelector, onSwitch) {
    const bar = document.querySelector(barSelector);
    if (!bar) return;
    bar.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const panelId = btn.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById('tab-' + panelId);
        if (panel) panel.classList.add('active');
        if (onSwitch) onSwitch(panelId);
      });
    });
  }

  /* ============================================================
     EXPOSE PUBLIC API (minimal surface)
     ============================================================ */
  const exports = {
    // Formatting
    formatNumber, formatDate, getCategoryConfig,
    renderBadge, renderModelIcon, renderStars, sanitize,
    debounce, getParam, safeRedirect,
    // Auth
    checkSession, requireAuth,
    // UI
    initHeader, initFooter, handleSearch, showToast, initTabs,
    // Mock data (available even in prod as fallback)
    MOCK_MODELS, MOCK_ENGINEERS, MOCK_REVIEWS,
  };

  Object.assign(window, exports);

}(window));
