// Real embedding + HTTP acceptance. The API must be restarted after exporting
// a changed corpus; existing in-memory indexes cannot prove current readiness.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { getConfig } from '../server/core.mjs';
import { createProviders } from '../server/providers.mjs';
import { createKnowledge } from '../server/knowledge.mjs';
const config=getConfig(), providers=createProviders(config);
const knowledge=await createKnowledge(providers,config.embedding.model);
assert(knowledge.status().ready);
const cases=[
  {expertId:'01_huaiyuanjie',question:'一天游览该先确认哪些交通和开放信息？',serviceId:'planning'},
  {expertId:'02_laizhusheng',question:'大金山国防园有哪些教育展馆？',nodeId:'n_djs'},
  {expertId:'08_wuxiangsao',question:'网上预订住宿需要核对哪些条件？',serviceId:'stay'},
  {expertId:'10_meiguisao',question:'买糕点时配料和保存标签怎么看？',serviceId:'shopping'},
  {expertId:'11_dongpingjie',question:'南京非紧急政务服务咨询号码是什么？',serviceId:'support'},
  {expertId:'12_dongluke',question:'寺庙展馆参观需要遵守什么礼仪？',serviceId:'etiquette'},
];
const retrieval=[];
for(const {question,...filter} of cases){
  const started=Date.now(),hits=await knowledge.retrieve(question,{...filter,limit:3});
  assert(hits.length,question);assert(hits.every((hit)=>hit.expertId===filter.expertId));
  assert(hits.every((hit)=>!filter.serviceId||hit.serviceId===filter.serviceId));
  assert(hits.every((hit)=>!filter.nodeId||hit.nodeId===filter.nodeId));
  retrieval.push({question,filter,durationMs:Date.now()-started,hits:hits.map(({id,score,sources})=>({id,score,sources}))});
}
const requests=[
  {id:'foundation_booking',input:{nodeId:'n_tsq',question:'预订溧水住宿前要核对什么？'},kind:'preset',expertId:'08_wuxiangsao'},
  {id:'foundation_shopping',input:{question:'买糕点伴手礼要看哪些标签？'},kind:'preset',expertId:'10_meiguisao'},
  {id:'foundation_learning',input:{nodeId:'n_djs',question:'大金山国防园有哪些教育展馆？'},kind:'rag',expertId:'02_laizhusheng'},
  {id:'literal_translation',input:{nodeId:'n_wx',question:'翻译成英文：“明天下雨，我想预订无想山酒店。”'},kind:'translation',expertId:'12_dongluke'},
  {id:'missing_dates_in_card',input:{nodeId:'n_tsq',question:'天生桥附近300元内酒店'},kind:'needs_input',expertId:'08_wuxiangsao'},
];
const http=[];
let failure;
for(const item of requests){
  const started=Date.now();
  try{
    const response=await fetch('http://127.0.0.1:8787/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item.input),signal:AbortSignal.timeout(55000)});
    const data=await response.json();
    assert.equal(response.status,200);assert.equal(data.kind,item.kind);assert.equal(data.speaker.id,item.expertId);
    if(['literal_translation','missing_dates_in_card'].includes(item.id))assert(!data.collaboration.trace.some((task)=>task.taskId==='knowledge'));
    if(item.kind==='preset')assert(data.sources.length&&data.reviewedAt==='2026-10-04');
    if(item.kind==='rag')assert(data.sources.length&&data.retrieval.approvedChunks>0);
    http.push({id:item.id,status:'passed',durationMs:Date.now()-started,input:item.input,kind:data.kind,speaker:data.speaker.name,content:data.content,sources:data.sources,trace:data.collaboration?.trace});
  }catch(error){failure=error;http.push({id:item.id,status:'failed',durationMs:Date.now()-started,message:error.message});}
  console.log(JSON.stringify({id:item.id,status:http.at(-1).status,durationMs:http.at(-1).durationMs}));
}
const ready=await(await fetch('http://127.0.0.1:8787/ready')).json();
assert.equal(ready.index.hash,knowledge.status().hash);
await writeFile(new URL('../docs/agent-audit/foundation-live-smoke.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),scope:'真实向量服务6组角色过滤检索与本地HTTP5组调用；未重新验收全部外部旅游服务',index:knowledge.status(),readiness:ready.ready,retrieval,http},null,2)+'\n');
if(failure)throw failure;
