/**
 * profile.js
 * Engineer profile page — loads engineer data, renders stats/tabs.
 *
 * SOLID:
 *   S — renderProfileTop, renderStats, loadModelsTab are independent
 *   O — new tabs added without modifying existing render functions
 *   L — each render function can be called standalone (testable)
 *   I — no render function depends on another's output
 *   D — data sourced via loadProfile abstraction, not hardcoded
 */

let currentEngineer = null;

/* ============================================================
   ENTRY POINT
   ============================================================ */
async function initProfilePage() {
  await initHeader({ showSearchBar: true });
  initFooter();

  const username = getEngineerFromURL();
  if (!username) {
    showProfileNotFound();
    return;
  }

  await loadProfile(username);
}

/* ============================================================
   URL PARAM
   ============================================================ */
function getEngineerFromURL() {
  return getParam('user');
}

/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadProfile(username) {
  // Try Supabase first
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      if (!error && data) {
        currentEngineer = data;
        renderAll(data);
        return;
      }
    }
  } catch { /* fall through */ }

  // Mock fallback
  const engineer = MOCK_ENGINEERS.find(e => e.username === username);
  if (!engineer) {
    showProfileNotFound();
    return;
  }
  currentEngineer = engineer;
  renderAll(engineer);
}

/* ============================================================
   RENDER ORCHESTRATOR
   ============================================================ */
function renderAll(engineer) {
  document.title = `${engineer.name} — SLM Marketplace`;
  renderBreadcrumb(engineer);
  renderProfileTop(engineer);
  renderStats(engineer);
  initProfileTabs(engineer);
  loadModelsTab(engineer);   // default tab
  loadSavedModels(engineer);  // H6: show saved models to owner
}

/* ============================================================
   BREADCRUMB
   ============================================================ */
function renderBreadcrumb(engineer) {
  const el = document.getElementById('breadcrumb');
  if (!el) return;
  el.innerHTML = `
    <a href="index.html">Home</a>
    <span class="breadcrumb-sep">›</span>
    <a href="explore.html">Researchers</a>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-current">${sanitize(engineer.username)}</span>
  `;
}

/* ============================================================
   PROFILE TOP
   ============================================================ */
async function renderProfileTop(engineer) {
  const el = document.getElementById('profile-top');
  if (!el) return;

  // M4 fix: Follow button — check if current user follows this engineer
  let followButton = '';
  try {
    const sessionUser = await checkSession();
    if (sessionUser && sessionUser.id !== engineer.id) {
      const client = getSupabaseClient();
      let isFollowing = false;
      if (client) {
        // In a real schema you'd have a follows table; for now use a localStorage flag
        isFollowing = localStorage.getItem(`follow_${engineer.id}`) === '1';
      }
      followButton = `
        <button class="btn btn-secondary btn-sm" id="follow-btn"
          onclick="handleFollow('${engineer.id}', '${engineer.username}')"
          aria-pressed="${isFollowing}">
          ${isFollowing ? '✓ Following' : '+ Follow'}
        </button>`;
    }
  } catch { /* non-blocking */ }

  const verifiedBadge = engineer.is_verified
    ? `<svg class="verified-icon" width="18" height="18" viewBox="0 0 24 24" fill="#3B82F6">
         <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
       </svg>`
    : '';

  const joinYear = engineer.join_date
    ? `Joined ${new Date(engineer.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : '';

  el.innerHTML = `
    <div class="profile-avatar" style="background:${engineer.avatar_color || '#6B7280'}">
      ${(engineer.name || engineer.username)[0].toUpperCase()}
    </div>
    <div class="profile-info">
      <div class="profile-name-row">
        <span class="profile-name">${sanitize(engineer.name)}</span>
        ${verifiedBadge}
      </div>
      <div class="profile-title">${sanitize(engineer.title || '')}</div>
      <div class="profile-meta-row">
        ${engineer.location ? `
          <span class="profile-meta-item">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            ${sanitize(engineer.location)}
          </span>
        ` : ''}
        ${joinYear ? `
          <span class="profile-meta-item">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${sanitize(joinYear)}
          </span>
        ` : ''}
        ${engineer.github_url ? `
          <span class="profile-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            <a href="https://${engineer.github_url}" target="_blank" rel="noopener noreferrer">${sanitize(engineer.github_url)}</a>
          </span>
        ` : ''}
      </div>
      <p class="profile-bio">${sanitize(engineer.bio || '')}</p>
      <div style="margin-top:16px;display:flex;gap:8px">
        ${followButton}
      </div>
    </div>
  `;
}

/* ============================================================
   STATS ROW
   ============================================================ */
function renderStats(engineer) {
  const el = document.getElementById('profile-stats');
  if (!el) return;

  const stats = [
    { value: engineer.model_count,                        label: 'Models' },
    { value: formatNumber(engineer.total_downloads),      label: 'Downloads' },
    { value: (engineer.avg_rating || 0).toFixed(1),       label: 'Average Rating' },
    { value: engineer.review_count,                       label: 'Reviews' },
    { value: engineer.followers,                          label: 'Followers' },
  ];

  el.innerHTML = stats.map(s => `
    <div class="profile-stat-box">
      <span class="profile-stat-value">${s.value}</span>
      <span class="profile-stat-label">${s.label}</span>
    </div>
  `).join('');
}

/* ============================================================
   TABS
   ============================================================ */
function initProfileTabs(engineer) {
  initTabs('#profile-tabs', (tabId) => {
    switch (tabId) {
      case 'models':   loadModelsTab(engineer);   break;
      case 'reviews':  loadReviewsTab(engineer);  break;
      case 'activity': loadActivityTab(engineer); break;
    }
  });
}

/* ============================================================
   MODELS TAB
   ============================================================ */
function loadModelsTab(engineer) {
  const el = document.getElementById('tab-models');
  if (!el) return;

  const models = MOCK_MODELS.filter(m => m.engineer_username === engineer.username);

  if (models.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:40px 0">
        <p class="empty-state-title">No models yet</p>
        <p class="empty-state-desc">This engineer hasn't uploaded any models.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="models-list" style="background:white;border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:0 20px;margin-top:20px">
      ${models.map(m => renderProfileModelRow(m)).join('')}
    </div>
    <button class="view-all-btn" onclick="window.location.href='explore.html?user=${engineer.username}'">
      View all models →
    </button>
  `;
}

function renderProfileModelRow(model) {
  return `
    <div class="model-row" onclick="window.location.href='model.html?id=${model.id}'" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
      ${renderModelIcon(model.title[0], model.category)}
      <div class="model-row-info min-w-0">
        <div class="model-row-name">
          <span class="font-semibold">${sanitize(model.title)}</span>
          ${renderBadge(model.category)}
        </div>
        <div class="model-row-desc">${sanitize(model.short_description)}</div>
      </div>
      <div class="model-row-meta">
        <span class="stat-inline">
          <svg class="star-filled" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span class="stat-value">${model.rating.toFixed(1)}</span>
        </span>
        <span class="stat-inline">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <span>${formatNumber(model.download_count)}</span>
        </span>
        <span class="text-secondary text-sm">${formatDate(model.created_at)}</span>
      </div>
    </div>
  `;
}

/* ============================================================
   REVIEWS TAB
   ============================================================ */
function loadReviewsTab(engineer) {
  const el = document.getElementById('tab-reviews');
  if (!el) return;

  // Reviews on all models by this engineer
  const engineerModelIds = MOCK_MODELS
    .filter(m => m.engineer_username === engineer.username)
    .map(m => m.id);
  const reviews = MOCK_REVIEWS.filter(r => engineerModelIds.includes(r.model_id));

  if (reviews.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:40px 0"><p class="empty-state-title">No reviews yet</p></div>`;
    return;
  }

  el.innerHTML = `
    <div style="padding:16px 0">
      ${reviews.map(r => `
        <div class="review-item">
          <div class="review-header">
            <div class="review-author">
              <div class="review-avatar">${r.user_name[0].toUpperCase()}</div>
              <div>
                <div class="review-name">${sanitize(r.user_name)}</div>
                ${renderStars(r.rating)}
              </div>
            </div>
            <span class="review-date">${formatDate(r.created_at)}</span>
          </div>
          <p class="review-text">${sanitize(r.comment)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

/* ============================================================
   ACTIVITY TAB
   ============================================================ */
async function loadActivityTab(engineer) {
  const el = document.getElementById('tab-activity');
  if (!el) return;

  // H5 fix: try to load real activity from Supabase
  let activities = [];
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client
        .from('activity')
        .select('*')
        .eq('user_id', engineer.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) {
        activities = data.map(a => ({
          text: `${sanitize(a.action_type.replace(/_/g,' '))} <strong>${sanitize(a.target_name || '')}</strong>`,
          time: formatDate(a.created_at),
        }));
      }
    }
  } catch { /* fall through to join event */ }

  if (activities.length === 0) {
    activities = [
      { text: `Joined SLM Marketplace`, time: formatDate(engineer.join_date) },
    ];
  }

  el.innerHTML = `
    <div class="activity-list">
      ${activities.map(a => `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <span class="activity-text">${a.text}</span>
          <span class="activity-time">${a.time}</span>
        </div>
      `).join('')}
    </div>
  `;
}


/* ============================================================
   H6 FIX: Load saved/bookmarked models for the profile owner
   ============================================================ */
async function loadSavedModels(engineer) {
  const user = await checkSession();
  if (!user || user.id !== engineer.id) return; // only show to owner

  try {
    const client = getSupabaseClient();
    if (!client) return;

    const { data, error } = await client
      .from('bookmarks')
      .select('model_id, saved_at, models(*)')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) return;

    // Inject a "Saved Models" section below the stats
    const statsEl = document.getElementById('profile-stats');
    if (!statsEl) return;

    const savedSection = document.createElement('div');
    savedSection.style.cssText = 'margin-top:24px;padding-top:20px;border-top:1px solid var(--color-border)';
    savedSection.innerHTML = `
      <div style="font-size:14px;font-weight:700;color:var(--color-text-primary);margin-bottom:12px">
        Saved Models
        <span style="font-size:12px;font-weight:400;color:var(--color-text-muted);margin-left:6px">${data.length}</span>
      </div>
      <div style="background:white;border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:0 20px">
        ${data.map(b => b.models ? renderProfileModelRow(b.models) : '').join('')}
      </div>
    `;
    statsEl.after(savedSection);
  } catch { /* non-critical */ }
}


/* ============================================================
   M4 FIX: Follow / unfollow engineer
   ============================================================ */
async function handleFollow(engineerId, username) {
  const user = await checkSession();
  if (!user) { window.location.href = 'auth.html'; return; }

  const btn = document.getElementById('follow-btn');
  if (!btn) return;

  const isFollowing = btn.getAttribute('aria-pressed') === 'true';
  const nowFollowing = !isFollowing;

  // Optimistic UI
  btn.textContent = nowFollowing ? '✓ Following' : '+ Follow';
  btn.setAttribute('aria-pressed', String(nowFollowing));

  try {
    const client = getSupabaseClient();
    if (client) {
      if (nowFollowing) {
        await client.rpc('follow_engineer', { target_id: engineerId });
      } else {
        await client.rpc('unfollow_engineer', { target_id: engineerId });
      }
    }
    // Persist locally as fallback
    if (nowFollowing) {
      localStorage.setItem(`follow_${engineerId}`, '1');
    } else {
      localStorage.removeItem(`follow_${engineerId}`);
    }
    showToast(nowFollowing ? `Following @${username}` : `Unfollowed @${username}`, 'success');

    // Update follower count in stats
    const statEls = document.querySelectorAll('.profile-stat-value');
    statEls.forEach(el => {
      const label = el.nextElementSibling;
      if (label && label.textContent.trim() === 'FOLLOWERS') {
        const current = parseInt(el.textContent) || 0;
        el.textContent = nowFollowing ? current + 1 : Math.max(0, current - 1);
      }
    });
  } catch {
    // Revert on error
    btn.textContent = isFollowing ? '✓ Following' : '+ Follow';
    btn.setAttribute('aria-pressed', String(isFollowing));
    showToast('Could not update follow status. Please try again.', 'error');
  }
}

function showProfileNotFound() {
  const wrap = document.querySelector('.profile-wrap');
  if (wrap) {
    wrap.innerHTML = `
      <div class="empty-state" style="padding:80px 0">
        <p class="empty-state-title">Profile not found</p>
        <p class="empty-state-desc">This engineer profile doesn't exist or has been removed.</p>
        <a href="explore.html" class="btn btn-primary" style="margin-top:16px;text-decoration:none">Explore models</a>
      </div>
    `;
  }
}

/* Boot */
initProfilePage();
