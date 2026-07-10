/**
 * Restore VouchEx files from agent transcript (last Write wins, then replay StrReplace in order).
 */
import fs from 'fs';
import path from 'path';

const TRANSCRIPT =
  'C:/Users/Priyank K Rajpopat/.cursor/projects/c-Users-Priyank-K-Rajpopat-gemini-antigravity-ide-scratch-VouchEx/agent-transcripts/39d578cb-d69a-4f3f-816d-a510c0f68518/39d578cb-d69a-4f3f-816d-a510c0f68518.jsonl';
const ROOT = 'C:/Users/Priyank K Rajpopat/.gemini/antigravity-ide/scratch/VouchEx';

const writes = new Map();
const replaces = [];

const lines = fs.readFileSync(TRANSCRIPT, 'utf8').trim().split('\n');
let lineNo = 0;
for (const line of lines) {
  lineNo++;
  let o;
  try {
    o = JSON.parse(line);
  } catch {
    continue;
  }
  for (const p of o.message?.content || []) {
    if (p.type !== 'tool_use') continue;
    const fp = p.input?.path;
    if (!fp || !fp.toLowerCase().includes('vouchex')) continue;

    if (p.name === 'Write' && p.input.contents != null) {
      writes.set(fp, p.input.contents);
    } else if (p.name === 'StrReplace' && p.input.old_string && p.input.new_string) {
      replaces.push({ line: lineNo, path: fp, old_string: p.input.old_string, new_string: p.input.new_string });
    }
  }
}

function normPath(p) {
  return p.replace(/\\/g, '/');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

let written = 0;
for (const [fp, contents] of writes) {
  const rel = fp.replace(/^.*VouchEx[\\/]/i, '').replace(/\\/g, '/');
  const out = path.join(ROOT, rel);
  ensureDir(out);
  fs.writeFileSync(out, contents, 'utf8');
  written++;
}

const replaceLog = { ok: 0, skip: 0, fail: [] };
for (const r of replaces) {
  const rel = r.path.replace(/^.*VouchEx[\\/]/i, '').replace(/\\/g, '/');
  const out = path.join(ROOT, rel);
  if (!fs.existsSync(out)) {
    replaceLog.skip++;
    continue;
  }
  let text = fs.readFileSync(out, 'utf8');
  if (!text.includes(r.old_string)) {
    replaceLog.fail.push({ line: r.line, path: rel, reason: 'old_string not found' });
    continue;
  }
  text = text.replace(r.old_string, r.new_string);
  fs.writeFileSync(out, text, 'utf8');
  replaceLog.ok++;
}

console.log(`Wrote ${written} files from transcript.`);
console.log(`StrReplace: ${replaceLog.ok} applied, ${replaceLog.skip} skipped (missing file), ${replaceLog.fail.length} failed.`);

if (replaceLog.fail.length) {
  const byFile = {};
  for (const f of replaceLog.fail) {
    byFile[f.path] = (byFile[f.path] || 0) + 1;
  }
  console.log('Failed replaces by file:', byFile);
  console.log('First 15 failures:');
  for (const f of replaceLog.fail.slice(0, 15)) {
    console.log(`  L${f.line} ${f.path}: ${f.reason}`);
  }
}
