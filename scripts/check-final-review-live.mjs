import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { getConfig } from '../server/core.mjs';
import { createProviders } from '../server/providers.mjs';
import { createKnowledge } from '../server/knowledge.mjs';
import { queryQA } from '../src/data/presetQA.js';
import { ticketQA } from '../src/data/ticketReference.js';

const config = getConfig();
const knowledge = await createKnowledge(createProviders(config), config.embedding.model);
assert.equal(knowledge.status().chunks, 69);
const retrieval = [];
for (const [question, nodeId, expertId, wanted] of [
  ['韩熙载与无想山、无想寺名称的地方传说是什么？', 'n_wx', '03_yanzhike', '无想山名字是怎么来的？'],
  ['胭脂河得名的火烧红石传说', 'n_tsq', '03_yanzhike', '胭脂河名字有什么传说？'],
  ['天生桥18元57元85元门票套票参考价', 'n_tsq', '03_yanzhike', ticketQA[0].q],
  ['周园儿童老人学生军人残障人士半价', 'n_zy', '02_laizhusheng', ticketQA[2].q],
  ['明觉铁画2008年正式名录的级别和项目编号', 'c_tj', '04_dalonggu', '明觉铁画的非遗级别有哪些正式依据？'],
]) {
  const filter = { nodeId, expertId, limit: 4 };
  const hits = await knowledge.retrieve(question, filter);
  assert(hits.some(hit => hit.question === wanted), question);
  assert(hits.every(hit => hit.nodeId === nodeId && hit.expertId === expertId));
  assert(hits.every(hit => hit.sources?.length && hit.status === 'approved'));
  retrieval.push({ question, filter, hits });
}
const contradictory = await knowledge.retrieve('明觉铁画级别', { nodeId: 'c_tj', expertId: '06_ruanyunan' });
assert.equal(contradictory.length, 0);
const http = [];
async function check(input, verify) {
  const started = Date.now();
  const response = await fetch(`http://127.0.0.1:${config.port}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    signal: AbortSignal.timeout(25000),
  });
  const output = await response.json();
  assert.equal(response.status, 200, JSON.stringify(output));
  verify(output);
  http.push({ input, output, durationMs: Date.now() - started });
}
for (const qa of [...ticketQA, queryQA('n_wx', '无想山名字是怎么来的？'), queryQA('n_tsq', '胭脂河名字有什么传说？'), queryQA('c_ldl', '骆山大龙为什么是断尾的？')]) {
  await check({ nodeId: qa.nodeId, question: qa.q }, output => {
    assert.equal(output.kind, 'preset'); assert.equal(output.content, qa.a);
    assert.deepEqual(output.sources, qa.sources);
  });
}
await check({ question: '想订住宿，预算300元以内' }, output => {
  assert.equal(output.kind, 'needs_input'); assert.match(output.content, /300元.*公共交通.*自驾.*入住日期和退房日期/s);
});
await check({ question: '想订住宿', preferences: { checkInDate: '2026-10-07' } }, output => {
  assert.match(output.content, /2026-10-07入住.*补充退房日期/s); assert.doesNotMatch(output.content, /补充入住日期/);
});
await check({ question: '预算改成300元以内，改乘公共交通', history: [{ role: 'user', content: '想订600元住宿，自驾' }] }, output => {
  assert.equal(output.kind, 'needs_input'); assert.match(output.content, /300元/);
  assert(output.collaboration.trace.some(task => task.taskId === 'stay'));
  assert(!output.collaboration.trace.some(task => task.taskId === 'transport'));
});
await check({ question: '从南京南站出发，怎么去最方便？' }, output => {
  assert.equal(output.kind, 'needs_input'); assert.match(output.content, /出发地已记下.*南京南站.*你想去哪个目的地/s);
});
await check({ question: '那门票多少钱？', history: [{ role: 'user', content: '我想去无想山' }] }, output => assert.match(output.content, /天池.*10元/));
await check({ question: '周园老人票多少钱？', history: [{ role: 'user', content: '我想去无想山' }] }, output => {
  assert.match(output.content, /75元/); assert.doesNotMatch(output.content, /天池/);
});
await check({ nodeId: 'c_syg', question: '来首溧水童谣？' }, output => {
  assert.equal(output.kind, 'unavailable'); assert.match(output.content, /不输出未核歌词/);
});
const ready = await (await fetch(`http://127.0.0.1:${config.port}/ready`)).json();
assert(ready.ready); assert.equal(ready.index.hash, knowledge.status().hash);
await writeFile(new URL('../.web_review/2026-10-05-R04-R05-正式验收接口.json', import.meta.url), JSON.stringify({
  checkedAt: new Date().toISOString(), index: knowledge.status(), retrieval,
  contradictoryFilterResult: contradictory, http,
  scope: '5次真实向量查询、1次互斥过滤、13次本地API请求；属于开发验收，不是人工逐条评分或公网验收',
}, null, 2) + '\n');
console.log(JSON.stringify({ chunks: ready.index.chunks, dimensions: ready.index.dimensions, retrieval: retrieval.length, http: http.length, hash: ready.index.hash }));
