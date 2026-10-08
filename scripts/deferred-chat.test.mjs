import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeferredChat } from '../src/services/deferredChat.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('问答按需载入并复用，原问题、上下文及流式回调完整传递', async () => {
  let loads = 0;
  const requests = [], progress = [], replies = [];
  const ask = createDeferredChat(async () => {
    loads++;
    return { ask: async options => {
      requests.push(options);
      options.onProgress?.({ taskId: 'knowledge', status: 'completed' });
      options.onAnswer?.({ type: 'complete', taskId: 'knowledge' });
      return { kind: 'preset', content: options.question };
    } };
  });
  assert.equal(loads, 0);
  const options = { question: '天生桥是人工的吗？', nodeId: 'n_tsq', history: [{ role: 'user', content: '我想看天生桥' }], preferences: { mode: 'walking' }, onProgress: value => progress.push(value), onAnswer: value => replies.push(value) };
  const results = await Promise.all([ask(options), ask({ question: '继续讲讲' })]);
  assert.equal(loads, 1);
  assert.equal(requests[0], options);
  assert.equal(results[0].content, options.question);
  assert.equal(progress.length, 1);
  assert.equal(replies.length, 1);
  await ask({ question: '再问一次' });
  assert.equal(loads, 1);
});

test('模块载入期间停止查询，载入完成后不再执行问答', async () => {
  const loading = deferred(), controller = new AbortController();
  let requests = 0;
  const ask = createDeferredChat(() => loading.promise);
  const result = ask({ question: '停止测试', signal: controller.signal });
  controller.abort();
  loading.resolve({ ask: () => { requests++; } });
  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(requests, 0);
});

test('已经停止的查询不会触发模块下载', async () => {
  let loads = 0;
  const ask = createDeferredChat(() => { loads++; });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(ask({ signal: controller.signal }), { name: 'AbortError' });
  assert.equal(loads, 0);
});

test('下载失败给中文恢复提示，之后的新请求可以重新载入', async () => {
  let loads = 0;
  const ask = createDeferredChat(async () => {
    if (++loads === 1) throw new Error('chunk download failed');
    return { ask: async () => ({ content: '已恢复' }) };
  });
  await assert.rejects(ask({ question: '第一次' }), /问答暂时无法加载，请刷新页面后重试/);
  assert.equal((await ask({ question: '重试' })).content, '已恢复');
  assert.equal(loads, 2);
});

test('问答本身的失败仍交给原会话处理，不反复下载已载入的模块', async () => {
  const original = new Error('原查询失败');
  let loads = 0;
  const ask = createDeferredChat(async () => {
    loads++;
    return { ask: async options => { if (options.question === '失败') throw original; return { kind: 'unavailable', content: '待核' }; } };
  });
  await assert.rejects(ask({ question: '失败' }), error => error === original);
  assert.equal((await ask({ question: '下一个问题' })).kind, 'unavailable');
  assert.equal(loads, 1);
});
