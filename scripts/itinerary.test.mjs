import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyPlan, readPlan, savePlan, normalizePlan, scenePlan, buildLegs, calculatePlan, exportPlan, PLAN_KEY, LEGACY_PLAN_KEY, navigationUrl } from '../src/data/itinerary.js';
import { normalizeRoute } from '../src/services/itinerary.js';
import { apiRequest } from '../src/services/api.js';

const now = Date.parse('2026-10-04T04:00:00Z');
const place = (name, location) => ({ name, location, address: '测试地址', checkedAt: '2026-10-04T03:00:00Z' });
function fixture(scene = 'culture') {
  const plan = scenePlan(scene);
  Object.assign(plan, { date: '2026-10-10', mode: 'transit', departureTime: '09:00', returnTime: '18:00', adults: '2', children: '1', budget: '500', otherCost: '100', origin: { query: '南京南站', place: place('南京南站', '118.797,31.969') }, destination: { query: '南京南站', place: place('南京南站', '118.797,31.969') } });
  plan.stops.forEach((stop, i) => Object.assign(stop, { stay: '60', cost: '50', place: place(`测试地点${i}`, `119.0${i},31.65`) }));
  buildLegs(plan).forEach((leg) => { plan.routes[leg.key] = { status: 'ok', minutes: 30, checkedAt: '2026-10-04T03:00:00Z' }; });
  return plan;
}
test('旧收藏迁移、去重与损坏数据安全处理；存储禁用不会阻塞编辑', () => {
  const data = new Map([[LEGACY_PLAN_KEY, JSON.stringify(['n_tsq', 'n_tsq', 'not-a-node', 's_tj'])]]);
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  const loaded = readPlan(storage);
  assert.deepEqual(loaded.plan.stops.map((stop) => stop.nodeId), ['n_tsq', 's_tj']);
  loaded.plan.budget = '0';
  assert.equal(savePlan(storage, loaded.plan), true);
  assert.equal(data.has(LEGACY_PLAN_KEY), false);
  assert.equal(readPlan(storage).plan.budget, '0');
  savePlan(storage, emptyPlan()); assert.equal(readPlan(storage).plan.stops.length, 0);
  data.set(PLAN_KEY, 'broken-json'); assert.equal(readPlan(storage).error, true);
  assert.equal(savePlan({ setItem() { throw new Error('blocked'); } }, fixture()), false);
});
test('两条场景只填明示的草案地点，保留条件，不编造日期、预算或人数', () => {
  for (const scene of ['culture', 'rain']) {
    const draft = scenePlan(scene);
    assert.equal(draft.date, ''); assert.equal(draft.budget, ''); assert.equal(draft.adults, ''); assert.equal(draft.stops[0].stay, '');
    const plan = fixture(scene), result = calculatePlan(plan, now);
    assert.equal(result.conflicts.length, 0);
    assert.deepEqual(result.timeline.map((item) => [item.arrival, item.departure]), [[570, 630], [660, 720]]);
    assert.equal(result.returnArrival, 750); assert.equal(result.subtotal, 200);
    const adjusted = scenePlan('rain', plan);
    assert.equal(adjusted.date, plan.date); assert.equal(adjusted.budget, plan.budget); assert.deepEqual(adjusted.routes, {});
  }
});
test('交通失败、不可达、过期及缺时长均保留未知，不用零分钟填平', () => {
  for (const route of [{ status: 'unavailable', minutes: 0 }, { status: 'unreachable' }, { status: 'ok', minutes: 1, checkedAt: '2026-10-02T00:00:00Z' }, { status: 'ok', minutes: null, checkedAt: '2026-10-04T03:00:00Z' }]) {
    const plan = fixture(); plan.routes[buildLegs(plan)[0].key] = route;
    const result = calculatePlan(plan, now);
    assert.equal(result.timeline[0].arrival, null); assert.equal(result.timeline[1].arrival, null); assert.equal(result.returnArrival, null);
    assert.ok(result.pending.some((text) => text.includes('交通衔接未知') || text.includes('未找到可达路线')));
  }
  const plan = fixture(); plan.stops[0].stay = '1.5'; assert.equal(calculatePlan(plan, now).timeline[0].departure, null);
});
test('时间重叠、晚返与超预算显式提示；未知路段也不能掩盖重叠', () => {
  const plan = fixture(); plan.stops[1].arrival = '10:00'; plan.budget = '100'; plan.returnTime = '10:00';
  let result = calculatePlan(plan, now);
  assert.ok(result.conflicts.some((text) => text.includes('时间冲突'))); assert.ok(result.conflicts.some((text) => text.includes('晚于最晚返回'))); assert.ok(result.conflicts.some((text) => text.includes('超过总预算')));
  delete plan.routes[buildLegs(plan)[1].key]; result = calculatePlan(plan, now);
  assert.ok(result.conflicts.some((text) => text.includes('早于上一段结束')));
});
test('地点、日期、交通与顺序变化不沿用其他路段估时', () => {
  for (const modify of [(plan) => { plan.mode = 'walking'; }, (plan) => { plan.date = '2026-10-11'; }, (plan) => { plan.stops.reverse(); }, (plan) => { plan.stops[0].place = null; }]) {
    const plan = fixture(); modify(plan); assert.equal(calculatePlan(plan, now).timeline[0].arrival, null);
  }
});
test('路线响应与保存数据校验，空路线不是成功，缺duration不是0', () => {
  assert.equal(normalizeRoute({ paths: [], checkedAt: '2026-10-04T03:00:00Z' }).status, 'unreachable');
  assert.throws(() => normalizeRoute({ paths: [{}], checkedAt: '2026-10-04T03:00:00Z' }));
  assert.throws(() => normalizeRoute({ paths: [{ duration: '' }], checkedAt: '2026-10-04T03:00:00Z' }));
  assert.equal(normalizeRoute({ paths: [{ duration: '61', distance: '' }], checkedAt: '2026-10-04T03:00:00Z' }).minutes, 2);
  const plan = normalizePlan({ ...fixture(), routes: { wrong: { status: 'ok', minutes: '0', message: { a: 1 } } } });
  assert.equal(plan.routes.wrong.minutes, null); assert.equal(plan.routes.wrong.message, '');
});
test('复制包括来源、缺失条件和真实导航参数，不导出凭据或聊天', () => {
  const plan = scenePlan('rain'), text = exportPlan(plan);
  assert.match(text, /日期：未确定/); assert.match(text, /内容出处/); assert.match(text, /费用尚未填全/); assert.match(text, /交通：未知/);
  const ready = fixture(), leg = buildLegs(ready)[0], url = new URL(navigationUrl(leg, ready.mode));
  assert.equal(url.hostname, 'uri.amap.com'); assert.equal(url.searchParams.get('mode'), 'bus'); assert.equal(url.searchParams.has('key'), false);
});

test('保存失败时复制和图片共用的导出正文不宣称已经保存，未提供状态时保持未知', () => {
  const plan = scenePlan('culture');
  const failed = exportPlan(plan, { savedLocally: false });
  assert.match(failed, /本次行程未能保存在浏览器/);
  assert.match(failed, /刷新可能丢失编辑/);
  assert.doesNotMatch(failed, /已保存在当前浏览器|清空行程可移除本地记录/);
  assert.match(exportPlan(plan, { savedLocally: true }), /已保存在当前浏览器/);
  assert.match(exportPlan(plan), /能否刷新恢复请查看页面保存提示/);
});
test('日期与天气不匹配、预报过期保持待确认，坏日期不参与天气核对', () => {
  const plan = fixture(); plan.date = '2026-02-31';
  assert.ok(calculatePlan(plan, now).pending.some((text) => text.includes('日期未确定或无效')));
  plan.weather = { date: plan.date, fetchedAt: now - 11 * 60 * 1000, text: '有雨', min: 15, max: 20 };
  assert.ok(calculatePlan(plan, now).pending.some((text) => text.includes('预报已过期')));
  plan.weather.fetchedAt = now; plan.weather.date = '2026-10-11';
  assert.ok(calculatePlan(plan, now).pending.some((text) => text.includes('天气未核对')));
});
test('接口失败、断网、非JSON及超时转成可读提示，显式取消不误报超时', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ error: { message: '查询较频繁，请稍后重试' } }), { status: 429 }));
  await assert.rejects(apiRequest('route', {}), /查询较频繁/);
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(apiRequest('route', {}), /无法连接查询服务/);
  fetchMock.mock.mockImplementation(async () => new Response('bad-json'));
  await assert.rejects(apiRequest('route', {}), /查询服务暂未连接.*继续编辑行程/);
  fetchMock.mock.mockImplementation(async () => { throw new DOMException('timeout', 'TimeoutError'); });
  await assert.rejects(apiRequest('route', {}), /查询超时/);
  const controller = new AbortController(); controller.abort();
  fetchMock.mock.mockImplementation(async () => { throw controller.signal.reason; });
  await assert.rejects(apiRequest('route', {}, { signal: controller.signal }), (error) => error.name === 'AbortError');
});
