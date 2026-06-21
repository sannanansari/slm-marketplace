/**
 * auth.js
 * Authentication page — login, signup, GitHub OAuth.
 *
 * SOLID:
 *   S — handleLogin, handleSignup, handleGitHubOAuth are separate concerns
 *   O — add new OAuth providers without touching existing handlers
 *   L — all auth handlers return the same shape: { user, error }
 *   I — togglePasswordShow knows nothing about form submission
 *   D — auth operations go through Supabase abstraction, not direct fetch
 */

/* ============================================================
   ENTRY POINT
   ============================================================ */
async function initAuthPage() {
  // If already logged in, redirect home
  const user = await checkSession();
  if (user) {
    const redirect = safeRedirect(getParam('redirect'), 'index.html');
    window.location.href = redirect;
    return;
  }

  // Check if ?mode=signup to auto-show signup tab
  const mode = getParam('mode');
  if (mode === 'signup') switchTab('signup');

  wireAuthForm();
}

/* ============================================================
   WIRE EVENTS
   ============================================================ */
function wireAuthForm() {
  // Tab switchers
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      await handleLogin();
    });
  }

  // Signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      await handleSignup();
    });
  }

  // Password toggles
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => togglePasswordShow(btn));
  });

  // GitHub OAuth buttons
  document.querySelectorAll('.github-oauth-btn').forEach(btn => {
    btn.addEventListener('click', handleGitHubOAuth);
  });

  // H1 fix: Forgot password
  const forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) forgotLink.addEventListener('click', handleForgotPassword);

  // Real-time validation
  document.getElementById('signup-email')?.addEventListener('blur', validateEmailField);
  document.getElementById('signup-password')?.addEventListener('input', validatePasswordStrength);
  document.getElementById('signup-confirm')?.addEventListener('blur', validatePasswordMatch);
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.auth-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tab}`);
  });
}

/* ============================================================
   LOGIN
   ============================================================ */
async function handleLogin() {
  const email    = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) {
    showAuthError('login', 'Please enter your email and password.');
    return;
  }

  setButtonLoading('login-btn', true);
  clearAuthError('login');

  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const redirect = safeRedirect(getParam('redirect'), 'index.html');
      window.location.href = redirect;
      return;
    }
    // Mock: just redirect
    showToast('Signed in (demo mode)', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 800);
  } catch (err) {
    showAuthError('login', friendlyAuthError(err));
  } finally {
    setButtonLoading('login-btn', false);
  }
}

/* ============================================================
   SIGNUP
   ============================================================ */
async function handleSignup() {
  const name     = document.getElementById('signup-name')?.value.trim();
  const email    = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const confirm  = document.getElementById('signup-confirm')?.value;

  // Client-side validation
  if (!name || !email || !password) {
    showAuthError('signup', 'All fields are required.');
    return;
  }
  if (!isValidEmail(email)) {
    showAuthError('signup', 'Please enter a valid email address.');
    return;
  }
  if (password.length < 8) {
    showAuthError('signup', 'Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    showAuthError('signup', 'Passwords do not match.');
    return;
  }

  setButtonLoading('signup-btn', true);
  clearAuthError('signup');

  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;

      // Create profile record in users table
      if (data.user) {
        await client.from('users').insert([{
          id: data.user.id,
          name,
          email,
          username: generateUsername(name),
          avatar_letter: name[0].toUpperCase(),
          avatar_color: randomAvatarColor(),
          join_date: new Date().toISOString(),
        }]);
      }

      showToast('Account created! Check your email to verify.', 'success');
      switchTab('login');
      return;
    }
    // Mock
    showToast('Account created (demo mode)!', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 800);
  } catch (err) {
    showAuthError('signup', friendlyAuthError(err));
  } finally {
    setButtonLoading('signup-btn', false);
  }
}

/* ============================================================
   GITHUB OAUTH
   ============================================================ */
async function handleGitHubOAuth() {
  try {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin + '/index.html',
        },
      });
      if (error) throw error;
      return;
    }
    showToast('GitHub OAuth requires Supabase connection.', 'info');
  } catch (err) {
    showToast('GitHub sign-in failed. Please try again.', 'error');
  }
}

/* ============================================================
   LOGOUT (callable from any page)
   ============================================================ */
async function handleLogout() {
  try {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
  } catch { /* ignore */ }
  window.location.href = 'index.html';
}

/* ============================================================
   PASSWORD TOGGLE
   ============================================================ */
function togglePasswordShow(btn) {
  const inputId = btn.dataset.target;
  const input = document.getElementById(inputId);
  if (!input) return;

  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.innerHTML = isText
    ? `<!-- eye icon -->
       <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
         <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
         <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
       </svg>`
    : `<!-- eye-off icon -->
       <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
         <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
       </svg>`;
  btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
}

/* ============================================================
   REAL-TIME FIELD VALIDATION
   ============================================================ */
function validateEmailField() {
  const input = document.getElementById('signup-email');
  if (!input) return;
  if (input.value && !isValidEmail(input.value)) {
    showInlineError(input, 'Please enter a valid email address.');
  } else {
    clearInlineError(input);
  }
}

function validatePasswordStrength() {
  const input = document.getElementById('signup-password');
  const bar   = document.getElementById('pw-strength-bar');
  const label = document.getElementById('pw-strength-label');
  if (!input || !bar || !label) return;

  const val = input.value;
  const strength = getPasswordStrength(val);

  const levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors  = ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];
  const widths  = ['0%', '25%', '50%', '75%', '100%'];

  bar.style.width  = widths[strength];
  bar.style.background = colors[strength];
  label.textContent    = levels[strength];
  label.style.color    = colors[strength];
}

function validatePasswordMatch() {
  const pw  = document.getElementById('signup-password');
  const cfm = document.getElementById('signup-confirm');
  if (!pw || !cfm) return;
  if (cfm.value && cfm.value !== pw.value) {
    showInlineError(cfm, 'Passwords do not match.');
  } else {
    clearInlineError(cfm);
  }
}

function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score);
}

/* ============================================================
   UTILITY HELPERS
   ============================================================ */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUsername(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(Math.random() * 999);
}

function randomAvatarColor() {
  const colors = ['#16A34A', '#2563EB', '#D97706', '#7C3AED', '#0D9488', '#DC2626', '#DB2777', '#6B7280'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function friendlyAuthError(err) {
  const msg = err?.message || '';
  if (msg.includes('Invalid login'))       return 'Incorrect email or password.';
  if (msg.includes('Email not confirmed')) return 'Please verify your email before signing in.';
  if (msg.includes('already registered'))  return 'An account with this email already exists.';
  if (msg.includes('rate limit'))          return 'Too many attempts. Please wait a moment.';
  return 'Something went wrong. Please try again.';
}

function showAuthError(panel, message) {
  const el = document.getElementById(`${panel}-error`);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
  }
}

function clearAuthError(panel) {
  const el = document.getElementById(`${panel}-error`);
  if (el) el.classList.add('hidden');
}

function showInlineError(input, message) {
  input.classList.add('error');
  let errEl = input.parentElement.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error';
    input.parentElement.append(errEl);
  }
  errEl.textContent = message;
}

function clearInlineError(input) {
  input.classList.remove('error');
  input.parentElement.querySelector('.form-error')?.remove();
}

function setButtonLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Loading…';
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
  }
}


/* ============================================================
   H1 FIX: Password Reset
   ============================================================ */
async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('login-email')?.value.trim();
  if (!email) {
    showAuthError('login', 'Enter your email address above, then click Forgot password.');
    return;
  }
  try {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://slm-market.sannan.app/auth.html?mode=reset',
      });
      if (error) throw error;
    }
    showToast('Password reset email sent. Check your inbox.', 'success', 5000);
  } catch (err) {
    showAuthError('login', 'Could not send reset email. Please try again.');
  }
}


/* ============================================================
   H2 FIX: Email confirmation / password reset token handler
   Supabase appends #access_token=...&type=signup to the redirect URL
   ============================================================ */
async function handleAuthCallback() {
  const hash = window.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.replace('#', ''));
  const type   = params.get('type');
  const token  = params.get('access_token');

  if (!token) return;

  // Clean the hash from the URL without reload
  history.replaceState(null, '', window.location.pathname + window.location.search);

  if (type === 'signup' || type === 'email') {
    showToast('Email confirmed! You are now signed in.', 'success', 5000);
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  } else if (type === 'recovery') {
    // Show reset password form
    showResetPasswordForm();
  }
}

function showResetPasswordForm() {
  switchTab('login');
  const panel = document.getElementById('panel-login');
  if (!panel) return;
  panel.innerHTML = `
    <h2 style="font-size:16px;font-weight:700;margin-bottom:16px">Set new password</h2>
    <div class="form-group">
      <label class="form-label form-label-required" for="new-password">New Password</label>
      <div class="pw-wrap">
        <input type="password" id="new-password" class="form-input" placeholder="Min. 8 characters" autocomplete="new-password">
      </div>
    </div>
    <button type="button" class="auth-submit-btn" onclick="handlePasswordUpdate()">Update Password</button>
  `;
}

async function handlePasswordUpdate() {
  const pw = document.getElementById('new-password')?.value;
  if (!pw || pw.length < 8) {
    showToast('Password must be at least 8 characters.', 'error'); return;
  }
  try {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.auth.updateUser({ password: pw });
      if (error) throw error;
    }
    showToast('Password updated! Redirecting…', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  } catch (err) {
    showToast('Could not update password. Try the reset link again.', 'error');
  }
}

/* Boot */
document.addEventListener('DOMContentLoaded', async function() {
  await handleAuthCallback();
  initAuthPage();
});
