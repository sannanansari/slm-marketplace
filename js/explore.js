/**
 * explore.js
 * Explore page: search, filter, sort, paginate model cards.
 *
 * SOLID:
 *   S — buildFilterQuery, renderCards, updateResultCount are each one job
 *   O — add new filter types without touching existing ones
 *   L — all filter handlers are interchangeable; they all call loadModels()
 *   I — UI handlers are isolated; Supabase layer is isolated
 *   D — loadModels depends on buildFilterQuery abstraction, not raw DOM reads
 */

/* ============================================================
   STATE
   ============================================================ */
const state = {
  query: '',
  categories: [],          // array of selected category slugs
  minRating: 0,
  dateRange: 'any',
  sortField: 'created_at',
  sortDir: 'desc',
  page: 1,
  pageSize: 10,
  totalCount: 0,
};

const ITEMS_PER_PAGE = 10;

/* ============================================================
   ENTRY POINT
   ============================================================ */
async function initExplorePage() {
  await initHeader({ showSearchBar: true });
  initFooter();

  // Read ?q= param from URL and pre-populate
  const q = getParam('q');
  if (q) {
    state.query = q;
    const input = document.getElementById('header-search-input');
    if (input) input.value = q;
  }

  // Read ?cat= param
  const cat = getParam('cat');
  if (cat) {
    state.categories = [cat];
    const cb = document.querySelector(`input[data-cat="${cat}"]`);
    if (cb) cb.checked = true;
  }

  wireFilters();
  loadModels();
  loadCategoryCounts(); // B5: update sidebar counts from DB
}

/* ============================================================
   WIRE ALL FILTER EVENTS (Single setup, not per-handler)
   ============================================================ */

/* ============================================================
   B5 FIX: Load real category counts from DB into sidebar
   ============================================================ */
async function loadCategoryCounts() {
  try {
    const client = getSupabaseClient();
    if (!client) return; // keep hardcoded HTML as fallback

    const { data, error } = await client
      .from('models')
      .select('category')
      .eq('status', 'published');

    if (error || !data) return;

    // Tally counts
    const counts = {};
    let total = 0;
    data.forEach(({ category }) => {
      counts[category] = (counts[category] || 0) + 1;
      total++;
    });

    // Update DOM
    const allEl = document.querySelector('.check-count[data-cat-count="all"]') ||
                  document.querySelector('#cat-all ~ label .check-count');
    if (allEl) allEl.textContent = total;

    Object.entries(counts).forEach(([cat, n]) => {
      const el = document.querySelector(`#cat-${cat} ~ label .check-count`);
      if (el) el.textContent = n;
    });
  } catch { /* non-critical — hardcoded fallback stays visible */ }
}

function wireFilters() {
  // Header search (debounced)
  const searchInput = document.getElementById('header-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(e => {
      state.query = e.target.value.trim();
      state.page = 1;
      loadModels();
    }, 400));
  }

  // Category checkboxes
  document.querySelectorAll('.cat-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      handleCategoryFilter(cb.dataset.cat, cb.checked);
    });
  });

  // Rating radios
  document.querySelectorAll('.rating-radio').forEach(r => {
    r.addEventListener('change', () => {
      state.minRating = parseFloat(r.value);
      state.page = 1;
      loadModels();
    });
  });

  // Date radios
  document.querySelectorAll('.date-radio').forEach(r => {
    r.addEventListener('change', () => {
      state.dateRange = r.value;
      state.page = 1;
      loadModels();
    });
  });

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const [field, dir] = sortSelect.value.split(':');
      state.sortField = field;
      state.sortDir = dir;
      state.page = 1;
      loadModels();
    });
  }

  // Clear all filters
  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllFilters);
  }
}

/* ============================================================
   FILTER HANDLERS
   ============================================================ */
function handleCategoryFilter(category, checked) {
  if (checked) {
    if (!state.categories.includes(category)) state.categories.push(category);
  } else {
    state.categories = state.categories.filter(c => c !== category);
  }
  state.page = 1;
  loadModels();
}

function clearAllFilters() {
  state.categories = [];
  state.minRating = 0;
  state.dateRange = 'any';
  state.query = '';
  state.page = 1;

  document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.rating-radio').forEach(r => r.checked = false);
  document.querySelector('.date-radio[value="any"]').checked = true;
  const input = document.getElementById('header-search-input');
  if (input) input.value = '';

  loadModels();
}

/* ============================================================
   FILTER QUERY BUILDER
   Single Responsibility: translates state → filtered/sorted dataset.
   ============================================================ */
function buildFilterQuery(models) {
  let result = [...models];

  // Text search
  if (state.query) {
    const q = state.query.toLowerCase();
    result = result.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.short_description.toLowerCase().includes(q) ||
      (m.tags || []).some(t => t.toLowerCase().includes(q)) ||
      m.category.toLowerCase().includes(q)
    );
  }

  // Category filter
  if (state.categories.length > 0) {
    result = result.filter(m => state.categories.includes(m.category));
  }

  // Rating filter
  if (state.minRating > 0) {
    result = result.filter(m => m.rating >= state.minRating);
  }

  // Date filter
  if (state.dateRange !== 'any') {
    const now = Date.now();
    const ranges = {
      '24h': 86_400_000,
      '7d':  7 * 86_400_000,
      '30d': 30 * 86_400_000,
      '6m':  180 * 86_400_000,
    };
    const cutoff = now - (ranges[state.dateRange] || 0);
    result = result.filter(m => new Date(m.created_at).getTime() >= cutoff);
  }

  // Sort
  result.sort((a, b) => {
    let va = a[state.sortField];
    let vb = b[state.sortField];
    if (typeof va === 'string') {
      va = new Date(va).getTime() || va;
      vb = new Date(vb).getTime() || vb;
    }
    return state.sortDir === 'desc' ? vb - va : va - vb;
  });

  return result;
}

/* ============================================================
   MAIN LOAD FUNCTION
   ============================================================ */
async function loadModels() {
  const grid = document.getElementById('models-grid');
  if (!grid) return;

  grid.innerHTML = renderCardSkeletons(ITEMS_PER_PAGE);

  // Cancel in-flight request if user filters quickly
  if (loadModels._abortController) loadModels._abortController.abort();
  loadModels._abortController = new AbortController();

  try {
    const client = getSupabaseClient();
    if (client) {
      await loadModelsFromSupabase(client);
      return;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    // Fall through to mock
  }

  // Mock fallback
  const filtered = buildFilterQuery(MOCK_MODELS);
  state.totalCount = filtered.length;
  const start = (state.page - 1) * ITEMS_PER_PAGE;
  const pageData = filtered.slice(start, start + ITEMS_PER_PAGE);
  renderCards(pageData);
  updateResultCount(filtered.length, start + 1, Math.min(start + ITEMS_PER_PAGE, filtered.length));
  renderPagination(Math.ceil(filtered.length / ITEMS_PER_PAGE));
}

async function loadModelsFromSupabase(client) {
  const start = (state.page - 1) * ITEMS_PER_PAGE;

  // M3 fix: use Supabase full-text search when query exists
  let query = client
    .from('models')
    .select('*', { count: 'exact' })
    .eq('status', 'published');

  // Full-text search using the tsvector column built in schema
  if (state.query) {
    query = query.textSearch('search_vector', state.query, {
      type: 'websearch',
      config: 'english',
    });
  }

  // Category filter
  if (state.categories.length > 0) {
    query = query.in('category', state.categories);
  }

  // Rating filter
  if (state.minRating > 0) {
    query = query.gte('rating', state.minRating);
  }

  // Date filter
  if (state.dateRange !== 'any') {
    const ranges = { '24h': 86400, '7d': 604800, '30d': 2592000, '6m': 15552000 };
    const seconds = ranges[state.dateRange];
    if (seconds) {
      const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
      query = query.gte('created_at', cutoff);
    }
  }

  // Sort
  const validSortFields = ['created_at', 'download_count', 'rating', 'view_count'];
  const sortField = validSortFields.includes(state.sortField) ? state.sortField : 'created_at';
  query = query.order(sortField, { ascending: state.sortDir === 'asc' });

  // Pagination — server-side range (M3 fix: real pagination not client slice)
  query = query.range(start, start + ITEMS_PER_PAGE - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  state.totalCount = count || 0;
  renderCards(data || []);
  updateResultCount(count || 0, count > 0 ? start + 1 : 0, Math.min(start + ITEMS_PER_PAGE, count || 0));
  renderPagination(Math.ceil((count || 0) / ITEMS_PER_PAGE));
}

/* ============================================================
   RENDER FUNCTIONS
   ============================================================ */
function renderCards(models) {
  const grid = document.getElementById('models-grid');
  if (!grid) return;

  if (models.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <p class="empty-state-title">No models match your filters</p>
        <p class="empty-state-desc">Try adjusting your search or clearing some filters.</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="clearAllFilters()">Clear filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = models.map(renderModelCard).join('');
}

function renderModelCard(model) {
  const tags = (model.tags || []).slice(0, 3).map(t =>
    `<span class="tag-pill">${sanitize(t)}</span>`
  ).join('');

  return `
    <article class="model-card" onclick="window.location.href='model.html?id=${model.id}'" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">
      ${renderModelIcon(model.title[0], model.category)}

      <div class="model-card-body">
        <div class="model-card-header">
          <span class="model-card-title">${sanitize(model.title)}</span>
          ${renderBadge(model.category)}
        </div>
        <div class="model-card-username">
          by <a href="profile.html?user=${model.engineer_username}" onclick="event.stopPropagation()">@${sanitize(model.engineer_username)}</a>
        </div>
        <p class="model-card-desc">${sanitize(model.short_description)}</p>
        <div class="model-card-tags">${tags}</div>
        <div class="model-card-footer">
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
          <span class="model-card-date">${formatDate(model.created_at)}</span>
        </div>
      </div>

      <div class="model-card-actions" onclick="event.stopPropagation()">
        <button class="bookmark-btn" data-id="${model.id}" onclick="handleBookmark(this, ${model.id})" aria-label="Bookmark model" title="Save model">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
        </button>
      </div>
    </article>
  `;
}

function renderCardSkeletons(count) {
  return Array.from({ length: count }, (_, i) => `
    <div class="model-card" style="pointer-events:none">
      <div class="skeleton" style="width:40px;height:40px;border-radius:8px;flex-shrink:0"></div>
      <div style="flex:1">
        <div class="skeleton skeleton-text" style="width:180px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-text" style="width:120px;margin-bottom:12px"></div>
        <div class="skeleton skeleton-text" style="width:100%"></div>
        <div class="skeleton skeleton-text-sm" style="margin-top:4px"></div>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   RESULT COUNT + PAGINATION
   ============================================================ */
function updateResultCount(total, from, to) {
  const el = document.getElementById('result-count');
  if (!el) return;
  el.innerHTML = total === 0
    ? 'No models found'
    : `Showing <strong>${from}–${to}</strong> of <strong>${total}</strong> models`;
}

function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  if (!el || totalPages <= 1) {
    if (el) el.innerHTML = '';
    return;
  }

  const current = state.page;
  let pages = [];

  // Always show first, last, current ±1, with ellipsis
  const range = new Set([1, totalPages, current, current - 1, current + 1].filter(p => p >= 1 && p <= totalPages));
  const sorted = [...range].sort((a, b) => a - b);

  let prev = null;
  sorted.forEach(p => {
    if (prev !== null && p - prev > 1) pages.push('...');
    pages.push(p);
    prev = p;
  });

  const prevBtn = `<button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="handlePagination(${current - 1})">
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;

  const nextBtn = `<button class="page-btn" ${current === totalPages ? 'disabled' : ''} onclick="handlePagination(${current + 1})">
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;

  const pageButtons = pages.map(p =>
    p === '...'
      ? `<span class="page-btn" style="border:none;cursor:default">…</span>`
      : `<button class="page-btn ${p === current ? 'active' : ''}" onclick="handlePagination(${p})">${p}</button>`
  ).join('');

  el.innerHTML = prevBtn + pageButtons + nextBtn;
}

function handlePagination(page) {
  if (page < 1 || page === state.page) return;
  state.page = page;
  loadModels();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   BOOKMARK
   ============================================================ */
async function handleBookmark(btn, modelId) {
  const user = await checkSession();
  if (!user) {
    showToast('Sign in to save models', 'info');
    return;
  }
  const saved = btn.classList.toggle('saved');
  btn.innerHTML = saved
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>`
    : `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>`;
  showToast(saved ? 'Model saved' : 'Removed from saved', 'success');
}

/* Boot */
document.addEventListener('DOMContentLoaded', initExplorePage);
