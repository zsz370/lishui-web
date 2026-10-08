import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,readFile,readdir,access} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createLatestRequest} from '../src/services/latestRequest.js';
import {readCorpus,corpusHash} from '../server/knowledge.mjs';
import {readGuideMemory,saveGuideMemory,guideMemoryKey} from '../src/data/guideMemory.js';
const run=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));

test('运行语料直接来自版本化已审数据，原索引的127条内容哈希完全一致',async()=>{
 const chunks=await readCorpus();assert.equal(chunks.length,127);assert.equal(corpusHash(chunks),'50eb0894f9da306ac52fb72e64a1b476b8f92a2160a0a347b4afc4aa715f1b38');
 assert(chunks.every(x=>x.status==='approved'&&x.sources.length));
});
test('慢住宿/列表响应晚于新条件到达时，不覆盖新结果；不依赖上游遵守abort',async()=>{
 const tracker=createLatestRequest();let release;const delayed=new Promise(resolve=>{release=resolve;});
 let shown='';const old=tracker.begin();const prior=delayed.then(()=>{if(tracker.current(old))shown='旧结果';});
 const current=tracker.begin();assert(old.controller.signal.aborted);if(tracker.current(current))shown='新结果';release();await prior;assert.equal(shown,'新结果');
});
test('退出当前视图或账号后，晚到响应及其错误均不再更新该视图',async()=>{
 const tracker=createLatestRequest(),ticket=tracker.begin();tracker.cancel();assert(ticket.controller.signal.aborted);assert.equal(tracker.current(ticket),false);
});
test('访客、账号A与账号B的导游偏好和未发送草稿相互隔离，刷新只恢复本人',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 for(const [owner,draft,budget]of[[null,'访客草稿','300'],['account-a','A的草稿','600'],['account-b','B的草稿','200']])saveGuideMemory(storage,{version:1,preferences:{budget},draft},owner);
 assert.equal(readGuideMemory(storage).draft,'访客草稿');assert.equal(readGuideMemory(storage,'account-a').draft,'A的草稿');assert.equal(readGuideMemory(storage,'account-b').preferences.budget,'200');
 assert.equal(readGuideMemory(storage,'another-account').draft,'');assert.notEqual(guideMemoryKey('account-a'),guideMemoryKey('account-b'));
});
test('无法辨认账号归属的旧导游缓存不自动展示，也不删除原值',()=>{
 const data=new Map([['lishui-guide-conditions-v1',JSON.stringify({version:1,preferences:{origin:'私有旧地址'},draft:'旧账号草稿'})]]),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 assert.equal(readGuideMemory(storage).draft,'');assert(data.has('lishui-guide-conditions-v1'));
});
test('无docs、无私钥、无本地向量的新工作目录也能运行整套其他单元测试与导游审计',async()=>{
 await mkdir(join(root,'.web_review'),{recursive:true});const temp=await mkdtemp(join(root,'.web_review/review-cold-'));
 for(const folder of ['src','server','scripts','public'])await cp(join(root,folder),join(temp,folder),{recursive:true});
 await mkdir(join(temp,'config'));await cp(join(root,'config/agent-system.plan.js'),join(temp,'config/agent-system.plan.js'));
 await cp(join(root,'package.json'),join(temp,'package.json'));
 await assert.rejects(()=>access(join(temp,'docs')));await assert.rejects(()=>access(join(temp,'config/integrations.env.local')));await assert.rejects(()=>access(join(temp,'runtime.local')));
 const tests=(await readdir(join(temp,'scripts'))).filter(name=>name.endsWith('test.mjs')&&name!=='review-integrity.test.mjs').map(name=>'scripts/'+name);
 const childEnvironment={...process.env};delete childEnvironment.NODE_TEST_CONTEXT;
 const result=await run(process.execPath,['--test',...tests],{cwd:temp,env:childEnvironment,maxBuffer:6*1024*1024});assert.match(result.stdout,/(?:fail 0)/);
 const audit=await run(process.execPath,['scripts/audit-guide.mjs'],{cwd:temp,env:childEnvironment});assert.match(audit.stdout,/索引|rag:index/);
 const exported=await run(process.execPath,['scripts/export-reviewed-corpus.mjs'],{cwd:temp,env:childEnvironment});assert.match(exported.stdout,/'approved'|"approved"/);
 const data=JSON.parse(await readFile(join(temp,'docs/corpus-audit/approved-corpus.json'),'utf8'));assert.equal(corpusHash(data.chunks),corpusHash(await readCorpus()));
});
