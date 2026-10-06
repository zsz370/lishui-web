import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlan, scenePlan, normalizePlan, buildLegs, exportPlanSummary, exportPlan, normalizePlace } from '../src/data/itinerary.js';
import { createProviders } from '../server/providers.mjs';
import { extractTripContext } from '../src/services/chatContext.js';
import { validateChat } from '../server/chat.mjs';
import { inspectLocalApi } from './dev-local.mjs';

const now = Date.parse('2026-10-05T12:00:00Z');
function multiDay() {
  const plan = scenePlan('food');
  Object.assign(plan, { date: '2026-10-06', returnDate: '2026-10-07', departureTime: '09:00', returnTime: '18:00', adults: '2', children: '0' });
  Object.assign(plan.stops[0], { arrival: '10:00', stay: '60' });
  Object.assign(plan.stops[1], { date: '2026-10-07', arrival: '10:00', stay: '90' });
  return plan;
}

test('多日按实际游览日计算时间，次日上午不会被判成第一天晚返', () => {
  const plan = multiDay(), result = calculatePlan(plan, now);
  assert.deepEqual(result.timeline.map((item) => [item.arrival, item.departure]), [[600, 660], [2040, 2130]]);
  assert.equal(result.conflicts.length, 0);
  assert.ok(result.pending.some((text) => text.includes('住宿')));
  plan.returnDate = '2026-10-05';
  assert.ok(calculatePlan(plan, now).conflicts.some((text) => text.includes('返程日期不能早于')));
});
test('跨日缺到达时间保持未知，过夜后不虚构接驳；乱序与超日期提示冲突', () => {
  const plan = multiDay(); plan.stops[1].arrival = '';
  buildLegs(plan).forEach((leg) => { plan.routes[leg.key] = { status: 'ok', minutes: 20, checkedAt: new Date(now).toISOString() }; });
  let result = calculatePlan(plan, now);
  assert.equal(result.timeline[1].arrival, null);
  assert.equal(result.returnArrival, null);
  assert.ok(result.pending.some((text) => text.includes('新一天请填写')));
  plan.stops[1].date = '2026-10-08';
  assert.ok(calculatePlan(plan, now).conflicts.some((text) => text.includes('不在出行与返程')));
  plan.stops[1].date = '2026-10-06'; plan.stops[0].date = '2026-10-07';
  assert.ok(calculatePlan(plan, now).conflicts.some((text) => text.includes('日期早于前一站')));
});
test('返程日晚于最后游览日时不沿用前一天的返程时间；路线日期改动使保存结果失效', () => {
  const plan = multiDay();
  buildLegs(plan).forEach((leg) => { plan.routes[leg.key] = { status: 'ok', minutes: 20, checkedAt: new Date(now).toISOString() }; });
  assert.equal(calculatePlan(plan, now).returnArrival, 2150);
  const keys = buildLegs(plan).map((leg) => leg.key);
  plan.returnDate = '2026-10-08';
  assert.equal(calculatePlan(plan, now).returnArrival, null);
  assert.notEqual(buildLegs(plan).at(-1).key, keys.at(-1));
  plan.stops[1].date = '2026-10-08';
  assert.notEqual(buildLegs(plan)[1].key, keys[1]);
});
test('新日期与城市字段刷新恢复，旧一日记录不捏造返程日，旧收藏兼容', () => {
  const plan = multiDay(); plan.origin.city = '上海';
  plan.origin.place = { name: '上海虹桥站', location: '121.327,31.200', citycode: '021', adcode: '310112', region: '上海市 · 闵行区' };
  const restored = normalizePlan(JSON.parse(JSON.stringify(plan)));
  assert.equal(restored.returnDate, '2026-10-07'); assert.equal(restored.stops[1].date, '2026-10-07');
  assert.equal(restored.origin.city, '上海'); assert.equal(restored.origin.place.citycode, '021');
  const old = { ...plan }; delete old.returnDate;
  assert.equal(normalizePlan(old).returnDate, '');
  assert.equal(normalizePlan(['n_tsq']).stops[0].nodeId, 'n_tsq');
});
test('精简卡省略空项但保留冲突、未确认总数与保存失败；详细版仍含来源', () => {
  const plan = multiDay(); plan.returnDate = '2026-10-05';
  const brief = exportPlanSummary(plan, { savedLocally: false, now });
  assert.match(brief, /2026-10-06/); assert.match(brief, /2026-10-07/);
  assert.match(brief, /冲突：返程日期/); assert.match(brief, /行前核对：\d+项条件未确认/); assert.match(brief, /未能保存在浏览器/);
  assert.doesNotMatch(brief, /实际地点：待确认|交通：未知|备注：无|内容出处：/);
  assert.match(exportPlan(plan), /内容出处：/);
  assert.ok(brief.length < exportPlan(plan).length / 2);
});
test('全国搜索不带南京范围，有范围时限定并保留省市/城市代码', async () => {
  const urls = [], providers = createProviders({ amapKey: 'test-key' }, async (url) => {
    urls.push(new URL(url));
    assert.equal(urls.at(-1).searchParams.get('extensions'), 'all', '基础结果不含城市与区县代码，不能用于跨城公交');
    return new Response(JSON.stringify({ status: '1', pois: [{ id: 'test', name: '上海虹桥站', location: '121.327,31.200', pname: '上海市', cityname: '上海市', adname: '闵行区', citycode: '021', adcode: '310112', address: '测试地址' }] }));
  });
  let result = await providers.places('上海虹桥站', '');
  assert.equal(urls[0].searchParams.has('city'), false); assert.equal(urls[0].searchParams.get('citylimit'), 'false');
  assert.match(result.places[0].region, /上海.*闵行/);
  assert.equal(normalizePlace(result.places[0]).citycode, '021');
  await providers.places('天生桥', '溧水'); assert.equal(urls[1].searchParams.get('city'), '溧水');
  assert.equal(urls[1].searchParams.get('citylimit'), 'true');
  await assert.rejects(providers.places('车站', 'bad&city=x'), /查询范围/);
});
test('跨城公交使用实际起终城市；旧地点缺城市时按坐标核对，不能写死南京', async () => {
  const urls = [], providers = createProviders({ amapKey: 'test-key' }, async (url) => {
    url = new URL(url); urls.push(url);
    return new Response(JSON.stringify(url.pathname.includes('regeo') ? { status: '1', regeocode: { addressComponent: { citycode: '021' } } } : { status: '1', route: { transits: [] } }));
  });
  await providers.route('121.327,31.200', '119.020,31.650', 'transit', { originCity: '021', destinationCity: '025' });
  assert.equal(urls[0].searchParams.get('city'), '021'); assert.equal(urls[0].searchParams.get('cityd'), '025');
  await providers.route('121.327,31.200', '119.020,31.650', 'transit', { destinationCity: '025' });
  assert.ok(urls.some((url) => url.pathname.includes('regeo')));
  await providers.route('121.327,31.200', '119.020,31.650', 'driving');
  assert.equal(urls.at(-1).searchParams.has('city'), false);
});
test('行程表单上下文可供导游使用，最新问题覆盖；总预算不当每晚房价', () => {
  assert.deepEqual(validateChat({ question: '怎么安排？', preferences: { weatherDate: '', origin: '', destination: '', mode: '' } }).preferences, {});
  const input = validateChat({ question: '怎么去？', preferences: { weatherDate: '2026-10-06', origin: '上海虹桥站', destination: '无想山', mode: 'driving' } });
  const context = extractTripContext(input);
  assert.equal(context.origin, '上海虹桥站'); assert.equal(context.weatherDate, '2026-10-06'); assert.equal(context.weatherDateAssumed, false);
  assert.equal(context.mode, 'driving'); assert.equal(context.maxPrice, undefined);
  const revised = extractTripContext({ ...input, question: '明天改坐公共交通', history: [] }, null, { today: '2026-10-05' });
  assert.equal(revised.mode, 'transit'); assert.equal(revised.weatherDate, '2026-10-06');
});
test('本地启动器识别项目API与其他占用，不停止其他服务', async () => {
  assert.deepEqual(await inspectLocalApi(8787, async () => new Response(JSON.stringify({ index: {}, llm: { provider: 'SiliconFlow' }, ready: true }))), { status: 'ready' });
  assert.deepEqual(await inspectLocalApi(8787, async () => new Response('<html>another site</html>')), { status: 'occupied' });
  assert.deepEqual(await inspectLocalApi(8787, async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }); }), { status: 'absent' });
});
