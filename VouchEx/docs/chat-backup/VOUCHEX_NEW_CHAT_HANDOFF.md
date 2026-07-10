# VouchEx — New Chat Handoff (paste this into a fresh Cursor chat)

Use this file to restore context when starting a **new Cursor chat** after disconnecting from GitHub or switching machines.

---

## Project

- **Product:** VouchEx — cloud GST & accounting portal (ClearBooks-style replica, multi-company SaaS)
- **Live site:** https://vouchex.kuhu.org.in
- **Local path:** `C:\Users\Priyank K Rajpopat\.gemini\antigravity-ide\scratch\VouchEx`
- **cPanel app root:** `~/vouchex` (Laravel `public/` is web root)
- **GitHub (being removed):** was `https://github.com/rajatlakhani2/vouchex.git` — user disconnecting to start fresh

---

## User workflow (IMPORTANT)

- User **does not edit code** — assistant builds locally, user **uploads files to cPanel**
- Deploy: upload changed files to `public/` + backend PHP; run `php artisan config:cache`, `route:cache`, `view:cache`
- Frontend build: `cd frontend && npm run build` → outputs to `laravel-api/public/`
- **Never commit `.env`** or secrets

---

## Architecture

- **Frontend:** React + Vite in `frontend/`
- **Backend:** Laravel in `laravel-api/`
- **Multi-company:** separate MySQL DB per company + master DB
- **Single subdomain** — no split Laravel/React domains

---

## Key directories & files

| Area | Path |
|------|------|
| Marketing landing | `frontend/src/components/MarketingPage.jsx`, `marketing.css` |
| Main app | `frontend/src/App.jsx`, `App.css` |
| Auth | `frontend/src/components/AuthPage.jsx` |
| Subscription | `frontend/src/components/SubscriptionPage.jsx` |
| Legal pages | `laravel-api/resources/views/legal/` |
| Routes | `laravel-api/routes/web.php`, `api.php` |
| SEO | `frontend/index.html`, `public/sitemap.xml`, `public/robots.txt` |
| Favicons | `public/favicon-48.png`, `favicon.ico`, `apple-touch-icon.png` |
| GBP images | `public/brand/google-business/gbp-logo-720x720.png`, `gbp-cover-1080x608.png` |

---

## Completed work (high level)

### Landing & marketing
- Sticky header, demo carousel, footer (Help modal, share link, Privacy/Terms)
- Real demo screenshots at `/brand/demo/`

### Backend fixes
- Google OAuth intent (register vs login)
- Trial/portal access middleware
- Company-scoped data for company admins
- Subscription UPI payment + email notify

### Google OAuth / legal
- Privacy Policy + Terms at `/privacy-policy`, `/terms-of-service`
- OAuth branding verified in Google Cloud Console

### SEO & Search Console
- Property verified: `https://vouchex.kuhu.org.in`
- Sitemap submitted (`sitemap.xml` — homepage only now)
- Homepage indexed; legal pages have `noindex` (should not appear in search)
- Canonical + Open Graph + JSON-LD in `index.html`
- Favicon PNGs for Google search icon (updates slowly)

### Google Business Profile
- Profile created; logo 720×720, cover 1080×608 (separate slots)
- Photos may show "Pending" 1–7 days — automatic review

### Mobile responsive (desktop unchanged via @media)
- Hamburger sidebar for logged-in app
- Mobile header: company + avatar + logout on **one top row** (fixed floating bar issue)
- Forms stack to 1 column; subscription plans stack; compact dashboard spacing

---

## Latest frontend build (check before deploy — hashes change each build)

After last mobile header fix:
- `assets/index-gUY6WDhY.css`
- `assets/index-0KPnOvjM.js`
- `index.html`

Run fresh `npm run build` and upload new hashes if code changed since.

---

## Search / branding notes

- `site:vouchex.kuhu.org.in` — homepage indexed
- Bare search "vouchex" — other unrelated sites still rank; takes time
- Trademark + `vouchex.in` domain recommended for brand protection
- Do **not** remove `googlecfa0a9660fbc0d0d.html` from `public/` (Search Console verification)

---

## Test accounts

- Super admin: `admin@vouchex.com` / `user123`
- Company admin: `admin@company.com` / `user123`

---

## `.env` highlights (live — do not commit)

- `GOOGLE_CLIENT_ID` set for production
- Mail: `mail.kuhu.org.in`, `noreply.vouchex@kuhu.org.in`
- `VOUCHEX_UPI_QR_URL=/brand/upi-payment-qr.png`

---

## Pending / future (not done)

- Mobile polish on every screen (invoice line items still horizontal scroll)
- Trademark registration (Class 9 + 42)
- Own domain `vouchex.in` / `vouchex.com`
- Fresh GitHub setup (user removing old repo first)
- Ranking #1 for "vouchex" globally — long-term SEO

---

## How to continue in a new chat

1. Open VouchEx folder in Cursor (not via old GitHub chat link)
2. Paste **this entire file** as your first message, plus your new task
3. Optional: also attach `docs/chat-backup/VOUCHEX_FULL_CHAT_BACKUP.md` if you need exact old Q&A
4. Say: *"Follow our usual workflow — I only upload to cPanel, you make changes locally and tell me what to upload."*

---

## Full conversation backup

See `docs/chat-backup/VOUCHEX_FULL_CHAT_BACKUP.md` for the complete exported chat history.

Transcript source: Cursor agent transcript `39d578cb-d69a-4f3f-816d-a510c0f68518`
