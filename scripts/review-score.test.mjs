import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScore, validateReviewExport } from './review-score.mjs';
const complete = { reviewer: '测试评审', taskCompletion: 2, factTotal: 2, factSupported: 1, factUnknown: 1, citationTotal: 1, citationSupported: 1, citationUnknown: 0, missedConstraints: 0, notes: '', dispute: false };

test('空白保持未评，明确的零事实与零引用合法，不从空白制造人工成绩', () => {
  assert(validateScore({ ...complete, taskCompletion: null }).length);
  assert(validateScore({ ...complete, factTotal: '' }).length);
  assert.equal(validateScore({ ...complete, factTotal: 0, factSupported: 0, factUnknown: 0, citationTotal: 0, citationSupported: 0 }).length, 0);
});
test('事实与引用计数守恒，争议必须有理由，分数不越界', () => {
  for (const change of [{ factUnknown: 2 }, { citationSupported: 2 }, { missedConstraints: -1 }, { taskCompletion: 3 }, { dispute: true }]) assert(validateScore({ ...complete, ...change }).length);
});
test('导入绑定历史批次与条目编号，重复/未知/不完整评分均拒绝', () => {
  const record = { reviewId: 'H001', ...complete, reviewedAt: '2026-10-05T00:00:00Z' };
  assert.equal(validateReviewExport({ packId: 'batch', records: [record] }, 'batch', ['H001']).length, 1);
  for (const value of [{ packId: 'other', records: [record] }, { packId: 'batch', records: [record, record] }, { packId: 'batch', records: [{ ...record, reviewId: 'unknown' }] }, { packId: 'batch', records: [{ ...record, citationTotal: null }] }]) assert.throws(() => validateReviewExport(value, 'batch', ['H001']));
});
