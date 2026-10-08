import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { presetQA, approvedQA, withdrawnQA } from '../src/data/presetQA.js';
import { getNode, mainNodes } from '../src/data/nodes.js';
import { approvedServiceQA, pendingServiceQA } from '../src/data/foundationQA.js';
import { reviewedChunks, pendingReview } from '../src/data/reviewedCorpus.js';

const dir = new URL('../docs/corpus-audit/', import.meta.url);
await mkdir(dir, { recursive: true });
const readPrior = async file => { try { return JSON.parse(await readFile(new URL(file,dir),'utf8')); } catch { return {}; } };
const [priorCorpus,priorPending,priorWithdrawn] = await Promise.all([readPrior('approved-corpus.json'),readPrior('pending-review.json'),readPrior('withdrawn-qa.json')]);
const historyWithdrawals = [...(priorWithdrawn.items||[]),...(priorCorpus.chunks||[]),...(priorPending.items||[])].filter(item=>item.nodeId&&!getNode(item.nodeId));
const archived = [...new Map([...historyWithdrawals,...withdrawnQA].map(item=>[item.id||item.nodeId+':'+(item.q||item.question),item])).values()];
const envelope = { version: '2026-10-07-usability-retirement', scope: '淮源姐当前已审风物与出行建议；用户撤下节点仅留在历史审计，不进入当前语料', count: approvedQA.length + approvedServiceQA.length };
const chunks = reviewedChunks;
await writeFile(new URL('approved-corpus.json', dir), JSON.stringify({ ...envelope, chunks }, null, 2) + '\n', 'utf8');
const pending = pendingReview;
await writeFile(new URL('pending-review.json', dir), JSON.stringify({ version: envelope.version, count: pending.length, items: pending }, null, 2) + '\n', 'utf8');
const summary = {
  withdrawn: archived.length,
  originalWebQA: 35, originalExactQueryFailures: 13, reviewedWebQA: presetQA.length + approvedServiceQA.length + pendingServiceQA.length,
  approved: chunks.length, approvedNodeQA: approvedQA.length, approvedServiceQA: approvedServiceQA.length, pending: pending.length, pendingNodeQA: pending.length - pendingServiceQA.length, pendingServiceQA: pendingServiceQA.length,
  approvedNodes: new Set(chunks.filter((item) => item.nodeId).map((item) => item.nodeId)).size,
  mainCoverage: mainNodes.map((node) => ({ id: node.id, name: node.name, approvedQuestions: chunks.filter((item) => item.nodeId === node.id).map((item) => item.question) })),
};
await writeFile(new URL('qa-summary.json', dir), JSON.stringify(summary, null, 2) + '\n', 'utf8');
await writeFile(new URL('withdrawn-qa.json', dir), JSON.stringify({ version: envelope.version, reason: '用户撤下节点及问答；原稿与旧审核状态保留用于历史审计，不属于当前语料。', count: archived.length, items: archived }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summary, null, 2));
