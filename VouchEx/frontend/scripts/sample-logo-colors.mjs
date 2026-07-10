import sharp from 'sharp';

const ref =
  'c:/Users/Priyank K Rajpopat/.gemini/antigravity-ide/scratch/VouchEx/frontend/public/brand/reference-logo.png';

const { data, info } = await sharp(ref).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function rgbAt(x, y) {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

const pts = [
  ['bar-left', 33, 70],
  ['bar-mid', 45, 62],
  ['bar-right', 57, 52],
  ['blue-arc', 18, 35],
  ['green', 72, 28],
  ['bottom', 45, 88],
  ['white', 5, 5],
];
for (const [name, x, y] of pts) {
  const [r, g, b] = rgbAt(x, y);
  console.log(name, x, y, `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`);
}
