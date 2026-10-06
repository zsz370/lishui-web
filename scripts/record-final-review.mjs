import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { approvedQA } from '../src/data/presetQA.js';
import { getVisitGuide } from '../src/data/nodeVisitGuides.js';

const root = process.cwd(), workspace = resolve(root, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const decode = bytes => bytes[0] === 255 && bytes[1] === 254 ? bytes.toString('utf16le') : bytes.toString('utf8');
const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const testText = decode(await readFile(resolve(root, '.web_review/2026-10-05-R04-R05-正式验收回归.txt')));
assert.match(testText, /pass 76/); assert.match(testText, /fail 0/);
const corpus = await json('docs/corpus-audit/approved-corpus.json');
const pending = await json('docs/corpus-audit/pending-review.json');
const withdrawn = await json('docs/corpus-audit/withdrawn-qa.json');
assert.equal(approvedQA.length, 54); assert.equal(corpus.chunks.length, 69);
assert.equal(pending.count, 1); assert.equal(withdrawn.count, 2);
const matrices = ['n_tsq', 'n_wx', 'n_fjb', 'n_sj'].map(nodeId => ({nodeId, approvedQuestions:approvedQA.filter(qa => qa.nodeId === nodeId).length, matrixQuestions:getVisitGuide(nodeId).items.length}));
assert.deepEqual(matrices.map(row => row.approvedQuestions), [7, 7, 5, 5]);
assert.deepEqual(matrices.map(row => row.matrixQuestions), [6, 7, 5, 5]);
const live = await json('.web_review/2026-10-05-R04-R05-正式验收接口.json');
assert.equal(live.retrieval.length, 5); assert.equal(live.http.length, 13);
assert.equal(live.contradictoryFilterResult.length, 0);
const ready = await (await fetch('http://127.0.0.1:8787/ready', {signal:AbortSignal.timeout(5000)})).json();
assert(ready.ready); assert.equal(ready.index.hash, live.index.hash);
assert.equal(ready.index.chunks, 69); assert.equal(ready.index.dimensions, 1024);
const browser = await json('.web_review/2026-10-05-R04-R05-浏览器闭环.json');
for (const entry of browser.evidence.filter(item => item.dimensions)) assert(entry.dimensions.scrollWidth <= entry.dimensions.width);
const findBrowser = name => browser.evidence.find(item => item.case === name);
assert.match(findBrowser('生产页面多轮住宿缺项').dom, /2026-10-07入住，每晚200元以内/);
assert.match(findBrowser('生产页面多轮住宿缺项').dom, /补充退房日期/);
assert.match(findBrowser('文化结果追问已审传说并保留出处').dom, /以上传说尚无史料确证/);
assert.match(findBrowser('行程刷新恢复日期时间人数预算和名片').dom, /骆山大龙/);
assert.match(findBrowser('文化记录重新进入可见2\/3').dom, /2\s*\/\s*3/);
const trip = await readFile(resolve(root, '.web_review/2026-10-05-R04-文化到行程闭环.txt'), 'utf8');
assert.match(trip, /2026-10-07.*公共交通/); assert.match(trip, /成人2 \/ 儿童1/);
assert.match(trip, /0—30元.*非经营方报价/); assert.match(trip, /https:\/\/www.ihchina.cn/);
assert.match(trip, /交通：未知/);
const coldRoot = resolve(root, '.web_review/R04R05离线冷启动_2026-10-05');
const offline = await json('.local_demo/版本清单.json');
assert.equal(offline.files.length, 78);
for (const file of offline.files) {
  assert.equal(hash(await readFile(resolve(coldRoot, file.path))), file.sha256, file.path);
  assert.equal(hash(await readFile(resolve(root, '.local_demo', file.path))), file.sha256, file.path);
}
assert.equal(hash(await readFile(resolve(coldRoot, '版本清单.json'))), hash(await readFile(resolve(root, '.local_demo/版本清单.json'))));
const zipPath = resolve(root, '.web_review/溧水离线演示_2026-10-05-R04-R05验收.zip');
const zipBytes = await readFile(zipPath); assert.equal(zipBytes.length, 23874484);
const offlineHttp = await Promise.all([['/culture/dragon','GET',200],['/itinerary','GET',200],['/api/chat','GET',503],['/api/chat','POST',405],['/missing-file.png','GET',404]].map(async ([path,method,status]) => {
  const response = await fetch(`http://127.0.0.1:4500${path}`, {method,signal:AbortSignal.timeout(5000)});
  assert.equal(response.status,status,path); return {path,method,status};
}));

const pack = await json('docs/evaluation-review-2026-10-05/review-pack.json');
const preparation = await json('docs/evaluation-review-2026-10-05/准备记录.json');
assert.equal(pack.cards.length, 216); assert.equal(pack.packId, preparation.packId);
assert.deepEqual(preparation.modes, {single:90,multi:90,withoutRag:36});
for (const [file, sha256] of Object.entries(pack.sourceHashes)) assert.equal(hash(await readFile(resolve(root,'docs/evaluation',file))),sha256,file);
assert.equal(hash(await readFile(resolve(root,'docs/evaluation-review-2026-10-05/index.html'))),preparation.htmlSha256);
// The receipt is qualitative user testimony; the blank numerical score fields stay intact.
const receiptPath = resolve(workspace,'01_项目管理/R04人工文字审核记录_2026-10-05.md');
const receipt = await readFile(receiptPath,'utf8'); assert.match(receipt,/两名队员/); assert.match(receipt,/216条/);
const checklist = await readFile(resolve(workspace,'01_项目管理/数媒竞赛_任务流程与执行清单.md'),'utf8');
const backlog = await readFile(resolve(workspace,'01_项目管理/项目改进待办.md'),'utf8');
assert.match(checklist,/10\/18/); assert.match(backlog,/10\/18/);
for(const id of ['R04','R05']) assert(backlog.includes(`- [x] **${id}｜`));

const paths = [];
async function walk(directory) {
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    const path = resolve(directory,entry.name);
    if(entry.isDirectory()) { if(!entry.name.endsWith('.local') && entry.name !== 'node_modules') await walk(path); }
    else if(entry.isFile()) paths.push(path);
  }
}
for(const name of ['src','server','scripts','public','dist','docs','.local_demo']) await walk(resolve(root,name));
for(const name of ['数媒竞赛_任务流程与执行清单.md','项目改进待办.md','下一阶段推进安排_2026-10-05.md','R04人工文字审核记录_2026-10-05.md']) paths.push(resolve(workspace,'01_项目管理',name));
paths.push(resolve(root,'README.md'),resolve(root,'package.json'),resolve(workspace,'README.md'),resolve(workspace,'详情.md'));
for (const entry of await readdir(resolve(root,'.web_review'))) if(/^2026-10-05-R(?:04|05).*\.(?:json|txt|png)$/.test(entry) && !entry.includes('正式验收版本')) paths.push(resolve(root,'.web_review',entry));
const envText = await readFile(resolve(root,'config/integrations.env.local'),'utf8');
const credentials = envText.split(/\r?\n/).filter(line=>/^[A-Z0-9_]*(?:API_KEY|SECRET|WEB_SERVICE_KEY)=/.test(line)).map(line=>line.slice(line.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,'')).filter(value=>value.length>=12);
const hashes = {}, imageSizes = {}, leaks = []; let scannedTextFiles = 0;
for(const path of [...new Set(paths)]) {
  const bytes = await readFile(path), name = relative(workspace,path).replaceAll('\\','/');
  hashes[name] = {bytes:bytes.length,sha256:hash(bytes)};
  if(/2026-10-05-R.*\.png$/.test(path)) imageSizes[name] = {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  if(/\.(?:js|jsx|mjs|cjs|ts|tsx|json|html|md|css|txt|example)$/.test(path)) {
    scannedTextFiles++; const content = decode(bytes);
    if(credentials.some(value=>content.includes(value)||content.includes(encodeURIComponent(value)))) leaks.push(name);
  }
}
assert.deepEqual(leaks,[]);
for(const number of [1,2]) {
  const key = `lishui-web/.web_review/2026-10-05-R04-闭环行程卡${number}.png`;
  assert.deepEqual(imageSizes[key],{width:750,height:1500});
}
const record = {
  recordedAt:new Date().toISOString(),gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:true,
  scope:'用户明确要求的R04定性审核/反馈闭环及R05当前MVP内容核准正式验收，全部操作在本机',
  completion:{workflow:{done:3,total:5},improvements:{done:7,total:13},total:{done:10,total:18},newWholeItems:['R04','R05']},
  humanReview:{source:'项目负责人对话文字确认',reviewDate:'2026-10-05',reviewerCount:2,collectiveCoverage:216,packId:pack.packId,numericalScoresReceived:false,numericalSupportRates:null,individualAllocation:null,receipt:relative(workspace,receiptPath).replaceAll('\\','/')},
  validation:{unitTests:{passed:76,failed:0},knowledge:{approved:69,node:54,service:15,pending:1,withdrawn:2,index:ready.index,matrices},liveRequests:{retrieval:5,contradictoryFilter:1,http:13},browserEvidence:browser.evidence.map(({case:name,dimensions})=>({case:name,dimensions})),imageSizes,offlineFileHashesVerified:78,offlineHttp,zip:{path:zipPath,bytes:zipBytes.length,sha256:hash(zipBytes)},historicalFilesUnchanged:pack.sourceHashes,reviewPageUnchanged:true,security:{scannedTextFiles,credentialValuesChecked:credentials.length,rawAndUrlEncoded:true,leaks,status:'passed'}},
  limits:['定性人工反馈未换算支持率，没有补造评分JSON或成本','新的N01/N02与69条知识版本不能直接当历史对照提升','文化2/3及37秒是开发操作，不是新增人工评审或游客学习效果','本机新来源/PNG资产保存不等于新物理设备/公网或浏览器下载完成','R05MVP达标不表示原始187行全审，扩展专题归R08，未知运营归R06/R11','现有远程服务器没有更改'],hashes,
};
await writeFile(resolve(root,'.web_review/2026-10-05-R04-R05-正式验收版本.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({status:'passed',tests:76,approved:69,pending:1,withdrawn:2,wholeItems:'10/18',coldFiles:78,zipBytes:zipBytes.length,historicalFilesUnchanged:Object.keys(pack.sourceHashes).length,reviewPageUnchanged:true,security:record.validation.security}));
