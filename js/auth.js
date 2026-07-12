/**
 * auth.js
 * Authentication — email/password + GitHub OAuth.
 *
 * FIX A1: PKCE callback no longer uses setTimeout(500ms) race condition.
 *          Uses onAuthStateChange to wait for SIGNED_IN event reliably.
 * FIX A3: SITE_URL reads from config or window.location.origin — not hardcoded.
 *
 * handleLogout() lives in global.js (available on all pages).
 */

/* ============================================================
   CONFIG — reads from injected config or falls back to origin
   Never hardcode the domain.
   ============================================================ */
function getSiteUrl() {
  return (window.__SLM_CONFIG && window.__SLM_CONFIG.siteUrl)
    ? window.__SLM_CONFIG.siteUrl
    : window.location.origin;
}

/* ============================================================
   BOOT
   ============================================================ */
(async function boot() {
  const handled = await handleAuthCallback();
  if (handled) return;

  const user = await checkSession();
  if (user) {
    window.location.href = safeRedirect(getParam('redirect'), 'index.html');
    return;
  }

  const mode = getParam('mode');
  if (mode === 'signup') switchTab('signup');
  if (mode === 'reset')  showResetPasswordForm();

  wireAuthForm();
}());

/* ============================================================
   OAUTH + EMAIL CALLBACK HANDLER
   ============================================================ */
async function handleAuthCallback() {
  const client = getSupabaseClient();
  if (!client) return false;

  const urlParams = new URLSearchParams(window.location.search);
  const code      = urlParams.get('code');

  if (code) {
    try {
      const session = await waitForSession(client, 8000);
      if (session) {
        await ensureUserProfile(session.user, client);
        cleanUrl();
        window.location.href = safeRedirect(getParam('redirect'), 'index.html');
        return true;
      }
    } catch {
      // Exchange timed out
    }
    cleanUrl();
    return false;
  }

  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.replace('#', ''));
    const type   = params.get('type');
    const token  = params.get('access_token');
    if (!token) return false;

    cleanUrl();

    if (type === 'signup' || type === 'email') {
      const { data: { session } } = await client.auth.getSession();
      if (session) {
        await ensureUserProfile(session.user, client);
        showToast('Email confirmed! Welcome to SLM Marketplace.', 'success', 4000);
        setTimeout(function() { window.location.href = 'index.html'; }, 1500);
        return true;
      }
    }

    if (type === 'recovery') {
      wireAuthForm();
      showResetPasswordForm();
      return true;
    }
  }

  return false;
}

/* ============================================================
   FIX A1: Wait for SIGNED_IN via onAuthStateChange (not setTimeout)
   ============================================================ */
function waitForSession(client, timeoutMs) {
  return new Promise(function(resolve) {
    var timer;
    var subscription;

    timer = setTimeout(function() {
      if (subscription) subscription.unsubscribe();
      resolve(null);
    }, timeoutMs || 8000);

    var result = client.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_IN' && session) {
        clearTimeout(timer);
        result.data.subscription.unsubscribe();
        resolve(session);
      }
    });

    subscription = result.data.subscription;

    // Also resolve immediately if session already exists
    client.auth.getSession().then(function(res) {
      if (res.data && res.data.session) {
        clearTimeout(timer);
        if (subscription) subscription.unsubscribe();
        resolve(res.data.session);
      }
    });
  });
}

function cleanUrl() {
  if (window.history && window.history.replaceState) {
    history.replaceState(null, '', window.location.pathname);
  }
}

/* ============================================================
   WIRE FORM EVENTS
   ============================================================ */
function wireAuthForm() {
  document.querySelectorAll('.auth-tab').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
  });

  var loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleLogin();
    });
  }

  var signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleSignup();
    });
  }

  document.querySelectorAll('.pw-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() { togglePasswordShow(btn); });
  });

  document.querySelectorAll('.github-oauth-btn').forEach(function(btn) {
    btn.addEventListener('click', handleGitHubOAuth);
  });

  var forgotLink = document.querySelector('.forgot-link');
  if (forgotLink) forgotLink.addEventListener('click', handleForgotPassword);

  var signupEmail = document.getElementById('signup-email');
  if (signupEmail) signupEmail.addEventListener('blur', validateEmailField);

  var signupPw = document.getElementById('signup-password');
  if (signupPw) signupPw.addEventListener('input', validatePasswordStrength);

  var signupCfm = document.getElementById('signup-confirm');
  if (signupCfm) signupCfm.addEventListener('blur', validatePasswordMatch);
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(function(btn) {
    var isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  document.querySelectorAll('.auth-panel').forEach(function(panel) {
    var isActive = panel.id === 'panel-' + tab;
    panel.classList.toggle('active', isActive);
    panel.setAttribute('aria-hidden', String(!isActive));
  });
}

/* ============================================================
   LOGIN
   ============================================================ */
async function handleLogin() {
  var email    = document.getElementById('login-email') ? document.getElementById('login-email').value.trim() : '';
  var password = document.getElementById('login-password') ? document.getElementById('login-password').value : '';

  if (!email || !password) {
    showAuthError('login', 'Please enter your email and password.');
    return;
  }

  setButtonLoading('login-btn', true);
  clearAuthError('login');

  try {
    var client = getSupabaseClient();
    if (client) {
      var result = await client.auth.signInWithPassword({ email: email, password: password });
      if (result.error) throw result.error;
      window.location.href = safeRedirect(getParam('redirect'), 'index.html');
      return;
    }
    showToast('Running in demo mode — Supabase not connected.', 'info');
    setTimeout(function() { window.location.href = 'index.html'; }, 1000);
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
  var name     = document.getElementById('signup-name') ? document.getElementById('signup-name').value.trim() : '';
  var email    = document.getElementById('signup-email') ? document.getElementById('signup-email').value.trim() : '';
  var password = document.getElementById('signup-password') ? document.getElementById('signup-password').value : '';
  var confirm  = document.getElementById('signup-confirm') ? document.getElementById('signup-confirm').value : '';

  if (!name || !email || !password) { showAuthError('signup', 'All fields are required.'); return; }
  if (!isValidEmail(email))         { showAuthError('signup', 'Please enter a valid email address.'); return; }
  if (password.length < 8)          { showAuthError('signup', 'Password must be at least 8 characters.'); return; }
  if (password !== confirm)         { showAuthError('signup', 'Passwords do not match.'); return; }

  setButtonLoading('signup-btn', true);
  clearAuthError('signup');

  try {
    var client = getSupabaseClient();
    if (client) {
      var result = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: getSiteUrl() + '/auth',
          data: { name: name, username: generateUsername(name) },
        },
      });
      if (result.error) throw result.error;
      if (result.data && result.data.user) {
        await ensureUserProfile(result.data.user, client, name);
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
    var client = getSupabaseClient();
    if (!client) {
      showToast('Supabase not connected. Check your config.', 'error');
      return;
    }
    var result = await client.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: getSiteUrl() + '/auth',
        scopes: 'read:user user:email',
      },
    });
    if (result.error) throw result.error;
  } catch (err) {
    var msg = (err && err.message) ? err.message : '';
    if (msg.includes('provider is not enabled')) {
      showToast('GitHub OAuth is not enabled in Supabase. Enable it in Auth → Providers.', 'error', 6000);
    } else {
      showToast('GitHub sign-in failed: ' + (msg || 'Unknown error'), 'error');
    }
  }
}

/* ============================================================
   FORGOT PASSWORD
   ============================================================ */
async function handleForgotPassword(e) {
  e.preventDefault();
  var email = document.getElementById('login-email') ? document.getElementById('login-email').value.trim() : '';
  if (!email) {
    showAuthError('login', 'Enter your email above, then click Forgot password.');
    return;
  }
  try {
    var client = getSupabaseClient();
    if (client) {
      var result = await client.auth.resetPasswordForEmail(email, {
        redirectTo: getSiteUrl() + '/auth?mode=reset',
      });
      if (result.error) throw result.error;
    }
    showToast('Password reset email sent. Check your inbox.', 'success', 6000);
  } catch {
    showAuthError('login', 'Could not send reset email. Please try again.');
  }
}

/* ============================================================
   RESET PASSWORD FORM
   ============================================================ */
function showResetPasswordForm() {
  var panel = document.getElementById('panel-login');
  if (!panel) return;

  panel.innerHTML =
    '<div style="margin-bottom:20px">' +
      '<h2 style="font-size:17px;font-weight:700;color:var(--color-text-primary);margin-bottom:4px">Set a new password</h2>' +
      '<p style="font-size:13px;color:var(--color-text-secondary)">Choose a strong password for your account.</p>' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label form-label-required" for="new-password">New Password</label>' +
      '<div class="pw-wrap">' +
        '<input type="password" id="new-password" class="form-input" placeholder="Min. 8 characters" autocomplete="new-password">' +
        '<button type="button" class="pw-toggle" data-target="new-password" aria-label="Show password" aria-pressed="false">' +
          '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label form-label-required" for="confirm-new-password">Confirm Password</label>' +
      '<div class="pw-wrap">' +
        '<input type="password" id="confirm-new-password" class="form-input" placeholder="Re-enter password" autocomplete="new-password">' +
      '</div>' +
    '</div>' +
    '<button type="button" id="update-pw-btn" class="auth-submit-btn">Update Password</button>';

  panel.querySelectorAll('.pw-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() { togglePasswordShow(btn); });
  });

  var updateBtn = document.getElementById('update-pw-btn');
  if (updateBtn) updateBtn.addEventListener('click', handlePasswordUpdate);
}

async function handlePasswordUpdate() {
  var pw  = document.getElementById('new-password') ? document.getElementById('new-password').value : '';
  var cfm = document.getElementById('confirm-new-password') ? document.getElementById('confirm-new-password').value : '';
  var btn = document.getElementById('update-pw-btn');

  if (!pw || pw.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
  if (pw !== cfm)            { showToast('Passwords do not match.', 'error'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Updating…'; }

  try {
    var client = getSupabaseClient();
    if (client) {
      var sessionResult = await client.auth.getSession();
      if (!sessionResult.data || !sessionResult.data.session) {
        showToast('Your reset link has expired. Request a new one.', 'error');
        return;
      }
      var result = await client.auth.updateUser({ password: pw });
      if (result.error) throw result.error;
    }
    showToast('Password updated! Signing you in…', 'success');
    setTimeout(function() { window.location.href = 'index.html'; }, 1500);
  } catch {
    showToast('Could not update password. Request a new reset link.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
  }
}

/* ============================================================
   ENSURE USER PROFILE
   ============================================================ */
async function ensureUserProfile(user, client, displayName) {
  if (!user || !client) return;

  var name = displayName
    || (user.user_metadata && user.user_metadata.full_name)
    || (user.user_metadata && user.user_metadata.name)
    || (user.user_metadata && user.user_metadata.user_name)
    || (user.email ? user.email.split('@')[0] : 'User');

  var username = (user.user_metadata && user.user_metadata.user_name) || generateUsername(name);
  var avatar   = (user.user_metadata && user.user_metadata.avatar_url) || null;

  try {
    await client.from('users').upsert([{
      id:            user.id,
      name:          name,
      email:         user.email,
      username:      username,
      avatar_url:    avatar,
      avatar_letter: name[0].toUpperCase(),
      avatar_color:  randomAvatarColor(),
      join_date:     new Date().toISOString(),
    }], { onConflict: 'id', ignoreDuplicates: true });
  } catch (err) {
    console.warn('[auth] ensureUserProfile failed (non-blocking):', err);
  }
}

/* ============================================================
   PASSWORD SHOW / HIDE
   ============================================================ */
function togglePasswordShow(btn) {
  var targetId = btn.dataset.target;
  var input = targetId
    ? document.getElementById(targetId)
    : btn.closest('.pw-wrap') ? btn.closest('.pw-wrap').querySelector('input') : null;
  if (!input) return;

  var show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  btn.setAttribute('aria-pressed', String(show));

  btn.innerHTML = show
    ? '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>'
    : '<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
}

/* ============================================================
   VALIDATION
   ============================================================ */
function validateEmailField() {
  var input = document.getElementById('signup-email');
  if (!input) return;
  if (input.value && !isValidEmail(input.value)) {
    showInlineError(input, 'Please enter a valid email address.');
  } else {
    clearInlineError(input);
  }
}

function validatePasswordStrength() {
  var input = document.getElementById('signup-password');
  var bar   = document.getElementById('pw-strength-bar');
  var label = document.getElementById('pw-strength-label');
  if (!input) return;
  var strength = getPasswordStrength(input.value);
  var levels   = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  var colors   = ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];
  var widths   = ['0%', '25%', '50%', '75%', '100%'];
  if (bar)   { bar.style.width = widths[strength]; bar.style.background = colors[strength]; }
  if (label) { label.textContent = levels[strength]; label.style.color = colors[strength]; }
}

function validatePasswordMatch() {
  var pw  = document.getElementById('signup-password');
  var cfm = document.getElementById('signup-confirm');
  if (!pw || !cfm || !cfm.value) return;
  if (cfm.value !== pw.value) showInlineError(cfm, 'Passwords do not match.');
  else clearInlineError(cfm);
}

function getPasswordStrength(pw) {
  if (!pw) return 0;
  var s = 0;
  if (pw.length >= 8)                              s++;
  if (pw.length >= 12)                             s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))       s++;
  if (/[0-9]/.test(pw))                            s++;
  if (/[^A-Za-z0-9]/.test(pw))                    s++;
  return Math.min(4, s);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUsername(name) {
  var base = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return base + '_' + Math.floor(Math.random() * 9999);
}

function randomAvatarColor() {
  var colors = ['#16A34A','#2563EB','#D97706','#7C3AED','#0D9488','#DC2626','#DB2777','#6B7280'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function friendlyAuthError(err) {
  var msg = ((err && err.message) ? err.message : '').toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) return 'Incorrect email or password.';
  if (msg.includes('email not confirmed')) return 'Check your email and click the confirmation link first.';
  if (msg.includes('already registered') || msg.includes('already exists')) return 'An account with this email already exists. Try logging in.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Wait a moment and try again.';
  if (msg.includes('provider') && msg.includes('not enabled')) return 'GitHub login is not enabled yet. Use email/password instead.';
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'Network error. Check your connection and try again.';
  return (err && err.message) ? err.message : 'Something went wrong. Please try again.';
}

function showAuthError(panel, message) {
  var el = document.getElementById(panel + '-error');
  if (!el) return;
  var span = el.querySelector('span:last-child');
  if (span) span.textContent = message;
  el.classList.remove('hidden');
}

function clearAuthError(panel) {
  var el = document.getElementById(panel + '-error');
  if (el) el.classList.add('hidden');
}

function showInlineError(input, message) {
  input.classList.add('error');
  var group = input.closest('.form-group');
  var el = group ? group.querySelector('.form-error') : null;
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-error';
    input.parentElement.after(el);
  }
  el.textContent = message;
}

function clearInlineError(input) {
  input.classList.remove('error');
  var group = input.closest('.form-group');
  var el = group ? group.querySelector('.form-error') : null;
  if (el) el.remove();
}

function setButtonLoading(btnId, loading) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.orig = btn.textContent;
    btn.textContent  = 'Loading…';
  } else {
    btn.textContent = btn.dataset.orig || btn.textContent;
  }
}
