import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = join(__dirname, '../public/brand/vouchex-mark.svg');
const out = join(__dirname, '../public/brand/vouchex-mark.png');

// HD raster fallback @4× sidebar size (60px → 240px)
await sharp(svg, { density: 600 })
  .resize(240, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log('Exported', out);
