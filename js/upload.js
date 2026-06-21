/**
 * upload.js
 * Upload Model page — form handling, real-time validation, tag management.
 *
 * SOLID:
 *   S — validateForm, handleTagInput, handleContinue each do one job
 *   O — add new form fields without changing validateForm structure
 *   L — validators return consistent { valid, error } shape
 *   I — tag logic doesn't know about form submission
 *   D — submitModel accepts a plain data object, not direct DOM reads
 */

/* ============================================================
   STATE
   ============================================================ */
const formState = {
  tags: [],
  category: '',
  charCount: 0,
};

const SUGGESTED_TAGS = {
  legal:       ['Contracts', 'Compliance', 'NLP', 'Legal QA'],
  healthcare:  ['Clinical', 'Medical NLP', 'Patient Data', 'Diagnosis'],
  coding:      ['Python', 'JavaScript', 'Code Generation', 'Completion'],
  finance:     ['Market Analysis', 'NLP', 'Forecasting', 'Sentiment'],
  general:     ['NLP', 'Text Generation', 'Summarization', 'QA'],
  education:   ['Tutoring', 'Explanation', 'Quiz', 'Curriculum'],
  multilingual:['Translation', 'Cross-lingual', 'NLP', '50+ languages'],
  security:    ['Threat Analysis', 'SIEM', 'Anomaly Detection', 'Cybersecurity'],
};

/* ============================================================
   ENTRY POINT
   ============================================================ */
async function initUploadPage() {
  await initHeader({ showSearchBar: false });
  initFooter();

  // Guard: must be logged in
  // Guard: must be logged in to upload
  await requireAuth();

  wireForm();
}

/* ============================================================
   WIRE ALL FORM EVENTS
   ============================================================ */
function wireForm() {
  // Model name
  const nameInput = document.getElementById('model-name');
  if (nameInput) {
    nameInput.addEventListener('input', () => handleModelNameInput(nameInput));
    nameInput.addEventListener('blur',  () => handleModelNameInput(nameInput, true));
  }

  // Category
  const catSelect = document.getElementById('category');
  if (catSelect) {
    catSelect.addEventListener('change', () => handleCategorySelect(catSelect.value));
  }

  // Description
  const descTextarea = document.getElementById('short-desc');
  if (descTextarea) {
    descTextarea.addEventListener('input', () => handleDescriptionInput(descTextarea));
  }

  // GitHub URL
  const githubInput = document.getElementById('github-url');
  if (githubInput) {
    githubInput.addEventListener('blur', () => handleGitHubInput(githubInput));
    githubInput.addEventListener('input', () => clearError(githubInput));
  }

  // Tag input
  const tagInput = document.getElementById('tag-input');
  if (tagInput) {
    tagInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        handleTagInput(tagInput.value.trim());
        tagInput.value = '';
      }
    });
  }

  // Buttons
  const continueBtn = document.getElementById('continue-btn');
  if (continueBtn) continueBtn.addEventListener('click', handleContinue);

  const draftBtn = document.getElementById('draft-btn');
  if (draftBtn) draftBtn.addEventListener('click', handleSaveDraft);
}

/* ============================================================
   FIELD HANDLERS
   ============================================================ */
function handleModelNameInput(input, isBlur = false) {
  const val = input.value;
  // Only letters, numbers, dashes, underscores, dots
  const validPattern = /^[a-zA-Z0-9\-_.]*$/;
  if (val && !validPattern.test(val)) {
    showFieldError(input, 'Only letters, numbers, dash, underscore, and dot are allowed.');
  } else if (isBlur && val.length < 3) {
    showFieldError(input, 'Model name must be at least 3 characters.');
  } else {
    clearError(input);
  }
}

function handleCategorySelect(value) {
  formState.category = value;
  updateSuggestedTags(value);
  clearError(document.getElementById('category'));
}

function handleDescriptionInput(textarea) {
  const len = textarea.value.length;
  formState.charCount = len;
  const counter = document.getElementById('desc-counter');
  if (counter) {
    counter.textContent = `${len}/150`;
    counter.style.color = len > 150 ? '#EF4444' : 'var(--color-text-muted)';
  }
  if (len > 0) clearError(textarea);
}

function handleGitHubInput(input) {
  const val = input.value.trim();
  if (val && !isValidGitHubURL(val)) {
    showFieldError(input, 'URL must start with https://github.com/');
  } else {
    clearError(input);
  }
}

function isValidGitHubURL(url) {
  if (!url) return true; // optional field
  // Must be a valid https github.com URL with at least user/repo path
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    const pathParts = u.pathname.split('/').filter(Boolean);
    return u.hostname === 'github.com' && pathParts.length >= 2;
  } catch {
    return false;
  }
}

/* ============================================================
   TAG MANAGEMENT
   ============================================================ */
function handleTagInput(value) {
  if (!value) return;
  // L4 fix: strip HTML and limit tag length before storing
  const div = document.createElement('div');
  div.textContent = value.replace(/,/g, '').trim();
  const cleaned = div.textContent.slice(0, 32).trim(); // max 32 chars per tag
  if (!cleaned) return;
  if (formState.tags.includes(cleaned)) return; // no duplicates
  if (formState.tags.length >= 10) {
    showToast('Maximum 10 tags allowed', 'info');
    return;
  }
  formState.tags.push(cleaned);
  renderTags();
}

function handleTagRemove(tag) {
  formState.tags = formState.tags.filter(t => t !== tag);
  renderTags();
}

function handleSuggestedTag(tag) {
  handleTagInput(tag);
}

function renderTags() {
  const container = document.getElementById('tags-container');
  if (!container) return;

  const tagInput = document.getElementById('tag-input');

  // Remove existing tag pills (not the input)
  container.querySelectorAll('.tag-item').forEach(el => el.remove());

  const pills = formState.tags.map(t => {
    const span = document.createElement('span');
    span.className = 'tag-item';
    span.innerHTML = `
      ${sanitize(t)}
      <button class="tag-remove" onclick="handleTagRemove('${sanitize(t).replace(/'/g, "\\'")}')" aria-label="Remove tag ${sanitize(t)}">×</button>
    `;
    return span;
  });

  pills.forEach(p => container.insertBefore(p, tagInput));
}

function updateSuggestedTags(category) {
  const container = document.getElementById('suggested-tags');
  if (!container) return;

  const suggestions = SUGGESTED_TAGS[category] || [];
  if (suggestions.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <span class="suggested-tag-hint">Suggestions:</span>
    ${suggestions.map(t =>
      `<button class="suggested-tag" onclick="handleSuggestedTag('${sanitize(t)}')">${sanitize(t)}</button>`
    ).join('')}
  `;
}

/* ============================================================
   VALIDATION
   ============================================================ */
/**
 * Validate all required fields. Returns { valid: bool, errors: [] }
 */
function validateForm() {
  const errors = [];

  const name = document.getElementById('model-name')?.value.trim() || '';
  const category = document.getElementById('category')?.value || '';
  const desc = document.getElementById('short-desc')?.value.trim() || '';
  const github = document.getElementById('github-url')?.value.trim() || '';

  if (name.length < 3) {
    errors.push({ field: 'model-name', message: 'Model name must be at least 3 characters.' });
  }

  if (!category) {
    errors.push({ field: 'category', message: 'Please select a category.' });
  }

  if (!desc) {
    errors.push({ field: 'short-desc', message: 'Short description is required.' });
  } else if (desc.length > 150) {
    errors.push({ field: 'short-desc', message: 'Description must be 150 characters or fewer.' });
  }

  if (github && !isValidGitHubURL(github)) {
    errors.push({ field: 'github-url', message: 'GitHub URL must start with https://github.com/' });
  }

  // Show inline errors
  errors.forEach(err => {
    const el = document.getElementById(err.field);
    if (el) showFieldError(el, err.message);
  });

  return { valid: errors.length === 0, errors };
}

/* ============================================================
   SUBMIT HANDLERS
   ============================================================ */
async function handleContinue() {
  const { valid } = validateForm();
  if (!valid) {
    showToast('Please fix the errors before continuing.', 'error');
    return;
  }

  const user = await checkSession();
  if (!user) { window.location.href = 'auth.html'; return; }
  const payload = collectFormData('published', user);
  const btn = document.getElementById('continue-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Publishing…';
  }

  try {
    const newId = await submitModel(payload);
    // M7 fix: log to activity table
    try {
      const actClient = getSupabaseClient();
      if (actClient && user) {
        await actClient.from('activity').insert([{
          user_id: user.id,
          action_type: 'upload',
          target_id: newId,
          target_name: payload.title,
          created_at: new Date().toISOString(),
        }]);
      }
    } catch { /* non-critical */ }
    showToast('Model published!', 'success');
    setTimeout(() => {
      window.location.href = `model.html?id=${newId}`;
    }, 800);
  } catch (err) {
    showToast('Something went wrong. Please try again.', 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Continue';
    }
  }
}

async function handleSaveDraft() {
  const user = await checkSession();
  const payload = collectFormData('draft', user);
  const btn = document.getElementById('draft-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving…';
  }

  try {
    await submitModel(payload);
    showToast('Draft saved', 'success');
  } catch {
    showToast('Could not save draft. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Draft';
    }
  }
}

/* ============================================================
   DATA COLLECTION + SUBMISSION
   ============================================================ */
function collectFormData(status, user) {
  return {
    title: document.getElementById('model-name')?.value.trim() || '',
    category: document.getElementById('category')?.value || '',
    short_description: document.getElementById('short-desc')?.value.trim() || '',
    github_url: document.getElementById('github-url')?.value.trim() || '',
    tags: formState.tags,
    status,
    created_at: new Date().toISOString(),
    // B1 fix: attach owner identity
    engineer_id: user?.id || null,
    engineer_username: user?.user_metadata?.username || user?.email?.split('@')[0] || null,
  };
}

/**
 * Submit to Supabase or mock.
 * Returns the new model's ID.
 */
async function submitModel(data) {
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data: inserted, error } = await client
        .from('models')
        .insert([data])
        .select('id')
        .single();
      if (error) throw error;
      return inserted.id;
    }
  } catch (err) {
  }

  // Mock: generate a fake ID
  return Math.floor(Math.random() * 9000) + 100;
}

/* ============================================================
   ERROR DISPLAY HELPERS
   ============================================================ */
function showFieldError(input, message) {
  input.classList.add('error');
  let errEl = input.parentElement.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error';
    input.parentElement.append(errEl);
  }
  errEl.textContent = message;
}

function clearError(input) {
  if (!input) return;
  input.classList.remove('error');
  const errEl = input.parentElement?.querySelector('.form-error');
  if (errEl) errEl.remove();
}

/* Boot */
document.addEventListener('DOMContentLoaded', initUploadPage);
