import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { apiRequest, apiChatStream } from '../src/services/api.js';

// Exercise the browser-facing client against real loopback HTTP failures.
// Only resolve its relative URLs; never call an external provider.
async function local(t, handler) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => nativeFetch(new URL(url, `http://127.0.0.1:${server.address().port}`), options);
  t.after(() => { globalThis.fetch = nativeFetch; server.closeAllConnections(); server.close(); });
}

test('API连接断开：JSON和流式客户端给网络提示，不返回伪结果', async (t) => {
  await local(t, (req) => req.socket.destroy());
  for (const invoke of [() => apiRequest('weather', {}), () => apiChatStream({ question: '天气' })]) {
    await assert.rejects(invoke, /无法连接查询服务，请检查网络后重试/);
  }
});

test('流只返回状态便结束：不得把正在查询当作完整答复', async (t) => {
  await local(t, (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('event: progress\ndata: {"taskId":"weather","status":"running"}\n\n');
  });
  const progress = [];
  await assert.rejects(() => apiChatStream({}, { onProgress: (event) => progress.push(event) }), /答复未完成/);
  assert.equal(progress.length, 1);
  assert.equal(progress[0].status, 'running');
});

test('客户端真实期限到达：JSON及流读取都终止并显示超时', async (t) => {
  await local(t, (_req, res) => {
    // A live connection with no answer. AbortSignal.timeout must end it.
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.flushHeaders();
  });
  for (const invoke of [() => apiRequest('weather', {}, { timeoutMs: 100 }), () => apiChatStream({}, { timeoutMs: 100 })]) {
    const start = performance.now();
    await assert.rejects(invoke, /查询超时，请稍后重试/);
    assert(performance.now() - start < 1500, 'should not hang after the client deadline');
  }
});

test('服务端超时事件：保留错误，拒绝将其包装成成功', async (t) => {
  await local(t, (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('event: error\ndata: {"error":{"message":"查询超时，请稍后重试。"}}\n\n');
  });
  await assert.rejects(() => apiChatStream({}), /查询超时/);
});

test('主动取消和网络故障有区别：调用方取消信号不被改写', async (t) => {
  await local(t, () => {});
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => apiChatStream({}, { signal: controller.signal }), { name: 'AbortError' });
});
