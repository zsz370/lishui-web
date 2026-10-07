import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { planChat, focusKnowledgeQuestion } from '../src/data/chatRouting.js';
import { readChatEvents } from '../src/services/chatStream.js';
import { createChat, validateChat } from '../server/chat.mjs';
import { createApi } from '../server/index.mjs';
import { createProviders } from '../server/providers.mjs';
import { getConfig, today, clientAddress } from '../server/core.mjs';

const weatherData = () => ({provider:'测试天气',sourceUrl:'https://example.org/weather',location:'溧水城区',fetchedAt:Date.now(),days:[{date:today(),text:'晴',min:18,max:26,rain:0}]});
const fakeKnowledge = {chunks:[],status:()=>({ready:true,chunks:0}),retrieve:async()=>[]};
const config = () => ({...getConfig({}),llm:{key:'test'},rateLimit:100});
async function start(t, providers, options={}) {
  const server=createApi({config:{...config(),...options},providers,knowledge:fakeKnowledge,log:()=>{}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>{server.closeAllConnections();server.close();});
  return `http://127.0.0.1:${server.address().port}`;
}
const post=(base,input,options={})=>fetch(`${base}/api/chat/stream`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),...options});

test('八类工具与地方知识由同一导游处理，显式地点和纯翻译不受原名片干扰',()=>{
  for(const [q,service] of [['溧水天气怎么样','weather'],['想订酒店','stay'],['从南京南站怎么去天生桥','transport'],['寺庙参观礼仪','etiquette'],['轮椅出行','accessibility'],['伴手礼怎么保存','shopping'],['安排一日游','planning'],['退票退款怎么办','support']]) assert(planChat({question:q}).services.includes(service),q);
  for(const [q,id] of [['韩熙载与无想山有何联系','01_huaiyuanjie'],['洪蓝玉带糕的名录类别','01_huaiyuanjie'],['骆山大龙的文化形制','01_huaiyuanjie'],['打五件是什么类别','01_huaiyuanjie'],['石臼渔歌的项目类别','01_huaiyuanjie'],['周园有哪些收藏线索','01_huaiyuanjie']]) assert(planChat({question:q,nodeId:'n_fjb'}).knowledgeTargets.some((target)=>target.expertId===id),q);
  assert.equal(planChat({question:'天生桥和洪蓝玉带糕有什么文化看点？'}).knowledgeTargets.length,2);
  const plan=planChat({question:'天生桥和玉带糕分别有什么文化线索？'});
  assert.equal(plan.knowledgeTargets.length,2);
  assert.equal(focusKnowledgeQuestion('天生桥和玉带糕分别有什么文化线索？',plan.knowledgeTargets[0],plan.knowledgeTargets),'天生桥有什么文化线索？');
  assert.deepEqual(planChat({nodeId:'n_sj',question:'S9水上列车实际如何过湖？'}).services,[]);
  assert(planChat({nodeId:'n_sj',question:'S9水上列车怎么坐，在哪换乘？'}).services.includes('transport'));
  assert.deepEqual(planChat({question:'请翻译“明天去天生桥问住宿和天气”',nodeId:'n_tsq'}).knowledgeTargets,[]);
});

test('待核问题不调用生成或搜索；非时效已审命中不能被模型切成未审摘录',async()=>{
  let calls=0;
  const held=await createChat({search:async()=>{calls++;return [];},generate:async()=>{calls++;return ''; }},fakeKnowledge)(validateChat({nodeId:'c_syg',question:'来首溧水童谣？'}));
  assert.match(held.content,/尚未核准/);assert.equal(calls,0);
  const knowledge={retrieve:async()=>[{question:'韩熙载是谁',answer:'南唐人物，不支持改名故事',kind:'fact',score:.6,sources:[{label:'已审证据',url:'https://example.org/reviewed'}]}]};
  const result=await createChat({search:async()=>[{excerpt:'未审故事',url:'https://example.org/web',label:'网页'}],generate:async()=>'{"selectedIds":["W1"]}'},knowledge)(validateChat({nodeId:'n_wx',question:'韩熙载在无想山的文化线索是什么？'}));
  assert.equal(result.kind,'unavailable');assert.doesNotMatch(result.content,/未审故事/);
});

test('跨节点分别过滤、由实际专家答复，来源与任务不串到第一节点',async()=>{
  const filters=[],events=[];
  const knowledge={retrieve:async(q,filter)=>{filters.push(filter);return [{question:q,answer:`${filter.nodeId}的已审资料`,kind:'fact',score:0.9,sources:[{label:filter.nodeId,url:`https://example.org/${filter.nodeId}`}]}];}};
  const chat=createChat({generate:async()=>'{"selectedIds":["K1"]}'},knowledge);
  const result=await chat(validateChat({question:'天生桥和洪蓝玉带糕有什么文化看点？'}),{onProgress:(event)=>events.push(event)});
  assert.deepEqual(filters.map((item)=>item.nodeId).sort(),['f_ydg','n_tsq']);
  assert(result.replies.some((item)=>item.speaker.id==='01_huaiyuanjie'));
  assert(result.replies.some((item)=>item.speaker.id==='01_huaiyuanjie'));
  assert.equal(events.filter((item)=>item.status==='running').length,2); // two knowledge tasks + coordinator
  assert(events.filter((item)=>item.status==='completed'&&!item.taskId.startsWith('dispatch:')).every((item)=>item.durationMs>=0));
});

test('单导游的独立工具查询可并行，结果统一成一条答复',async()=>{
  for(const mode of ['single','multi']) {
    let active=0,maxActive=0;
    const enter=async(value)=>{active++;maxActive=Math.max(maxActive,active);await delay(15);active--;return value;};
    const providers={weather:()=>enter(weatherData()),generate:async(messages,options)=>options?.structured?'{"selectedIds":["K1"]}':'伙伴已核对无想山资料，请结合天气安排行程。'};
    const knowledge={retrieve:()=>enter([{answer:'无想山资料',kind:'fact',score:0.9,sources:[{label:'背景',url:'https://example.org/guide'}]}])};
    const result=await createChat(providers,knowledge)(validateChat({nodeId:'n_wx',question:'今天无想山天气和文化看点是什么？'}),{mode});
    assert.equal(maxActive,2);
    assert.match(result.content,/无想山资料|伙伴/);
    assert.equal(result.replies.length,1);assert.equal(result.speaker.id,'01_huaiyuanjie');
  }
});

test('SSE在结果之前报告实际任务，部分天气失败仍返回其他结果',async(t)=>{
  const base=await start(t,{weather:async()=>{await delay(30);throw new Error('private upstream data');},generate:async()=>'{"selectedIds":["K1"]}'});
  const events=[],response=await post(base,{question:'今天溧水天气和退票怎么处理？'});
  assert.match(response.headers.get('content-type'),/text\/event-stream/);
  const result=await readChatEvents(response,(entry)=>events.push(entry));
  assert(events.some((entry)=>entry.taskId==='weather'&&entry.status==='running'));
  assert(events.some((entry)=>entry.taskId==='weather'&&entry.status==='failed'));
  assert(result.operations.trace.some((task)=>task.taskId==='support'));
  assert.doesNotMatch(JSON.stringify(result),/private upstream/);
});

test('需要日期的住宿任务如实标为待补充，不调用供应商',async(t)=>{
  const base=await start(t,{stays:async()=>{throw new Error('不应调用');}});
  const events=[];const result=await readChatEvents(await post(base,{question:'想订住宿'}),(entry)=>events.push(entry));
  assert.equal(result.kind,'needs_input');
  assert(events.some((entry)=>entry.status==='needs_input'));
});

test('请求取消传到上游信号，客户端断开后不继续汇总',async(t)=>{
  let cancelled=false,generated=false;
  const base=await start(t,{withRuntime:({signal})=>({weather:async()=>{try{await delay(2000,undefined,{signal});}catch{cancelled=true;throw new Error('cancelled');}return weatherData();},generate:async()=>{generated=true;return '';}})});
  const controller=new AbortController();const response=await post(base,{question:'今天溧水天气怎么样？'},{signal:controller.signal});
  const reader=response.body.getReader();await reader.read();controller.abort();await delay(50);
  assert(cancelled);assert.equal(generated,false);
  await reader.cancel().catch(()=>{});
});

test('服务端超时返回可读错误事件，格式错误在开启流之前拒绝',async(t)=>{
  const base=await start(t,{withRuntime:({signal})=>({weather:async()=>{await delay(3000,undefined,{signal});return weatherData();}})},{chatTimeoutMs:30});
  await assert.rejects(()=>post(base,{question:'今天天气？'}).then((response)=>readChatEvents(response)),/超时/);
  const invalid=await post(base,{question:''});assert.equal(invalid.status,400);assert.match(invalid.headers.get('content-type'),/application\/json/);
});

test('中文UTF-8分片、心跳和CRLF完整解码；截断与错误事件不能充当成功',async()=>{
  const bytes=new TextEncoder().encode('event: progress\r\ndata: {"taskId":"weather","status":"running","label":"查询天气"}\r\n\r\n: keepalive\r\n\r\nevent: result\r\ndata: {"content":"中文答复","speaker":{"id":"test"}}\r\n\r\n');
  const events=[];
  const response=new Response(new ReadableStream({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}}));
  const result=await readChatEvents(response,(entry)=>events.push(entry));assert.equal(result.content,'中文答复');assert.equal(events[0].label,'查询天气');
  await assert.rejects(()=>readChatEvents(new Response('event: progress\ndata: {}\n\n')),/未完成/);
  await assert.rejects(()=>readChatEvents(new Response('event: error\ndata: {"error":{"message":"额度不足"}}\n\n')),/额度不足/);
});

test('上游请求可取消，计量只记录操作和数值；生产来源必须明确',async()=>{
  const controller=new AbortController(),metrics=[];
  const provider=createProviders({...getConfig({}),llm:{base:'https://api.siliconflow.cn/v1',key:'never-expose',model:'test'}},async(url,options)=>{assert(options.signal);return {ok:true,json:async()=>({choices:[{message:{content:'答案'},finish_reason:'stop'}],usage:{prompt_tokens:12,completion_tokens:3,total_tokens:15}})};},undefined,{signal:controller.signal,onMetric:(item)=>metrics.push(item)});
  await provider.generate([{role:'user',content:'private question'}]);assert.equal(metrics[0].usage.totalTokens,15);assert.doesNotMatch(JSON.stringify(metrics),/never-expose|private question/);
  controller.abort();await assert.rejects(()=>provider.generate([]));
  assert.deepEqual(getConfig({API_ALLOWED_ORIGINS:'https://lsguide.cn'}).origins,['https://lsguide.cn']);
  assert.throws(()=>getConfig({API_ALLOWED_ORIGINS:'*'}));assert.throws(()=>getConfig({API_ALLOWED_ORIGINS:'http://lsguide.cn'}));
  assert.equal(clientAddress({socket:{remoteAddress:'127.0.0.1'},headers:{'x-real-ip':'203.0.113.8'}},true),'203.0.113.8');
  assert.equal(clientAddress({socket:{remoteAddress:'203.0.113.9'},headers:{'x-real-ip':'203.0.113.8'}},true),'203.0.113.9');
  assert.equal(clientAddress({socket:{remoteAddress:'127.0.0.1'},headers:{'x-real-ip':'untrusted, spoofed'}},true),'127.0.0.1');
});
