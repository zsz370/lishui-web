import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { foundationQA, approvedServiceQA, queryServiceQA } from '../src/data/foundationQA.js';
import { approvedQA } from '../src/data/presetQA.js';
import { getNode } from '../src/data/nodes.js';
import { createChat, validateChat } from '../server/chat.mjs';
import { ask } from '../src/services/chat.js';
const unexpected = async () => { throw new Error('Unexpected external request'); };
const empty = { retrieve: unexpected };
const tools = { generate: unexpected, search: unexpected, weather: unexpected, stays: unexpected, places: unexpected, route: unexpected, translate: unexpected };

test('六位缺口角色各有三条独立获审基础问答，来源与审核日期齐全', () => {
  const owners = ['01_huaiyuanjie','02_laizhusheng','08_wuxiangsao','10_meiguisao','11_dongpingjie','12_dongluke'];
  for (const id of owners) {
    const entries = foundationQA.filter((qa) => (qa.expertId || getNode(qa.nodeId)?.expert) === id);
    assert.equal(entries.length, 3, id);
    assert.equal(new Set(entries.map((qa) => qa.q)).size, 3);
    assert(entries.every((qa) => qa.status === 'approved' && qa.reviewedAt === '2026-10-04' && qa.a && qa.sources.every((source) => source?.label && new URL(source.url).protocol === 'https:')));
  }
});

test('全部服务基础QA在线服务端与客户端答复一致并保留角色、引用', async () => {
  for (const qa of approvedServiceQA) {
    const input = { question: qa.q, nodeId: 'n_tsq', serviceId: 'weather' };
    const [server, client] = await Promise.all([createChat(tools, empty)(validateChat(input)), ask(input)]);
    for (const response of [server, client]) {
      assert.equal(response.kind, 'preset', qa.q);
      assert.equal(response.content, qa.a);
      assert.equal(response.speaker.id, qa.expertId);
      assert.equal(response.sourceUrl, qa.sources[0].url);
      assert.equal(response.serviceId, qa.serviceId);
    }
  }
  assert.equal(queryServiceQA('预订溧水住宿前要核对什么？明天300元内订房'), null);
});

test('单一翻译含景点上下文、天气与订房文字时只翻译指定文本', async () => {
  const calls=[];
  const response=await createChat({ ...tools, translate: async (text) => { calls.push(text); return { content:'Translation.' }; } }, empty)(validateChat({ nodeId:'n_wx', question:'翻译成英文：“明天下雨，我想预订无想山酒店。”' }));
  assert.deepEqual(calls,['明天下雨，我想预订无想山酒店。']);
  assert.equal(response.kind,'translation');
  assert.equal(response.collaboration.trace.length,2);
  assert(response.collaboration.trace.every((task) => task.agentId === '11_dongpingjie' || task.agentId === '12_dongluke'));
  assert.deepEqual(response.collaboration.trace.filter((task) => !task.taskId.startsWith('dispatch:')).map((task) => task.taskId), ['etiquette']);
});

test('单一天气或缺日期住宿不会因名片上下文查无关资料', async () => {
  const weather=await createChat({...tools, weather:async()=>{throw new Error('offline');}},empty)(validateChat({nodeId:'n_wx',question:'无想山明天天气如何？'}));
  assert.equal(weather.kind,'unavailable');
  assert(!weather.collaboration.trace.some((task)=>task.taskId==='knowledge'));
  const stay=await createChat(tools,empty)(validateChat({nodeId:'n_tsq',question:'天生桥附近300元内酒店'}));
  assert.equal(stay.kind,'needs_input');
  assert(!stay.collaboration.trace.some((task)=>task.taskId==='knowledge'));
});

test('住宿多轮沿用日期，新预算仍触发真实工具路径', async () => {
  let captured;
  const response=await createChat({...tools,stays:async(input)=>{captured=input;return{hotels:[],checkedAt:'test',provider:'test'};}},empty)(validateChat({serviceId:'stay',question:'预算200元',history:[{role:'user',content:'明天入住不继承相对日期，日期请用2099-01-01至2099-01-02'}]}));
  assert.equal(captured.checkInDate,'2099-01-01');assert.equal(captured.checkOutDate,'2099-01-02');assert.equal(captured.maxPrice,200);assert.equal(response.serviceId,'stay');
});

test('未经审核的网络传说摘录被过滤，选中引用不附带无关网页', async () => {
  const qa=approvedQA.find((item)=>item.nodeId==='n_tsq');
  const response=await createChat({...tools,search:async()=>[
    {label:'传说稿',url:'https://example.org/legend',excerpt:'相传韩熙载改名，血染河水。'},
    {label:'另一主题',url:'https://example.org/other',excerpt:'另一主题的资料'},
  ],generate:async()=>JSON.stringify({selectedIds:['K1']})},{retrieve:async()=>[{...qa,question:qa.q,answer:qa.a,score:0.6}]})(validateChat({nodeId:'n_tsq',question:'天生桥人工开河资料'}));
  assert(!response.content.includes('血染'));
  assert(!response.links.some((link)=>link.url.startsWith('https://example.org')));
  assert.equal(response.retrieval.webResults,1);
});

test('派生修复完整保留187行出处，童谣待核不进入批准索引', async () => {
  const data=JSON.parse(await readFile(new URL('../docs/corpus-audit/normalized-qa.json',import.meta.url),'utf8'));
  assert.equal(data.count,184);assert.equal(data.repairedRawRows,6);
  const repaired=data.items.filter((item)=>item.repair);
  assert.equal(repaired.length,3);assert.equal(repaired.filter((item)=>item.status==='approved').length,2);
  assert.equal(repaired.find((item)=>item.question==='来首溧水童谣？').status,'pending');
  const corpus=JSON.parse(await readFile(new URL('../docs/corpus-audit/approved-corpus.json',import.meta.url),'utf8'));
  assert.equal(corpus.count,approvedQA.length+approvedServiceQA.length);
  assert(!corpus.chunks.some((chunk)=>chunk.question==='来首溧水童谣？'));
});
