import test from 'node:test';
import assert from 'node:assert/strict';
import { presetQA, approvedQA, queryQA } from '../src/data/presetQA.js';
import { getVisitGuide } from '../src/data/nodeVisitGuides.js';
import { getNode } from '../src/data/nodes.js';
import { createChat, validateChat } from '../server/chat.mjs';

test('四个主打节点的五项指南均有对应正文、出处和运营待确认项', () => {
  for (const id of ['n_tsq', 'n_wx', 'n_fjb', 'n_sj']) {
    const guide = getVisitGuide(id);
    assert(new Set(guide.items.map((item) => item.question)).size >= 5);
    assert(guide.items.every((item) => item.qa?.status === 'approved' && item.qa.sources.length));
    assert.match(guide.unknowns, /出行日/);
    assert.match(guide.unknowns, /未确认|尚未确认/);
  }
  assert.equal(getVisitGuide('missing'), null);
  for (const expert of ['05_gusanniang', '06_ruanyunan']) {
    assert(approvedQA.filter((item) => getNode(item.nodeId).expert === expert).length >= 3);
  }
});

test('建成时间、人物身份和文化背景不会放行未核细节', () => {
  assert.match(queryQA('c_cs', '蒲塘桥为什么是九孔？').a, /没有证明/);
  assert.equal(queryQA('c_cs', '蒲塘桥九孔始建于哪年'), null);
  assert.equal(queryQA('c_cs', '蒲塘桥九孔为什么对应九龙'), null);
  assert.match(queryQA('n_wx', '韩熙载是谁？').a, /不能证明他亲自改了山名/);
  assert.match(queryQA('n_wx', '韩熙载把龙鸣山改名无想山的由来').a, /地名叙述.*不能把这一解释/);
  assert.doesNotMatch(queryQA('n_zy', '周园值得去吗？').a, /创办者|三馆|周广明|原稿/);
  assert.match(queryQA('n_dp', '东屏湖有什么？').a, /不证明可以自由露营/);
});

test('传统会期、农业采收和同名歌曲保留各自的时效及资料边界', () => {
  assert.match(queryQA('f_wf', '乌饭什么时候吃？').a, /2025年/);
  assert.match(queryQA('f_wf', '乌饭什么时候吃？').a, /不能套作下一年/);
  assert.match(queryQA('n_fjb', '傅家边青梅和赏梅是一回事吗？').a, /不能据此认定游客可以入园/);
  assert.match(queryQA('c_syg', '同名的新四军歌曲《石臼渔歌》是谁创作的？').a, /孙海云作词、涂克作曲/);
  assert.match(queryQA('c_syg', '非遗石臼渔歌与同名歌曲可以直接等同吗？').a, /具体关系仍需/);
  for (const item of presetQA.filter((item) => item.status === 'pending')) assert.equal(queryQA(item.nodeId, item.q), null);
});

test('全部完整节点QA在服务端直接使用获审正文，不再触发联网或模型', async () => {
  const unexpected = async () => { throw new Error('完整获审问题不应调用外部服务'); };
  const chat = createChat({ search: unexpected, generate: unexpected }, { retrieve: unexpected });
  for (const qa of approvedQA) {
    const response = await chat(validateChat({ nodeId: qa.nodeId, question: qa.q }));
    assert.equal(response.kind, 'preset', qa.q);
    assert.equal(response.content, qa.a, qa.q);
    assert.equal(response.speaker.id, getNode(qa.nodeId).expert);
    assert.equal(response.reviewedAt, qa.reviewedAt);
    assert.deepEqual(response.sources, qa.sources);
  }
});

test('已审人物变体答复不会混入相反的未审改名故事', async () => {
  const qa = queryQA('n_wx', '韩熙载是谁？');
  const chunk = { id: qa.id, question: qa.q, answer: qa.a, sources: qa.sources, kind: qa.kind, score: 0.65 };
  const chat = createChat({ search: async () => [{ label: '未审核网页', url: 'https://example.org/story', excerpt: '韩熙载亲自将龙鸣山改名无想山。' }], generate: async () => JSON.stringify({ selectedIds: ['K1', 'W1'] }) }, { retrieve: async () => [chunk] });
  const response = await chat(validateChat({ nodeId: 'n_wx', question: '韩熙载与无想山有何联系？' }));
  assert.equal(response.kind, 'rag');
  assert.match(response.content, /不能证明他亲自改了山名/);
  assert.doesNotMatch(response.content, /联网摘录|亲自将龙鸣山改名/);
  assert(response.sources.every((source) => source.url !== 'https://example.org/story'));
});
