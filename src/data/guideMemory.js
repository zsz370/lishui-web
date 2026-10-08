import { getNode } from './nodes.js';
import { validDate } from './itinerary.js';
import { extractTripContext } from '../services/chatContext.js';
import { dialogueContext } from '../services/conversationContext.js';
import { partyDescription, destinationStatement, hasDatePhrase, transportMode } from '../services/tripConditions.js';
import { hotelBudgetUnrestricted } from '../services/stayPreferences.js';

export const GUIDE_MEMORY_KEY = 'lishui-guide-conditions-v2';
export const guideMemoryKey = ownerId => ownerId?GUIDE_MEMORY_KEY+':account:'+ownerId:GUIDE_MEMORY_KEY;
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
export function readGuideMemory(storage, ownerId = null) {
  try { const value=JSON.parse(storage.getItem(guideMemoryKey(ownerId)) || 'null');return normalizeGuideMemory(value?.ownerId===ownerId?value:null); }
  catch { return normalizeGuideMemory(null); }
}
export function saveGuideMemory(storage, value, ownerId = null) {
  try { storage.setItem(guideMemoryKey(ownerId), JSON.stringify({...normalizeGuideMemory(value),ownerId})); return true; }
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
export function rememberGuideInput(preferences, question, node, today, history = []) {
  const current = normalizeGuidePreferences(preferences);
  const input = { question, preferences: current, history };
  const dialogue = dialogueContext(input);
  const ctx = extractTripContext(input, node||dialogue.node, today ? {today} : undefined);
  const values = { ...current }, patch = {};
  if(dialogue.task==='conversation')return{preferences:current,planPatch:patch};
  if (dialogue.correction && !ctx.destination) delete values.destination;
  if (destinationStatement(question,dialogue.task)&&ctx.destination || dialogue.correction && ctx.destination) values.destination = ctx.destination;
  if (hasDatePhrase(question) && (['planning','stay','weather'].includes(dialogue.task)||/出发|出行|计划|行程|天气|入住|退房|住.*晚/.test(question))) {
    if(ctx.weatherDate)values.weatherDate = ctx.weatherDate;else delete values.weatherDate;
    if ((dialogue.task==='planning'||/出发|出行|计划|行程/.test(question))&&ctx.weatherDate) patch.date = ctx.departureDate||ctx.weatherDate;
    if(ctx.returnDate&&/返程|返回/.test(question))patch.returnDate=ctx.returnDate;
    if (ctx.checkInDate) values.checkInDate = ctx.checkInDate;
    if (ctx.checkOutDate) values.checkOutDate = ctx.checkOutDate;
  }
  const people = partyDescription(question);
  if (people) values.companions = people;
  else if (/孩子|带娃|亲子|老人|长辈|轮椅/.test(question)) values.companions = ctx.companions;
  if (transportMode(question)) { values.mode=ctx.mode; patch.mode=ctx.mode; }
  if (/从.+出发|出发地/.test(question) && ctx.origin) { values.origin=ctx.origin; patch.origin={query:ctx.origin,city:'',place:null}; }
  const total = question.match(/(?:总预算|行程预算)\s*(\d{1,5})/) || (dialogue.task === 'planning' && !/每晚|住宿预算|酒店预算/.test(question) ? question.match(/(\d{1,5})\s*(?:元以内|元以下|以内|以下)/) : null);
  if (total) patch.budget=total[1];
  else if (ctx.maxPrice != null && /每晚|住宿预算|酒店预算|元以内|预算/.test(question)) values.budget=String(ctx.maxPrice);
  if(hotelBudgetUnrestricted(question))delete values.budget;
  return { preferences: normalizeGuidePreferences(values), planPatch: patch };
}
export function snapshotGuideRequest(value) {
  return { question: value.question, nodeId:value.nodeId, serviceId:value.serviceId, expertId:value.expertId, preferences:{...normalizeGuidePreferences(value.preferences)}, history:(value.history||[]).map(({role,content})=>({role,content})) };
}
