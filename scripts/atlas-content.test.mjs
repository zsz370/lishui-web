import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { atlasEntries, filterAtlas } from '../src/data/atlas.js';
import { nodes, getNode } from '../src/data/nodes.js';
import { topics } from '../src/data/collections.js';
import { presetQA, approvedQA, withdrawnQA, queryQA } from '../src/data/presetQA.js';
import { normalizePlan, calculatePlan, createStop } from '../src/data/itinerary.js';
import { validateChat } from '../server/chat.mjs';
import { expansionNodeQA, expansionPendingNodeQA } from '../src/data/contentExpansionQA.js';

const removed = ['f_yt', 'f_le', 'f_pz', 's_wd', 'c_xz', 'c_dsh', 'c_dw'];
test('用户撤下条目不会出现在目录、栏目或现行问答，旧API请求也不能继续推荐', () => {
  assert.equal(nodes.length, 29);
  for (const id of removed) {
    assert.equal(getNode(id), undefined);
    assert.equal(atlasEntries.some((entry) => entry.id === id), false);
    assert.equal(topics.some((topic) => topic.groups.some((group) => group.nodeIds.includes(id))), false);
    assert.equal(presetQA.some((item) => item.nodeId === id), false);
    assert.throws(() => validateChat({ nodeId: id, question: '介绍一下' }));
  }
  assert.equal(getNode('s_wxsz').cat, '街区');
  assert.equal(filterAtlas('街区', '无想水镇').length, 1);
});
test('旧收藏剔除撤下地点，保留有效地点与用户条件；不把万达迁移成不同地点', () => {
  assert.deepEqual(normalizePlan(['n_tsq', ...removed, 's_hl']).stops.map((stop) => stop.nodeId), ['n_tsq', 's_hl']);
  const plan = normalizePlan({ version: 2, date: '2026-10-10', adults: '2', budget: '500', goal: '保留我的出行需求', stops: [...removed, 'n_tsq'].map(createStop) });
  assert.deepEqual(plan.stops.map((stop) => stop.nodeId), ['n_tsq']);
  assert.equal(plan.goal, '保留我的出行需求');
  assert.equal(plan.date, '2026-10-10');
  assert.equal(plan.budget, '500');
  assert.doesNotThrow(() => calculatePlan(plan));
});
test('撤下待核不充作审核通过，修订与新增单独记入已审数，童谣仍隔离', () => {
  assert.equal(approvedQA.length, 52 + expansionNodeQA.length);
  const addedIds = new Set(expansionNodeQA.map(item => item.id));
  assert.equal(approvedQA.filter(item => !addedIds.has(item.id)).length, 52);
  assert.equal(withdrawnQA.length, 4);
  assert(withdrawnQA.every((item) => !getNode(item.nodeId) && !presetQA.includes(item)));
  const pending = presetQA.filter((item) => item.status === 'pending');
  assert.equal(pending.length, 1 + expansionPendingNodeQA.length);
  assert(pending.some(item => item.q === '来首溧水童谣？'));
  for (const item of pending) assert.equal(queryQA(item.nodeId, item.q), null);
});
test('图鉴每项正文出处可用，当前29项配图实际存在，撤下节点不再公开', async () => {
  assert.equal(new Set(atlasEntries.map((entry) => entry.id)).size, 29);
  assert.equal(atlasEntries.filter((entry) => entry.photo).length, 29);
  assert.deepEqual(atlasEntries.filter((entry) => !entry.photo).map((entry) => entry.id), []);
  assert.equal(filterAtlas('美食').length, 7);
  assert.equal(filterAtlas('民俗', '打五件').length, 0);
  assert.equal(filterAtlas('全部', '不存在的风物').length, 0);
  for (const entry of atlasEntries) {
    assert(entry.summary && entry.introductionSources.length);
    if (entry.photo) await access(new URL(`../public${entry.photo}`, import.meta.url));
  }
});
