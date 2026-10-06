import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const hash = (data) => createHash('sha256').update(data).digest('hex');
await access(resolve(root, 'dist/index.html'));
const paths = [];
async function walk(folder) {
  for (const entry of await readdir(resolve(root, folder), { withFileTypes: true })) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && !entry.name.endsWith('.local')) paths.push(path);
  }
}
for (const folder of ['dist', 'server', 'src']) await walk(folder);
for (const entry of await readdir(resolve(root, 'scripts'))) if (entry.endsWith('.test.mjs')) paths.push(`scripts/${entry}`);
paths.push('scripts/dev-local.mjs', 'scripts/review-score.mjs', 'package.json', 'package-lock.json', 'config/agent-system.plan.js', 'config/integrations.env.example', 'docs/corpus-audit/approved-corpus.json', 'docs/corpus-audit/normalized-qa.json', 'runtime.local/knowledge-index.json');
const files = [];
const env = await readFile(resolve(root, 'config/integrations.env.local'), 'utf8');
const values = env.split(/\r?\n/).map((line) => line.match(/^([A-Z_0-9]+)\s*=\s*(.+)$/)).filter(Boolean).filter((item) => /KEY|SECRET|PASSWORD/.test(item[1])).map((item) => item[2].trim().replace(/^["']|["']$/g, '')).filter((value) => value.length >= 8);
for (const path of paths.sort()) {
  const data = await readFile(resolve(root, path));
  if (/\.(mjs|js|jsx|json|css|html|txt|md)$/.test(path) && values.some((value) => data.includes(Buffer.from(value)))) throw new Error(`Release contains a configured secret: ${path}`);
  files.push({ path, bytes: data.length, sha256: hash(data) });
}
const id = `20261006-${hash(JSON.stringify(files)).slice(0, 12)}`;
const destination = resolve(root, '.web_review/server-releases', id);
await mkdir(destination, { recursive: false }).catch(async (error) => {
  if (error.code === 'ENOENT') { await mkdir(resolve(root, '.web_review/server-releases'), { recursive: true }); await mkdir(destination); }
  else throw error;
});
for (const file of files) {
  const target = resolve(destination, file.path);
  await mkdir(resolve(target, '..'), { recursive: true });
  await cp(resolve(root, file.path), target);
}
const manifest = { id, createdAt: new Date().toISOString(), scope: 'Frontend, API, approved knowledge/index and regression fixtures; no private configuration', files };
await writeFile(resolve(destination, 'release-manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(resolve(root, '.web_review/2026-10-06-server-release.json'), JSON.stringify({ id, destination, files: files.length, bytes: files.reduce((sum, item) => sum + item.bytes, 0), secretMatches: 0 }, null, 2));
console.log(JSON.stringify({ id, files: files.length, bytes: manifest.files.reduce((sum, item) => sum + item.bytes, 0), secretMatches: 0 }));
