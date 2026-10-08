const todayInShanghai = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const plusDays = (date, count) => new Date(Date.parse(`${date}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);

// Only user messages and explicit form values can fill conditions. Assistant output is not user intent.
export function extractTripContext(input, node, { today = todayInShanghai(), addDays = plusDays } = {}) {
  const preferences = input.preferences || {};
  const messages = [...(input.history || []).filter((item) => item.role === 'user').map((item) => item.content), input.question];
  const context = messages.join('；');
  let checkInDate = preferences.checkInDate, checkOutDate = preferences.checkOutDate;
  let origin = preferences.origin || undefined, destination = preferences.destination || undefined, maxPrice = /^\d+$/.test(preferences.budget || '') ? Number(preferences.budget) : undefined;
  let weatherDate = preferences.weatherDate || undefined, location, mode = ['walking', 'driving', 'transit'].includes(preferences.mode) ? preferences.mode : preferences.transport === 'drive' ? 'driving' : 'transit';
  for (const message of messages) {
    const explicit = message.match(/20\d{2}-\d{2}-\d{2}/g) || [];
    const relative = /后天/.test(message) ? 2 : /明天/.test(message) ? 1 : /今天|今晚/.test(message) ? 0 : null;
    const date = explicit.at(-1) || (relative !== null ? addDays(today, relative) : undefined);
    if (date) weatherDate = date;
    if (explicit.length >= 2) { checkInDate = explicit.at(-2); checkOutDate = explicit.at(-1); }
    else if (date && /退房/.test(message) && !/入住/.test(message)) checkOutDate = date;
    else if (date && (/入住|住宿|住一晚|住\d+晚|酒店|民宿|订房|两天一晚/.test(message) || input.serviceId === 'stay')) checkInDate = date;
    const trip = message.match(/从([^，,。？?；]{2,30}?)(?:怎么去|怎么到|去|到|前往)([^，,。？?；]{2,30}?)(?:[，,。？?；]|$)/);
    if (trip && !/^(?:最方便|方便|那里|那边|这里|目的地|更好|合适)/.test(trip[2])) { origin = trip[1].replace(/(?:自驾|开车|坐公交|坐地铁|步行)$/, '').trim(); destination = trip[2].trim(); }
    else {
      const start = message.match(/(?:从|出发地(?:是|为|改为|改成|：|:)?)([^，,。？?；]{2,25}?)(?:出发|[，,。？?；]|$)/);
      if (start) origin = start[1].trim();
    }
    const budget = /总预算|行程预算/.test(message) && !/每晚|住宿预算|酒店预算/.test(message) ? undefined : message.match(/(?:预算|每晚)?\s*(\d{1,5})\s*(?:元|块)/g)?.at(-1)?.match(/\d+/)?.[0];
    if (budget) maxPrice = Number(budget);
    if (/公共交通|地铁|公交|无车|没有车/.test(message)) mode = 'transit';
    else if (/自驾|开车/.test(message)) mode = 'driving';
    else if (/步行|走路/.test(message)) mode = 'walking';
    if (/溧水|lishui/i.test(message)) location = 'lishui';
    else if (/南京(?:城区|市区|天气)/.test(message)) location = 'nanjing';
  }
  const duration = [...context.matchAll(/两天一晚|住一晚|住宿一晚|(?:住|住宿)(\d{1,2})晚/g)].at(-1);
  if (checkInDate && duration && !/退房/.test(input.question) && !(input.question.match(/20\d{2}-\d{2}-\d{2}/g)?.length >= 2)) checkOutDate = addDays(checkInDate, Number(duration[1] || 1));
  destination = node?.name?.split('·')[0] || destination;
  const quoted = input.question.match(/[“「"](.+?)[”」"]/s)?.[1];
  return { checkInDate, checkOutDate, maxPrice, origin, destination,
    weatherDate: weatherDate || today, weatherDateAssumed: !weatherDate, location: location || 'lishui', locationAssumed: !location && !node,
    mode,
    to: /日语/.test(input.question) ? 'jp' : /韩语/.test(input.question) ? 'kor' : /法语/.test(input.question) ? 'fra' : 'en',
    translationText: quoted || input.question.replace(/^.*?(?:翻译成(?:英文|英语|日语|韩语|法语)|翻译|translate)[:：\s]*/i, '').trim(),
    companions: /老人|长辈|轮椅/.test(context) ? 'seniors' : /孩子|带娃|亲子/.test(context) ? 'family' : 'general',
  };
}

export function stayOverview(ctx) {
  const remembered = [ctx.checkInDate && `${ctx.checkInDate}入住`, ctx.checkOutDate && `${ctx.checkOutDate}退房`, ctx.maxPrice && `每晚${ctx.maxPrice}元以内`, ctx.destination && `围绕${ctx.destination}`].filter(Boolean);
  const missing = [!ctx.checkInDate && '入住日期', !ctx.checkOutDate && '退房日期'].filter(Boolean);
  return `${remembered.length ? `已记下：${remembered.join('，')}。\n` : ''}住宿先比较想游玩的片区，再核对到景点的接驳。${ctx.companions === 'family' ? '带孩子时核对床型、早餐和入住人数。' : ctx.companions === 'seniors' ? '带长辈或轮椅时确认电梯、台阶和浴室条件。' : ''}\n尚未按完整日期查询房价或房态。${missing.length ? `请补充${missing.join('和')}。` : '按这些条件继续查住宿吗？'}`;
}

export function transportOverview(ctx) {
  return `${ctx.origin ? `出发地已记下：${ctx.origin}。` : ''}${ctx.destination ? `目的地已记下：${ctx.destination}。` : ''}\n两端地点还没齐，暂不能给完整路线、班次或费用。\n${!ctx.destination && !ctx.origin ? '想去哪里，从哪里出发？' : !ctx.destination ? '想去哪个目的地？' : '从哪里出发？'}`;
}
