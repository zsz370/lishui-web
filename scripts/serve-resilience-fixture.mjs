// Local-only validation server. It never proxies requests or changes a running API.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const mode = process.argv.find((argument) => argument.startsWith('--mode='))?.slice(7);
if (!['faults', 'reset', 'streamcut', 'timeout'].includes(mode)) throw new Error('Use --mode=faults|reset|streamcut|timeout');
const port = Number(process.argv.find((argument) => argument.startsWith('--port='))?.slice(7) || 4510);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid loopback port');
const root = resolve('dist');
const injection = `
Object.defineProperty(window, 'localStorage', {get(){throw new DOMException('Local validation fixture', 'SecurityError')}});
`;
const label = { faults: '本地故障验收 模拟存储禁用 图片失败 API额度耗尽', reset: '本地故障验收 模拟API连接中断（页面资源正常）', streamcut: '本地故障验收 模拟查询状态后断流（无完整答复）', timeout: '本地故障验收 模拟服务端超时回报（1.5秒注入，非真实上游耗时）' }[mode];
const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.html': 'text/html' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    response.setHeader('Cache-Control', 'no-store');
    if (url.pathname.startsWith('/api/')) {
      if (mode === 'reset') { request.socket.destroy(); return; }
      if (mode === 'streamcut' || mode === 'timeout') {
        response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
        response.write(`event: progress\ndata: ${JSON.stringify({ taskId: 'weather', agentId: '01_huaiyuanjie', label: '核对天气', status: 'running' })}\n\n`);
        const timer = setTimeout(() => {
          if (mode === 'timeout') response.write(`event: error\ndata: ${JSON.stringify({ error: { message: '本地验收：查询超时，请稍后重试。' } })}\n\n`);
          response.end();
        }, 1500);
        response.on('close', () => clearTimeout(timer));
        return;
      }
      response.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: { message: '本地验收：今日查询额度已用完，请稍后再试。' } }));
      return;
    }
    const candidate = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (candidate !== root && !candidate.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    if (mode === 'faults' && /\.(png|jpe?g|webp|gif)$/i.test(candidate)) { response.writeHead(404); response.end(); return; }
    const extension = extname(candidate);
    const file = extension ? candidate : resolve(root, 'index.html');
    if (!(await stat(file)).isFile()) { response.writeHead(404); response.end(); return; }
    let body = await readFile(file);
    if (file === resolve(root, 'index.html')) {
      body = Buffer.from(body.toString('utf8').replace('<head>', `<head><script>${mode === 'faults' ? injection : ''}</script>`).replace('<body>', `<body><p style="margin:0;padding:10px;background:#fff0c5;color:#41351d;font:12px sans-serif">${label}</p>`));
    }
    response.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}${['.html', '.js', '.css'].includes(extname(file)) ? '; charset=utf-8' : ''}` });
    response.end(body);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`${label}: http://127.0.0.1:${port}/`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.closeAllConnections(); server.close(); });
