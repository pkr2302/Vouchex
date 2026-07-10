import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, '..', 'laravel-api', 'public', 'brand', 'google-business');
mkdirSync(outDir, { recursive: true });

const faviconSvg = readFileSync(join(root, 'public', 'brand', 'vouchex-mark.svg'));

// Google Business Profile LOGO: square, icon only (shows in small circle)
const logoSize = 720;
const iconInner = Math.round(logoSize * 0.72);
const iconPng = await sharp(faviconSvg).resize(iconInner, iconInner).png().toBuffer();
const logoBg = await sharp({
  create: {
    width: logoSize,
    height: logoSize,
    channels: 4,
    background: { r: 0, g: 27, b: 94, alpha: 1 },
  },
})
  .png()
  .composite([{ input: iconPng, gravity: 'centre' }])
  .png()
  .toBuffer();
writeFileSync(join(outDir, 'gbp-logo-720x720.png'), logoBg);

// Google Business Profile COVER: wide banner (not the tall flyer)
const coverW = 1080;
const coverH = 608;
const markSize = 220;
const markPng = await sharp(faviconSvg).resize(markSize, markSize).png().toBuffer();

const coverSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${coverW}" height="${coverH}" viewBox="0 0 ${coverW} ${coverH}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030a18"/>
      <stop offset="45%" stop-color="#061228"/>
      <stop offset="100%" stop-color="#0d2b67"/>
    </linearGradient>
  </defs>
  <rect width="${coverW}" height="${coverH}" fill="url(#bg)"/>
  <circle cx="880" cy="120" r="180" fill="#2563eb" opacity="0.12"/>
  <circle cx="980" cy="520" r="140" fill="#22c55e" opacity="0.1"/>
  <text x="72" y="250" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700">VouchEx</text>
  <text x="72" y="310" fill="#4ade80" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="4">ACCOUNTS MADE SIMPLE</text>
  <text x="72" y="380" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="26">Cloud GST &amp; Accounting for SMEs and CAs</text>
  <text x="72" y="430" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="22">vouchex.kuhu.org.in  ·  30-day free trial</text>
</svg>`);

const coverBase = await sharp(coverSvg).png().toBuffer();
const coverPng = await sharp(coverBase)
  .composite([{ input: markPng, left: coverW - markSize - 72, top: Math.round((coverH - markSize) / 2) }])
  .png()
  .toBuffer();
writeFileSync(join(outDir, 'gbp-cover-1080x608.png'), coverPng);

console.log('Google Business Profile images written to laravel-api/public/brand/google-business/');
