import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('离线视频以正确类型返回，浏览器范围读取含尾段/HEAD及无效范围', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lishui-offline-video-'));
  const content = Buffer.from('0123456789abcdefghij');
  await writeFile(join(root, 'index.html'), '<title>遇见美溧</title>');
  await writeFile(join(root, 'clip.mp4'), content);
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, [resolve('scripts/start-offline-demo.mjs'), `--root=${root}`, `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.once('data', resolve); child.once('error', reject);
      child.once('exit', (code) => reject(new Error(`启动器提前退出：${code}`)));
    });
    const url = `http://127.0.0.1:${port}/clip.mp4`;
    const whole = await fetch(url);
    assert.equal(whole.headers.get('content-type'), 'video/mp4');
    assert.deepEqual(Buffer.from(await whole.arrayBuffer()), content);
    const piece = await fetch(url, { headers: { Range: 'bytes=4-8' } });
    assert.equal(piece.status, 206); assert.equal(piece.headers.get('content-range'), 'bytes 4-8/20');
    assert.equal(await piece.text(), '45678');
    const tail = await fetch(url, { headers: { Range: 'bytes=-3' } });
    assert.equal(tail.status, 206); assert.equal(await tail.text(), 'hij');
    const head = await fetch(url, { method: 'HEAD', headers: { Range: 'bytes=4-' } });
    assert.equal(head.status, 206); assert.equal(head.headers.get('content-length'), '16'); assert.equal(await head.text(), '');
    for (const range of ['bytes=99-', 'bytes=9-3', 'bytes=-0', 'bytes=0-1,3-4']) {
      const response = await fetch(url, { headers: { Range: range } });
      assert.equal(response.status, 416); assert.equal(response.headers.get('content-range'), 'bytes */20');
    }
  } finally {
    const stopped = new Promise((resolve) => child.once('exit', resolve));
    child.kill(); await stopped;
    await rm(root, { recursive: true });
  }
});
