import test from 'node:test';
import assert from 'node:assert/strict';
import { dragonQuestions, dragonTaskVersion, createDragonResult, readDragonResult, saveDragonResult } from '../src/data/dragonExperience.js';
import { queryQA } from '../src/data/presetQA.js';
import { scenePlan, exportPlan, buildLegs, createStop, calculatePlan, normalizePlan } from '../src/data/itinerary.js';
import { wrapExportText, paginateExport, restoreExportText, EXPORT_ROWS, EXPORT_FIRST_LINE, EXPORT_LINE_HEIGHT, EXPORT_HEIGHT } from '../src/data/itineraryExport.js';
import { nodes } from '../src/data/nodes.js';

test('三个知识点仍对应获审事实及原始出处；规模与传说边界不丢失', () => {
  assert.equal(dragonQuestions.length, 3);
  for (const question of dragonQuestions) {
    const qa = queryQA('c_ldl', question.reference);
    assert.equal(qa.status, 'approved'); assert.equal(qa.kind, question.reference.includes('断尾') ? 'legend' : 'fact');
    assert.equal(question.explanation, qa.a); assert.equal(question.referenceId, qa.id);
    assert.equal(question.sources[0].url, 'https://www.ihchina.cn/project_details/12838');
  }
  assert.match(dragonQuestions[1].explanation, /不代表每一场/);
  assert.match(dragonQuestions[2].explanation, /不能.*真实历史事件/);
});
test('第一次错误选择保留；刷新恢复会重新计算得分，拒绝旧版和损坏记录', () => {
  const result = createDragonResult([1, 1, 2], 10000, 45000);
  assert.equal(result.score, 2); assert.equal(result.elapsedSeconds, 35);
  assert.equal(result.answers[0].correct, false);
  const storage = { getItem: () => JSON.stringify({ ...result, score: 3, history: '未导出聊天' }) };
  const loaded = readDragonResult(storage);
  assert.equal(loaded.score, 2); assert.equal(loaded.history, undefined);
  assert.equal(readDragonResult({ getItem: () => JSON.stringify({ ...result, version: `${dragonTaskVersion}-old` }) }), null);
  assert.equal(readDragonResult({ getItem: () => '{' }), null);
  assert.equal(createDragonResult([0, 1], 10000), null);
  assert.equal(createDragonResult([0, 99, 2], 10000), null);
});
test('文化记录存储禁用不会抛错或阻塞本次结果', () => {
  const result = createDragonResult([0, 1, 2], 10000, 18000);
  assert.equal(saveDragonResult({ setItem() { throw new Error('DENIED'); } }, result), false);
  assert.equal(readDragonResult({ getItem() { throw new Error('DENIED'); } }), null);
  assert.equal(result.score, 3);
});
test('长中文、百分号链接、组合字符及空行跨页后能还原全文，无省略或裁切', () => {
  const text = `出发🙂é\n\n${'很长的中文备注'.repeat(40)}\n导航：https://uri.amap.com/navigation?to=${encodeURIComponent('南京南站'.repeat(15))}\n末尾 `;
  const rows = wrapExportText(text, (line) => Array.from(line).length * 10, 120);
  const pages = paginateExport(rows, 9);
  assert.ok(pages.length > 3); assert.ok(pages.every((page) => page.length <= 9));
  assert.equal(restoreExportText(pages.flat()), text);
  assert.ok(rows.every((row) => Array.from(row.text).length <= 12));
  assert.ok(EXPORT_FIRST_LINE + EXPORT_ROWS * EXPORT_LINE_HEIGHT < EXPORT_HEIGHT - 110);
});
test('所有节点的大行程也可分页完整导出；未知费用和待确认项不被抹掉', () => {
  const plan = scenePlan('culture'); plan.stops = nodes.map((node) => createStop(node.id));
  const text = exportPlan(plan), pages = paginateExport(wrapExportText(text, (line) => line.length * 16, 654));
  assert.equal(restoreExportText(pages.flat()), text); assert.ok(pages.length > 5);
  for (const node of nodes) assert.ok(text.includes(node.name));
  assert.match(text, /小计（未填全）/); assert.match(text, /交通：未知/); assert.match(text, /待确认：/);
});
test('当前编辑与导航链接进入导出，聊天和配置字段不会进入', () => {
  const plan = scenePlan('culture'); plan.date = '2026-10-10'; plan.mode = 'walking';
  plan.stops[0].note = '只导出这条备注'; plan.stops[0].cost = '85';
  const place = (name, location) => ({ name, location, address: '测试入口' });
  plan.origin.place = place('天生桥停车场', '118.965,31.629');
  plan.stops[0].place = place('天生桥景区', '118.968,31.629');
  plan.chat = '私密聊天内容不应导出'; plan.credentials = '测试凭据不应导出';
  const text = exportPlan(plan);
  assert.match(text, /2026-10-10/); assert.match(text, /85元/); assert.match(text, /只导出这条备注/);
  const leg = buildLegs(plan)[0], navigation = text.split('\n').find((line) => line.startsWith('导航：')).slice(3);
  const url = new URL(navigation); assert.equal(url.hostname, 'uri.amap.com'); assert.equal(url.searchParams.get('from'), `${leg.from.place.location},${leg.from.place.name}`);
  assert.ok(!text.includes(plan.chat)); assert.ok(!text.includes(plan.credentials));
});
test('旧单值费用不被推算成区间；补全上下限后计算、保存和导出一致', () => {
  const plan = scenePlan('culture'); plan.otherCost = '100';
  Object.assign(plan.stops[0], { cost: '85' }); Object.assign(plan.stops[1], { cost: '30' });
  assert.equal(calculatePlan(plan).subtotal, 215); assert.equal(calculatePlan(plan).ceilingSubtotal, null);
  assert.match(exportPlan(plan), /总费用区间：尚未填全/);
  plan.otherCostMax = '120'; plan.stops[0].costMax = '100'; plan.stops[1].costMax = '40';
  const restored = normalizePlan(JSON.parse(JSON.stringify(plan)));
  assert.equal(calculatePlan(restored).ceilingSubtotal, 260);
  assert.match(exportPlan(restored), /总费用区间：215—260元/);
  assert.match(exportPlan(restored), /85—100元/);
  const old = normalizePlan({ ...plan, otherCostMax: undefined, stops: plan.stops.map(({ costMax, ...stop }) => stop) });
  assert.equal(calculatePlan(old).ceilingSubtotal, null);
});
test('倒置、负数和只有上限的区间不能当成有效费用；区间上限超预算会提示', () => {
  const plan = scenePlan('culture'); Object.assign(plan, { otherCost: '100', otherCostMax: '120', budget: '250' });
  Object.assign(plan.stops[0], { cost: '85', costMax: '100' }); Object.assign(plan.stops[1], { cost: '30', costMax: '40' });
  assert.ok(calculatePlan(plan).conflicts.some((message) => message.includes('上限260元超过')));
  for (const invalid of ['70', '-1']) { plan.stops[0].costMax = invalid; assert.equal(calculatePlan(plan).ceilingSubtotal, null); assert.ok(calculatePlan(plan).conflicts.some((message) => message.includes('费用区间无效'))); }
  plan.stops[0].costMax = '100'; plan.stops[0].cost = '';
  assert.equal(calculatePlan(plan).completeRanges, false);
  assert.ok(calculatePlan(plan).conflicts.some((message) => message.includes('费用区间无效')));
});
