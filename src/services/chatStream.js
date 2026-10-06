// Status events describe executed tasks; answer text arrives only in result.
export async function readChatEvents(response, onProgress = () => {}) {
  if (!response.body) throw new Error('服务没有返回查询结果，请重试。');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', result;
  const consume = (block) => {
    const lines = block.split('\n');
    const type = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
    const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
    if (!data) return;
    let payload;
    try { payload = JSON.parse(data); } catch { throw new Error('查询结果格式异常，请重试。'); }
    if (type === 'progress') onProgress(payload);
    if (type === 'result') result = payload;
    if (type === 'error') throw new Error(payload.error?.message || '查询未完成，请重试。');
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');
      if (buffer.length > 1000000) throw new Error('查询结果过长，请缩小问题后重试。');
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) { consume(buffer.slice(0, end)); buffer = buffer.slice(end + 2); }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!result?.content || !result?.speaker) throw new Error('连接已结束，但答复未完成，请重试。');
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
