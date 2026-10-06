import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const review = resolve(root, '.web_review');
const cold = resolve(review, '离线冷启动复验_2026-10-04-费用区间');
const digest = (data) => createHash('sha256').update(data).digest('hex');
const hash = async (path) => digest(await readFile(path));
async function walk(path) {
  const files = [];
  for (const item of await readdir(path, { withFileTypes: true })) {
    const next = resolve(path, item.name);
    if (item.isDirectory()) files.push(...await walk(next));
    else if (item.isFile()) files.push(next);
  }
  return files;
}
const offline = JSON.parse(await readFile(resolve(cold, '版本清单.json'), 'utf8'));
for (const file of offline.files) {
  assert.equal(await hash(resolve(cold, file.path)), file.sha256, `解压文件不一致：${file.path}`);
  assert.equal(await hash(resolve(root, '.local_demo', file.path)), file.sha256, `源离线构建不一致：${file.path}`);
}
assert.equal((await walk(cold)).length, offline.files.length + 1, '解压目录不应包含额外文件');

const httpCases = [
  { path: '/', status: 200 },
  { path: '/culture/dragon', status: 200 },
  { path: '/itinerary', status: 200 },
  { path: '/assets/missing.webp', status: 404 },
  { path: '/api/ready', status: 503 },
  { path: '/', method: 'POST', status: 405 },
  { path: '/..%2f..%2fconfig%2fintegrations.env.local', status: 403 },
];
const http = [];
for (const item of httpCases) {
  const response = await fetch(`http://127.0.0.1:4495${item.path}`, { method: item.method || 'GET', signal: AbortSignal.timeout(5000) });
  await response.arrayBuffer();
  assert.equal(response.status, item.status, `离线HTTP ${item.path}`);
  http.push({ ...item, actualStatus: response.status });
}

const credentialNames = ['BOCHA_API_KEY', 'QWEATHER_API_KEY', 'AMAP_WEB_SERVICE_KEY', 'BAIDU_TRANSLATE_APP_ID', 'BAIDU_TRANSLATE_SECRET', 'LLM_API_KEY', 'EMBEDDING_API_KEY', 'STAY_API_KEY'];
const configured = credentialNames.map((name) => process.env[name]).filter((value) => value && value.length >= 6);
assert.equal(configured.length, 8, '应加载本地配置的8个服务凭据字段；不输出字段值');
const scanFiles = [...await walk(resolve(root, 'src')), ...await walk(resolve(root, 'public')), ...await walk(resolve(root, 'dist')), ...await walk(resolve(root, '.local_demo')), ...await walk(resolve(root, 'server')), ...await walk(resolve(root, 'scripts')), ...((await walk(resolve(root, 'docs'))).filter((file) => /\.(md|svg)$/.test(file))), resolve(root, 'README.md'), resolve(root, 'config/integrations.env.example'), resolve(root, '../01_项目管理/数媒竞赛_任务流程与执行清单.md'), resolve(root, '../01_项目管理/项目改进待办.md')];
const hits = [];
for (const file of scanFiles) {
  const data = await readFile(file);
  if (configured.some((value) => [value, encodeURIComponent(value)].some((candidate) => data.includes(Buffer.from(candidate))))) hits.push(relative(root, file).replaceAll('\\', '/'));
}
assert.equal(hits.length, 0, '公开内容与构建存在凭据值；诊断不输出秘密值');
const security = { checkedAt: new Date().toISOString(), scannedFiles: scanFiles.length, credentialFieldsChecked: configured.length, hits, scope: '已配置服务凭据的原值/URL编码值；源码、公开资产、构建、离线包目录、脚本与Markdown/SVG报告；私有配置不发布，未声称扫描聊天中未落盘的SSH口令', status: 'passed' };
await writeFile(resolve(review, '2026-10-04-文化导出-秘密扫描.json'), JSON.stringify(security, null, 2));
const downloadHash = await hash('C:/Users/user/Downloads/溧水随身行程-3of3 (1).png');
assert.equal(downloadHash, await hash(resolve(review, '2026-10-04-R13-费用区间-行程卡-3.png')));
const offlineDownloadHash = await hash('C:/Users/user/Downloads/溧水随身行程-2of2.png');
assert.equal(offlineDownloadHash, await hash(resolve(review, '2026-10-04-R06-离线-行程卡-2.png')));
const regression = await readFile(resolve(review, '2026-10-04-文化导出-回归.txt'), 'utf8');
assert.match(regression, /tests 54/);
assert.match(regression, /pass 54/);
assert.match(regression, /fail 0/);
const readyResponse = await fetch('http://127.0.0.1:8787/ready', { signal: AbortSignal.timeout(5000) });
assert.equal(readyResponse.status, 200);
const ready = await readyResponse.json();
assert.equal(ready.ready, true);

const record = {
  checkedAt: new Date().toISOString(), gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTree: true,
  scope: '首页5秒渐变；R03文化任务、R12文化叙事、R13随身行程；R06离线子项。今天累计原完整条目8/18，本轮新增3项；未改服务器。',
  counts: { workflowCompleted: 3, workflowTotal: 5, improvementsCompleted: 5, improvementsTotal: 13, cumulativeCompleted: 8, totalOriginalEntries: 18, newCompletedThisContinuation: ['R03', 'R12', 'R13'] },
  validation: { unitTests: { passed: 54, failed: 0 }, introductions: 35, build: 'passed', offlineBuild: 'passed', offlinePackageFiles: offline.files.length, coldHashesVerified: offline.files.length, offlinePackageBytesBeforeZip: offline.files.reduce((sum, file) => sum + file.bytes, 0), offlineHttp: http, browserViewports: [{ width: 1280, height: 900, observedDocumentWidth: 1265 }, { width: 393, height: 852, observedDocumentWidth: 378 }], normalDownloadSha256: downloadHash, offlineDownloadSha256: offlineDownloadHash, security, apiReady: ready, ragClosedLoop: { cases: 2, repetitions: 1, scope: '单次探索，不并入216次受控评测' } },
  limitations: ['当前电脑解压后新来源冷启动，不是新物理设备或公网验收', '离线版只含构建时静态已审资料，不运行向量检索或实时工具；外部链接仍需联网', '文化用时/分数来自开发操作，不是R11真实游客研究', '团队分工与过去AI制作记录用户回复未整理，R07未完成', 'R04人工语义评分仍待办，不宣称多智能体通用优势', '资料4条待核、童谣与专题深度继续隔离核准', '既有服务器完全未修改；备案、公网与完整网络故障复验仍待办', '系统减少动态/隐藏页由代码守护，未做操作系统选项切换验收', '源代码包含此前未提交工作；没有提交或回滚既有变更'],
  sourceHashes: {}, artifactHashes: {}, managementHashes: {}, buildHashes: {}, offlineHashes: {}, reviewHashes: {},
};
for (const file of [...await walk(resolve(root, 'src')), ...await walk(resolve(root, 'server')), ...await walk(resolve(root, 'scripts')), ...['README.md', 'package.json', 'package-lock.json', 'vite.config.js', '.gitignore', 'config/integrations.env.example'].map((name) => resolve(root, name))]) record.sourceHashes[relative(root, file).replaceAll('\\', '/')] = await hash(file);
for (const name of ['文化互动与随身行程推进验收_2026-10-04.md', '秦淮源头的一天_设计依据与原创草图_2026-10-04.md', '秦淮源头的一天_原创草图.svg', '项目进度与下一步安排_2026-10-04.md', 'README.md']) record.artifactHashes[`docs/${name}`] = await hash(resolve(root, 'docs', name));
for (const name of ['数媒竞赛_任务流程与执行清单.md', '项目改进待办.md']) record.managementHashes[name] = await hash(resolve(root, '../01_项目管理', name));
for (const file of await walk(resolve(root, 'dist'))) record.buildHashes[relative(root, file).replaceAll('\\', '/')] = await hash(file);
for (const file of await walk(resolve(root, '.local_demo'))) record.offlineHashes[relative(root, file).replaceAll('\\', '/')] = await hash(file);
for (const file of await readdir(review)) if (/^2026-10-04-(R03-|R12-|R13-|R06-离线-|首页轮播-|RAG-取消|文化导出-(回归|秘密)|最终首页)/.test(file) || file === '溧水离线演示_2026-10-04.zip') record.reviewHashes[file] = await hash(resolve(review, file));
await writeFile(resolve(review, '2026-10-04-文化导出-版本与验收.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ passed: 54, coldHashesVerified: offline.files.length, offlineHttpCases: http.length, secretScan: 'passed', scannedFiles: scanFiles.length, sources: Object.keys(record.sourceHashes).length, review: Object.keys(record.reviewHashes).length, cumulativeOriginalEntries: '8/18', remoteMutations: 0 }));
