/**
 * leaderboard.js
 * Leaderboard — top engineers, top models, trending. Time filter.
 *
 * SOLID:
 *   S — loadTopEngineers, loadTopModels, loadTrendingModels are independent
 *   O — add new leaderboard tabs without touching existing render functions
 *   L — renderEngineerRow / renderModelRow have consistent signatures
 *   I — calculateScore is a pure utility; no DOM dependencies
 *   D — handleTabSwitch dispatches to load functions; doesn't know their internals
 */

let activeTab = 'engineers';
let timePeriod = 'month';

/* ============================================================
   ENTRY POINT
   ============================================================ */
async function initLeaderboardPage() {
  await initHeader({ showSearchBar: false });
  initFooter();

  // Time filter
  const timeSelect = document.getElementById('time-filter');
  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      timePeriod = timeSelect.value;
      dispatchTabLoad(activeTab);
    });
  }

  // Tabs
  initTabs('#lb-tabs', (tabId) => {
    activeTab = tabId;
    dispatchTabLoad(tabId);
  });

  // Initial load
  loadTopEngineers();
}

/* ============================================================
   TAB DISPATCHER
   ============================================================ */
const THEAD_CONFIGS = {
  engineers: '<tr><th>Rank</th><th>Engineer</th><th class="lb-number-col">Models</th><th class="lb-number-col">Downloads</th><th class="lb-number-col">Avg. Rating</th><th class="score-cell">Score</th></tr>',
  models:    '<tr><th>Rank</th><th>Model</th><th>Category</th><th class="lb-number-col">Downloads</th><th class="lb-number-col">Rating</th><th class="score-cell">Downloads</th></tr>',
  trending:  '<tr><th>Rank</th><th>Model</th><th>Category</th><th class="lb-number-col">Downloads</th><th class="lb-number-col">Rating</th><th class="score-cell">Trend Score</th></tr>',
};

function dispatchTabLoad(tabId) {
  // B4 fix: update thead columns for the active tab
  const thead = document.getElementById('lb-thead');
  if (thead && THEAD_CONFIGS[tabId]) thead.innerHTML = THEAD_CONFIGS[tabId];

  switch (tabId) {
    case 'engineers': loadTopEngineers();   break;
    case 'models':    loadTopModels();      break;
    case 'trending':  loadTrendingModels(); break;
  }
}

/* ============================================================
   TOP ENGINEERS
   ============================================================ */
function loadTopEngineers() {
  const tbody = document.getElementById('lb-tbody');
  if (!tbody) return;

  tbody.innerHTML = renderTableSkeletons(5, 5);

  setTimeout(() => {
    const sorted = [...MOCK_ENGINEERS]
      .map(e => ({ ...e, computedScore: calculateScore(e.total_downloads, e.avg_rating, e.model_count) }))
      .sort((a, b) => b.computedScore - a.computedScore);

    const maxScore = sorted[0]?.computedScore || 1;

    tbody.innerHTML = sorted.map((eng, idx) =>
      renderEngineerRow(eng, idx + 1, maxScore)
    ).join('');
  }, 350);
}

function renderEngineerRow(eng, rank, maxScore) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const pct = Math.round((eng.computedScore / maxScore) * 100);

  return `
    <tr onclick="window.location.href='profile.html?user=${eng.username}'" tabindex="0" role="row" onkeydown="if(event.key==='Enter')this.click()" title="View ${sanitize(eng.name)}'s profile">
      <td class="rank-cell">
        ${medal ? `<span class="medal">${medal}</span>` : `<span class="rank-num">${rank}</span>`}
      </td>
      <td>
        <div class="lb-engineer-cell">
          <div class="lb-avatar" style="background:${eng.avatar_color || '#6B7280'}">${eng.name[0].toUpperCase()}</div>
          <div>
            <div class="lb-name">${sanitize(eng.name)}</div>
            <div class="lb-username">@${sanitize(eng.username)}</div>
          </div>
        </div>
      </td>
      <td class="lb-number-col">
        <span class="lb-number">${eng.model_count}</span>
      </td>
      <td class="lb-number-col">
        <span class="lb-number">${formatNumber(eng.total_downloads)}</span>
      </td>
      <td class="lb-number-col">
        <span class="lb-number">${(eng.avg_rating || 0).toFixed(1)}</span>
        <div>${renderStars(eng.avg_rating || 0)}</div>
      </td>
      <td class="score-cell">
        <div class="score-row">
          <span class="score-value">${eng.computedScore.toLocaleString()}</span>
          <div class="score-bar-wrap">
            <div class="score-bar" style="width:${pct}%"></div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

/* ============================================================
   TOP MODELS
   ============================================================ */
function loadTopModels() {
  const tbody = document.getElementById('lb-tbody');
  if (!tbody) return;

  tbody.innerHTML = renderTableSkeletons(5, 5);

  setTimeout(() => {
    const sorted = [...MOCK_MODELS].sort((a, b) => b.download_count - a.download_count);
    const maxDl = sorted[0]?.download_count || 1;

    tbody.innerHTML = sorted.map((m, idx) => renderModelRow(m, idx + 1, maxDl)).join('');
  }, 350);
}

function renderModelRow(model, rank, maxVal) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const pct = Math.round((model.download_count / maxVal) * 100);
  const cfg = getCategoryConfig(model.category);

  return `
    <tr onclick="window.location.href='model.html?id=${model.id}'" tabindex="0" role="row" onkeydown="if(event.key==='Enter')this.click()" title="View ${sanitize(model.title)}">
      <td class="rank-cell">
        ${medal ? `<span class="medal">${medal}</span>` : `<span class="rank-num">${rank}</span>`}
      </td>
      <td>
        <div class="lb-engineer-cell">
          <div class="lb-avatar" style="background:${cfg.color}">${model.title[0].toUpperCase()}</div>
          <div>
            <div class="lb-name">${sanitize(model.title)}</div>
            <div class="lb-username">@${sanitize(model.engineer_username)}</div>
          </div>
        </div>
      </td>
      <td>${renderBadge(model.category)}</td>
      <td class="lb-number-col">
        <span class="lb-number">${formatNumber(model.download_count)}</span>
      </td>
      <td class="lb-number-col">
        <span class="lb-number">${model.rating.toFixed(1)}</span>
        <div>${renderStars(model.rating)}</div>
      </td>
      <td class="score-cell">
        <div class="score-row">
          <span class="score-value">${formatNumber(model.download_count)}</span>
          <div class="score-bar-wrap">
            <div class="score-bar" style="width:${pct}%"></div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

/* ============================================================
   TRENDING MODELS
   ============================================================ */
function loadTrendingModels() {
  const tbody = document.getElementById('lb-tbody');
  if (!tbody) return;

  tbody.innerHTML = renderTableSkeletons(5, 5);

  setTimeout(() => {
    // Trending = most recently uploaded with high rating
    const trending = [...MOCK_MODELS]
      .sort((a, b) => {
        const scoreA = (a.rating * 1000) + a.download_count;
        const scoreB = (b.rating * 1000) + b.download_count;
        return scoreB - scoreA;
      });
    const maxVal = trending[0]?.download_count || 1;

    tbody.innerHTML = trending.map((m, idx) => renderModelRow(m, idx + 1, maxVal)).join('');
  }, 350);
}

/* ============================================================
   SCORE CALCULATOR
   Pure function: weights downloads (50%), rating (30%), model count (20%)
   ============================================================ */
function calculateScore(downloads, rating, modelCount) {
  const normalizedDownloads = Math.log10(Math.max(downloads, 1)) * 100;
  const normalizedRating    = (rating / 5) * 300;
  const normalizedModels    = Math.min(modelCount * 20, 400);
  return Math.round(normalizedDownloads + normalizedRating + normalizedModels);
}

/* ============================================================
   SKELETON LOADER
   ============================================================ */
function renderTableSkeletons(rows, cols) {
  return Array.from({ length: rows }, () => `
    <tr style="pointer-events:none">
      ${Array.from({ length: cols }, () => `
        <td><div class="skeleton" style="height:14px;border-radius:4px;width:80%"></div></td>
      `).join('')}
    </tr>
  `).join('');
}

/* Boot */
document.addEventListener('DOMContentLoaded', initLeaderboardPage);
