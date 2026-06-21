# Supabase Setup for slm-market.sannan.app

## 1. Create Supabase project
Go to https://supabase.com → New project → choose a region close to your users.

## 2. Run the schema
SQL Editor → paste the contents of `supabase-schema.sql` → Run.

## 3. Configure Auth URLs
Supabase Dashboard → Authentication → URL Configuration:

| Setting | Value |
|---|---|
| Site URL | `https://slm-market.sannan.app` |
| Redirect URLs (add all) | `https://slm-market.sannan.app/index.html` |
| | `https://slm-market.sannan.app/auth.html` |
| | `https://slm-market.sannan.app` |
| | `http://localhost:8788` ← for local dev |
| | `http://localhost:8000` ← for plain server |

## 4. Enable GitHub OAuth (optional)
Supabase Dashboard → Authentication → Providers → GitHub:
- Create a GitHub OAuth App at https://github.com/settings/developers
- Homepage URL: `https://slm-market.sannan.app`
- Callback URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- Paste Client ID + Secret into Supabase

## 5. Set CF Pages Environment Variables
CF Dashboard → Pages → slm-marketplace → Settings → Environment Variables:

| Variable | Value | Environment |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Production + Preview |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | Production + Preview |

**Note:** The anon key is safe to expose to browsers — it's public by design.
Supabase Row Level Security (already configured in the schema) protects your data.
Never put your `service_role` key here.

## 6. Email templates (optional polish)
Supabase Dashboard → Authentication → Email Templates:
- Change the confirmation link domain from `supabase.co` to `slm-market.sannan.app`
- Update the From name to "SLM Marketplace"

## 7. Rate limiting
Supabase Free tier: 100 requests/hour per IP on auth endpoints.
If you expect more, upgrade to Pro or add a Cloudflare Rate Limiting rule:
CF Dashboard → Security → WAF → Rate Limiting Rules:
- Path: `/auth.html*`
- Rate: 10 requests per minute per IP
- Action: Block
