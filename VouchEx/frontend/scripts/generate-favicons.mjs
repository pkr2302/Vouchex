/**
 * Resize vouchex-icon-source.png to standard favicon sizes — no colour edits, scale only.
 * Source: public/brand/vouchex-icon-source.png (your Google Business / brand logo)
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const source = path.join(publicDir, 'brand/vouchex-icon-source.png');

if (!fs.existsSync(source)) {
  console.error('Missing source:', source);
  process.exit(1);
}

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

async function resizeSquare(size) {
  return sharp(source)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 27, b: 94, alpha: 1 },
    })
    .png()
    .toBuffer();
}

async function main() {
  const meta = await sharp(source).metadata();
  console.log(`Source: ${meta.width}x${meta.height} — resizing only (no edits)`);

  for (const { name, size } of sizes) {
    const out = path.join(publicDir, name);
    await sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 27, b: 94, alpha: 1 },
      })
      .png()
      .toFile(out);
    console.log('Wrote', name);
  }

  const icoBuf = await toIco([
    await resizeSquare(16),
    await resizeSquare(32),
    await resizeSquare(48),
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  console.log('Wrote favicon.ico');

  const laravelPublic = path.resolve(__dirname, '../../laravel-api/public');
  if (fs.existsSync(laravelPublic)) {
    for (const { name } of sizes) {
      fs.copyFileSync(path.join(publicDir, name), path.join(laravelPublic, name));
    }
    fs.copyFileSync(path.join(publicDir, 'favicon.ico'), path.join(laravelPublic, 'favicon.ico'));
    console.log('Copied favicons to laravel-api/public');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
