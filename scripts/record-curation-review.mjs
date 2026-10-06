import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { approvedQA } from '../src/data/presetQA.js';
import { validateReviewExport } from './review-score.mjs';

const root = process.cwd(), workspace = resolve(root, '..'), review = resolve(root, '.web_review');
const cold = resolve(review, 'R05离线冷启动_2026-10-05');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const decode = (bytes) => bytes[0] === 255 && bytes[1] === 254 ? bytes.toString('utf16le') : bytes.toString('utf8');
const json = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const tests = decode(await readFile(resolve(review, '2026-10-05-R05-R04-回归.txt')));
assert.match(tests, /pass 66/); assert.match(tests, /fail 0/);
assert.equal(approvedQA.length, 50);
const corpus = await json('docs/corpus-audit/approved-corpus.json');
const pending = await json('docs/corpus-audit/pending-review.json');
const withdrawn = await json('docs/corpus-audit/withdrawn-qa.json');
assert.equal(corpus.chunks.length, 65); assert.equal(pending.count, 1); assert.equal(withdrawn.count, 2);
const live = await json('.web_review/2026-10-05-R05-真实检索与接口.json');
assert.equal(live.retrieval.length, 3); assert.equal(live.contradictoryFilterResult.length, 0); assert.equal(live.http.length, 7);
const readyResponse = await fetch('http://127.0.0.1:8787/ready', { signal: AbortSignal.timeout(5000) });
const ready = await readyResponse.json();
assert.equal(readyResponse.status, 200); assert(ready.ready); assert.equal(ready.index.chunks, 65);
assert.equal(ready.index.dimensions, 1024); assert.equal(ready.index.hash, live.index.hash);

const browser = await json('.web_review/2026-10-05-R05-浏览器.json');
const distHtml = await readFile(resolve(root, 'dist/index.html'), 'utf8');
assert.equal(browser.cases.length, 4);
for (const entry of browser.cases) {
  assert(entry.layout.scrollWidth <= entry.layout.viewport);
  assert(entry.layout.script.some((url) => distHtml.includes(url.split('/').at(-1))));
  const qa = approvedQA.find((item) => item.q === entry.question);
  if (qa) assert(entry.text.includes(qa.a)); else assert(entry.text.includes('不输出未核歌词'));
}
const offlineBrowser = await json('.web_review/2026-10-05-R05-离线浏览器.json');
assert(offlineBrowser.layout.scrollWidth <= offlineBrowser.layout.viewport);
assert(offlineBrowser.text.includes(approvedQA.find((item) => item.q === '无想山名字是怎么来的？').a));
const offline = await json('.local_demo/版本清单.json');
assert.equal(offline.files.length, 78);
for (const file of offline.files) {
  assert.equal(hash(await readFile(resolve(cold, file.path))), file.sha256, file.path);
  assert.equal(hash(await readFile(resolve(root, '.local_demo', file.path))), file.sha256, file.path);
}
assert.equal(hash(await readFile(resolve(cold, '版本清单.json'))), hash(await readFile(resolve(root, '.local_demo/版本清单.json'))));
const zipPath = resolve(review, '溧水离线演示_2026-10-05-R05.zip'), zipBytes = await readFile(zipPath);
assert.equal(zipBytes.length, 23870690);
const http = await Promise.all([['/atlas','GET',200],['/nodes/n_wx','GET',200],['/api/chat','GET',503],['/api/chat','POST',405],['/missing-file.png','GET',404]].map(async ([path,method,status]) => {
  const response = await fetch(`http://127.0.0.1:4499${path}`, { method, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, status, path); return {path,method,status};
}));

const preparation = await json('docs/evaluation-review-2026-10-05/准备记录.json');
const pack = await json('docs/evaluation-review-2026-10-05/review-pack.json');
const mapping = await json('docs/evaluation-review-2026-10-05/分组映射_评审后使用.json');
assert.equal(pack.cards.length, 216); assert.equal(mapping.mappings.length, 216);
assert.equal(pack.packId, preparation.packId); assert.equal(mapping.packId, pack.packId);
assert.equal(preparation.humanScoresWritten, 0);
assert.deepEqual(preparation.modes, {single:90,multi:90,withoutRag:36});
assert.equal(new Set(mapping.mappings.map((item) => item.scenarioId)).size, 30);
for (const [name, sha256] of Object.entries(pack.sourceHashes)) assert.equal(hash(await readFile(resolve(root,'docs/evaluation',name))), sha256, name);
assert.equal(hash(await readFile(resolve(root,'docs/evaluation-review-2026-10-05/index.html'))), preparation.htmlSha256);
const reviewBrowser = await json('.web_review/2026-10-05-R04-浏览器操作.json');
for (const field of ['blankConfirmationRejected','testConfirmationPersisted','editedScoreBecameDraft','restoredScoreFile','exportTextSavedAndValidated']) assert.equal(reviewBrowser[field], true);
assert.equal(reviewBrowser.automaticDownloadObserved, false);
const developmentScores = await json('.web_review/2026-10-05-R04-仅开发操作的测试评分.json');
assert.equal(validateReviewExport(developmentScores, pack.packId, pack.cards.map((item) => item.reviewId)).length, 1);
assert(developmentScores.records.every((item) => item.reviewer.includes('非人工评审')));

const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const path = resolve(directory,entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'node_modules' && !entry.name.endsWith('.local')) await walk(path); }
    else if (entry.isFile()) files.push(path);
  }
}
for (const directory of ['src','public','dist','scripts','server','docs','.local_demo']) await walk(resolve(root,directory));
files.push(resolve(root,'README.md'),resolve(root,'package.json'),resolve(workspace,'详情.md'));
for (const name of ['数媒竞赛_任务流程与执行清单.md','项目改进待办.md','下一阶段推进安排_2026-10-05.md','R04人工评审使用说明_2026-10-05.md']) files.push(resolve(workspace,'01_项目管理',name));
for (const entry of await readdir(review)) if (/^2026-10-05-R(?:04|05).*\.(?:json|txt|png)$/.test(entry) && !entry.endsWith('版本与验收.json')) files.push(resolve(review,entry));
const env = await readFile(resolve(root,'config/integrations.env.local'),'utf8');
const credentials = env.split(/\r?\n/).filter((line) => /^[A-Z0-9_]*(?:API_KEY|SECRET|WEB_SERVICE_KEY)=/.test(line)).map((line) => line.slice(line.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,'')).filter((value) => value.length >= 12);
const hashes = {}, leaks = [], imageSizes = {};
let scannedTextFiles = 0;
for (const path of [...new Set(files)]) {
  const bytes = await readFile(path), name = relative(workspace,path).replaceAll('\\','/');
  hashes[name] = {sha256:hash(bytes),bytes:bytes.length};
  if (/2026-10-05-R.*\.png$/.test(path)) imageSizes[name] = {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  if (/\.(?:js|jsx|mjs|cjs|ts|tsx|json|html|md|css|txt|example)$/.test(path)) {
    scannedTextFiles++; const content = decode(bytes);
    if (credentials.some((value) => content.includes(value) || content.includes(encodeURIComponent(value)))) leaks.push(name);
  }
}
assert.deepEqual(leaks, []);
const record = {recordedAt:new Date().toISOString(),gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:true,
  scope:'R05来源修订/新增问答与童谣隔离，R04历史人工评审材料及备份；只在本机操作',
  validation:{unitTests:{passed:66,failed:0},knowledge:{approved:65,node:50,service:15,pending:1,withdrawn:2,index:ready.index},
    liveRequests:{retrieval:3,contradictoryFilter:1,http:7},browser,offlineBrowser,imageSizes,
    offlineFileHashesVerified:offline.files.length,offlineBeforeZipBytes:offline.files.reduce((sum,file) => sum+file.bytes,0),
    zip:{path:zipPath,bytes:zipBytes.length,sha256:hash(zipBytes)},offlineHttp:http,
    review:{packId:pack.packId,cases:30,cards:216,modes:preparation.modes,sourceHashes:pack.sourceHashes,humanScoresWritten:0,developmentOperations:reviewBrowser},
    security:{scannedTextFiles,credentialValuesChecked:credentials.length,rawAndUrlEncoded:true,leaks,status:'passed'}},
  hashes,limits:['原完整条目仍8/18，R05/R04整项未完成','测试评分仅验证开发操作，不计人工语义指标','内置浏览器未取得自动下载文件；全文保存与实际文件恢复通过',
    '本轮N01换为童谣待核题，知识65条与10/4的61条不同；后续结果不能直接当同条件提升','新ZIP只核对78文件及改动问答，文化/PNG/32页完整链路沿用历史验收',
    '本机新来源不等于新物理设备、公网或完整断网','没有更改远程服务器，没有重跑216次评测']};
await writeFile(resolve(review,'2026-10-05-R05-R04-版本与验收.json'), JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({status:'passed',tests:66,approved:65,pending:1,coldFiles:78,zipBytes:zipBytes.length,reviewCards:216,humanScores:0,historicalFilesUnchanged:4,security:record.validation.security}));
