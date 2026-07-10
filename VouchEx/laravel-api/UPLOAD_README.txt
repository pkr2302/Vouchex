VOUCHEX — WHAT TO UPLOAD TO CPANEL
====================================

UPLOAD ONLY the contents of this folder (laravel-api).
DO NOT upload the "frontend" folder from your PC.
DO NOT upload node_modules.

REQUIRED FOLDERS (must be present after extract):
  app/
  bootstrap/
  config/
  database/
  public/          ← must contain index.php, index.html, config.json, assets/
  routes/
  storage/
  vendor/          ← created on server by: composer install

REQUIRED FILES:
  artisan
  composer.json
  .env.example     ← rename to .env on server and fill DB password

OPTIONAL (safe to upload, not required on server):
  DATABASE_SCHEMA.md

DO NOT UPLOAD:
  frontend/                 (React source — already built into public/)
  frontend/node_modules/
  CPANEL_DEPLOYMENT.md        (keep on your PC only)
  vouchex.kuhu.org.in/        (old unused cPanel folder)

NO sample PNG files, NO digi-maa logos, NO ClearBooks deploy folders
should be in this package.

After extract, verify:
  /home/kuhuorgi/vouchex/public/index.php   exists
  /home/kuhuorgi/vouchex/public/index.html  exists
  /home/kuhuorgi/vouchex/public/assets/      has .js and .css files
