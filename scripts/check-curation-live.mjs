import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { getConfig } from '../server/core.mjs';
import { createProviders } from '../server/providers.mjs';
import { createKnowledge } from '../server/knowledge.mjs';
import { approvedQA } from '../src/data/presetQA.js';

const config = getConfig();
const knowledge = await createKnowledge(createProviders(config), config.embedding.model);
assert.equal(knowledge.status().chunks, 65);
const retrieval = [];
for (const [question, filter, wanted] of [
  ['无想山得名说出自哪篇地方文章？', { nodeId: 'n_wx', expertId: '03_yanzhike' }, '无想山名字是怎么来的？'],
  ['明觉铁画2008年正式名录的级别和项目编号？', { nodeId: 'c_tj', expertId: '04_dalonggu' }, '明觉铁画的非遗级别有哪些正式依据？'],
  ['骆山大龙展示馆建设报道是否证明现在开放？', { nodeId: 'c_ldl', expertId: '04_dalonggu' }, '在哪能看到骆山大龙？'],
]) {
  const hits = await knowledge.retrieve(question, { ...filter, limit: 3 });
  assert(hits.some((hit) => hit.question === wanted));
  assert(hits.every((hit) => hit.nodeId === filter.nodeId && hit.expertId === filter.expertId));
  retrieval.push({ question, filter, hits });
}
assert.equal((await knowledge.retrieve('明觉铁画级别', { nodeId: 'c_tj', expertId: '06_ruanyunan' })).length, 0);
const http = [];
for (const input of [
  ...approvedQA.filter((qa) => qa.reviewedAt === '2026-10-05').map((qa) => ({ nodeId: qa.nodeId, question: qa.q })),
  { nodeId: 'c_syg', question: '来首溧水童谣？' },
  { question: '请唱一首溧水儿歌，给我歌词' },
  { nodeId: 'n_tsq', question: '天生桥的溧水童谣怎么唱？' },
]) {
  const response = await fetch(`http://127.0.0.1:${config.port}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    signal: AbortSignal.timeout(20000),
  });
  const output = await response.json();
  assert.equal(response.status, 200);
  const qa = approvedQA.find((item) => item.q === input.question);
  if (qa) { assert.equal(output.kind, 'preset'); assert.equal(output.content, qa.a); assert.deepEqual(output.sources, qa.sources); }
  else { assert.equal(output.kind, 'unavailable'); assert.match(output.content, /不输出未核歌词/); }
  http.push({ input, output });
}
const ready = await (await fetch(`http://127.0.0.1:${config.port}/ready`)).json();
assert(ready.ready);
assert.equal(ready.index.hash, knowledge.status().hash);
await writeFile(new URL('../.web_review/2026-10-05-R05-真实检索与接口.json', import.meta.url), JSON.stringify({
  checkedAt: new Date().toISOString(), index: knowledge.status(), retrieval, contradictoryFilterResult: [], http,
  scope: '3次真实向量查询、1次互斥过滤、7次当前本地API请求；不是人工评分、公网或新设备验收',
}, null, 2) + '\n');
console.log(JSON.stringify({ chunks: ready.index.chunks, retrieval: retrieval.length, http: http.length, hash: ready.index.hash }));
