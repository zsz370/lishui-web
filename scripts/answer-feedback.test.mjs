import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createApi } from '../server/index.mjs';
import { createProviders } from '../server/providers.mjs';
import { getConfig } from '../server/core.mjs';
import { readChatEvents } from '../src/services/chatStream.js';
import { readModelStream } from '../server/modelStream.mjs';
import { createChat, validateChat } from '../server/chat.mjs';
import { approvedQA } from '../src/data/presetQA.js';
import { approvedServiceQA } from '../src/data/foundationQA.js';
import { visitorAnswer, visitorAnswerCopy } from '../src/data/visitorAnswerCopy.js';

const knowledge={ chunks:[], status:()=>({ready:true,chunks:1}), retrieve:async()=>[{question:'天生桥形成与人工开河',answer:'天生桥与人工开河有关。',score:.9,kind:'fact',sources:[{label:'来源',url:'https://example.org/facts'}]}] };
const input={nodeId:'n_tsq',question:'请讲讲天生桥的开河运输关系'};
async function listen(t,server) { server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});return `http://127.0.0.1:${server.address().port}`; }

test('游客文案覆盖新增语料，吃法不夹非遗元数据，传说和票价边界保留',()=>{
  const all=[...approvedQA,...approvedServiceQA];assert(all.length>=100);
  assert.deepEqual(new Set(Object.keys(visitorAnswerCopy)),new Set(all.map((qa)=>qa.q)));
  for(const qa of all) {
    const copy=visitorAnswer(qa);assert(copy.trim(),qa.q);
    assert.doesNotMatch(copy,/本次不把|原稿|审核库|已审资料：|NJⅦ|JSⅦ/);
    if(qa.kind==='legend')assert.match(copy,/尚无.*史料.*确证/);
    if(qa.kind==='reference-price'){assert.match(copy,/2026年10月5日/);assert.match(copy,/参考价/);assert.match(copy,/当天/);}
  }
  assert.match(visitorAnswerCopy['洪蓝手抓鸡怎么吃？'],/撕取鸡肉.*蘸料/);
  assert.doesNotMatch(visitorAnswerCopy['洪蓝手抓鸡怎么吃？'],/非遗|名录|散养|皮脆/);
});

test('正文确实先于HTTP最终结果到达；首条回答不等待其他任务汇总',async(t)=>{
  let release; const gate=new Promise((resolve)=>{release=resolve;});t.after(()=>release());
  const provider={generate:async()=>'{"selectedIds":["K1"]}',generateStream:async(_, {onDelta})=>{onDelta('天生桥');await gate;onDelta('与人工开河有关。');return '天生桥与人工开河有关。';}};
  const base=await listen(t,createApi({config:{...getConfig({}),rateLimit:100},providers:provider,knowledge,log:()=>{}}));
  const response=await fetch(base+'/api/chat/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  let finished=false,first;
  const seen=new Promise((resolve)=>{first=resolve;});
  const entries=[];
  const resultPromise=readChatEvents(response,()=>{},(entry)=>{entries.push(entry);if(entry.type==='delta')first();}).then((r)=>{finished=true;return r;});
  await Promise.race([seen,delay(1500).then(()=>{throw Error('正文没有提前到达');})]);assert.equal(finished,false);
  assert.equal(entries[0].delta,'天生桥');release();
  const result=await resultPromise;assert.equal(result.content,'天生桥与人工开河有关。');assert(entries.some((e)=>e.type==='complete'));
});

test('真实模型HTTP SSE分片解码，不展示思考字段；请求携带stream:true',async(t)=>{
  const upstream=await listen(t,createServer(async(req,res)=>{
    const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks));assert.equal(body.stream,true);
    res.writeHead(200,{'Content-Type':'text/event-stream'});
    const text='data: '+JSON.stringify({choices:[{delta:{content:'你好，',reasoning_content:'内部推理'}}]})+'\r\n\r\n';
    for(const byte of Buffer.from(text))res.write(Buffer.from([byte]));await delay(25);
    res.end('data: '+JSON.stringify({choices:[{delta:{content:'欢迎来溧水。'},finish_reason:'stop'}],usage:{prompt_tokens:5,completion_tokens:3,total_tokens:8}})+'\n\ndata: [DONE]\n\n');
  }));
  const metrics=[],deltas=[];
  const provider=createProviders({...getConfig({}),llm:{base:upstream,key:'test',model:'fixture'}},fetch,undefined,{onMetric:(x)=>metrics.push(x)});
  const answer=await provider.generateStream([{role:'user',content:'你好'}],{onDelta:(d)=>deltas.push(d)});
  assert.equal(answer,'你好，欢迎来溧水。');assert.equal(deltas.length,2);assert.equal(metrics[0].usage.totalTokens,8);assert.doesNotMatch(JSON.stringify(deltas),/内部推理/);
});

test('没有DONE或长度截断的流必须失败；部分文字不能冒充完整答复',async()=>{
  const payload='data: '+JSON.stringify({choices:[{delta:{content:'未完成'},finish_reason:'length'}]})+'\n\ndata: [DONE]\n\n';
  await assert.rejects(()=>readModelStream(new Response(payload)),/中断/);
  await assert.rejects(()=>readModelStream(new Response('data: {"choices":[{"delta":{"content":"一半"}}]}\n\n')),/中断/);
});

test('生成失败或无证据相关性时不回填一个无关整段答案',async()=>{
  const seen=[];
  const result=await createChat({generate:async()=>'{"selectedIds":["K1"]}',generateStream:async(_, {onDelta})=>{onDelta('不完整');throw Error('断流');}},knowledge)(validateChat(input),{onAnswer:(e)=>seen.push(e)});
  assert.match(result.content,/未能完整核对/);assert.doesNotMatch(result.content,/不完整|天生桥与人工开河/);
  assert.match(seen.at(-1).reply.content,/未能完整核对/);
  const unknown=await createChat({generate:async()=>'{"selectedIds":[]}'},knowledge)(validateChat(input));
  assert.equal(unknown.kind,'unavailable');assert.doesNotMatch(unknown.content,/人工开河/);
});

test('已流式文字在取消后不再出现完成事件',async()=>{
  const controller=new AbortController(),events=[];
  const provider={generate:async()=>'{"selectedIds":["K1"]}',generateStream:async(_, {onDelta})=>{onDelta('开始回答');controller.abort();onDelta('取消后');return '取消后';}};
  await assert.rejects(()=>createChat(provider,knowledge)(validateChat(input),{signal:controller.signal,onAnswer:(e)=>events.push(e)}));
  assert.equal(events.length,1);assert.equal(events[0].delta,'开始回答');
});
