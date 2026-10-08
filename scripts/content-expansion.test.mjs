import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { expansionNodeQA, expansionServiceQA, expansionPendingNodeQA, expansionPendingServiceQA } from '../src/data/contentExpansionQA.js';
import { approvedQA, queryQA } from '../src/data/presetQA.js';
import { approvedServiceQA, queryServiceQA } from '../src/data/foundationQA.js';
import { getVisitGuide } from '../src/data/nodeVisitGuides.js';
import { visitorAnswer } from '../src/data/visitorAnswerCopy.js';
import { getNode } from '../src/data/nodes.js';
import { getTravelService } from '../src/data/travelServices.js';
import { themeRoutes } from '../src/data/themeRoutes.js';
import { emptyPlan, scenePlan } from '../src/data/itinerary.js';

test('新增问答覆盖四类21个当前节点，每个两项，来源完整且游客正文无审核元数据', () => {
  assert.equal(expansionNodeQA.length, 42);
  assert.equal(new Set(expansionNodeQA.map(qa => qa.nodeId)).size, 21);
  assert.deepEqual(new Set(expansionNodeQA.map(qa => getNode(qa.nodeId).cat)), new Set(['山水', '美食', '民俗', '街区']));
  assert.equal(approvedQA.length + approvedServiceQA.length, 127);
  for (const nodeId of new Set(expansionNodeQA.map(qa => qa.nodeId))) {
    const added = expansionNodeQA.filter(qa => qa.nodeId === nodeId);
    assert.equal(added.length, 2);
    assert(getVisitGuide(nodeId).items.every(item => item.qa?.status === 'approved'));
    for (const qa of added) assert.equal(queryQA(nodeId, qa.q)?.id, qa.id);
  }
  for (const qa of [...expansionNodeQA, ...expansionServiceQA]) {
    assert.equal(qa.status, 'approved');
    assert(qa.reviewedAt && qa.sources.length && qa.reviewBasis);
    assert(qa.sources.every(source => source.label && /^https:\/\//.test(source.url)));
    assert.doesNotMatch(visitorAnswer(qa), /https?:|审核状态|已审资料|参考资料：|来源：|出处：|NJ[ⅠⅡⅢⅣⅤⅥⅦ]|JS[ⅠⅡⅢⅣⅤⅥⅦ]/);
  }
});

test('六类设施各三项，仅为行前建议，完整问题走固定问答且保留业务服务归属', () => {
  assert.equal(expansionServiceQA.length, 18);
  for (const topic of ['parking', 'toilet', 'nursing', 'accessibility', 'luggage', 'pets']) {
    const list = expansionServiceQA.filter(qa => qa.facilityTopic === topic);
    assert.equal(list.length, 3);
    for (const qa of list) {
      assert(getTravelService(qa.serviceId));
      assert.equal(qa.kind, 'guidance');
      assert.equal(queryServiceQA(qa.q)?.id, qa.id);
    }
  }
});

test('缺来源的节点及具体设施事实都隔离，未混入获审语料或问答', async () => {
  const approved = new Set([...approvedQA, ...approvedServiceQA].map(qa => qa.id));
  const {reviewedChunks,pendingReview}=await import('../src/data/reviewedCorpus.js');const corpus={chunks:reviewedChunks},pending={items:pendingReview};
  for (const qa of [...expansionPendingNodeQA, ...expansionPendingServiceQA]) {
    assert.equal(qa.status, 'pending'); assert(qa.reason); assert.equal(qa.a, '');
    assert(!approved.has(qa.id)); assert(!corpus.chunks.some(chunk => chunk.id === qa.id));
    assert(pending.items.some(item => item.id === qa.id && item.status === 'pending'));
    assert.equal(qa.nodeId ? queryQA(qa.nodeId, qa.q) : queryServiceQA(qa.q), null);
  }
});

test('主题草案保留个人条件，不伪造地点、时间、费用、路线或设施', () => {
  const previous = { ...emptyPlan(), date: '2099-01-01', returnDate: '2099-01-01', mode: 'driving', budget: '500', adults: '2', children: '1', goal: '自己选择的兴趣', routes: { old: {} } };
  assert.equal(themeRoutes.length, 2);
  for (const theme of themeRoutes) {
    assert(theme.sources.length && theme.status === 'approved' && theme.kind === 'guidance');
    const plan = scenePlan(theme.id, previous);
    assert.deepEqual(plan.stops.map(stop => stop.nodeId), theme.nodeIds);
    for (const key of ['date', 'returnDate', 'mode', 'budget', 'adults', 'children', 'goal']) assert.equal(plan[key], previous[key]);
    assert.deepEqual(plan.routes, {});
    for (const stop of plan.stops) {
      assert.equal(stop.place, null); assert.equal(stop.stay, ''); assert.equal(stop.arrival, ''); assert.equal(stop.cost, '');
      assert.match(stop.note, /确认|核对/);
    }
    const fresh = scenePlan(theme.id);
    assert.equal(fresh.date, ''); assert.equal(fresh.budget, ''); assert.equal(fresh.goal, theme.goal);
  }
  assert.equal(scenePlan(themeRoutes[1].id, scenePlan(themeRoutes[0].id)).goal, themeRoutes[1].goal);
});
