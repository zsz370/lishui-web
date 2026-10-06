import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const dir=new URL('../docs/evaluation/',import.meta.url);
const data=JSON.parse(await readFile(new URL('results.local.json',dir),'utf8'));
if(data.running)throw new Error('Evaluation is still running');
const records=JSON.parse(await readFile(new URL('cases.json',dir),'utf8'));
const quantile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]:null;
const review={checkedAt:new Date().toISOString(),dataHash:data.dataHash,runs:data.results.length,reviewer:'自动规则与开发检查；人工语义评分未完成',sourceHashes:{},modes:{},failedCases:[],reviewFields:['taskCompletion:0/1/2','factSupport:受支持事实数/可核事实数','citationSupport:真正支持对应主张的引用数/所用引用数','missedConstraints:遗漏的明示条件','notes:失败、歧义及复核依据']};
for(const file of ['server/chat.mjs','server/providers.mjs','server/knowledge.mjs','server/core.mjs','server/index.mjs','src/data/chatRouting.js','src/services/travelAdvice.js','scripts/evaluate-rag.mjs','scripts/eval-scenarios.mjs'])review.sourceHashes[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
for(const mode of ['single','multi','withoutRag']){
  const rows=data.results.filter((row)=>row.mode===mode),metrics=rows.flatMap((row)=>row.modelMetrics);
  review.modes[mode]={...data.modes[mode],modelFailed:metrics.filter((m)=>m.status==='failed').length,usageMissing:metrics.filter((m)=>!m.usage).length,reportedPromptTokens:metrics.reduce((sum,m)=>sum+(m.usage?.promptTokens||0),0),reportedCompletionTokens:metrics.reduce((sum,m)=>sum+(m.usage?.completionTokens||0),0),facts:rows.filter((row)=>records.cases.find((c)=>c.id===row.id)?.ablation).length,factsAutomatedPassed:rows.filter((row)=>row.automatedPass&&records.cases.find((c)=>c.id===row.id)?.ablation).length};
  for(const row of rows.filter((row)=>!row.automatedPass))review.failedCases.push({id:row.id,mode,repeat:row.repeat,failedChecks:Object.entries(row.checks).filter(([,ok])=>!ok).map(([name])=>name)});
}
const live=JSON.parse(await readFile(new URL('../docs/agent-audit/routing-stream-live.json',import.meta.url),'utf8'));
review.liveHttp={scope:live.scope,cases:live.cases.length,p50Ms:quantile(live.cases.map((row)=>row.durationMs),.5),p95Ms:quantile(live.cases.map((row)=>row.durationMs),.95),firstProgressP50Ms:quantile(live.cases.map((row)=>row.firstProgressMs).filter(Number.isFinite),.5),firstProgressMaxMs:Math.max(...live.cases.map((row)=>row.firstProgressMs).filter(Number.isFinite))};
await writeFile(new URL('developer-review.json',dir),JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({runs:review.runs,modes:review.modes,live:review.liveHttp},null,2));
