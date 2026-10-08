import { approvedQA, presetQA } from './presetQA.js';
import { approvedServiceQA, pendingServiceQA } from './foundationQA.js';
import { getNode } from './nodes.js';

// Derive the existing export schema from versioned reviewed QA; private audit files are optional.
export const reviewedChunks = [
  ...approvedQA.map(({ id, nodeId, q, a, keys, kind, reviewedAt, sources }) => ({
    id, nodeId, expertId: getNode(nodeId).expert, topic: getNode(nodeId).cat, scope: 'node',
    question: q, answer: a, keys, kind, status: 'approved', reviewedAt, sources,
  })),
  ...approvedServiceQA.map(({ id, expertId, serviceId, q, a, keys, kind, reviewedAt, sources, scope }) => ({
    id, expertId, serviceId, question: q, answer: a, keys, kind, status: 'approved', reviewedAt, sources, scope, topic: '旅途服务',
  })),
];
export const pendingReview = [...presetQA.filter(item => item.status !== 'approved'), ...pendingServiceQA].map(({ id, nodeId, serviceId, scope, q, a, reason, sources = [] }) => ({
  id, nodeId, serviceId, scope: scope || 'node', question: q, originalAnswer: a, sources, status: 'pending', reason,
}));
