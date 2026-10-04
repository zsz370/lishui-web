import { getNode } from './nodes.js';

export const PLAN_KEY = 'lishui-itinerary-v2';
export const LEGACY_PLAN_KEY = 'lishui-itinerary';
export const transportNames = { transit: '公共交通', walking: '步行', driving: '自驾' };
const clean = (value, limit = 200) => typeof value === 'string' ? value.slice(0, limit) : '';
export const numberValue = (value) => typeof value !== 'number' && typeof value !== 'string' || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value);
export const validPoint = (value) => /^\d{1,3}(?:\.\d{1,6})?,\d{1,2}(?:\.\d{1,6})?$/.test(value || '') && Number(value.split(',')[0]) <= 180 && Number(value.split(',')[1]) <= 90;
export function normalizePlace(value) {
  if (!value || !validPoint(value.location) || !clean(value.name)) return null;
  return { id: clean(value.id), name: clean(value.name), address: clean(value.address, 300), location: value.location, checkedAt: clean(value.checkedAt), provider: '高德地图' };
}
export function createStop(nodeId) {
  const node = getNode(nodeId);
  return { nodeId, arrival: '', stay: '', cost: '', costNote: '', note: '', query: node?.cat === '山水' || node?.cat === '街区' ? node.name.split('·')[0] : '', place: null };
}
export function emptyPlan() {
  return { version: 2, date: '', departureTime: '', returnTime: '', adults: '', children: '', mode: '', budget: '', otherCost: '', goal: '', weatherCondition: '', origin: { query: '', place: null }, destination: { query: '', place: null }, stops: [], routes: {}, weather: null };
}
export function normalizePlan(raw) {
  const plan = emptyPlan();
  if (Array.isArray(raw)) return { ...plan, stops: [...new Set(raw.filter((id) => typeof id === 'string' && getNode(id)))].map(createStop) };
  if (!raw || raw.version !== 2) return plan;
  for (const key of ['date', 'departureTime', 'returnTime', 'adults', 'children', 'budget', 'otherCost', 'goal']) plan[key] = clean(raw[key]);
  plan.mode = transportNames[raw.mode] ? raw.mode : '';
  plan.weatherCondition = raw.weatherCondition === 'rain' ? 'rain' : '';
  for (const key of ['origin', 'destination']) plan[key] = { query: clean(raw[key]?.query, 120), place: normalizePlace(raw[key]?.place) };
  const seen = new Set();
  plan.stops = (Array.isArray(raw.stops) ? raw.stops : []).filter((stop) => getNode(stop?.nodeId) && !seen.has(stop.nodeId) && seen.add(stop.nodeId)).map((stop) => {
    const result = createStop(stop.nodeId);
    for (const key of ['arrival', 'stay', 'cost', 'costNote', 'note', 'query']) result[key] = clean(stop[key]);
    result.place = normalizePlace(stop.place);
    return result;
  });
  // Saved queries remain dated references. Rendering revalidates their shape and age.
  if (raw.routes && typeof raw.routes === 'object' && !Array.isArray(raw.routes)) {
    for (const [key, route] of Object.entries(raw.routes).slice(-100)) {
      if (key.length > 300 || !route || !['ok', 'unavailable', 'unreachable'].includes(route.status)) continue;
      plan.routes[key] = { status: route.status, minutes: typeof route.minutes === 'number' && Number.isFinite(route.minutes) && route.minutes >= 0 ? route.minutes : null, distance: typeof route.distance === 'number' && Number.isFinite(route.distance) ? route.distance : null, checkedAt: clean(route.checkedAt), provider: '高德地图', message: clean(route.message), steps: (Array.isArray(route.steps) ? route.steps : []).filter((step) => typeof step === 'string').slice(0, 20), buses: (Array.isArray(route.buses) ? route.buses : []).filter((bus) => typeof bus === 'string').slice(0, 12) };
    }
  }
  if (raw.weather && typeof raw.weather === 'object' && typeof raw.weather.text === 'string' && [raw.weather.min, raw.weather.max, raw.weather.fetchedAt].every((value) => typeof value === 'number' && Number.isFinite(value))) plan.weather = { date: clean(raw.weather.date, 10), text: clean(raw.weather.text, 60), min: raw.weather.min, max: raw.weather.max, rain: typeof raw.weather.rain === 'number' ? raw.weather.rain : null, provider: clean(raw.weather.provider, 30), sourceUrl: clean(raw.weather.sourceUrl, 300), fetchedAt: raw.weather.fetchedAt };
  return plan;
}
export function readPlan(storage) {
  try {
    const current = storage.getItem(PLAN_KEY);
    if (current !== null) return { plan: normalizePlan(JSON.parse(current)), error: false };
    return { plan: normalizePlan(JSON.parse(storage.getItem(LEGACY_PLAN_KEY) || '[]')), error: false };
  } catch { return { plan: emptyPlan(), error: true }; }
}
export function savePlan(storage, plan) {
  try { storage.setItem(PLAN_KEY, JSON.stringify(plan)); storage.removeItem(LEGACY_PLAN_KEY); return true; }
  catch { return false; }
}
export const routeKey = (from, to, mode, date) => JSON.stringify([from?.location || '', to?.location || '', mode, date]);
export function buildLegs(plan) {
  const points = [{ id: 'origin', name: plan.origin.query || '出发地', place: plan.origin.place }, ...plan.stops.map((stop) => ({ id: stop.nodeId, name: getNode(stop.nodeId)?.name, place: stop.place })), { id: 'destination', name: plan.destination.query || '返程终点', place: plan.destination.place }];
  return points.slice(1).map((point, i) => ({ id: `${points[i].id}:${point.id}`, from: points[i], to: point, key: routeKey(points[i].place, point.place, plan.mode, plan.date) }));
}
export function navigationUrl(leg, mode) {
  if (!leg.from.place || !leg.to.place || !transportNames[mode]) return null;
  return `https://uri.amap.com/navigation?${new URLSearchParams({ from: `${leg.from.place.location},${leg.from.place.name}`, to: `${leg.to.place.location},${leg.to.place.name}`, mode: { transit: 'bus', walking: 'walk', driving: 'car' }[mode], src: 'lishui-guide', callnative: '0' })}`;
}
export const parseTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time || '') ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null;
export const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export const formatTime = (minutes) => minutes == null ? '待确定' : `${minutes >= 1440 ? '次日 ' : ''}${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export function routeMinutes(route, now = Date.now()) {
  if (route?.status !== 'ok' || !Number.isFinite(route.minutes) || route.minutes < 0 || !Number.isFinite(Date.parse(route.checkedAt)) || now - Date.parse(route.checkedAt) > 24 * 60 * 60 * 1000 || Date.parse(route.checkedAt) > now + 60000) return null;
  return Math.ceil(route.minutes);
}
export function planWeather(plan, now = Date.now()) {
  const weather = plan.weather;
  return weather?.date === plan.date && typeof weather.text === 'string' && [weather.min, weather.max, weather.fetchedAt].every(Number.isFinite) && now >= weather.fetchedAt && now - weather.fetchedAt < 10 * 60 * 1000 ? weather : null;
}
export function calculatePlan(plan, now = Date.now()) {
  const pending = [], conflicts = [], legs = buildLegs(plan);
  if (!validDate(plan.date)) pending.push('出行日期未确定或无效，天气与开放安排还不能按日期核对。');
  if (!planWeather(plan, now)) pending.push('出行日天气未核对或预报已过期，请出发前重新查询。');
  if (!plan.origin.place) pending.push('请查询并确认出发地。');
  if (!plan.destination.place) pending.push('请查询并确认返程终点。');
  if (!plan.mode) pending.push('交通方式未确定。');
  if (!Number.isInteger(numberValue(plan.adults)) || Number(plan.adults) < 1 || Number(plan.adults) > 30 || !Number.isInteger(numberValue(plan.children)) || Number(plan.children) > 30) pending.push('请补充有效成人与儿童人数（整数，成人1—30，儿童0—30）。');
  if (numberValue(plan.budget) === null) pending.push('总预算未确定。');
  let cursor = parseTime(plan.departureTime);
  if (cursor === null) pending.push('出发时间未确定。');
  const deadline = parseTime(plan.returnTime);
  if (deadline === null) pending.push('最晚返回时间未确定。');
  if (cursor !== null && deadline !== null && deadline <= cursor) conflicts.push('最晚返回时间应晚于出发时间；当前编辑器用于同一天行程。');
  const timeline = plan.stops.map((stop, i) => {
    const leg = legs[i], route = plan.routes[leg.key], travel = routeMinutes(route, now);
    if (travel === null) pending.push(`${leg.from.name} → ${leg.to.name}：${route?.status === 'unreachable' ? '未找到可达路线，请调整地点或交通方式。' : '交通衔接未知，需确认地点并查询路线。'}`);
    const earliest = cursor !== null && travel !== null ? cursor + travel : null;
    const fixed = parseTime(stop.arrival), arrival = fixed ?? earliest;
    if (fixed !== null && earliest !== null && fixed < earliest) conflicts.push(`${getNode(stop.nodeId).name}：设定到达${formatTime(fixed)}，按前一站与地图估时最早${formatTime(earliest)}，时间冲突。`);
    // A fixed appointment cannot erase a preceding visit even when travel is unknown.
    if (fixed !== null && cursor !== null && fixed < cursor && travel === null) conflicts.push(`${getNode(stop.nodeId).name}：到达时间早于上一段结束，时间冲突。`);
    const rawStay = numberValue(stop.stay), stay = Number.isInteger(rawStay) && rawStay > 0 && rawStay <= 1440 ? rawStay : null;
    if (stay === null) pending.push(`${getNode(stop.nodeId).name}：停留时长未确定，请填1—1440的整数分钟。`);
    if (!stop.place) pending.push(`${getNode(stop.nodeId).name}：请确认实际入口、店铺或展馆，不把文化项目名称当作地址。`);
    const departure = arrival !== null && stay !== null && stay > 0 ? arrival + stay : null;
    if (departure !== null && departure >= 1440) conflicts.push(`${getNode(stop.nodeId).name}：安排跨到次日，请缩短停留或调整出发时间。`);
    if (departure !== null && deadline !== null && departure > deadline) conflicts.push(`${getNode(stop.nodeId).name}：结束时间晚于最晚返回时间。`);
    cursor = departure;
    return { stop, arrival, departure, travel, leg, basis: fixed !== null ? '自填到达时间' : arrival !== null ? '地图估时推算' : '衔接待确定' };
  });
  const returnLeg = legs.at(-1), returnTravel = plan.stops.length ? routeMinutes(plan.routes[returnLeg.key], now) : null;
  if (plan.stops.length && returnTravel === null) pending.push('返程交通未知，尚不能确认按时返回。');
  const returnArrival = cursor !== null && returnTravel !== null ? cursor + returnTravel : null;
  if (returnArrival !== null && deadline !== null && returnArrival > deadline) conflicts.push(`预计${formatTime(returnArrival)}返回，晚于最晚返回${formatTime(deadline)}。`);
  const costs = [...plan.stops.map((stop) => numberValue(stop.cost)), numberValue(plan.otherCost)];
  const subtotal = costs.reduce((sum, value) => sum + (value ?? 0), 0);
  const budget = numberValue(plan.budget), completeCosts = costs.every((cost) => cost !== null);
  if (!completeCosts) pending.push('费用尚未填全；门票、餐饮、交通的实际价格需另行确认。');
  if (budget !== null && subtotal > budget) conflicts.push(`已填费用${subtotal}元超过总预算${budget}元。`);
  pending.push('各地点出行日开放、预约、费用与公共交通班次仍需行前确认。');
  return { timeline, legs, returnArrival, subtotal, completeCosts, pending: [...new Set(pending)], conflicts };
}
export function scenePlan(scene, previous = emptyPlan()) {
  // Demo designs retain the user's constraints. No date, party size or price is invented.
  const next = { ...previous, routes: {}, goal: previous.goal || '理解一个溧水文化知识点', mode: previous.mode || 'transit', weatherCondition: scene === 'rain' ? 'rain' : '', stops: [] };
  next.stops = (scene === 'rain' ? ['n_zy', 's_hl'] : ['n_tsq', 's_tj']).map(createStop);
  return next;
}
export function exportPlan(plan) {
  const result = calculatePlan(plan);
  const lines = ['我的溧水一日行程（规划草稿）', `日期：${plan.date || '未确定'} · ${transportNames[plan.mode] || '交通未确定'}`, `同行：成人${plan.adults || '未确定'} / 儿童${plan.children === '' ? '未确定' : plan.children}`, `目标：${plan.goal || '未确定'}`, `出发：${plan.origin.place?.name || plan.origin.query || '未确定'} ${plan.departureTime || '时间未确定'}`, `返程：${plan.destination.place?.name || plan.destination.query || '未确定'} · 最晚${plan.returnTime || '未确定'}`];
  lines.push(`天气准备：${plan.weatherCondition === 'rain' ? '用户选择按雨天准备，不代表实际预报' : '尚未指定雨天备选条件'}`);
  if (planWeather(plan)) lines.push(`城区预报：${plan.weather.date} ${plan.weather.text} ${Math.round(plan.weather.min)}—${Math.round(plan.weather.max)}℃，${plan.weather.provider}，查询于${new Date(plan.weather.fetchedAt).toISOString()}`, `天气出处：${/^https:\/\//.test(plan.weather.sourceUrl) ? plan.weather.sourceUrl : '请查看网页天气服务的来源说明'}`);
  else lines.push('天气预报：未知或保存的预报已过期，请出发前核对。');
  for (const [index, item] of result.timeline.entries()) {
    const node = getNode(item.stop.nodeId), route = plan.routes[item.leg.key];
    lines.push(`${index + 1}. ${node.name} ${formatTime(item.arrival)}—${formatTime(item.departure)}（${item.basis}）`, `实际地点：${item.stop.place?.name || '待确认'} ${item.stop.place?.address || ''}`, `交通：${item.travel === null ? '未知' : `地图估时${item.travel}分钟`} ${route?.checkedAt ? `查询于${route.checkedAt}` : ''}`, `自填费用：${numberValue(item.stop.cost) === null ? '未知' : `${item.stop.cost}元`} ${item.stop.costNote || ''}`, `备注：${item.stop.note || '无'}`);
    for (const source of node.introductionSources || []) lines.push(`内容出处：${source.label} ${source.url}`);
    const navigation = navigationUrl(item.leg, plan.mode);
    if (navigation) lines.push(`导航：${navigation}`);
  }
  const back = result.legs.at(-1), returnNavigation = plan.stops.length && navigationUrl(back, plan.mode);
  if (returnNavigation) lines.push(`返程导航：${returnNavigation}`);
  lines.push(`预计返回：${formatTime(result.returnArrival)}`, `自填费用${result.completeCosts ? '合计' : '小计（未填全）'}：${result.subtotal}元 · 总预算：${plan.budget || '未确定'}${plan.budget === '' ? '' : '元'}`, '费用是个人规划估计；地图路线不代表出行日班次、开放或预约确认。', ...result.conflicts.map((text) => `冲突：${text}`), ...result.pending.map((text) => `待确认：${text}`), '保存在当前浏览器；清空行程可移除本地记录。');
  return lines.join('\n');
}
