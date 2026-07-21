# Contributing to SLM Marketplace

Thank you for your interest in contributing. This document explains how to get started.

---

## What We Need Help With

### Beginner-friendly
- Fix broken links in docs sidebar
- Add missing alt text to images
- Improve error messages to be more user-friendly
- Add loading skeletons to cards

### Intermediate
- Load bookmark state on Explore page
- Add pagination to Profile page
- Add dark mode toggle to main app
- Improve mobile navigation

### Advanced
- Make docs sidebar data-driven (eliminate 49 copies)
- Add model comparison page
- Build API for programmatic model discovery
- Add WebGPU in-browser inference

---

## How to Contribute

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/slm-marketplace.git
cd slm-marketplace
```

### 2. Set up local dev

```bash
npm install -g wrangler
cp config.example.js config.js
# Fill config.js with your Supabase credentials
wrangler pages dev . --port 8788
```

### 3. Make your changes

Create a branch:
```bash
git checkout -b fix/bookmark-state
# or
git checkout -b feature/dark-mode-toggle
```

### 4. Coding rules — read these before writing any code

| Rule | Why |
|------|-----|
| Vanilla JS only | No React/Vue/jQuery — keeps it simple for all contributors |
| Separate HTML/CSS/JS | Never mix concerns |
| One function, one job | Easier to test and review |
| `sanitize()` before innerHTML | Prevents XSS |
| `addEventListener` not onclick | CSP compliance + cleaner code |
| try/catch every async call | Silent failures hurt users |
| No inline styles in JS | Breaks dark mode, theming |

### 5. Open a Pull Request

```bash
git add .
git commit -m "fix: load bookmark state on explore page"
git push origin fix/bookmark-state
```

Then open a PR on GitHub. Describe what you changed and why.

---

## Reporting Bugs

Open an issue at: https://github.com/sannanansari/slm-marketplace/issues

Include:
- What you did
- What you expected
- What actually happened
- Browser + OS
- Console errors (F12 → Console)

---

## Code Style

- **Indentation:** 2 spaces
- **Quotes:** single quotes in JS
- **Semicolons:** yes
- **Function names:** camelCase
- **CSS classes:** kebab-case
- **Constants:** UPPER_SNAKE_CASE

---

## Questions?

Open a GitHub Discussion or an Issue tagged `question`.
