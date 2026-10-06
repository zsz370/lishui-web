import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { getConfig } from '../server/core.mjs';
import { createProviders } from '../server/providers.mjs';
import { createKnowledge } from '../server/knowledge.mjs';
import { approvedQA } from '../src/data/presetQA.js';
import { approvedServiceQA } from '../src/data/foundationQA.js';

const config = getConfig(), providers = createProviders(config);
const knowledge = await createKnowledge(providers, config.embedding.model);
const expectedCount = approvedQA.length + approvedServiceQA.length;
assert.equal(knowledge.status().ready, true);
assert.equal(knowledge.status().chunks, expectedCount);
const retrievalCases = [
  { question: '胭脂河开挖是为了怎样运输粮食？', nodeId: 'n_tsq', expertId: '03_yanzhike' },
  { question: '无想山G5线路在普通工作日是否运行，资料是哪年的？', nodeId: 'n_wx', expertId: '03_yanzhike' },
  { question: '傅家边的青梅成熟和梅花观赏有什么不同？', nodeId: 'n_fjb', expertId: '07_fuxiaomei' },
  { question: '石臼湖应如何填写观景停留时间？', nodeId: 'n_sj', expertId: '09_shijiulang' },
  { question: '打五件的正式非遗类别是曲艺吗？', nodeId: 'c_dw', expertId: '05_gusanniang' },
  { question: '新四军歌曲石臼渔歌的词曲作者是谁？', nodeId: 'c_syg', expertId: '06_ruanyunan' },
  { question: '网上预订住宿需要核对哪些条件？', serviceId: 'stay', expertId: '08_wuxiangsao' },
];
const retrieval = [];
for (const { question, ...filter } of retrievalCases) {
  const started = Date.now();
  const hits = await knowledge.retrieve(question, { ...filter, limit: 3 });
  assert(hits.length, question);
  assert(hits.every((hit) => hit.expertId === filter.expertId && (!filter.nodeId || hit.nodeId === filter.nodeId) && (!filter.serviceId || hit.serviceId === filter.serviceId)));
  retrieval.push({ question, filter, durationMs: Date.now() - started, hits: hits.map(({ id, score, sources }) => ({ id, score, sources })) });
  console.log(JSON.stringify({ check: 'retrieval', question, count: hits.length }));
}
const empty = await knowledge.retrieve('同名歌曲的词曲作者', { nodeId: 'c_syg', expertId: '05_gusanniang' });
assert.equal(empty.length, 0, '互相矛盾的节点/角色条件不能返回跨角色资料');
const requests = [
  { nodeId: 'n_wx', question: '韩熙载是谁？', expert: '03_yanzhike' },
  { nodeId: 'f_wf', question: '乌饭什么时候吃？', expert: '07_fuxiaomei' },
  { nodeId: 'c_cs', question: '蒲塘桥为什么是九孔？', expert: '05_gusanniang' },
  { nodeId: 'c_dw', question: '打五件属于舞蹈还是曲艺？', expert: '05_gusanniang' },
  { nodeId: 'c_syg', question: '非遗石臼渔歌与同名歌曲可以直接等同吗？', expert: '06_ruanyunan' },
];
const http = [];
for (const { expert, ...input } of requests) {
  const started = Date.now();
  const response = await fetch(`http://127.0.0.1:${config.port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(55000) });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.speaker.id, expert);
  assert.equal(data.content, approvedQA.find((item) => item.nodeId === input.nodeId && item.q === input.question).a);
  assert(data.sources.length && data.reviewedAt === '2026-10-04');
  http.push({ input, durationMs: Date.now() - started, content: data.content, kind: data.kind, speaker: data.speaker, sources: data.sources, trace: data.collaboration?.trace });
  console.log(JSON.stringify({ check: 'HTTP', question: input.question, kind: data.kind }));
}
const ready = await (await fetch(`http://127.0.0.1:${config.port}/ready`)).json();
assert(ready.ready);
assert.equal(ready.index.hash, knowledge.status().hash);
const variantInput = { nodeId: 'n_wx', question: '韩熙载是什么人？' };
const variantStarted = Date.now();
const variantResponse = await fetch(`http://127.0.0.1:${config.port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(variantInput), signal: AbortSignal.timeout(55000) });
const variant = await variantResponse.json();
assert.equal(variantResponse.status, 200);
assert.equal(variant.speaker.id, '03_yanzhike');
assert.equal(variant.kind, 'rag');
assert.match(variant.content, /不能证明他亲自改了山名/);
assert.doesNotMatch(variant.content, /联网摘录/);
assert(variant.sources.every((source) => approvedQA.filter((qa) => qa.nodeId === 'n_wx').some((qa) => qa.sources.some((approved) => approved.url === source.url))));
http.push({ input: variantInput, durationMs: Date.now() - variantStarted, content: variant.content, kind: variant.kind, speaker: variant.speaker, sources: variant.sources, trace: variant.collaboration?.trace });
console.log(JSON.stringify({ check: 'HTTP-variant', question: variantInput.question, kind: variant.kind }));
await writeFile(new URL('../docs/agent-audit/content-depth-live.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), scope: '7组真实向量检索、1组互斥过滤、6组本地HTTP（含1组RAG变体）；不是多智能体效果对照或公网验收', index: knowledge.status(), readiness: ready.ready, retrieval, contradictoryFilterResult: empty, http }, null, 2) + '\n');
