#!/usr/bin/env node
/**
 * Remove stale hashed assets from laravel-api/public/assets after vite build.
 * Keeps only files referenced in index.html.
 */
import { readFileSync, readdirSync, unlinkSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../../laravel-api/public');
const indexPath = path.join(publicDir, 'index.html');
const assetsDir = path.join(publicDir, 'assets');

if (!existsSync(indexPath) || !existsSync(assetsDir)) {
  console.warn('prune-old-assets: index.html or assets/ not found, skipping.');
  process.exit(0);
}

const html = readFileSync(indexPath, 'utf8');
const keep = new Set();
for (const m of html.matchAll(/\/assets\/([^"'\s>]+)/g)) {
  keep.add(m[1]);
}

let removed = 0;
for (const file of readdirSync(assetsDir)) {
  if (!keep.has(file)) {
    unlinkSync(path.join(assetsDir, file));
    removed += 1;
    console.log('Removed stale asset:', file);
  }
}

console.log(`prune-old-assets: kept ${keep.size} file(s), removed ${removed}.`);
