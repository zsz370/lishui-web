const todayInShanghai = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const plusDays = (date, count) => new Date(Date.parse(`${date}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
import { dialogueContext, mentionedPlaces } from './conversationContext.js';
import { companionProfile, destinationStatement, explicitDates, relativeDate, hasDatePhrase, transportMode, namedDates, routingText, tripDuration } from './tripConditions.js';
import { translationText } from './translationContext.js';
import { extractHotelPreferences, hotelBudgetUnrestricted } from './stayPreferences.js';

// Only user messages and explicit form values can fill conditions. Assistant output is not user intent.
export function extractTripContext(input, node, { today = todayInShanghai(), addDays = plusDays } = {}) {
  const preferences = input.preferences || {};
  const dialogue = dialogueContext(input);
  const messages = [...(input.history || []).filter((item) => item.role === 'user').map((item) => item.content), input.question];
  const context = messages.join('；');
  let checkInDate = preferences.checkInDate, checkOutDate = preferences.checkOutDate;
  let origin = preferences.origin || undefined, destination = preferences.destination || undefined, maxPrice = /^\d+$/.test(preferences.budget || '') ? Number(preferences.budget) : undefined;
  let weatherDate = preferences.weatherDate || undefined, dateUnclear=false, departureDate, returnDate, tripBudget, location, mode = ['walking', 'driving', 'transit'].includes(preferences.mode) ? preferences.mode : preferences.transport === 'drive' ? 'driving' : 'transit';
  let activeStay = false, activePlanning = false;
  for (const [index, message] of messages.entries()) {
    const purpose=routingText(message),messageTask=dialogueContext({question:message,history:messages.slice(0,index).map(content=>({role:'user',content}))}).task;
    if ((/行程|一日游|两日游|路线推荐|游玩路线/.test(purpose) || tripDuration(purpose)) && !/酒店|住宿|民宿|订房|入住|退房/.test(purpose)) {activeStay = false;activePlanning = true;}
    if (/酒店|住宿|民宿|订房|入住|退房|想住|住哪|住在|住一|住两/.test(purpose)) {activeStay = true;activePlanning = false;}
    if (index === messages.length - 1 && (input.serviceId === 'stay' || dialogue.task === 'stay')) activeStay = true;
    const explicit = explicitDates(message);
    const date = explicit.at(-1) || relativeDate(message,today,addDays);
    if (date) {weatherDate = date;dateUnclear=false;}
    else if(hasDatePhrase(message)){weatherDate=undefined;dateUnclear=true;}
    if (date && (/出发|出行|计划|行程/.test(message)||messageTask==='planning')&&!/返程|返回/.test(message)) departureDate = date;
    if (explicit.length >= 2 && activeStay) { checkInDate = explicit.at(-2); checkOutDate = explicit.at(-1); }
    else if (date && /退房/.test(message) && !/入住/.test(message)) checkOutDate = date;
    else if (date && (/入住|住宿|住一晚|住\d+晚|酒店|民宿|订房|两天一晚/.test(message) || activeStay)) checkInDate = date;
    const labelled=namedDates(message,today,addDays);
    if(labelled.departureDate){departureDate=labelled.departureDate;weatherDate=departureDate;}
    if(labelled.returnDate)returnDate=labelled.returnDate;
    if(labelled.checkInDate&&(explicit.length<2||explicit.includes(labelled.checkInDate)))checkInDate=labelled.checkInDate;
    if(labelled.checkOutDate&&(explicit.length<2||explicit.includes(labelled.checkOutDate)))checkOutDate=labelled.checkOutDate;
    const places = mentionedPlaces(message);
    if (places.negative.some(place => place.name.split('·')[0] === destination || place.name === destination)) destination = undefined;
    if (places.positive.length && destinationStatement(message,messageTask)) destination = places.positive[0].name.split('·')[0];
    const trip = message.match(/从([^，,。？?；]{2,30}?)(?:怎么去|怎么到|去|到|前往)([^，,。？?；]{2,30}?)(?:[，,。？?；]|$)/);
    if (trip && !/^(?:最方便|方便|那里|那边|这里|目的地|更好|合适)/.test(trip[2])) { origin = trip[1].replace(/(?:自驾|开车|坐公交|坐地铁|步行)$/, '').trim(); destination = trip[2].trim(); }
    else {
      const start = message.match(/(?:从|出发地(?:是|为|改为|改成|：|:)?)([^，,。？?；]{2,25}?)(?:出发|[，,。？?；]|$)/);
      if (start) origin = start[1].trim();
    }
    const budget = /总预算|行程预算/.test(message) && !/每晚|住宿预算|酒店预算/.test(message) ? undefined : message.match(/(?:预算|每晚)?\s*(\d{1,5})\s*(?:元|块|以内|以下)/g)?.at(-1)?.match(/\d+/)?.[0];
    if (budget && (activeStay || /每晚|住宿预算|酒店预算/.test(message))) maxPrice = Number(budget);
    if(hotelBudgetUnrestricted(message))maxPrice=undefined;
    const total = message.match(/(?:总预算|行程预算)\s*(\d{1,5})/) || (activePlanning && !/每晚|住宿预算|酒店预算/.test(message) ? message.match(/(\d{1,5})\s*(?:元以内|元以下|以内|以下)/) : null);
    if (total) tripBudget = Number(total[1]);
    mode = transportMode(message)||mode;
    if (/溧水|lishui/i.test(message)) location = 'lishui';
    else if (/南京(?:城区|市区|天气)/.test(message)) location = 'nanjing';
  }
  const duration = messages.map(tripDuration).filter(Boolean).at(-1);
  if (duration?.nightsGiven && duration.nights && departureDate && !checkInDate) checkInDate = departureDate;
  if (checkInDate && duration?.nights && !/退房/.test(input.question) && !(explicitDates(input.question).length >= 2)) checkOutDate = addDays(checkInDate, duration.nights);
  if (departureDate && duration && !returnDate) returnDate = addDays(departureDate, duration.days - 1);
  if (dialogue.excluded.some(id => mentionedPlaces(destination || '').positive.some(place => place.id === id))) destination = undefined;
  if (!destination && node && !dialogue.excluded.includes(node.id) && /这里|附近|周边|那边|围绕/.test(input.question) && !dialogue.correction) destination = node.name.split('·')[0];
  const hotelPreference=extractHotelPreferences(input);
  if(hotelPreference.maxPrice!=null)maxPrice=hotelPreference.maxPrice;
  if(hotelPreference.budgetCleared)maxPrice=undefined;
  return { checkInDate, checkOutDate, maxPrice, hotelPreference, origin, destination, departureDate, returnDate, tripBudget,
    weatherDate: dateUnclear?'':weatherDate || today, weatherDateAssumed: !weatherDate && !dateUnclear, location: location || 'lishui', locationAssumed: !location && !node,
    mode,
    to: /日语/.test(input.question) ? 'jp' : /韩语/.test(input.question) ? 'kor' : /法语/.test(input.question) ? 'fra' : 'en',
    translationText: translationText(input),
    correction: dialogue.correction,
    companions: companionProfile(preferences.companions,messages),
  };
}

export function stayOverview(ctx) {
  const remembered = [ctx.departureDate && !ctx.checkInDate && `${ctx.departureDate}出发`, ctx.tripBudget && `这趟总预算${ctx.tripBudget}元`, ctx.checkInDate && `${ctx.checkInDate}入住`, ctx.checkOutDate && `${ctx.checkOutDate}退房`, ctx.maxPrice && `每晚${ctx.maxPrice}元以内`, ctx.destination && `围绕${ctx.destination}`].filter(Boolean);
  const missing = [!ctx.checkInDate && '入住日期', !ctx.checkOutDate && '退房日期'].filter(Boolean);
  return `${ctx.correction ? '明白，已更正地点条件。\n' : ''}${remembered.length ? `已记下：${remembered.join('，')}。\n` : ''}${ctx.destination ? `找${ctx.destination}附近的住宿，先按日期筛选，再比较到景点的接驳。` : '可以比较溧水城区、乡村和山居，结合想去的地点选择接驳方便的片区。'}${ctx.companions === 'family' ? '带孩子时核对床型、早餐和入住人数。' : ctx.companions === 'seniors' ? '带长辈或轮椅时确认电梯、台阶和浴室条件。' : ''}\n${missing.length ? `请补充${missing.join('和')}，我继续找酒店。` : '我按这些条件继续找酒店。'}`;
}

export function transportOverview(ctx) {
  return `${ctx.origin ? `出发地已记下：${ctx.origin}。` : ''}${ctx.destination ? `目的地已记下：${ctx.destination}。` : ''}\n两端地点还没齐，暂不能给完整路线、班次或费用。\n${!ctx.destination && !ctx.origin ? '想去哪里，从哪里出发？' : !ctx.destination ? '想去哪个目的地？' : '从哪里出发？'}`;
}
