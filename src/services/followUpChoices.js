import { validDate } from '../data/itinerary.js';
export const shanghaiDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const shiftDate = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);

// 选项只代表游客可选择的条件，不是票价、房价或设施事实，也不改变 needs_input 的判定。
export function followUpChoices(serviceId, ctx = {}, input = {}, today = shanghaiDate()) {
  const preferences = input.preferences || {};
  const text = [...(input.history || []).filter(item => item.role === 'user').map(item => item.content), input.question || ''].join('；');
  const groups = [];
  const choice = (label, question, values = {}, planPatch = {}) => ({ label, question, preferences: values, planPatch });
  if (serviceId === 'weather-location') return [{ id: 'weather-location', prompt: prompts.weatherLocation, choices: [choice('溧水城区', '改查溧水城区天气'), choice('南京城区', '改查南京城区天气')] }];
  if (serviceId === 'weather' || serviceId === 'planning' && ctx.weatherDateAssumed) {
    groups.push({ id: 'travel-date', prompt: serviceId==='weather' ? prompts.weatherDate : prompts.travelDate, custom: serviceId==='weather' ? 'weather-date' : 'travel-date', choices: [0,1,2].map((days, index) => choice(['今天','明天','后天'][index], serviceId === 'weather' ? `查询${['今天','明天','后天'][index]}的天气` : `计划${['今天','明天','后天'][index]}出发，继续安排行程`, { weatherDate: shiftDate(today, days) }, serviceId==='planning' ? { date: shiftDate(today, days) } : {})) });
  }
  if (serviceId === 'stay' && (!ctx.checkInDate || !ctx.checkOutDate)) {
    groups.push(ctx.checkInDate ? {id:'stay-checkout',prompt:prompts.stayCheckout,custom:'stay-checkout',choices:(validDate(ctx.checkInDate)?[1,2]:[]).map(days=>choice(`住${days}晚`,`退房日期改为${shiftDate(ctx.checkInDate,days)}`,{checkOutDate:shiftDate(ctx.checkInDate,days)}))} : ctx.checkOutDate ? {id:'stay-date',prompt:prompts.stayDate,custom:'stay-date',checkOutDate:ctx.checkOutDate,choices:(validDate(ctx.checkOutDate)?[2,1]:[]).map(days=>{const date=shiftDate(ctx.checkOutDate,-days);return choice(`${date}入住`,`${date}入住`,{checkInDate:date,checkOutDate:ctx.checkOutDate});})} : { id: 'stay-date', prompt: prompts.stayDate, custom: 'stay-date', choices: [1,2].map((days, index) => choice(['明天住一晚','后天住一晚'][index], `${['明天','后天'][index]}入住，住一晚`, { checkInDate: shiftDate(today, days), checkOutDate: shiftDate(today, days+1) })) });
  }
  if (['planning','stay'].includes(serviceId) && !preferences.companions && !/\d+\s*(?:个?人|位)|[一二两三四五六七八九十]+\s*(?:个?人|位)|带娃|孩子|亲子|长辈|老人|轮椅/.test(text)) {
    groups.push({ id: 'companions', prompt: prompts.companions, choices: ['1人','2人','3人以上'].map(label => choice(label, `${label}出行，继续${serviceId === 'stay' ? '找住宿' : '规划行程'}`, { companions: label })) });
  }
  if (serviceId === 'stay' && !ctx.maxPrice) groups.push({ id: 'stay-budget', prompt: prompts.stayBudget, custom: 'stay-budget', choices: [300,600].map(value => choice(`${value}元以内`, `住宿每晚${value}元以内`, { budget: String(value) })) });
  if (serviceId === 'planning' && !/总预算\s*\d+|行程预算\s*\d+/.test(text)) groups.push({ id: 'trip-budget', prompt: prompts.tripBudget, custom: 'trip-budget', choices: [500,1000].map(value => choice(`${value}元`, `行程总预算${value}元，继续规划`, {}, { budget: String(value) })) });
  if (['planning','transport'].includes(serviceId) && !ctx.origin) groups.push({ id: 'origin', prompt: prompts.origin, choices: [choice('南京南站', '从南京南站出发，继续安排行程', { origin: '南京南站' }, { origin: { query: '南京南站', city: '', place: null } }), choice('南京市区', '从南京市区出发，继续安排行程', { origin: '南京市区' }, { origin: { query: '南京市区', city: '', place: null } })] });
  if (serviceId === 'transport' && !ctx.destination) groups.push({ id: 'destination', prompt: prompts.destination, choices: ['天生桥','无想山','石臼湖'].map(name => choice(name, `想去${name}，怎么走？`, { destination: name })) });
  return groups;
}

export function customFollowUp(group, value) {
  if (group.custom === 'stay-checkout') return {question:`退房日期改为${value}`,preferences:{checkOutDate:value}};
  if (group.custom === 'weather-date') return { question: `查询${value}的天气`, preferences: { weatherDate: value } };
  if (group.custom === 'travel-date') return { question: `${value}出发，继续规划行程`, preferences: { weatherDate: value }, planPatch: { date: value } };
  if (group.custom === 'stay-date') return { question: group.checkOutDate ? `${value}入住` : `${value}入住，住一晚`, preferences: { checkInDate: value, checkOutDate: group.checkOutDate || shiftDate(value, 1) } };
  if (group.custom === 'stay-budget') return { question: `住宿每晚${value}元以内`, preferences: { budget: value } };
  return { question: `行程总预算${value}元，继续规划`, planPatch: { budget: value } };
}
import { agentPersona } from '../data/agentPersona.js';
const prompts = agentPersona.followUp.prompts;
