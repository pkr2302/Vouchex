# VouchEx — cPanel Deployment Guide (Step-by-Step)

This portal runs on **one subdomain only** (frontend + API together).  
You upload files; the app is already built.

---

## BEFORE YOU START — What you need to create in cPanel

You will do these **two things in cPanel first** (detailed steps in Part 1 and Part 2 below):

1. **One subdomain** — e.g. `vouchex.kuhu.org.in`
2. **One MySQL database** — e.g. `kuhuorgi_vouchex`

---

## PART 1 — Create the subdomain

1. Log in to **SpidyHost** → click **Login to Control Panel** (cPanel).
2. In the left sidebar, click **Domains** (or find **Domains** in the main area).
3. Click the blue button **Create A New Domain** (or **Create Subdomain**).
   - If you are at **5/5 subdomains**, you must **delete an unused subdomain first** (e.g. old `api.clearbooks.kuhu.org.in`) OR **upgrade** your plan.
4. In the **Domain** field, type: `vouchex.kuhu.org.in` (replace with your chosen name).
5. **Document Root** — set to:
   ```
   /home/kuhuorgi/vouchex/public
   ```
   (Replace `kuhuorgi` with your cPanel username if different.)
6. Click **Submit** or **Create**.
7. Wait 1–5 minutes for DNS to apply.
8. In cPanel → **SSL/TLS Status** (or **Security** → **SSL/TLS**) → run **AutoSSL** for `vouchex.kuhu.org.in` so HTTPS works.

---

## PART 2 — Create the MySQL database

1. In cPanel, open **MySQL® Databases**.
2. Under **Create New Database**:
   - Type database name: `vouchex` (cPanel adds prefix → `kuhuorgi_vouchex`).
   - Click **Create Database**.
3. Under **MySQL Users** → **Add New User**:
   - Username: `vouchex_user` → becomes `kuhuorgi_vouchex_user`
   - Password: click **Generate Password** → **copy and save it** in Notepad.
   - Click **Create User**.
4. Under **Add User To Database**:
   - User: `kuhuorgi_vouchex_user`
   - Database: `kuhuorgi_vouchex`
   - Click **Add**.
5. On privileges screen, check **ALL PRIVILEGES** → **Make Changes**.

Write down:
- Database name: `kuhuorgi_vouchex`
- Username: `kuhuorgi_vouchex_user`
- Password: (the one you saved)

---

## PART 3 — Upload VouchEx files

### Folder to upload (from your PC)

```
c:\Users\Priyank K Rajpopat\.gemini\antigravity-ide\scratch\VouchEx\laravel-api\
```

Upload **the entire `laravel-api` folder contents** to:

```
/home/kuhuorgi/vouchex/
```

So on the server you have:
```
/home/kuhuorgi/vouchex/app/
/home/kuhuorgi/vouchex/bootstrap/
/home/kuhuorgi/vouchex/config/
/home/kuhuorgi/vouchex/database/
/home/kuhuorgi/vouchex/public/    ← subdomain points here
/home/kuhuorgi/vouchex/routes/
/home/kuhuorgi/vouchex/storage/
/home/kuhuorgi/vouchex/artisan
/home/kuhuorgi/vouchex/composer.json
... etc
```

### How to upload (File Manager)

1. cPanel → **File Manager**.
2. Go to `/home/kuhuorgi/`.
3. Click **+ Folder** → name it `vouchex` → **Create**.
4. Open the `vouchex` folder.
5. Click **Upload** → upload a **ZIP** of the `laravel-api` folder (recommended), then **Extract**.
   - Or upload all folders/files via FTP (FileZilla) if you prefer.

**Do NOT upload** `frontend/node_modules` — only `laravel-api` is needed on the server.

---

## PART 4 — Configure `.env` on the server

1. In File Manager, open `/home/kuhuorgi/vouchex/`.
2. Find `.env.example` → **Rename** to `.env`.
3. **Edit** `.env` and set these fields exactly:

```env
APP_NAME=VouchEx
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://vouchex.kuhu.org.in

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=kuhuorgi_vouchex
DB_USERNAME=kuhuorgi_vouchex_user
DB_PASSWORD=YOUR_DATABASE_PASSWORD_HERE

SESSION_DRIVER=file
DOCUMENT_LOCK_TTL_MINUTES=15
```

4. Save the file.

---

## PART 5 — Install PHP dependencies & run migrations (Terminal)

1. cPanel → **Terminal** (under **Advanced**).
2. Run these commands **one at a time**:

```bash
cd ~/vouchex
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

If `composer` is not found, use:
```bash
/usr/local/bin/composer install --no-dev --optimize-autoloader
```

3. Set folder permissions if needed:
```bash
chmod -R 775 storage bootstrap/cache
```

---

## PART 6 — Verify the portal

1. Open browser: `https://vouchex.kuhu.org.in`
2. You should see the **VouchEx login screen**.
3. Log in with:

| Email | Password | Role |
|-------|----------|------|
| `admin@vouchex.com` | `user123` | Super Admin (creates companies) |
| `admin@company.com` | `user123` | Company Admin |
| `rohit.sharma@company.com` | `user123` | User |

4. **Change all passwords** in Settings → User Management after first login.

### Super Admin flow
1. Log in as `admin@vouchex.com`
2. Use the **company dropdown** in the top header to select a company
3. Go to **Settings → Manage Companies** to create new companies

---

## PART 7 — After future updates (when I give you new files)

1. Upload only changed files to `/home/kuhuorgi/vouchex/` (overwrite).
2. If database changed, run in Terminal:
   ```bash
   cd ~/vouchex && php artisan migrate --force
   ```
3. If frontend changed, the built files are already in `public/assets/` — upload those.
4. Clear cache:
   ```bash
   php artisan config:cache && php artisan route:cache
   ```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank white page | Check `storage/logs/laravel.log` in File Manager |
| 500 error on login | Verify `.env` database password; run `php artisan migrate --force` |
| "Company context required" | Super admin must select a company from header dropdown |
| API not found | Document root must be `vouchex/public` not `vouchex` |
| Old assets showing | Delete old files in `public/assets/` before uploading new build |

---

## Default logins (change immediately)

- Super Admin: `admin@vouchex.com` / `user123`
- Company Admin: `admin@company.com` / `user123`

---

## Architecture reminder

- **One subdomain** — UI and API together (`/api/*` routes)
- **One MySQL database** — all companies isolated by `company_id`
- **Real-time sync** — polls every 5 seconds (no extra subdomain needed)
