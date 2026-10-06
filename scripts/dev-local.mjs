import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

// Reuse a project API only after inspecting its public readiness response.
export async function inspectLocalApi(port, fetcher = fetch) {
  try {
    const response = await fetcher(`http://127.0.0.1:${port}/ready`, { signal: AbortSignal.timeout(2000) });
    const body = await response.json();
    if (!body.index || body.llm?.provider !== 'SiliconFlow') return { status: 'occupied' };
    return { status: body.ready ? 'ready' : 'degraded' };
  } catch (error) {
    return { status: error instanceof TypeError && error.cause?.code === 'ECONNREFUSED' ? 'absent' : 'occupied' };
  }
}

async function main() {
  process.chdir(fileURLToPath(new URL('..', import.meta.url)));
  const envPath = 'config/integrations.env.local';
  if (!existsSync(envPath)) throw new Error('缺少本地接口配置。请按README配置；只浏览静态页面可用 npm run dev:web。');
  // Load the same local file as dev:api without printing or passing secret values as arguments.
  process.loadEnvFile(envPath);
  const port = Number(process.env.API_PORT || 8787);
  if (port !== 8787) throw new Error('当前网页代理使用8787端口，请先核对本地API_PORT与vite.config.js。');
  const children = [], status = await inspectLocalApi(port);
  let stopping = false;
  const stop = () => {
    if (stopping) return; stopping = true;
    for (const child of children) {
      if (!child.pid || child.exitCode !== null) continue;
      if (process.platform === 'win32') spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      else child.kill('SIGTERM');
    }
  };
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
  process.on('exit', stop);
  const launch = (args) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true });
    children.push(child);
    child.on('error', () => { process.exitCode = 1; stop(); });
    child.on('exit', (code) => { if (!stopping) { process.exitCode = code || 1; stop(); } });
    return child;
  };
  if (status.status === 'occupied') throw new Error('8787端口已被其他服务占用或无法确认；未停止该服务，请先核对。');
  if (status.status === 'absent') {
    launch(['--watch', `--env-file=${envPath}`, 'server/index.mjs']);
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (stopping) throw new Error('后端启动失败，请查看上方接口启动提示。');
      await new Promise((resolve) => setTimeout(resolve, 250));
      const api = await inspectLocalApi(port);
      if (['ready', 'degraded'].includes(api.status)) { ready = true; break; }
    }
    if (!ready) { stop(); throw new Error('后端未能启动，已停止本次启动的进程。'); }
  } else console.log('复用已运行的本项目本地API；结束本次网页预览不会停止它。');
  const web = launch(['node_modules/vite/bin/vite.js', '--strictPort', ...process.argv.slice(2)]);
  await once(web, 'exit');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
