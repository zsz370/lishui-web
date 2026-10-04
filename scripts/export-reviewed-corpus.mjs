import { mkdir, writeFile } from 'node:fs/promises';
import { presetQA, approvedQA } from '../src/data/presetQA.js';
import { getNode, mainNodes } from '../src/data/nodes.js';
import { approvedServiceQA } from '../src/data/foundationQA.js';

const dir = new URL('../docs/corpus-audit/', import.meta.url);
await mkdir(dir, { recursive: true });
const envelope = { version: '2026-10-04', scope: '已审节点与服务基础QA，供角色/节点/服务过滤的共享向量索引使用；原始整库仍未获批', count: approvedQA.length + approvedServiceQA.length };
const chunks = approvedQA.map(({ id, nodeId, q, a, keys, kind, reviewedAt, sources }) => ({
  id, nodeId, expertId: getNode(nodeId).expert, topic: getNode(nodeId).cat, scope: 'node',
  question: q, answer: a, keys, kind, status: 'approved', reviewedAt, sources,
}));
chunks.push(...approvedServiceQA.map(({ id, expertId, serviceId, q, a, keys, kind, reviewedAt, sources, scope }) => ({ id, expertId, serviceId, question: q, answer: a, keys, kind, status: 'approved', reviewedAt, sources, scope, topic: '旅途服务' })));
await writeFile(new URL('approved-corpus.json', dir), JSON.stringify({ ...envelope, chunks }, null, 2) + '\n', 'utf8');
const pending = presetQA.filter((item) => item.status !== 'approved').map(({ id, nodeId, q, a, reason }) => ({ id, nodeId, question: q, originalAnswer: a, status: 'pending', reason }));
await writeFile(new URL('pending-review.json', dir), JSON.stringify({ version: envelope.version, count: pending.length, items: pending }, null, 2) + '\n', 'utf8');
const summary = {
  originalWebQA: 35, originalExactQueryFailures: 13, reviewedWebQA: presetQA.length + approvedServiceQA.length,
  approved: chunks.length, approvedNodeQA: approvedQA.length, approvedServiceQA: approvedServiceQA.length, pending: pending.length,
  approvedNodes: new Set(chunks.filter((item) => item.nodeId).map((item) => item.nodeId)).size,
  mainCoverage: mainNodes.map((node) => ({ id: node.id, name: node.name, approvedQuestions: chunks.filter((item) => item.nodeId === node.id).map((item) => item.question) })),
};
await writeFile(new URL('qa-summary.json', dir), JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summary, null, 2));
