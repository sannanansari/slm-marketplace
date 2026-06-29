/**
 * model.js
 * Model Detail Page — loads model by ID, renders all tabs.
 *
 * SOLID:
 *   S — each render*() function renders exactly one section
 *   O — add new tabs by adding a new load function + tab button (no existing code changes)
 *   L — tab load functions are independently callable
 *   I — each tab renders from the same model object; no god-object required
 *   D — data fetching is isolated in loadModel(); renderers accept plain data
 */

let currentModel = null;

/* ============================================================
   ENTRY POINT
   ============================================================ */
async function initModelPage() {
  await initHeader({ showSearchBar: true });
  initFooter();

  const id = getIdFromURL();
  if (!id) {
    showModelNotFound();
    return;
  }

  await loadModel(id);
  trackView(id);
}

/* ============================================================
   URL PARAM
   ============================================================ */
function getIdFromURL() {
  return getParam('id');
}

/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadModel(id) {
  // Try Supabase; fall back to mock
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('models')
        .select('*, users(name, username, is_verified, avatar_color)')
        .eq('id', id)
        .single();

      if (!error && data) {
        currentModel = data;
        renderAll(data);
        return;
      }
    }
  } catch { /* fall through to mock */ }

  // Mock fallback
  const model = MOCK_MODELS.find(m => String(m.id) === String(id));
  if (!model) {
    showModelNotFound();
    return;
  }
  currentModel = model;
  renderAll(model);
}

/* ============================================================
   RENDER ORCHESTRATOR
   ============================================================ */
function renderAll(model) {
  renderBreadcrumb(model);
  renderHero(model);
  renderButtons(model);
  initModelTabs(model);
  loadOverviewTab(model);   // default active tab
}

/* ============================================================
   REVIEW TAB LABEL UPDATE
   ============================================================ */
async function updateReviewTabLabel(model) {
  let count = 0;
  try {
    const client = getSupabaseClient();
    if (client) {
      const { count: c } = await client
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', model.id);
      count = c || 0;
    } else {
      count = MOCK_REVIEWS.filter(r => r.model_id === model.id).length;
    }
  } catch {
    count = MOCK_REVIEWS.filter(r => r.model_id === model.id).length;
  }
  const btn = document.querySelector('.tab-btn[data-tab="reviews"]');
  if (btn) btn.textContent = `Reviews (${count})`;
}

/* ============================================================
   BREADCRUMB
   ============================================================ */
function renderBreadcrumb(model) {
  const el = document.getElementById('breadcrumb');
  if (!el) return;
  const cfg = getCategoryConfig(model.category);
  el.innerHTML = `
    <a href="index.html">Home</a>
    <span class="breadcrumb-sep">›</span>
    <a href="explore.html">Explore</a>
    <span class="breadcrumb-sep">›</span>
    <a href="explore.html?cat=${model.category}">${cfg.label}</a>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-current">${sanitize(model.title)}</span>
  `;
}

/* ============================================================
   HERO SECTION
   ============================================================ */
function renderHero(model) {
  const el = document.getElementById('model-hero');
  if (!el) return;

  const verifiedBadge = model.is_verified
    ? `<svg class="verified-icon" width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
         <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
       </svg>`
    : '';

  el.innerHTML = `
    ${renderModelIcon(model.title[0], model.category, 'lg')}
    <div class="model-hero-info">
      <div class="model-hero-name">
        ${sanitize(model.title)}
        ${renderBadge(model.category)}
      </div>
      <div class="model-hero-username">
        by <a href="profile.html?user=${model.engineer_username}">@${sanitize(model.engineer_username)}</a>
        ${verifiedBadge}
      </div>
      <p class="model-hero-desc">${sanitize(model.short_description)}</p>
      <div class="model-stats-row">
        <div class="model-stat-item">
          <span class="model-stat-value">
            <svg class="star-filled" width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            ${model.rating.toFixed(1)}
          </span>
          <span class="model-stat-label">Rating</span>
        </div>
        <div class="model-stat-item">
          <span class="model-stat-value">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:#6B7280">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            ${formatNumber(model.download_count)}
          </span>
          <span class="model-stat-label">Downloads</span>
        </div>
        <div class="model-stat-item">
          <span class="model-stat-value">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color:#6B7280">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            ${formatNumber(model.view_count)}
          </span>
          <span class="model-stat-label">Views</span>
        </div>
        <div class="model-stat-item">
          <span class="model-stat-value">${formatDate(model.created_at)}</span>
          <span class="model-stat-label">Updated</span>
        </div>
      </div>
    </div>
    <div class="model-hero-bookmark">
      <button class="bookmark-btn" id="hero-bookmark-btn" onclick="handleBookmarkModel()" aria-label="Save model">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
      </button>
    </div>
  `;
}

/* ============================================================
   ACTION BUTTONS
   ============================================================ */
async function renderButtons(model) {
  const el = document.getElementById('model-actions');
  if (!el) return;

  const githubBtn = model.github_url
    ? `<a href="${sanitize(model.github_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
           <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
         </svg>
         View on GitHub
       </a>`
    : '';

  // M5/M6 fix: show Edit + Delete to model owner only
  let ownerControls = '';
  try {
    const user = await checkSession();
    if (user && (user.id === model.engineer_id || user.email === model.engineer_email)) {
      ownerControls = `
        <a href="upload.html?edit=${model.id}" class="btn btn-secondary">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Edit
        </a>
        <button class="btn btn-secondary" onclick="handleDeleteModel(${model.id})"
          style="color:#DC2626;border-color:#FECACA" aria-label="Delete this model">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
          Delete
        </button>`;
    }
  } catch { /* non-blocking */ }

  el.innerHTML = `
    <button class="btn btn-primary" onclick="handleDownload()">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
      </svg>
      Get Model
    </button>
    ${githubBtn}
    ${ownerControls}
    <button class="btn btn-secondary" onclick="handleReport()">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
      </svg>
      Report
    </button>
  `;
}

async function handleDeleteModel(modelId) {
  const confirmed = window.confirm('Delete this model? This cannot be undone.');
  if (!confirmed) return;
  try {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('models').delete().eq('id', modelId);
      if (error) throw error;
    }
    showToast('Model deleted.', 'success');
    setTimeout(() => { window.location.href = 'explore.html'; }, 1000);
  } catch {
    showToast('Could not delete model. Please try again.', 'error');
  }
}

/* ============================================================
   TAB SYSTEM
   ============================================================ */
function initModelTabs(model) {
  initTabs('#model-tabs', (tabId) => {
    switch (tabId) {
      case 'overview':    loadOverviewTab(model);    break;
      case 'benchmarks':  loadBenchmarksTab(model);  break;
      case 'details':     loadDetailsTab(model);     break;
      case 'reviews':     loadReviewsTab(model);     break;
    }
  });
}

/* ============================================================
   OVERVIEW TAB
   ============================================================ */
function loadOverviewTab(model) {
  const el = document.getElementById('tab-overview');
  if (!el) return;

  const tags = (model.tags || []).map(t =>
    `<span class="tag-pill">${sanitize(t)}</span>`
  ).join('');

  el.innerHTML = `
    <div class="overview-grid">
      <!-- Description + Tags -->
      <div>
        <div class="overview-col-title">Description</div>
        <p class="model-full-desc">${sanitize(model.full_description || model.short_description)}</p>
        <div class="overview-col-title" style="margin-top:16px">Tags</div>
        <div class="model-tags-row">${tags}</div>
      </div>

      <!-- Benchmarks -->
      <div>
        <div class="overview-col-title">Benchmarks</div>
        <table class="bench-table">
          <tr><td>Accuracy</td><td>${model.accuracy ?? '—'}%</td></tr>
          <tr><td>F1 Score</td><td>${model.f1_score ?? '—'}%</td></tr>
          <tr><td>Response Time</td><td>${model.response_time ?? '—'}ms</td></tr>
          <tr><td>Model Size</td><td>${sanitize(model.model_size || '—')}</td></tr>
          <tr><td>Parameters</td><td>${sanitize(model.model_size || '—')}</td></tr>
        </table>
      </div>

      <!-- Links -->
      <div>
        <div class="overview-col-title">Links</div>
        <div class="links-list">
          <div>
            <div class="link-item-label">GitHub Repository</div>
            <div class="link-item-value">
              ${model.github_url
                ? `<a href="${sanitize(model.github_url)}" target="_blank" rel="noopener noreferrer">${sanitize(model.github_url.replace('https://', ''))}</a>`
                : '—'
              }
            </div>
          </div>
          <div>
            <div class="link-item-label">License</div>
            <div class="link-item-value">${sanitize(model.license || 'MIT')}</div>
          </div>
          <div>
            <div class="link-item-label">Base Model</div>
            <div class="link-item-value">${sanitize(model.base_model || '—')}</div>
          </div>
          <div>
            <div class="link-item-label">Languages</div>
            <div class="link-item-value">${sanitize(model.languages || 'English')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   BENCHMARKS TAB
   ============================================================ */
function loadBenchmarksTab(model) {
  const el = document.getElementById('tab-benchmarks');
  if (!el) return;

  const rows = [
    { metric: 'Accuracy',       value: model.accuracy,       unit: '%',  note: 'Document classification accuracy on test set' },
    { metric: 'F1 Score',       value: model.f1_score,       unit: '%',  note: 'Harmonic mean of precision and recall' },
    { metric: 'Response Time',  value: model.response_time,  unit: 'ms', note: 'Average inference latency (CPU, 512 tokens)' },
  ].filter(r => r.value !== undefined);

  el.innerHTML = `
    <div class="benchmarks-full">
      <table class="bench-full-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${sanitize(r.metric)}</td>
              <td class="metric-value">${r.value}${r.unit}</td>
              <td style="color:var(--color-text-secondary);font-size:13px">${sanitize(r.note)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${rows.length === 0 ? '<p style="color:var(--color-text-muted);font-size:14px;padding:24px 0">No benchmark data available.</p>' : ''}
    </div>
  `;
}

/* ============================================================
   DETAILS TAB
   ============================================================ */
function loadDetailsTab(model) {
  const el = document.getElementById('tab-details');
  if (!el) return;

  const details = [
    { label: 'Model Size',      value: model.model_size || '—',     sub: 'Parameter count' },
    { label: 'Context Window',  value: model.context_window || '—', sub: 'Max token length' },
    { label: 'Quantized',       value: model.quantized ? 'Yes' : 'No', sub: model.quantized ? 'INT8 / GGUF' : 'FP32' },
    { label: 'Base Model',      value: model.base_model || '—',     sub: 'Foundation architecture' },
    { label: 'Languages',       value: model.languages || 'English', sub: 'Supported languages' },
    { label: 'License',         value: model.license || 'MIT',      sub: 'Usage license' },
  ];

  el.innerHTML = `
    <div class="details-grid">
      ${details.map(d => `
        <div class="detail-card">
          <div class="detail-card-label">${sanitize(d.label)}</div>
          <div class="detail-card-value">${sanitize(d.value)}</div>
          <div class="detail-card-sub">${sanitize(d.sub)}</div>
        </div>
      `).join('')}
    </div>
    ${model.training_data ? `
      <div style="padding:0 0 24px">
        <div class="overview-col-title" style="margin-bottom:8px">Training Data</div>
        <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6">${sanitize(model.training_data)}</p>
      </div>
    ` : ''}
  `;
}

/* ============================================================
   REVIEWS TAB  (H4 fix: write + read)
   ============================================================ */
async function loadReviewsTab(model) {
  const el = document.getElementById('tab-reviews');
  if (!el) return;

  // Check if current user has already reviewed this model
  let userReviewExists = false;
  let currentUser = null;
  try {
    currentUser = await checkSession();
    if (currentUser) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client
          .from('reviews')
          .select('id')
          .eq('model_id', model.id)
          .eq('user_id', currentUser.id)
          .maybeSingle();
        userReviewExists = !!data;
      }
    }
  } catch { /* non-blocking */ }

  // Fetch reviews
  let reviews = [];
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client
        .from('reviews')
        .select('*, users(name, username)')
        .eq('model_id', model.id)
        .order('created_at', { ascending: false });
      reviews = data || [];
    } else {
      reviews = MOCK_REVIEWS.filter(r => r.model_id === model.id);
    }
  } catch {
    reviews = MOCK_REVIEWS.filter(r => r.model_id === model.id);
  }

  // Write-review form (only for logged-in users who haven't reviewed yet)
  const writeForm = currentUser && !userReviewExists ? `
    <div class="write-review-form" id="write-review-form">
      <div class="overview-col-title" style="margin-bottom:12px">Write a Review</div>
      <div class="star-picker" id="star-picker" role="group" aria-label="Select rating">
        ${[1,2,3,4,5].map(n => `
          <button class="star-pick-btn" data-val="${n}" onclick="pickStar(${n})"
            aria-label="${n} star${n>1?'s':''}" title="${n} star${n>1?'s':''}">
            <svg class="star-empty" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>`).join('')}
        <span id="star-label" style="font-size:13px;color:var(--color-text-muted);margin-left:8px">Select rating</span>
      </div>
      <textarea id="review-comment" class="form-textarea" rows="3"
        placeholder="Share your experience with this model…" maxlength="1000"
        style="margin-top:12px"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary btn-sm" onclick="submitReview(${model.id})">Submit Review</button>
      </div>
    </div>
    <hr style="border:none;border-top:1px solid var(--color-border);margin:20px 0">
  ` : (currentUser ? '<p style="font-size:13px;color:var(--color-text-muted);padding:12px 0">You have already reviewed this model.</p><hr style="border:none;border-top:1px solid var(--color-border);margin:8px 0 20px">' : `
    <p style="font-size:13px;color:var(--color-text-secondary);padding:12px 0">
      <a href="auth.html" style="color:var(--color-primary);font-weight:500">Sign in</a> to write a review.
    </p>
    <hr style="border:none;border-top:1px solid var(--color-border);margin:8px 0 20px">
  `);

  const reviewList = reviews.length === 0
    ? `<div class="empty-state" style="padding:24px 0"><p class="empty-state-title">No reviews yet</p><p class="empty-state-desc">Be the first to review this model.</p></div>`
    : reviews.map(r => {
        const name = r.users?.name || r.user_name || 'Anonymous';
        return `
          <div class="review-item">
            <div class="review-header">
              <div class="review-author">
                <div class="review-avatar">${name[0].toUpperCase()}</div>
                <div>
                  <div class="review-name">${sanitize(name)}</div>
                  ${renderStars(r.rating)}
                </div>
              </div>
              <span class="review-date">${formatDate(r.created_at)}</span>
            </div>
            <p class="review-text">${sanitize(r.comment || '')}</p>
          </div>`;
      }).join('');

  el.innerHTML = `<div class="reviews-section">${writeForm}${reviewList}</div>`;
}

// Star picker state
let selectedStarRating = 0;

function pickStar(val) {
  selectedStarRating = val;
  document.querySelectorAll('.star-pick-btn').forEach((btn, i) => {
    const svg = btn.querySelector('svg');
    svg.className.baseVal = i < val ? 'star-filled' : 'star-empty';
  });
  const label = document.getElementById('star-label');
  if (label) label.textContent = val + ' star' + (val > 1 ? 's' : '');
}

async function submitReview(modelId) {
  if (!selectedStarRating) { showToast('Please select a star rating.', 'info'); return; }
  const comment = document.getElementById('review-comment')?.value.trim() || '';

  const user = await checkSession();
  if (!user) { window.location.href = 'auth.html'; return; }

  try {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('reviews').insert([{
        model_id: modelId,
        user_id: user.id,
        rating: selectedStarRating,
        comment,
        created_at: new Date().toISOString(),
      }]);
      if (error) throw error;
    }
    showToast('Review submitted. Thank you!', 'success');
    // Reload the tab with the new review visible
    if (currentModel) {
      selectedStarRating = 0;
      loadReviewsTab(currentModel);
      updateReviewTabLabel(currentModel);
    }
  } catch (err) {
    const msg = err?.message?.includes('unique') ? 'You have already reviewed this model.' : 'Could not submit review. Please try again.';
    showToast(msg, 'error');
  }
}

/* ============================================================
   DOWNLOAD + BOOKMARK + REPORT + VIEW TRACK
   ============================================================ */
async function handleDownload() {
  if (!currentModel) return;

  // Use atomic RPC + activity log
  try {
    const client = getSupabaseClient();
    if (client) {
      // M1 fix: atomic increment via RPC
      await client.rpc('increment_download_count', { model_id: Number(currentModel.id) });
      // M7 fix: log activity
      const user = await checkSession();
      if (user) {
        await client.from('activity').insert([{
          user_id: user.id,
          action_type: 'download',
          target_id: currentModel.id,
          target_name: currentModel.title,
          created_at: new Date().toISOString(),
        }]).catch(() => {});
      }
    }
  } catch { /* non-blocking */ }

  if (currentModel.github_url) {
    window.open(currentModel.github_url, '_blank', 'noopener,noreferrer');
  }
  showToast('Opening repository…', 'success');
}

async function handleBookmarkModel() {
  const user = await checkSession();
  if (!user) {
    showToast('Sign in to save models', 'info');
    return;
  }
  const btn = document.getElementById('hero-bookmark-btn');
  if (!btn) return;
  const saved = btn.classList.toggle('saved');
  btn.innerHTML = saved
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>`
    : `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>`;
  showToast(saved ? 'Model saved' : 'Removed from saved', 'success');
}

function handleReport() {
  showToast('Report submitted. Thank you.', 'info');
}

async function trackView(id) {
  // M1 fix: one view per session per model, skip bots
  const botUA = /bot|crawl|spider|slurp|facebookexternalhit/i.test(navigator.userAgent);
  if (botUA) return;

  const sessionKey = `viewed_model_${id}`;
  if (sessionStorage.getItem(sessionKey)) return; // already counted this session
  sessionStorage.setItem(sessionKey, '1');

  try {
    const client = getSupabaseClient();
    if (client && id) {
      // Use Supabase RPC to increment atomically (avoids read-then-write race)
      await client.rpc('increment_view_count', { model_id: Number(id) });
    }
  } catch { /* non-blocking */ }
}

function showModelNotFound() {
  const main = document.querySelector('.model-detail-wrap');
  if (main) {
    main.innerHTML = `
      <div class="empty-state" style="padding:80px 0">
        <div class="empty-state-icon">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <p class="empty-state-title">Model not found</p>
        <p class="empty-state-desc">This model may have been removed or the link is invalid.</p>
        <a href="explore.html" class="btn btn-primary" style="margin-top:16px;text-decoration:none">Browse models</a>
      </div>
    `;
  }
}

/* Boot */
initModelPage();
