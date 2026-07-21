# SLM Marketplace

<div align="center">

<img src="https://slm-marketplace.sannan.app/assets/og-image.svg" alt="SLM Marketplace" width="120">

**The open source marketplace for Small Language Models**

Discover · Upload · Fine-tune · Deploy · Share

[![Live Site](https://img.shields.io/badge/Live-slm--marketplace.sannan.app-F97316?style=for-the-badge)](https://slm-marketplace.sannan.app)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/sannanansari/slm-marketplace?style=for-the-badge)](https://github.com/sannanansari/slm-marketplace/stargazers)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red?style=for-the-badge)](https://github.com/sannanansari/slm-marketplace)

</div>

---

## What is SLM Marketplace?

SLM Marketplace is a free, open source platform where AI engineers can **discover, upload, share, and review Small Language Models (SLMs)** — models between 1B and 7B parameters that run on consumer hardware.

Think of it as the HuggingFace Hub, but purpose-built for small models with a community-first approach, built-in learning resources, and zero barriers to publishing your first model.

### Why Small Language Models?

| | SLM (1B–7B) | LLM (70B+) |
|--|-------------|------------|
| **Hardware** | Laptop / gaming GPU | A100 cluster |
| **Cost to run** | $0 (local) | $0.01–$0.06 per 1K tokens |
| **Fine-tuning** | $0–$50 on free Colab | $10,000+ |
| **Privacy** | Fully offline | Data sent to cloud |
| **Domain accuracy** | Excellent after fine-tuning | Good (prompts only) |

A fine-tuned 3B model consistently outperforms GPT-4 on specific domain tasks — at zero running cost.

---

## Features

### For Model Consumers
- 🔍 **Explore** — search and filter models by domain, size, rating, and task
- ⭐ **Reviews** — community ratings and detailed reviews
- 🔖 **Bookmarks** — save models for later
- 📊 **Leaderboard** — discover top engineers and most-downloaded models
- 🦙 **One-click run** — every model shows Ollama and HuggingFace download commands

### For Model Builders
- 📤 **Upload** — publish your fine-tuned SLM in minutes
- 📈 **Analytics** — track downloads, views, and ratings
- 🏆 **Score system** — earn reputation based on downloads, ratings, and model count
- 🗂️ **Model cards** — rich descriptions, benchmarks, and usage examples

### For Learners
- 🗺️ **6-Month Roadmap** — day-by-day curriculum from Python basics to publishing your first SLM
- 📚 **Documentation** — the most beginner-friendly SLM learning resource on the internet
- 🏗️ **Guided Projects** — build real things: chatbots, RAG systems, domain experts, agents
- 📖 **Topics covered:** Python, PyTorch, CUDA, LoRA, QLoRA, Unsloth, GGUF, vLLM, Ollama, RAG, Agents, MCP, Deployment

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email + GitHub OAuth) |
| Storage | Supabase Storage |
| Hosting | Cloudflare Pages |
| Search | PostgreSQL full-text search (GIN index) |
| No build step | Pure static files — no webpack, no npm |

**Why vanilla JS?** No framework means no breaking changes, no node_modules, no build pipeline. The entire site deploys in 15 seconds as static files. Any developer can read and contribute without learning a framework.

---

## Getting Started

### Prerequisites
- A [Supabase](https://supabase.com) account (free)
- A [Cloudflare](https://cloudflare.com) account (free)
- Git

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/sannanansari/slm-marketplace.git
cd slm-marketplace

# 2. Install Wrangler (Cloudflare local dev server)
npm install -g wrangler

# 3. Copy and fill in your Supabase credentials
cp config.example.js config.js
# Edit config.js with your real Supabase URL and key

# 4. Run locally
wrangler pages dev . --port 8788

# 5. Open http://localhost:8788
```

### Database Setup

```bash
# In Supabase SQL Editor — run these two files in order:
# 1. supabase-schema.sql      (creates all tables, RLS, triggers, indexes)
# 2. supabase-schema-fixes.sql (adds missing columns, fixes functions)
```

### Environment Variables

```javascript
// config.js — fill with your real values from Supabase Settings → API
window.__SLM_CONFIG = {
  url:     'https://YOUR_PROJECT.supabase.co',
  key:     'YOUR_PUBLISHABLE_KEY',
  siteUrl: 'https://slm-marketplace.sannan.app'
};
```

---

## Project Structure

```
slm-marketplace/
├── index.html              # Home / landing page
├── explore.html            # Model discovery + search
├── model.html              # Individual model page
├── upload.html             # Upload flow (auth required)
├── auth.html               # Login / Signup / Reset
├── profile.html            # User profile (auth required)
├── leaderboard.html        # Top engineers
├── config.js               # Supabase config (gitignored)
├── config.example.js       # Config template (commit this)
├── _headers                # Cloudflare security + cache headers
├── _redirects              # Cloudflare URL routing
├── supabase-schema.sql     # Complete database schema
├── supabase-schema-fixes.sql
├── css/                    # Per-page stylesheets
├── js/                     # Per-page JavaScript
│   ├── supabase.js         # Client singleton
│   ├── global.js           # Shared utilities + mock data
│   ├── auth.js             # All auth flows
│   ├── explore.js          # Search + filter + paginate
│   ├── upload.js           # Upload form
│   ├── model.js            # Model detail + reviews
│   ├── profile.js          # Profile page
│   └── leaderboard.js      # Rankings
├── assets/                 # Icons, images
└── docs/                   # Complete documentation platform
    ├── getting-started/    # What is an SLM?
    ├── roadmap/            # 6-month learning curriculum
    ├── fine-tuning/        # LoRA, QLoRA, Unsloth
    ├── quantization/       # GGUF, GPTQ, AWQ
    ├── inference/          # Ollama, vLLM
    ├── rag/                # RAG pipelines
    ├── deployment/         # Cloud deployment
    └── publishing/         # HuggingFace + SLM Marketplace
```

---

## Documentation

The docs platform at [slm-marketplace.sannan.app/docs](https://slm-marketplace.sannan.app/docs) includes:

- **[6-Month SLM Roadmap](https://slm-marketplace.sannan.app/docs/roadmap/)** — Day-by-day curriculum
- **[Fine-Tuning Guide](https://slm-marketplace.sannan.app/docs/fine-tuning/)** — LoRA, QLoRA, full training script
- **[Quantization Guide](https://slm-marketplace.sannan.app/docs/quantization/)** — GGUF, GPTQ, AWQ with benchmarks
- **[RAG Guide](https://slm-marketplace.sannan.app/docs/rag/)** — Chroma, FAISS, PGVector, hybrid search
- **[Ollama Guide](https://slm-marketplace.sannan.app/docs/inference/ollama.html)** — Run any SLM locally
- **[Publishing Guide](https://slm-marketplace.sannan.app/docs/publishing/)** — HuggingFace + SLM Marketplace

---

## Deployment

### Cloudflare Pages (recommended)

```
1. Push to GitHub
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect Git
3. Build command:        (leave empty)
4. Build output dir:     /
5. Deploy
```

No build step. No configuration. Just static files.

### Environment Variables on Cloudflare

Set these in Pages → Settings → Environment variables:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your publishable key |
| `SITE_URL` | Your live domain |

---

## Contributing

Contributions are welcome. Here's how:

```bash
# Fork the repo on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/slm-marketplace.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# Follow the coding rules below

# Push and open a Pull Request
git push origin feature/your-feature-name
```

### Coding Rules

- **Vanilla JS only** — no React, Vue, jQuery, or any framework
- **Separate files** — HTML, CSS, and JS always in separate files
- **Single responsibility** — each function does exactly one thing
- **Sanitize all input** — use `sanitize()` before every `innerHTML`
- **addEventListener only** — no `onclick` attributes in HTML
- **Try/catch everything** — every async Supabase call needs error handling
- **No inline styles** — never add styles in JavaScript

### Good First Issues

- [ ] Load bookmark state on Explore page (show saved models as already bookmarked)
- [ ] Add pagination to Profile page (currently loads all models at once)
- [ ] Add dark mode toggle to main app (docs already has dark mode)
- [ ] Add Turnstile CAPTCHA to signup form
- [ ] Make docs sidebar data-driven (currently hardcoded in 49 HTML files)
- [ ] Add model search by parameter count range
- [ ] Add multilingual full-text search (currently English only)

---

## Roadmap

### v1.1 (Next)
- [ ] Model comparison page (side-by-side benchmarks)
- [ ] Collections / lists (curated model packs)
- [ ] Email notifications on new reviews
- [ ] Model version history

### v1.2
- [ ] Direct GGUF file upload to Supabase Storage
- [ ] One-click Ollama run button (generates `ollama run hf.co/...` command)
- [ ] API for programmatic model discovery
- [ ] Embed widget for external sites

### v2.0
- [ ] Model playground (run SLMs in browser via WebGPU)
- [ ] Community Discord integration
- [ ] Organisation accounts for teams
- [ ] Model fine-tuning jobs (trigger Colab from marketplace)

---

## Database Schema

Core tables:

```sql
users    → id (uuid), name, username, score, total_downloads, model_count
models   → id, title, category, engineer_id, tags, rating, download_count, search_vector
reviews  → id, model_id, user_id, rating, comment  [UNIQUE per user per model]
bookmarks→ id, model_id, user_id                   [UNIQUE per user per model]
downloads→ id, model_id, user_id (nullable)
activity → id, user_id, action_type, target_id
follows  → id, follower_id, following_id
```

All tables have Row Level Security enabled. Anonymous users can read published models. Writes require authentication and ownership verification.

---

## Security

- **RLS on all tables** — Supabase Row Level Security enforces all authorization at the database level
- **Sanitized output** — all user content escaped through `sanitize()` before rendering
- **No secrets in git** — Supabase credentials in `config.js` (gitignored) or Cloudflare env vars
- **CSP headers** — Content Security Policy restricts script sources
- **Safe redirects** — `safeRedirect()` blocks open redirect attacks
- **Anon key is safe** — the publishable key is designed to be public; RLS handles security

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Free to use, modify, and distribute. Commercial use permitted.

---

## Author

**Sannan Ansari**
- GitHub: [@sannanansari](https://github.com/sannanansari)
- Project: [slm-marketplace.sannan.app](https://slm-marketplace.sannan.app)

---

## Acknowledgements

- [Supabase](https://supabase.com) — database, auth, and storage
- [Cloudflare Pages](https://pages.cloudflare.com) — hosting
- [HuggingFace](https://huggingface.co) — the SLM ecosystem this is built for
- [Unsloth](https://github.com/unslothai/unsloth) — fine-tuning framework featured in docs
- [Ollama](https://ollama.com) — local inference tool featured in docs

---

<div align="center">

**Built for the open source AI community**

If this project helps you, please ⭐ star the repo

[Live Site](https://slm-marketplace.sannan.app) · [Documentation](https://slm-marketplace.sannan.app/docs) · [Report Bug](https://github.com/sannanansari/slm-marketplace/issues) · [Request Feature](https://github.com/sannanansari/slm-marketplace/issues)

</div>
