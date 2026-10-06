import test from 'node:test';
import assert from 'node:assert/strict';
import { queryQA, queryPendingQA } from '../src/data/presetQA.js';
import { createChat, validateChat } from '../server/chat.mjs';
import { ask } from '../src/services/chat.js';

test('地名答复给出文章解释，保留原始史料未互证边界；展示馆计划不转成开放承诺', () => {
  const name = queryQA('n_wx', '无想山名字是怎么来的？');
  assert.equal(name.status, 'approved');
  assert.match(name.a, /地方文章.*未核得.*原始史料/s);
  assert(name.sources.some((source) => source.url.includes('jssdfz.jiangsu.gov.cn')));
  const hall = queryQA('c_ldl', '在哪能看到骆山大龙？');
  assert.match(hall.a, /2025年5月.*建设.*不证明今天已经开放/s);
  assert.equal(queryQA('c_ldl', '骆山大龙展示馆预约体验几点开放'), null);
});

test('铁画的市级正式认定与媒体省级说法分开，不从缺文件推出从未升级', () => {
  const qa = queryQA('c_tj', '明觉铁画的非遗级别有哪些正式依据？');
  assert.match(qa.a, /2008.*NJⅦ-19.*市级/s);
  assert.match(qa.a, /不能用报道代替名录.*不能据旧名录断言此后没有升级/s);
  assert.equal(qa.sources.length, 2);
});

test('童谣原题、变体、无节点及其他节点均不输出未审歌词或调用外部服务', async () => {
  const unexpected = async () => { throw new Error('待核歌词不得走生成、联网、检索'); };
  const chat = createChat({ search: unexpected, generate: unexpected }, { retrieve: unexpected });
  for (const input of [
    { nodeId: 'c_syg', question: '来首溧水童谣？' },
    { question: '给我唱一首溧水儿歌' },
    { nodeId: 'n_tsq', question: '天生桥有什么溧水童谣，给我歌词' },
  ]) {
    assert(queryPendingQA(input.nodeId, input.question));
    for (const mode of ['single', 'multi']) {
      const result = await chat(validateChat(input), { mode });
      assert.equal(result.kind, 'unavailable');
      assert.match(result.content, /不输出未核歌词/);
    }
    const offline = await ask(input);
    assert.equal(offline.kind, 'unavailable');
  }
});

test('童谣隔离不抢走紧急求助', async () => {
  const response = await ask({ nodeId: 'c_syg', question: '听童谣的时候孩子走失，救命' });
  assert.equal(response.serviceId, 'support');
  assert.match(response.content, /110/);
});

test('带引号的纯翻译只翻译指定文本，不被其中童谣词误拦截', async () => {
  const calls = [];
  const unexpected = async () => { throw new Error('纯翻译不应查询地方知识'); };
  const chat = createChat({ search: unexpected, generate: unexpected, translate: async (text) => {
    calls.push(text); return { content: 'Please sing a Lishui nursery rhyme.' };
  } }, { retrieve: unexpected });
  const result = await chat(validateChat({ nodeId: 'c_syg', question: '请翻译“来首溧水童谣？”' }));
  assert.deepEqual(calls, ['来首溧水童谣？']);
  assert.equal(result.kind, 'translation');
});
