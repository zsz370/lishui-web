export const offlineDemo = import.meta.env?.VITE_OFFLINE_DEMO === 'true';
export const backendEnabled = !offlineDemo && Boolean(import.meta.env) && import.meta.env?.VITE_AGENT_API_ENABLED !== 'false';
import { readChatEvents } from './chatStream.js';
import { canDisplayAnswerEvent } from './chatDisplay.js';
import { boundedChatRequest } from './chatPayload.js';

export async function apiChatStream(body, { signal, onProgress, onAnswer, timeoutMs = 100000 } = {}) {
  if (offlineDemo) throw new Error('离线演示未连接问答服务，请查看已审固定问答。');
  try {
    const activeSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
    const response = await fetch('/api/chat/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', body: JSON.stringify(boundedChatRequest(body)), signal: activeSignal });
    if (response.status === 404) return apiRequest('chat', boundedChatRequest(body), { signal, timeoutMs });
    if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(data?.error?.message || '查询暂时不可用，请稍后重试。'); }
    if (!response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('查询服务尚未准备好，请稍后重试。');
    return await readChatEvents(response, onProgress, event => { if(canDisplayAnswerEvent(event))onAnswer?.(event); });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('查询超时，请稍后重试。');
    if (error instanceof TypeError) throw new Error('无法连接查询服务，请检查网络后重试。');
    throw error;
  }
}
export async function apiRequest(path, body, { signal, timeoutMs = 100000 } = {}) {
  if (offlineDemo) throw new Error('离线演示不查询实时服务，当前结果未知。');
  try {
    const response = await fetch(`/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    });
    let result;
    try { result = await response.json(); } catch (error) {
      // A body read can fail after headers arrive. Keep cancellation, deadline
      // and network errors intact so the outer handler can distinguish them.
      if (error.name === 'TimeoutError' || error.name === 'AbortError' || error instanceof TypeError) throw error;
      throw new Error('查询服务暂未连接，本次实时信息还不能核对。你可以继续编辑行程或阅读资料，服务恢复后再查询。');
    }
    if (!response.ok) throw new Error(typeof result?.error?.message === 'string' ? result.error.message : '查询暂时不可用');
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('查询超时，请稍后重试。');
    if (error instanceof TypeError) throw new Error('无法连接查询服务，请检查网络后重试。');
    throw error;
  }
}
