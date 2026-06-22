/**
 * auth.js
 * Full authentication — email/password + GitHub OAuth.
 * Works on slm-market.sannan.app in production.
 *
 * GitHub OAuth flow (PKCE):
 *   1. User clicks "Continue with GitHub"
 *   2. Supabase redirects to github.com for auth
 *   3. GitHub redirects back to /auth (our redirect URL)
 *   4. Supabase detects the code in the URL, exchanges for session
 *   5. handleAuthCallback() detects the session and redirects to /
 *
 * Email flow:
 *   1. User signs up → Supabase sends confirmation email
 *   2. User clicks link → lands on /auth with #access_token in hash
 *   3. handleAuthCallback() detects it, confirms session, redirects to /
 */

const SITE_URL = 'https://slm-market.sannan.app';

/* ============================================================
   BOOT — runs first on every auth page load
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function () {
  // STEP 1: Handle any OAuth / email callback first
  const handled = await handleAuthCallback();
  if (handled) return; // redirecting — don't render the form

  // STEP 2: Already logged in? Redirect away.
  const user = await checkSession();
  if (user) {
    window.location.href = safeRedirect(getParam('redirect'), 'index.html');
    return;
  }

  // STEP 3: Show correct tab based on ?mode= param
  const mode = getParam('mode');
  if (mode === 'signup') switchTab('signup');
  if (mode === 'reset')  showResetPasswordForm();

  wireAuthForm();
});

/* ============================================================
   OAUTH + EMAIL CALLBACK HANDLER
   Must run BEFORE rendering the form.
   ============================================================ */
async function handleAuthCallback() {
  const client = getSupabaseClient();
  if (!client) return false;

  // --- GitHub OAuth (PKCE): Supabase auto-detects ?code= in URL ---
  // detectSessionInUrl:true in supabase.js handles this automatically.
  // We just need to check if a session was created.
  const urlParams = new URLSearchParams(window.location.search);
  const code      = urlParams.get('code');

  if (code) {
    // PKCE exchange — Supabase handles this internally when detectSessionInUrl is true
    // Wait briefly for the exchange to complete
    await new Promise(r => setTimeout(r, 500));
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      await ensureUserProfile(session.user, client);
      window.location.href = safeRedirect(getParam('redirect'), 'index.html');
      return true;
    }
  }

  // --- Email confirmation / password reset: Supabase uses #hash ---
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.replace('#', ''));
    const type   = params.get('type');
    const token  = params.get('access_token');

    if (!token) return false;

    // Clean hash from URL
    history.replaceState(null, '', window.location.pathname + window.location.search);

    if (type === 'signup' || type === 'email') {
      // Session is already set by Supabase via detectSessionInUrl
      const { data: { session } } = await client.auth.getSession();
      if (session) {
        await ensureUserProfile(session.user, client);
        showToast('Email confirmed! Welcome to SLM Marketplace.', 'success', 4000);
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return true;
      }
    }

    if (type === 'recovery') {
      // Show the reset password form immediately
      wireAuthForm();
      showResetPasswordForm();
      return true;
    }
  }

  return false;
}

/* ============================================================
   WIRE ALL FORM EVENTS
   ============================================================ */
function wireAuthForm() {
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await handleLogin();
  });

  document.getElementById('signup-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await handleSignup();
  });

  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => togglePasswordShow(btn));
  });

  document.querySelectorAll('.github-oauth-btn').forEach(btn => {
    btn.addEventListener('click', handleGitHubOAuth);
  });

  document.querySelector('.forgot-link')?.addEventListener('click', handleForgotPassword);

  // Real-time validation
  document.getElementById('signup-email')?.addEventListener('blur',  validateEmailField);
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
   EMAIL/PASSWORD LOGIN
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
      window.location.href = safeRedirect(getParam('redirect'), 'index.html');
      return;
    }
    showToast('Running in demo mode — Supabase not connected.', 'info');
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  } catch (err) {
    showAuthError('login', friendlyAuthError(err));
  } finally {
    setButtonLoading('login-btn', false);
  }
}

/* ============================================================
   SIGN UP
   ============================================================ */
async function handleSignup() {
  const name     = document.getElementById('signup-name')?.value.trim();
  const email    = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const confirm  = document.getElementById('signup-confirm')?.value;

  if (!name || !email || !password) {
    showAuthError('signup', 'All fields are required.'); return;
  }
  if (!isValidEmail(email)) {
    showAuthError('signup', 'Please enter a valid email address.'); return;
  }
  if (password.length < 8) {
    showAuthError('signup', 'Password must be at least 8 characters.'); return;
  }
  if (password !== confirm) {
    showAuthError('signup', 'Passwords do not match.'); return;
  }

  setButtonLoading('signup-btn', true);
  clearAuthError('signup');

  try {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${SITE_URL}/auth`,   // where they land after clicking email link
          data: { name, username: generateUsername(name) },
        },
      });
      if (error) throw error;

      // Create profile immediately (even before email confirm)
      if (data.user) {
        await ensureUserProfile(data.user, client, name);
      }

      showToast('Check your email for a confirmation link.', 'success', 6000);
      switchTab('login');
      return;
    }
    showToast('Demo mode — sign up not available.', 'info');
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
    if (!client) {
      showToast('Supabase not connected. Check your config.', 'error');
      return;
    }

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: {
        // Supabase will redirect here after GitHub auth is complete.
        // Must be listed in: Supabase → Auth → URL Configuration → Redirect URLs
        redirectTo: `${SITE_URL}/auth`,
        scopes: 'read:user user:email',
      },
    });

    if (error) throw error;
    // Browser redirects to GitHub — nothing else to do here.

  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('provider is not enabled')) {
      showToast('GitHub OAuth is not enabled in Supabase. Enable it in Auth → Providers.', 'error', 6000);
    } else {
      showToast('GitHub sign-in failed: ' + (msg || 'Unknown error'), 'error');
    }
  }
}

/* ============================================================
   LOGOUT  (called from any page via header avatar menu)
   ============================================================ */
async function handleLogout() {
  try {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
  } catch { /* ignore */ }
  window.location.href = 'index.html';
}

/* ============================================================
   FORGOT PASSWORD
   ============================================================ */
async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('login-email')?.value.trim();
  if (!email) {
    showAuthError('login', 'Enter your email above, then click Forgot password.');
    return;
  }

  try {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/auth?mode=reset`,
      });
      if (error) throw error;
    }
    showToast('Password reset email sent. Check your inbox.', 'success', 6000);
  } catch {
    showAuthError('login', 'Could not send reset email. Please try again.');
  }
}

/* ============================================================
   RESET PASSWORD FORM  (shown after clicking email link)
   ============================================================ */
function showResetPasswordForm() {
  const panel = document.getElementById('panel-login');
  if (!panel) return;

  panel.innerHTML = `
    <div style="margin-bottom:20px">
      <h2 style="font-size:17px;font-weight:700;color:var(--color-text-primary);margin-bottom:4px">
        Set a new password
      </h2>
      <p style="font-size:13px;color:var(--color-text-secondary)">
        Choose a strong password for your account.
      </p>
    </div>
    <div class="form-group">
      <label class="form-label form-label-required" for="new-password">New Password</label>
      <div class="pw-wrap">
        <input type="password" id="new-password" class="form-input"
          placeholder="Min. 8 characters" autocomplete="new-password">
        <button type="button" class="pw-toggle" data-target="new-password" aria-label="Show password">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label form-label-required" for="confirm-new-password">Confirm Password</label>
      <div class="pw-wrap">
        <input type="password" id="confirm-new-password" class="form-input"
          placeholder="Re-enter password" autocomplete="new-password">
      </div>
    </div>
    <button type="button" class="auth-submit-btn" onclick="handlePasswordUpdate()">
      Update Password
    </button>
  `;

  // Wire the new toggle
  panel.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => togglePasswordShow(btn));
  });
}

async function handlePasswordUpdate() {
  const pw  = document.getElementById('new-password')?.value;
  const cfm = document.getElementById('confirm-new-password')?.value;

  if (!pw || pw.length < 8) {
    showToast('Password must be at least 8 characters.', 'error'); return;
  }
  if (pw !== cfm) {
    showToast('Passwords do not match.', 'error'); return;
  }

  try {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.auth.updateUser({ password: pw });
      if (error) throw error;
    }
    showToast('Password updated! Signing you in…', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  } catch {
    showToast('Could not update password. Request a new reset link.', 'error');
  }
}

/* ============================================================
   ENSURE USER PROFILE EXISTS IN DB
   Creates the users table row on first login (email or OAuth).
   Safe to call multiple times — uses upsert.
   ============================================================ */
async function ensureUserProfile(user, client, displayName) {
  if (!user || !client) return;

  const name     = displayName
                || user.user_metadata?.full_name
                || user.user_metadata?.name
                || user.user_metadata?.user_name
                || user.email?.split('@')[0]
                || 'User';

  const username = user.user_metadata?.user_name   // GitHub login
                || generateUsername(name);

  const avatar   = user.user_metadata?.avatar_url  // GitHub avatar
                || null;

  try {
    await client.from('users').upsert([{
      id:           user.id,
      name,
      email:        user.email,
      username,
      avatar_url:   avatar,
      avatar_letter: name[0].toUpperCase(),
      avatar_color: randomAvatarColor(),
      join_date:    new Date().toISOString(),
    }], {
      onConflict: 'id',
      ignoreDuplicates: true,   // don't overwrite existing profile
    });
  } catch { /* non-blocking — profile creation is best-effort */ }
}

/* ============================================================
   PASSWORD SHOW/HIDE
   ============================================================ */
function togglePasswordShow(btn) {
  const input = document.getElementById(btn.dataset.target);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  btn.innerHTML = show
    ? `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
         <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
       </svg>`
    : `<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
         <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
         <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
       </svg>`;
}

/* ============================================================
   REAL-TIME VALIDATION
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

  const strength = getPasswordStrength(input.value);
  const levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors  = ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];
  const widths  = ['0%', '25%', '50%', '75%', '100%'];

  bar.style.width      = widths[strength];
  bar.style.background = colors[strength];
  label.textContent    = levels[strength];
  label.style.color    = colors[strength];
}

function validatePasswordMatch() {
  const pw  = document.getElementById('signup-password');
  const cfm = document.getElementById('signup-confirm');
  if (!pw || !cfm || !cfm.value) return;
  if (cfm.value !== pw.value) {
    showInlineError(cfm, 'Passwords do not match.');
  } else {
    clearInlineError(cfm);
  }
}

function getPasswordStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

/* ============================================================
   UTILITY HELPERS
   ============================================================ */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUsername(name) {
  const base = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return base + '_' + Math.floor(Math.random() * 9999);
}

function randomAvatarColor() {
  const colors = ['#16A34A','#2563EB','#D97706','#7C3AED','#0D9488','#DC2626','#DB2777','#6B7280'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function friendlyAuthError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid credentials'))
    return 'Incorrect email or password.';
  if (msg.includes('email not confirmed'))
    return 'Check your email and click the confirmation link first.';
  if (msg.includes('already registered') || msg.includes('already exists'))
    return 'An account with this email already exists. Try logging in.';
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many attempts. Wait a moment and try again.';
  if (msg.includes('provider') && msg.includes('not enabled'))
    return 'GitHub login is not enabled yet. Use email/password instead.';
  if (msg.includes('network') || msg.includes('failed to fetch'))
    return 'Network error. Check your connection and try again.';
  return err?.message || 'Something went wrong. Please try again.';
}

function showAuthError(panel, message) {
  const el = document.getElementById(`${panel}-error`);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearAuthError(panel) {
  document.getElementById(`${panel}-error`)?.classList.add('hidden');
}

function showInlineError(input, message) {
  input.classList.add('error');
  let el = input.closest('.form-group')?.querySelector('.form-error');
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-error';
    input.parentElement.after(el);
  }
  el.textContent = message;
}

function clearInlineError(input) {
  input.classList.remove('error');
  input.closest('.form-group')?.querySelector('.form-error')?.remove();
}

function setButtonLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.textContent;
    btn.textContent  = 'Loading…';
  } else {
    btn.textContent = btn.dataset.orig || btn.textContent;
  }
}
