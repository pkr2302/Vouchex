import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const transcriptPath = join(
  projectRoot,
  '..',
  '..',
  '..',
  '..',
  '.cursor',
  'projects',
  'c-Users-Priyank-K-Rajpopat-gemini-antigravity-ide-scratch-VouchEx',
  'agent-transcripts',
  '39d578cb-d69a-4f3f-816d-a510c0f68518',
  '39d578cb-d69a-4f3f-816d-a510c0f68518.jsonl'
);

const outDir = join(projectRoot, 'docs', 'chat-backup');
mkdirSync(outDir, { recursive: true });

const raw = readFileSync(transcriptPath, 'utf8');
const lines = raw.split(/\r?\n/).filter(Boolean);

let md = `# VouchEx — Full Chat Backup\n\n`;
md += `- **Exported:** ${new Date().toISOString().slice(0, 10)}\n`;
md += `- **Transcript ID:** 39d578cb-d69a-4f3f-816d-a510c0f68518\n`;
md += `- **Messages:** ${lines.length}\n\n`;
md += `> Paste \`docs/chat-backup/VOUCHEX_NEW_CHAT_HANDOFF.md\` into a new Cursor chat for quick context.\n\n`;
md += `---\n\n`;

let userCount = 0;
let assistantCount = 0;

for (const line of lines) {
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    continue;
  }
  const role = row.role;
  if (role !== 'user' && role !== 'assistant') continue;

  const parts = row.message?.content ?? [];
  const texts = parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('\n\n');

  if (!texts.trim()) continue;

  if (role === 'user') {
    userCount += 1;
    md += `## User (${userCount})\n\n`;
    md += stripTags(texts) + '\n\n---\n\n';
  } else {
    assistantCount += 1;
    md += `## Assistant (${assistantCount})\n\n`;
    md += stripTags(texts) + '\n\n---\n\n';
  }
}

function stripTags(text) {
  return text
    .replace(/<\/?user_query>/g, '')
    .replace(/\[REDACTED\]/g, '')
    .trim();
}

const fullPath = join(outDir, 'VOUCHEX_FULL_CHAT_BACKUP.md');
writeFileSync(fullPath, md, 'utf8');
console.log(`Wrote ${fullPath} (${userCount} user, ${assistantCount} assistant messages)`);
