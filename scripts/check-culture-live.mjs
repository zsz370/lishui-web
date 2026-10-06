import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { readChatEvents } from '../src/services/chatStream.js';
import { getConfig } from '../server/core.mjs';

const base = `http://127.0.0.1:${getConfig().port}`;
const cases = [
  { id: 'C01', scope: '文化选择后，向专家核对传说与史实', question: '骆山大龙的断尾故事是史实吗？', source: 'https://www.ihchina.cn/project_details/12838' },
  { id: 'C02', scope: '文化名片入行程后，展示馆建设计划不当作开放证明', question: '在哪能看到骆山大龙？', boundary: true },
];
const output = [];
for (const item of cases) {
  const events = [], started = Date.now();
  const response = await fetch(`${base}/api/chat/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeId: 'c_ldl', question: item.question }), signal: AbortSignal.timeout(95000) });
  assert.equal(response.status, 200);
  const result = await readChatEvents(response, (event) => events.push({ ...event, receivedAfterMs: Date.now() - started }));
  assert.ok(result.content?.trim());
  assert.equal(result.speaker?.id, '04_dalonggu');
  if (item.source) assert.ok(JSON.stringify(result).includes(item.source));
  if (item.boundary) assert.ok(/不证明今天已经开放/.test(result.content));
  output.push({ ...item, repeat: 1, durationMs: Date.now() - started, events, result, humanReview: null });
  console.log(JSON.stringify({ id: item.id, kind: result.kind, durationMs: Date.now() - started, content: result.content }));
}
const ready = await (await fetch(`${base}/ready`)).json(); assert.equal(ready.ready, true);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
await writeFile(`.web_review/${stamp}-R03-RAG闭环单次探索.json`, JSON.stringify({ checkedAt: new Date().toISOString(), scope: '2个闭环问题各一次，单次探索；不并入历史30题216次对照，不代表游客理解改善。人工语义评分继续由R04复核。', ready, cases: output }, null, 2), { flag: 'wx' });
