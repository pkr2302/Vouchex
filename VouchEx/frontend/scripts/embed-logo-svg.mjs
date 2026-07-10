import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const png = join(__dirname, '../public/brand/vouchex-logo-full.png');
const svg = join(__dirname, '../public/brand/vouchex-logo.svg');
const b64 = readFileSync(png).toString('base64');

const content = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 256" role="img" aria-label="VouchEx — Accounts made simple">
  <image width="1024" height="256" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${b64}"/>
</svg>
`;

writeFileSync(svg, content, 'utf8');
console.log('Wrote', svg);
