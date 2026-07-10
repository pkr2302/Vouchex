import sharp from 'sharp';

const files = [
  'c:/Users/Priyank K Rajpopat/.gemini/antigravity-ide/scratch/VouchEx/frontend/public/brand/vouchex-logo-full.png',
  'C:/Users/Priyank K Rajpopat/.cursor/projects/c-Users-Priyank-K-Rajpopat-gemini-antigravity-ide-scratch-VouchEx/assets/vouchex-logo-final.png',
];
for (const f of files) {
  try {
    const m = await sharp(f).metadata();
    console.log(f.split('/').pop(), m.width, m.height, m.format);
  } catch (e) {
    console.log(f, e.message);
  }
}
