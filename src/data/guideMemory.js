import { getNode } from './nodes.js';
import { validDate } from './itinerary.js';
import { extractTripContext } from '../services/chatContext.js';

export const GUIDE_MEMORY_KEY = 'lishui-guide-conditions-v1';
const keys = ['budget','companions','transport','area','checkInDate','checkOutDate','weatherDate','origin','destination','mode'];
export function normalizeGuidePreferences(raw = {}) {
  const result = {};
  for (const key of keys) {
    if (typeof raw?.[key] !== 'string') continue;
    const value = raw[key].trim().slice(0, ['origin','destination'].includes(key) ? 120 : 40);
    if (!value || /Date$/.test(key) && !validDate(value)) continue;
    if (key === 'mode' && !['walking','driving','transit'].includes(value)) continue;
    result[key] = value;
  }
  return result;
}
export function normalizeGuideMemory(raw) {
  return { version: 1, preferences: normalizeGuidePreferences(raw?.version === 1 ? raw.preferences : {}), draft: raw?.version === 1 && typeof raw.draft === 'string' ? raw.draft.slice(0,1000) : '' };
}
export function readGuideMemory(storage) {
  try { return normalizeGuideMemory(JSON.parse(storage.getItem(GUIDE_MEMORY_KEY) || 'null')); }
  catch { return normalizeGuideMemory(null); }
}
export function saveGuideMemory(storage, value) {
  try { storage.setItem(GUIDE_MEMORY_KEY, JSON.stringify(normalizeGuideMemory(value))); return true; }
  catch { return false; }
}
export const hasGuideMemory = value => Boolean(value.draft || Object.keys(value.preferences).length);
export function planPreferences(plan) {
  return normalizeGuidePreferences({
    weatherDate: validDate(plan.date) ? plan.date : '', mode: plan.mode,
    origin: plan.origin.place?.name || plan.origin.query,
    destination: getNode(plan.stops[0]?.nodeId)?.name || plan.destination.query,
    companions: plan.adults ? `${plan.adults}位成人${plan.children ? '，'+plan.children+'位儿童' : ''}` : '',
  });
}
export function rememberGuideInput(preferences, question, node, today) {
  const current = normalizeGuidePreferences(preferences);
  const ctx = extractTripContext({ question, preferences: current, history: [] }, node, today ? {today} : undefined);
  const values = { ...current }, patch = {};
  if (/今天|明天|后天|20\d{2}-\d{2}-\d{2}/.test(question) && /出发|出行|计划|行程|天气|入住|退房|住.*晚/.test(question)) {
    values.weatherDate = ctx.weatherDate;
    if (/出发|出行|计划|行程/.test(question)) patch.date = ctx.weatherDate;
    if (ctx.checkInDate) values.checkInDate = ctx.checkInDate;
    if (ctx.checkOutDate) values.checkOutDate = ctx.checkOutDate;
  }
  const people = question.match(/(\d{1,2})\s*人(以上)?/);
  if (people) values.companions = people[1]+'人'+(people[2] || '');
  else if (/孩子|带娃|亲子/.test(question)) values.companions = 'family';
  else if (/老人|长辈|轮椅/.test(question)) values.companions = 'seniors';
  if (/公共交通|地铁|公交|没有车|无车|自驾|开车|步行|走路/.test(question)) { values.mode=ctx.mode; patch.mode=ctx.mode; }
  if (/从.+出发|出发地/.test(question) && ctx.origin) { values.origin=ctx.origin; patch.origin={query:ctx.origin,city:'',place:null}; }
  const total = question.match(/(?:总预算|行程预算)\s*(\d{1,5})/);
  if (total) patch.budget=total[1];
  else if (ctx.maxPrice != null && /每晚|住宿预算|酒店预算|元以内/.test(question)) values.budget=String(ctx.maxPrice);
  return { preferences: normalizeGuidePreferences(values), planPatch: patch };
}
export function snapshotGuideRequest(value) {
  return { question: value.question, nodeId:value.nodeId, serviceId:value.serviceId, expertId:value.expertId, preferences:{...normalizeGuidePreferences(value.preferences)}, history:(value.history||[]).map(({role,content})=>({role,content})) };
}
