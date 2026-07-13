# Supabase Auth Setup — slm-market.sannan.app

Complete guide for Email + GitHub OAuth to work in production.

---

## STEP 1 — URL Configuration (MOST IMPORTANT)

Supabase → Authentication → URL Configuration

**Site URL** (set to exactly this):

```
https://slm-market.sannan.app
```

**Redirect URLs** (add ALL of these — click Add URL for each):

```
https://slm-market.sannan.app
https://slm-market.sannan.app/auth
https://slm-market.sannan.app/auth.html
https://slm-market.sannan.app/index.html
http://localhost:8788
http://localhost:3000
```

Click **Save** after adding all URLs.

---

## STEP 2 — Enable GitHub OAuth

### 2a. Create GitHub OAuth App

Go to: https://github.com/settings/developers
→ OAuth Apps → New OAuth App

Fill in:
| Field | Value |
|---|---|
| Application name | SLM Marketplace |
| Homepage URL | `https://slm-market.sannan.app` |
| Authorization callback URL | `https://YOUR_PROJECT.supabase.co/auth/v1/callback` |

(Replace YOUR_PROJECT with your actual Supabase project ref)

Click **Register application**.

Then click **Generate a new client secret**.

Copy both:

- **Client ID** (public)
- **Client Secret** (secret — shown once)

### 2b. Enable in Supabase

Supabase → Authentication → Providers → GitHub

Toggle **Enable GitHub** ON

Paste:

- Client ID → into Client ID field
- Client Secret → into Client Secret field

Click **Save**.

---

## STEP 3 — Email Settings

Supabase → Authentication → Email Templates

### Confirmation email template

Change the redirect URL in the template from the default to:

```
https://slm-market.sannan.app/auth
```

### SMTP (optional but recommended)

By default Supabase sends emails from their own domain.
For production, use your own SMTP:

Supabase → Project Settings → Authentication → SMTP Settings:

- Enable custom SMTP
- Use SendGrid, Resend, or AWS SES
- From email: `noreply@sannan.app`
- From name: `SLM Marketplace`

Supabase free tier limits: 4 emails/hour.
With custom SMTP: unlimited.

---

## STEP 4 — Run the Schema

Supabase → SQL Editor → paste entire supabase-schema.sql → Run

This creates:

- users, models, reviews, bookmarks, downloads, activity, follows tables
- All RLS policies
- Triggers (rating recalc, score recalc)
- RPCs (follow, unfollow, increment_view_count, increment_download_count)

---

## STEP 5 — Cloudflare Pages Env Vars

CF Pages → slm-marketplace → Settings → Environment Variables

| Variable          | Value                    | Encrypt |
| ----------------- | ------------------------ | ------- |
| SUPABASE_URL      | https://xxxx.supabase.co | No      |
| SUPABASE_ANON_KEY | eyJhbGci...              | Yes     |

Both in **Production** AND **Preview** environments.

After saving → Retry deployment.

---

## STEP 6 — Verify Auth Works

### Test email signup:

1. Go to `https://slm-market.sannan.app/auth`
2. Click Sign Up
3. Fill in name, email, password
4. Click Create Account
5. Check email for confirmation link
6. Click link → should redirect to `https://slm-market.sannan.app/auth`
7. Should see "Email confirmed! Welcome" toast → auto redirect to homepage

### Test GitHub OAuth:

1. Go to `https://slm-market.sannan.app/auth`
2. Click "Continue with GitHub"
3. Authorise on GitHub
4. Should redirect back to `https://slm-market.sannan.app/auth`
5. Session detected → auto redirect to homepage
6. Header shows your avatar initial

### If GitHub OAuth fails with "provider not enabled":

→ Go back to Step 2b and enable GitHub in Supabase providers

### If email link goes to wrong page:

→ Check Step 1 — Redirect URLs must include `https://slm-market.sannan.app/auth`

### If /js/config.js returns empty:

→ Check Step 5 — env vars must be set AND redeployment triggered

---

## STEP 7 — Check it's all working

Open browser DevTools → Network tab → go to /auth

You should see:

- `js/config.js` → response contains your Supabase URL ✓
- `supabase.min.js` → 200 from jsdelivr ✓
- No red requests in Network tab ✓

Check Console tab — should be zero errors.
