import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map((item) => item.replace(/^--/, '').split('=')));
const root = resolve(args.root || fileURLToPath(new URL('./site/', import.meta.url)));
const port = Number(args.port || 4493);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('端口请使用1024—65535之间的整数。');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm' };
await stat(resolve(root, 'index.html'));
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); } catch { response.writeHead(400); response.end(); return; }
  if (pathname === '/api' || pathname.startsWith('/api/')) { response.writeHead(503, { 'Content-Type': types['.json'] }); response.end(JSON.stringify({ error: { message: '离线演示未连接实时服务。' } })); return; }
  const target = resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  try {
    let file = pathname === '/' ? resolve(root, 'index.html') : target;
    try { if (!(await stat(file)).isFile()) throw new Error('NOT_FILE'); }
    catch { if (pathname.startsWith('/assets/') || pathname.startsWith('/nodes/') && /\.[^/]+$/.test(pathname) || /\.[^/]+$/.test(pathname)) { response.writeHead(404); response.end(); return; } file = resolve(root, 'index.html'); }
    const data = await readFile(file), extension = file.slice(file.lastIndexOf('.'));
    if (extension === '.mp4' && request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      const suffix = range && !range[1] && range[2] ? Number(range[2]) : 0;
      const start = suffix ? Math.max(0, data.length - suffix) : range?.[1] ? Number(range[1]) : NaN;
      const end = suffix ? data.length - 1 : range?.[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= data.length) {
        response.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); response.end(); return;
      }
      response.writeHead(206, { 'Content-Type': types[extension], 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : data.subarray(start, end + 1)); return;
    }
    response.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(500); response.end('无法读取演示文件，请检查解压后的site目录。'); }
});
server.on('error', (error) => { console.error(error.code === 'EADDRINUSE' ? `端口${port}已有服务，请改用--port=4494；不会停止现有进程。` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`离线演示：http://127.0.0.1:${port}（仅本机；Ctrl+C停止）`));
