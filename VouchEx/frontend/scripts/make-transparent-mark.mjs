import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ref = process.argv[2];
const out = join(__dirname, '../public/brand/vouchex-mark-hd.png');
const SCALE = 8;

if (!ref) {
  console.error('Usage: node make-transparent-mark.mjs <reference.png>');
  process.exit(1);
}

const { data, info } = await sharp(ref).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r > 248 && g > 248 && b > 248) {
    data[i + 3] = 0;
  } else if (r > 235 && g > 235 && b > 235) {
    data[i + 3] = Math.max(0, 255 - Math.round(((r + g + b) / 3 - 235) * 18));
  }
}

const targetW = width * SCALE;
const targetH = height * SCALE;

await sharp(data, { raw: { width, height, channels } })
  .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3 })
  .sharpen({ sigma: 0.65, m1: 0.75, m2: 0.4 })
  .png({ compressionLevel: 6, adaptiveFiltering: true })
  .toFile(out);

console.log('Wrote', out, `${targetW}x${targetH}`);
