/**
 * home.js
 * Homepage: loads recent models, category tab filters.
 * Uses mock data; swap for Supabase calls by replacing load functions.
 */

/* Active category filter state */
let activeCategory = 'all';

/**
 * Entry point.
 */
async function initHomePage() {
  await initHeader({ showSearchBar: false });
  initFooter();

  loadCategories();
  loadRecentModels();

  // Hero search
  const heroForm = document.getElementById('hero-search-form');
  if (heroForm) {
    heroForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = document.getElementById('hero-search-input').value.trim();
      handleSearch(q);
    });
  }
}

/**
 * Render the category pill tabs with model counts.
 */
function loadCategories() {
  const counts = {};
  MOCK_MODELS.forEach(m => {
    counts[m.category] = (counts[m.category] || 0) + 1;
  });

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'legal', label: 'Legal' },
    { id: 'coding', label: 'Coding' },
    { id: 'finance', label: 'Finance' },
    { id: 'general', label: 'General' },
    { id: 'education', label: 'Education' },
    { id: 'multilingual', label: 'Multilingual' },
    { id: 'security', label: 'Security' },
  ];

  const container = document.getElementById('category-tabs');
  if (!container) return;

  container.innerHTML = tabs.map(t => {
    const count = t.id === 'all' ? MOCK_MODELS.length : (counts[t.id] || 0);
    return `
      <button class="cat-tab ${t.id === activeCategory ? 'active' : ''}"
              data-cat="${t.id}"
              onclick="handleCategoryTab('${t.id}')">
        ${t.label}
      </button>
    `;
  }).join('');
}

/**
 * Handle a category tab click.
 */
function handleCategoryTab(category) {
  activeCategory = category;
  // Update active state
  document.querySelectorAll('.cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === category);
  });
  loadRecentModels();
}

/**
 * Load and render the recent models list (filtered by activeCategory).
 */
function loadRecentModels() {
  const container = document.getElementById('models-list');
  if (!container) return;

  container.innerHTML = renderSkeletonRows(6);

  // L2 fix: no artificial delay
  (function() {
    let models = [...MOCK_MODELS];
    if (activeCategory !== 'all') {
      models = models.filter(m => m.category === activeCategory);
    }
    models = models.slice(0, 6);

    if (models.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <div class="empty-state-icon">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="empty-state-title">No models found</p>
          <p class="empty-state-desc">No models in this category yet. Be the first to upload one.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = models.map(renderModelRow).join('');
  }());
}

/**
 * Render a single model list row.
 */
function renderModelRow(model) {
  return `
    <div class="model-row" onclick="window.location.href='model.html?id=${model.id}'" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
      ${renderModelIcon(model.title[0], model.category)}
      <div class="model-row-info min-w-0">
        <div class="model-row-name">
          <span class="font-semibold">${sanitize(model.title)}</span>
          ${renderBadge(model.category)}
        </div>
        <div class="model-row-username">by @${sanitize(model.engineer_username)}</div>
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

/**
 * Skeleton rows while loading.
 */
function renderSkeletonRows(count) {
  return Array.from({ length: count }, () => `
    <div class="model-row" style="pointer-events:none">
      <div class="skeleton" style="width:40px;height:40px;border-radius:8px;flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div class="skeleton skeleton-text" style="width:160px"></div>
        <div class="skeleton skeleton-text-sm"></div>
      </div>
      <div class="skeleton skeleton-text" style="width:80px"></div>
    </div>
  `).join('');
}

/* Boot */
document.addEventListener('DOMContentLoaded', initHomePage);
