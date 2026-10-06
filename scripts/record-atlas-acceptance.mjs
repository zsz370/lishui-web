import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = process.cwd(), workspace = resolve(root, '..');
const review = resolve(root, '.web_review');
const cold = resolve(review, '图鉴离线冷启动_2026-10-05');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const text = (bytes) => bytes[0] === 255 && bytes[1] === 254 ? bytes.toString('utf16le') : bytes.toString('utf8');
const tests = text(await readFile(resolve(review, '2026-10-05-图鉴-回归.txt')));
assert.match(tests, /pass 58/); assert.match(tests, /fail 0/);
const browser = JSON.parse(await readFile(resolve(review, '2026-10-05-图鉴-浏览器.json'), 'utf8'));
assert.equal(browser.pages.length, 32);
assert.equal(browser.pages.filter((page) => page.imageLoaded).length, 28);
assert.equal(browser.pages.filter((page) => page.textOnly).length, 4);
assert(browser.pages.every((page) => page.documentWidth <= page.width && page.headingY >= 70));
const offline = JSON.parse(await readFile(resolve(root, '.local_demo/版本清单.json'), 'utf8'));
assert.equal(offline.files.length, 78);
for (const file of offline.files) assert.equal(hash(await readFile(resolve(cold, file.path))), file.sha256, file.path);
const zipPath = resolve(review, '溧水离线演示_2026-10-05.zip'), zipBytes = await readFile(zipPath);
assert.equal(zipBytes.length, 23869434);
const http = [];
for (const [path, method, status] of [['/atlas','GET',200],['/nodes/s_wxsz','GET',200],['/api/chat','GET',503],['/api/chat','POST',405],['/missing-file.png','GET',404]]) {
  const response = await fetch(`http://127.0.0.1:4496${path}`, { method, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, status, path); http.push({ path, method, status });
}
const readyResponse = await fetch('http://127.0.0.1:8787/ready', { signal: AbortSignal.timeout(5000) });
const ready = await readyResponse.json(); assert.equal(readyResponse.status, 200); assert.equal(ready.index.chunks, 61);
assert.equal(ready.index.dimensions, 1024); assert(ready.ready);
const api = [];
for (const nodeId of ['f_yt','f_le','f_pz','s_wd','n_tsq']) {
  const response = await fetch('http://127.0.0.1:8787/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeId, question: nodeId === 'n_tsq' ? '天生桥是天然的还是人工的？' : '介绍一下' }), signal: AbortSignal.timeout(5000) });
  const result = await response.json();
  assert.equal(response.status, nodeId === 'n_tsq' ? 200 : 400, nodeId);
  if (nodeId === 'n_tsq') assert.equal(result.kind, 'preset');
  api.push({ nodeId, status: response.status, kind: result.kind || null });
}
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { if (!entry.name.endsWith('.local') && entry.name !== 'node_modules') await walk(path); }
    else if (entry.isFile()) files.push(path);
  }
}
for (const directory of ['src','public','dist','scripts','server','docs','.local_demo']) await walk(resolve(root, directory));
files.push(resolve(root,'README.md'),resolve(root,'package.json'),resolve(workspace,'详情.md'));
for (const name of ['数媒竞赛_任务流程与执行清单.md','项目改进待办.md','图鉴内容与素材清单_2026-10-05.md','下一阶段推进安排_2026-10-05.md']) files.push(resolve(workspace,'01_项目管理',name));
const env = await readFile(resolve(root,'config/integrations.env.local'),'utf8');
const credentials = env.split(/\r?\n/).filter((line) => /^[A-Z0-9_]*(?:API_KEY|SECRET|WEB_SERVICE_KEY)=/.test(line)).map((line) => line.slice(line.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,'')).filter((value) => value.length >= 12);
const hashes = {}, leaks = [];
let scannedTextFiles = 0;
for (const path of [...new Set(files)]) {
  const bytes = await readFile(path); hashes[relative(workspace,path).replaceAll('\\','/')] = { sha256: hash(bytes), bytes: bytes.length };
  if (/\.(?:js|jsx|mjs|cjs|ts|tsx|json|html|md|css|txt|example)$/.test(path)) {
    scannedTextFiles++; const contents = text(bytes);
    if (credentials.some((value) => contents.includes(value) || contents.includes(encodeURIComponent(value)))) leaks.push(relative(root,path));
  }
}
assert.deepEqual(leaks, []);
const record = { recordedAt: new Date().toISOString(), gitHead: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), workingTree: true,
  scope: '32项轻量图鉴、撤下/替换关联、成员与实有制作记录；本地验收，没有远程服务器变更',
  validation: { unitTests: { passed: 58, failed: 0 }, introductions: 32, browser, offlineFileHashesVerified: offline.files.length,
    offlineBeforeZipBytes: offline.files.reduce((sum,file) => sum + file.bytes, 0), zip: { path: zipPath, bytes: zipBytes.length, sha256: hash(zipBytes) }, http,
    api: { readiness: { ready: ready.ready, chunks: ready.index.chunks, dimensions: ready.index.dimensions, hash: ready.index.hash, builtAt: ready.index.builtAt }, requests: api },
    security: { scannedTextFiles, credentialValuesChecked: credentials.length, rawAndUrlEncoded: true, leaks, status: 'passed' } },
  hashes, limits: ['本机新来源/解压副本，不是新物理设备、公网或完整断网测试','图片404仅注入解压副本，已恢复且78文件哈希一致','本轮未新增GIF/语音制作；10/4验收保持历史','R07缺失初始提示词/完整版本及拍摄信息仍为未知','R04未完成真实人工语义评审；不把自动规则检查当正确率','原完整条目8/18为10/4历史计数，图鉴追加不充数'] };
await writeFile(resolve(review, '2026-10-05-图鉴-版本与验收.json'), JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({ status:'passed', tests:58, atlasPages:32, images:28, textOnly:4, coldFiles:78, http:http.length, api:api.length, security:record.validation.security }));
