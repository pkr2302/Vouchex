# VouchEx QA environment (`laravel-api-testing`)

Copy of production `laravel-api` for safe changes **before** cPanel upload.

## Workflow

1. **You** describe the change.
2. **Agent** edits files here in `laravel-api-testing/` (and `frontend/` source).
3. **QA build** (frontend): from `frontend/` folder run `npm run build:qa`  
   → output goes to `laravel-api-testing/public/` only (production `laravel-api/public` is untouched).
4. **You review** — see “Local preview” below.
5. **After approval** — agent copies the same changes to `laravel-api/` and gives you the exact cPanel upload list.

## Local preview

### Frontend only (fastest — live API on cPanel)

```powershell
cd frontend
npm run dev:qa
```

Open **http://127.0.0.1:5174** — UI runs locally; set `frontend/.env.local` if needed:

```
VITE_API_BASE_URL=https://vouchex.kuhu.org.in/api
```

Use a test login only; avoid destructive actions on live data during UI review.

### Full stack (needs PHP + Composer on this PC)

```powershell
cd laravel-api-testing
composer install
copy .env.example .env
php artisan key:generate
php artisan serve --port=8001
```

Then in another terminal: `cd frontend && npm run dev:qa` → http://127.0.0.1:5174

## Rules

- **Never** run `npm run build` (production) until QA is approved.
- **Never** upload from `laravel-api-testing/` to cPanel — only from `laravel-api/` after sign-off.
- Backend-only changes: edit `laravel-api-testing` first, test with artisan, then promote to `laravel-api`.
