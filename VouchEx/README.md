# VouchEx — Multi-Company GST Accounting Portal

Complete cloud accounting portal (ClearBooks UI replica) with **multi-company SaaS architecture**.

## Status: Ready for cPanel deployment

- [x] Laravel 11 API (auth, CRUD, sync, document locks)
- [x] Multi-company Option B (single DB, `company_id` isolation)
- [x] React 19 frontend (all 8 tabs, GST, exports, PDF, OCR)
- [x] Production build in `laravel-api/public/`
- [x] Database migrations + seeder

## Project structure

```
VouchEx/
├── laravel-api/          ← UPLOAD THIS to cPanel
│   ├── app/              Controllers, Models, Services
│   ├── database/         Migrations + Seeder
│   ├── public/           Built frontend + index.php (web root)
│   └── routes/           API + SPA routes
├── frontend/             React source (for future edits only)
├── CPANEL_DEPLOYMENT.md  ← YOUR step-by-step upload guide
└── README.md
```

## Deploy

**Read `CPANEL_DEPLOYMENT.md`** — it walks you through creating subdomain + database, then uploading.

## Default logins (change after first login)

| Email | Password | Role |
|-------|----------|------|
| admin@vouchex.com | user123 | Super Admin |
| admin@company.com | user123 | Company Admin |
| rohit.sharma@company.com | user123 | User |

## Rebuild frontend (only if UI changes later)

```bash
cd frontend
npm install
npm run build
```

Output goes to `laravel-api/public/`.
