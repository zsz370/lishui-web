// Explicit live acceptance against the running local API, never used by tests.
import { writeFile } from 'node:fs/promises';
const results=[];
const requests=[
  {id:'source_grounded_rag',input:{nodeId:'n_tsq',question:'天生桥的石桥与人工开河有何关系？票价资料齐全吗？'}},
  {id:'cross_department_trip',input:{question:'明天带老人，从南京南站去无想山，两天一晚，查天气和300元内酒店、公共交通，给英文行程'}},
  {id:'arbitrary_translation',input:{question:'翻译成英文：“我想确认入住日期，并询问是否有电梯。”'}},
  {id:'missing_dates',input:{question:'找300元以内的酒店'}},
];
for(const request of requests){
  const started=Date.now();
  try {
    const response=await fetch('http://127.0.0.1:8787/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request.input),signal:AbortSignal.timeout(100000)});
    const data=await response.json();
    results.push({id:request.id,httpStatus:response.status,durationMs:Date.now()-started,question:request.input.question,kind:data.kind,replies:(data.replies||[data]).map((reply)=>({kind:reply.kind,speaker:reply.speaker?.name,content:reply.content,retrieval:reply.retrieval,source:reply.source})),collaboration:data.collaboration});
    console.log(JSON.stringify({id:request.id,status:response.status,kinds:(data.replies||[data]).map((reply)=>reply.kind),trace:data.collaboration?.trace.map(({taskId,status})=>({taskId,status}))}));
  }catch{results.push({id:request.id,status:'request_failed'});console.log(JSON.stringify({id:request.id,status:'request_failed'}));}
}
await writeFile(new URL('../docs/agent-audit/agent-flow-smoke.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),scope:'实时演示查询的记录，房价天气会变化，不作为新获审QA入库',results},null,2)+'\n');
