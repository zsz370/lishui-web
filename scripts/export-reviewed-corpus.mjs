import { mkdir, writeFile } from 'node:fs/promises';
import { presetQA, approvedQA, withdrawnQA } from '../src/data/presetQA.js';
import { getNode, mainNodes } from '../src/data/nodes.js';
import { approvedServiceQA, pendingServiceQA } from '../src/data/foundationQA.js';

const dir = new URL('../docs/corpus-audit/', import.meta.url);
await mkdir(dir, { recursive: true });
const envelope = { version: '2026-10-07-content-expansion', scope: '淮源姐统一的山水、美食、民俗与出行知识；背景事实与行前核对建议分别标记，待核节点和设施事实隔离', count: approvedQA.length + approvedServiceQA.length };
const chunks = approvedQA.map(({ id, nodeId, q, a, keys, kind, reviewedAt, sources }) => ({
  id, nodeId, expertId: getNode(nodeId).expert, topic: getNode(nodeId).cat, scope: 'node',
  question: q, answer: a, keys, kind, status: 'approved', reviewedAt, sources,
}));
chunks.push(...approvedServiceQA.map(({ id, expertId, serviceId, q, a, keys, kind, reviewedAt, sources, scope }) => ({ id, expertId, serviceId, question: q, answer: a, keys, kind, status: 'approved', reviewedAt, sources, scope, topic: '旅途服务' })));
await writeFile(new URL('approved-corpus.json', dir), JSON.stringify({ ...envelope, chunks }, null, 2) + '\n', 'utf8');
const pending = [...presetQA.filter((item) => item.status !== 'approved'), ...pendingServiceQA].map(({ id, nodeId, serviceId, scope, q, a, reason, sources = [] }) => ({ id, nodeId, serviceId, scope: scope || 'node', question: q, originalAnswer: a, sources, status: 'pending', reason }));
await writeFile(new URL('pending-review.json', dir), JSON.stringify({ version: envelope.version, count: pending.length, items: pending }, null, 2) + '\n', 'utf8');
const summary = {
  withdrawn: withdrawnQA.length,
  originalWebQA: 35, originalExactQueryFailures: 13, reviewedWebQA: presetQA.length + approvedServiceQA.length + pendingServiceQA.length,
  approved: chunks.length, approvedNodeQA: approvedQA.length, approvedServiceQA: approvedServiceQA.length, pending: pending.length, pendingNodeQA: pending.length - pendingServiceQA.length, pendingServiceQA: pendingServiceQA.length,
  approvedNodes: new Set(chunks.filter((item) => item.nodeId).map((item) => item.nodeId)).size,
  mainCoverage: mainNodes.map((node) => ({ id: node.id, name: node.name, approvedQuestions: chunks.filter((item) => item.nodeId === node.id).map((item) => item.question) })),
};
await writeFile(new URL('qa-summary.json', dir), JSON.stringify(summary, null, 2) + '\n', 'utf8');
await writeFile(new URL('withdrawn-qa.json', dir), JSON.stringify({ version: envelope.version, reason: '2026-10-05用户决定移除相应节点；原始资料与旧审核记录保留，撤下不等于审核通过。', count: withdrawnQA.length, items: withdrawnQA }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summary, null, 2));
