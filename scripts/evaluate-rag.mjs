import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getConfig } from '../server/core.mjs';
import { createProviders } from '../server/providers.mjs';
import { createKnowledge } from '../server/knowledge.mjs';
import { createChat, validateChat } from '../server/chat.mjs';
import { evaluationScenarios } from './eval-scenarios.mjs';
import { approvedQA } from '../src/data/presetQA.js';

// Evidence/tools are captured once per scenario and frozen for paired trials.
// Model calls remain live; replay latency excludes external tool latency.
const config=getConfig(),cases=evaluationScenarios();
const repetitions=Number(process.argv.find((arg)=>arg.startsWith('--repeat='))?.split('=')[1]||3);
if(!Number.isInteger(repetitions)||repetitions<1||repetitions>3)throw new Error('repeat must be 1..3');
// 新测量各自留档，不覆盖10/4的216次输出及其后续人工评分依据。
const runs=new URL('../docs/evaluation/runs/',import.meta.url);await mkdir(runs,{recursive:true});
const directory=new URL(`${new Date().toISOString().replace(/[:.]/g,'-')}/`,runs);await mkdir(directory);
console.log(JSON.stringify({outputDirectory:decodeURIComponent(directory.pathname)}));
const results=[],snapshots=[];
const providers=createProviders(config),knowledge=await createKnowledge(providers,config.embedding.model);
const keyOf=(name,args)=>JSON.stringify([name,args]);
const operations=['search','weather','places','route','translate','stays'];
const sourcesOf=(result)=>[...new Map((result.replies||[result]).flatMap((reply)=>[...(reply.sources||[]),...(reply.sourceUrl?[{label:reply.source,url:reply.sourceUrl}]:[])]).map((source)=>[source.url,source])).values()];
const quantile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]:null;
for(const scenario of cases){
  const frozen=new Map(),capturedMetrics=[];
  const real=createProviders(config,undefined,undefined,{onMetric:(metric)=>capturedMetrics.push(metric)});
  const capture={...real};
  for(const operation of operations) capture[operation]=async(...args)=>{
    const key=keyOf(operation,args);
    try{if(scenario.failure===operation)throw new Error('controlled tool failure');const value=await real[operation](...args);frozen.set(key,{operation,args,value});return structuredClone(value);}
    catch{frozen.set(key,{operation,args,error:'工具未返回有效结果'});throw new Error('工具未返回有效结果');}
  };
  const frozenKnowledge=new Map();
  const captureKnowledge={retrieve:async(question,filter)=>{const clean={nodeId:filter.nodeId,expertId:filter.expertId,serviceId:filter.serviceId,limit:filter.limit};const value=await knowledge.retrieve(question,clean);frozenKnowledge.set(keyOf('retrieve',[question,clean]),{question,filter:clean,value});return structuredClone(value);}};
  await createChat(capture,captureKnowledge)(validateChat(scenario.input));
  // The no-RAG arm needs a web snapshot even when the approved arm skipped search.
  if(scenario.ablation)await createChat(capture,captureKnowledge)(validateChat(scenario.input),{disableKnowledge:true});
  snapshots.push({id:scenario.id,tools:[...frozen.values()],knowledge:[...frozenKnowledge.values()],capturedMetrics});
  for(let repeat=1;repeat<=repetitions;repeat++)for(const mode of scenario.ablation?['single','multi','withoutRag']:['single','multi']){
    const metrics=[],calls=[],started=Date.now();
    const active=createProviders(config,undefined,undefined,{onMetric:(metric)=>metrics.push(metric)});
    for(const operation of operations)active[operation]=async(...args)=>{calls.push({operation,args});const item=frozen.get(keyOf(operation,args));if(!item||item.error)throw new Error('固定工具快照不可用');return structuredClone(item.value);};
    const replayKnowledge={retrieve:async(question,filter)=>{const clean={nodeId:filter.nodeId,expertId:filter.expertId,serviceId:filter.serviceId,limit:filter.limit};const item=frozenKnowledge.get(keyOf('retrieve',[question,clean]));if(!item)throw new Error('固定检索快照不可用');return structuredClone(item.value);}};
    let output,error;
    try{output=await createChat(active,replayKnowledge)(validateChat(scenario.input),{mode:mode==='single'?'single':'multi',disableKnowledge:mode==='withoutRag'});}catch{error='评测调用未完成';}
    const text=(output?.replies||[output]).filter(Boolean).map((reply)=>reply.content).join('\n');
    const sources=output?sourcesOf(output):[];
    const e=scenario.expected;
    const checks={keywords:e.keywords.every((word)=>text.includes(word)),forbidden:!(e.forbidden||[]).some((word)=>text.includes(word)),services:!e.services||e.services.every((service)=>output?.serviceId===service||(output?.replies||[]).some((reply)=>reply.serviceId===service)||output?.collaboration?.trace?.some((task)=>task.taskId===service)),citations:!e.citation||sources.length>0,operations:(e.operations||[]).every((name)=>calls.some((call)=>call.operation===name)),noOperations:!(e.noOperations||[]).some((name)=>calls.some((call)=>call.operation===name)||metrics.some((metric)=>metric.operation===name))};
    results.push({id:scenario.id,mode,repeat,durationMs:Date.now()-started,checks,automatedPass:!error&&Object.values(checks).every(Boolean),output,error,toolCalls:calls,modelMetrics:metrics,humanReview:{taskCompletion:null,factSupport:null,citationSupport:null,missedConstraints:null,notes:''}});
  }
  await writeFile(new URL('results.local.json',directory),JSON.stringify({running:true,checkedAt:new Date().toISOString(),results},null,2)+'\n');
  console.log(JSON.stringify({scenario:scenario.id,category:scenario.category,runs:results.filter((result)=>result.id===scenario.id).length,passed:results.filter((result)=>result.id===scenario.id&&result.automatedPass).length}));
}
const summary={checkedAt:new Date().toISOString(),scenarioCount:cases.length,repetitions,model:config.llm.model,embedding:config.embedding.model,index:knowledge.status(),dataHash:createHash('sha256').update(JSON.stringify(cases)).digest('hex'),method:'相同已审语料和每题冻结的真实工具/检索快照；模型选择/汇总为真实请求。单角色顺序执行与多角色并行执行同一任务规则。withoutRag禁用已审QA和检索，保留同一联网工具快照。',limitations:['工具快照回放不等待原始工具网络耗时，P50/P95仅表示回放加真实模型耗时，不能代表公网端到端性能。','自动词项/来源/任务检查不是人工语义评分，人工评分字段仍为空。','两种调度共用工具与规则，是受控架构基线，不代表任意自主单智能体。','只记录实际token与调用量；未确认单价，不折算货币成本。','天气等快照对应采集时，不能作为后来出行日承诺。'],modes:{}};
for(const mode of ['single','multi','withoutRag']){const rows=results.filter((result)=>result.mode===mode),times=rows.map((row)=>row.durationMs);summary.modes[mode]={runs:rows.length,automatedPassed:rows.filter((row)=>row.automatedPass).length,p50ReplayMs:quantile(times,.5),p95ReplayMs:quantile(times,.95),modelCalls:rows.reduce((sum,row)=>sum+row.modelMetrics.filter((metric)=>metric.operation==='generate').length,0),reportedTokens:rows.reduce((sum,row)=>sum+row.modelMetrics.reduce((n,metric)=>n+(metric.usage?.totalTokens||0),0),0),toolCalls:rows.reduce((sum,row)=>sum+row.toolCalls.length,0)};}
await Promise.all([writeFile(new URL('cases.json',directory),JSON.stringify({createdAt:summary.checkedAt,cases:cases.map((item)=>({...item,references:item.referenceIds?.map((id)=>approvedQA.find((qa)=>qa.id===id))}))},null,2)+'\n'),writeFile(new URL('tool-snapshots.local.json',directory),JSON.stringify(snapshots,null,2)+'\n'),writeFile(new URL('results.local.json',directory),JSON.stringify({running:false,...summary,results},null,2)+'\n'),writeFile(new URL('summary.json',directory),JSON.stringify(summary,null,2)+'\n')]);
console.log(JSON.stringify(summary.modes));
