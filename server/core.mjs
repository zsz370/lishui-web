import { isIP } from 'node:net';

export function clientAddress(req, trustLoopbackProxy = false) {
  const address=req.socket.remoteAddress;
  const loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);
  const forwarded=req.headers['x-real-ip'];
  return trustLoopbackProxy&&loopback&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:address;
}

export class AppError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export function requireValue(value, name) {
  if (!value) throw new AppError('NOT_CONFIGURED', `${name}服务尚未配置`, 503);
  return value;
}
export function textField(value, name, max = 1000, required = true) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new AppError('INVALID_INPUT', `${name}格式不正确`);
  return value.trim();
}
export const safeUrl = (value) => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
};
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const addDays = (date, count) => new Date(new Date(`${date}T00:00:00Z`).getTime() + count * 86400000).toISOString().slice(0, 10);
export function dates(checkInDate, checkOutDate) {
  for (const date of [checkInDate, checkOutDate]) {
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new AppError('INVALID_DATES', '请提供有效的入住和退房日期（YYYY-MM-DD）');
  }
  if (checkInDate < today() || checkOutDate <= checkInDate || checkOutDate > addDays(checkInDate, 30)) throw new AppError('INVALID_DATES', '入住日期不能早于今天，退房须晚于入住且相隔不超过30天');
  return { checkInDate, checkOutDate };
}
export function endpoint(value, fallback, hosts) {
  const url = new URL(value || fallback);
  if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || url.username || url.password || url.search || url.hash) throw new Error('Invalid provider endpoint');
  return url.href.replace(/\/$/, '');
}
export function getConfig(env = process.env) {
  const weatherHost = (env.QWEATHER_API_HOST || '').replace(/^https:\/\//, '').replace(/\/$/, '');
  if (weatherHost && !/^[a-z0-9-]+\.re\.qweatherapi\.com$|^[a-z0-9-]+\.qweatherapi\.com$/i.test(weatherHost)) throw new Error('Invalid weather host');
  const origins=(env.API_ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173').split(',').map((value)=>value.trim()).filter(Boolean);
  if(!origins.length||origins.some((value)=>{try{const url=new URL(value);return url.origin!==value||url.username||url.password||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname));}catch{return true;}})) throw new Error('Invalid allowed origins');
  const integer=(name,fallback,min,max)=>{const value=Number(env[name]||fallback);if(!Number.isInteger(value)||value<min||value>max)throw new Error(`Invalid ${name}`);return value;};
  if(env.API_TRUST_LOOPBACK_PROXY && !['true','false'].includes(env.API_TRUST_LOOPBACK_PROXY)) throw new Error('Invalid API_TRUST_LOOPBACK_PROXY');
  return {
    port: Number(env.API_PORT || 8787), host: '127.0.0.1',
    origins,trustLoopbackProxy:env.API_TRUST_LOOPBACK_PROXY==='true',rateLimit:integer('API_RATE_LIMIT',20,1,1000),maxInflight:integer('API_MAX_INFLIGHT',4,1,20),chatTimeoutMs:integer('API_CHAT_TIMEOUT_MS',90000,1000,180000),
    llm: { base: endpoint(env.LLM_BASE_URL, 'https://api.siliconflow.cn/v1', ['api.siliconflow.cn']), key: env.LLM_API_KEY, model: env.LLM_MODEL || 'Qwen/Qwen3.5-4B' },
    embedding: { base: endpoint(env.EMBEDDING_BASE_URL, 'https://api.siliconflow.cn/v1', ['api.siliconflow.cn']), key: env.EMBEDDING_API_KEY, model: env.EMBEDDING_MODEL || 'BAAI/bge-m3' },
    bocha: { base: endpoint(env.BOCHA_BASE_URL, 'https://api.bochaai.com', ['api.bochaai.com', 'api.bocha.cn']), key: env.BOCHA_API_KEY },
    weather: { host: weatherHost, key: env.QWEATHER_API_KEY },
    amapKey: env.AMAP_WEB_SERVICE_KEY,
    baidu: { appId: env.BAIDU_TRANSLATE_APP_ID, secret: env.BAIDU_TRANSLATE_SECRET },
    stay: { base: endpoint(env.STAY_API_BASE_URL, 'https://flyai.open.fliggy.com/mcp', ['flyai.open.fliggy.com']), key: env.STAY_API_KEY },
  };
}
export async function upstream(provider, url, options = {}, fetcher = fetch) {
  try {
    const res = await fetcher(url, { ...options, redirect: 'error', signal: options.signal || AbortSignal.timeout(15000) });
    if (!res.ok) throw new AppError('UPSTREAM_FAILED', `${provider}服务未返回有效数据（HTTP ${res.status}）`, 502);
    return await res.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('UPSTREAM_FAILED', `${provider}服务暂时无法连接`, 502);
  }
}
