import test from 'node:test';
import assert from 'node:assert/strict';
import { presetQA, approvedQA, queryQA, qaByNode } from '../src/data/presetQA.js';
import { getNode, mainNodes } from '../src/data/nodes.js';
import { ask } from '../src/services/chat.js';

test('审核状态、节点和引用完整，主打节点各有三条可调用问答', () => {
  assert.equal(new Set(presetQA.map((item) => item.id)).size, presetQA.length);
  for (const item of presetQA) {
    assert.ok(getNode(item.nodeId), item.q);
    assert.ok(['approved', 'pending'].includes(item.status), item.q);
    if (item.status === 'approved') {
      assert.ok(item.a.trim());
      assert.ok(item.sources.length, item.q);
      assert.ok(item.sources.every((source) => source?.label && (source.kind === 'project_confirmation' && source.url === '/about#ticket-reference' || /^https:\/\//.test(source.url) && new URL(source.url).protocol === 'https:')), item.q);
    } else assert.ok(item.reason);
  }
  for (const node of mainNodes) assert.ok(qaByNode[node.id]?.length >= 3, node.name);
});

test('逐条原问题返回对应答案，待核原问题一律隔离', () => {
  for (const item of presetQA) assert.equal(queryQA(item.nodeId, item.q)?.id || null, item.status === 'approved' ? item.id : null, item.q);
});

test('同一地名下的不同意图及大小写标点变体不会串题', () => {
  const cases = [
    ['n_tsq', '天生桥胭脂河为什么是红的', '胭脂河的水为什么是红的？'],
    ['n_tsq', '在天生桥坐游船需要注意什么', '去天生桥要注意什么？'],
    ['n_wx', '无想山爬多久合适', '无想山值得爬多久、怎么玩？'],
    ['n_wx', '无想山有哪些文化遗迹', '无想山有哪些文化看点？'],
    ['n_fjb', '傅家边有什么水果', '傅家边能采摘什么？'],
    ['n_sj', '石臼湖跨湖列车是什么', '石臼湖水上列车是什么？'],
    ['c_ldl', '骆山大龙有多少人参与', '骆山大龙有多大？'],
    ['c_ldl', '骆山大龙为什么断尾', '骆山大龙为什么是断尾的？'],
    ['c_ldl', '溧水非遗有多少', '溧水一共有多少项非遗？'],
  ];
  for (const [node, question, expected] of cases) assert.equal(queryQA(node, question)?.q, expected, question);
  assert.equal(queryQA('n_sj', '石臼湖水上列车是什么!')?.q, '石臼湖水上列车是什么？');
});

test('缺资料、待核意图、模糊输入及跨节点查询不猜答案', () => {
  const cases = [
    ['n_tsq', '天生桥'], ['c_syg', '来首溧水童谣？'],
    ['n_sj', '石臼湖名字有什么传说'], ['c_ldl', '骆山大龙陈列馆正月开放吗'],
    ['c_cs', '蒲塘桥九孔始建于哪年'], ['n_sj', '石臼湖面积是多少'],
    ['n_wx', '今天几点开放'], ['n_tsq', '骆山大龙有多大'],
    ['missing', '怎么玩'], ['n_tsq', ''], ['n_tsq', null],
  ];
  for (const [node, question] of cases) assert.equal(queryQA(node, question), null, String(question));
});

test('知识回答携带可展示的来源，地铁知识不被通用交通路由吞掉', async () => {
  for (const item of approvedQA) {
    const response = await ask({ nodeId: item.nodeId, question: item.q });
    assert.equal(response.kind, 'preset', item.q);
    assert.equal(response.content, item.a, item.q);
    assert.equal(response.sourceUrl, item.sources[0].url, item.q);
    assert.equal(response.reviewedAt, item.reviewedAt);
  }
});

test('紧急求助、实际换乘及退改优先分流；待核问题走资料不足兜底', async () => {
  const emergency = await ask({ nodeId: 'c_ldl', question: '骆山大龙正月表演时孩子走失，救命' });
  assert.equal(emergency.serviceId, 'support');
  assert.match(emergency.content, /110/);
  const transport = await ask({ nodeId: 'n_sj', question: '石臼湖水上列车怎么坐，怎么换乘' });
  assert.equal(transport.serviceId, 'transport');
  const refund = await ask({ nodeId: 'n_tsq', question: '天生桥游船门票退款怎么办' });
  assert.equal(refund.serviceId, 'support');
  const pending = await ask({ nodeId: 'c_syg', question: '来首溧水童谣？' });
  assert.equal(pending.kind, 'unavailable');
});
