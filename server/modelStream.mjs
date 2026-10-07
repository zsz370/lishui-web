import { AppError } from './core.mjs';

// Parse genuine upstream token events. A truncated stream is never complete.
export async function readModelStream(response, onDelta = () => {}) {
  if (!response.body) throw new AppError('UPSTREAM_FAILED', '问答服务未返回正文', 502);
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', content = '', done = false, finish, usage;
  const consume = (block) => {
    const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
    if (!data) return;
    if (data === '[DONE]') { done = true; return; }
    let body;
    try { body = JSON.parse(data); } catch { throw new AppError('UPSTREAM_FAILED', '问答服务返回格式异常', 502); }
    if (body.error) throw new AppError('UPSTREAM_FAILED', '问答服务暂时不可用', 502);
    if (body.usage) usage = body.usage;
    const choice = body.choices?.[0];
    if (choice?.finish_reason) finish = choice.finish_reason;
    const delta = choice?.delta?.content;
    if (typeof delta === 'string' && delta) {
      content += delta;
      if (content.length > 16000) throw new AppError('UPSTREAM_FAILED', '答复过长，请缩小问题', 502);
      onDelta(delta);
    }
  };
  try {
    while (true) {
      const next = await reader.read();
      buffer += decoder.decode(next.value, { stream: !next.done });
      buffer = buffer.replace(/\r\n/g, '\n');
      if (buffer.length > 1000000) throw new AppError('UPSTREAM_FAILED', '问答服务返回格式异常', 502);
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) { consume(buffer.slice(0, end)); buffer = buffer.slice(end + 2); }
      if (next.done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!done || finish !== 'stop' || !content.trim()) throw new AppError('UPSTREAM_FAILED', '答复中断，请重试', 502);
    return { content, usage };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
