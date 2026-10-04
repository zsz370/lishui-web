export const backendEnabled = Boolean(import.meta.env) && import.meta.env?.VITE_AGENT_API_ENABLED !== 'false';
export async function apiRequest(path, body, { signal, timeoutMs = 100000 } = {}) {
  try {
    const response = await fetch(`/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('服务未返回有效资料，请稍后重试。'); }
    if (!response.ok) throw new Error(typeof result?.error?.message === 'string' ? result.error.message : '查询暂时不可用');
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('查询超时，请稍后重试。');
    if (error instanceof TypeError) throw new Error('无法连接查询服务，请检查网络后重试。');
    throw error;
  }
}
