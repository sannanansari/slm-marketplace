# SLM Marketplace — Project Structure

```
slm-marketplace/
│
├── index.html              # Home / landing page
├── explore.html            # Model discovery + search
├── model.html              # Individual model page
├── upload.html             # Model upload flow (protected)
├── auth.html               # Login / Signup / Password reset
├── profile.html            # User profile (protected)
├── leaderboard.html        # Model rankings
│
├── _headers                # Cloudflare Pages HTTP headers (security, cache)
├── _redirects              # Cloudflare Pages URL rewrites
├── _worker.js              # Cloudflare Workers edge config injection
│                             (injects SUPABASE_URL, SUPABASE_ANON_KEY at runtime)
├── .dev.vars               # Local dev secrets (never commit real values)
├── config.example.js       # Documents expected config shape — not loaded at runtime
├── sitemap.xml             # SEO sitemap
├── robots.txt              # Crawler rules
│
├── css/
│   ├── global.css          # CSS variables, reset, shared components
│   ├── explore.css         # Explore page styles
│   ├── model.css           # Model page styles
│   ├── upload.css          # Upload form styles
│   ├── auth.css            # Auth page styles
│   ├── profile.css         # Profile page styles
│   └── leaderboard.css     # Leaderboard page styles
│
├── js/
│   ├── global.js           # Shared utilities, header/footer, session check,
│   │                         handleLogout(), error boundary
│   ├── supabase.js         # Supabase client singleton (getSupabaseClient())
│   ├── auth.js             # Auth flows: login, signup, OAuth, password reset
│   │                         FIX A1: waitForSession() replaces setTimeout hack
│   │                         FIX A2: handleLogout() moved to global.js
│   │                         FIX A3: getSiteUrl() reads from config, not hardcoded
│   ├── explore.js          # Explore page: search, filter, sort, pagination
│   ├── model.js            # Model detail page: load model, reviews, bookmarks
│   ├── upload.js           # Upload form: validation, Supabase storage upload
│   ├── profile.js          # Profile page: load user data, models, activity
│   └── leaderboard.js      # Leaderboard: rankings, filters
│
├── assets/
│   ├── favicon.svg
│   ├── og-image.svg
│   └── logo.svg
│
└── docs/                   # Documentation platform
    ├── index.html          # Docs home / hub
    ├── docs.css            # Shared docs styles (sidebar, TOC, code blocks,
    │                         dark mode, tab groups, FAQ, card grids)
    ├── docs.js             # Shared docs JS (search, TOC, mobile menu,
    │                         FAQ toggles, tab groups, reading progress)
    │
    ├── getting-started/
    │   └── index.html      # What is an SLM, SLM vs LLM, first SLM in 5 min
    │
    ├── roadmap/
    │   └── index.html      # 6-month day-by-day curriculum (Month 1–6)
    │
    ├── setup/
    │   ├── index.html      # Environment setup (Python, Git, CUDA)
    │   ├── colab.html      # Google Colab guide
    │   └── gpu-guide.html  # GPU selection and setup guide
    │
    ├── foundations/
    │   └── index.html      # Transformers, attention, tokenization, embeddings
    │
    ├── tutorials/
    │   └── index.html      # Build your first SLM end-to-end tutorial
    │
    ├── fine-tuning/
    │   ├── index.html      # LoRA, QLoRA, Unsloth, SFTTrainer — full guide
    │   └── qlora.html      # QLoRA deep dive
    │
    ├── datasets/
    │   └── index.html      # Dataset collection, cleaning, formatting, publishing
    │
    ├── evaluation/
    │   └── index.html      # Metrics, lm-eval-harness, RAGAS, LLM-as-judge
    │
    ├── quantization/
    │   └── index.html      # GGUF, GPTQ, AWQ — with real benchmarks
    │
    ├── inference/
    │   ├── index.html      # Inference overview
    │   ├── ollama.html     # Ollama: install, API, Modelfiles, custom GGUF
    │   └── vllm.html       # vLLM: PagedAttention, OpenAI API, production
    │
    ├── deployment/
    │   └── index.html      # RunPod, HF Spaces, Docker, monitoring
    │
    ├── rag/
    │   └── index.html      # RAG: Chroma, FAISS, PGVector, hybrid search
    │
    ├── projects/
    │   └── index.html      # Guided projects (chatbot, RAG system, agent)
    │
    ├── hardware/
    │   └── index.html      # GPU selection, VRAM requirements, cloud options
    │
    ├── costs/
    │   └── index.html      # Training and inference cost calculator
    │
    ├── publishing/
    │   └── index.html      # HuggingFace Hub, SLM Marketplace, model cards
    │
    ├── best-practices/
    │   └── index.html      # Production SLM engineering best practices
    │
    └── troubleshooting/
        └── index.html      # Common errors and fixes
```

## Architecture Decisions

**Why vanilla JS?**  
No build step means no node_modules, no webpack config, no breaking changes from 
framework upgrades. The site works as static HTML served from any CDN.

**Why Cloudflare Pages + Workers?**  
Workers inject Supabase credentials at the edge without them appearing in git or 
the client bundle. Free tier covers 100K requests/day.

**Why Supabase?**  
Row-Level Security, auth, storage, and Postgres in one service. The anon key is 
safe to expose client-side because RLS policies enforce authorization.

**Why docs as static HTML?**  
No CMS means docs are versioned in git, can be PR-reviewed, and deploy instantly.
The tradeoff is manual sidebar updates — acceptable at current scale.
