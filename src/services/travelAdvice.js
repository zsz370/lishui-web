import { getPersona } from '../data/personas.js';
import { getTravelService, recommendStays, serviceSources, stayDefaults } from '../data/travelServices.js';
import { getWeather, selectWeatherDay, weatherText, weatherAdvice } from './weather.js';
import { extractTripContext, stayOverview, transportOverview } from './chatContext.js';
import { followUpChoices } from './followUpChoices.js';
import { routingText } from './tripConditions.js';
import { hotelSearchIntent } from './stayPreferences.js';

const rules = [
  ['support', /丢失|丢了|遗失|失物|投诉|退票|退改|退款|求助|报警|急救|发票|厕所|洗手间|卫生间|母婴室|lost|refund|help/i],
  ['weather', /天气|气温|温度|下雨|降雨|雨天|暴雨|雷雨|穿什么|带伞|冷不冷|热不热|weather|rain|temperature/i],
  ['stay', /住宿|住哪|住在|住一|住两|住山|住湖|酒店|民宿|订房|家庭房|亲子房|过夜|露营|stay|hotel|accommodation/i],
  ['transport', /交通|怎么去|怎么走|怎么到|怎么坐|地铁|高铁|S[179]|开车|自驾|停车|班车|接驳|机场|火车|末班|打车|换乘|train|metro|bus/i],
  ['etiquette', /礼仪|礼貌|禁忌|寺庙|寺院|拍照|英文|英语|翻译|双语|english|translate|photo|toilet/i],
  ['accessibility', /轮椅|无障碍|行动不便|坡道|老人|长辈|婴儿|推车|带娃|带孩子/],
  ['shopping', /伴手礼|特产|文创|礼物|保存|保质期|买什么|购买|消费|souvenir/i],
  ['planning', /行程|一日游|两日游|一天|两天|几天|安排|路线|怎么玩|plan|itinerary/i],
];
const emergency = /救命|晕倒|无法呼吸|严重受伤|火灾|遇险|落水|孩子走失|孩子走丢|报警|急救|emergency/i;
export function routeServices(question, fallback) {
  if (emergency.test(question)) return ['support'];
  question=routingText(question);
  let matches = rules.filter(([, pattern]) => pattern.test(question)).map(([id]) => id);
  if(hotelSearchIntent(question)&&!matches.includes('stay'))matches.unshift('stay');
  if (matches.includes('stay')) matches = matches.filter((id) => id !== 'accessibility');
  if (matches.includes('etiquette') && /英文|英语|翻译|english|translate/i.test(question) && !/丢失|丢了|投诉|退款/.test(question)) matches = matches.filter((id) => id !== 'support');
  // A rain query includes the forecast and adjustment advice in the weather response.
  if (matches.includes('weather')) matches = matches.filter((id) => id !== 'planning');
  return matches.length ? matches.slice(0, 4) : fallback ? [fallback] : [];
}

function reply(serviceId, content, extra = {}) {
  const service = getTravelService(serviceId);
  return { kind: 'service', serviceId, speaker: getPersona(service.expert), content, source: '旅途咨询参考', suggest: service.prompts, ...extra };
}
function sourced(source) { return { source: source.label, sourceUrl: source.url }; }

export function inferStayPreferences(question, base = stayDefaults) {
  const pref = { ...stayDefaults, ...base };
  if (/老人|长辈|轮椅/.test(question)) pref.companions = 'seniors';
  else if (/亲子|孩子|带娃|三口|四口/.test(question)) pref.companions = 'family';
  if (/没有车|没车|无车|公共交通|地铁/.test(question)) pref.transport = 'transit';
  else if (/自驾|开车/.test(question)) pref.transport = 'drive';
  if (/山里|山中|山居|无想山|竹海/.test(question)) pref.area = 'mountain';
  else if (/乡村|田园|村里|山凹/.test(question)) pref.area = 'rural';
  else if (/城区|市区|地铁附近/.test(question)) pref.area = 'city';
  const budget = question.replace(/(?:总预算|行程预算)\s*\d{1,5}\s*(?:元|块)?/g, '').match(/(?:预算|每晚|一晚)?\s*(\d{2,5})\s*(?:元|块)/);
  if (budget) pref.budget = Number(budget[1]) <= 300 ? '300' : Number(budget[1]) <= 600 ? '600' : 'flexible';
  return pref;
}

export function accommodationAnswer(preferences, question = '', context) {
  const candidates = recommendStays(preferences);
  const group = preferences.companions === 'seniors' ? '带长辈时，先确认电梯、浴室防滑和到门口是否要爬坡。' : preferences.companions === 'family' ? '带孩子时，提前确认床型、加床、早餐与儿童入住要求。' : '先核对入住日期、床型和目标片区。';
  const transport = preferences.transport === 'transit' ? '没有车的话，优先比较城区和地铁周边，再核对到景点的最后一段接驳。' : '自驾可以比较乡村与山居，同时确认停车和夜间返程路线。';
  const budget = context?.maxPrice ? `每晚${context.maxPrice}元以内` : question.match(/\d{2,5}\s*(?:元|块)/)?.[0] || (preferences.budget === '300' ? '每晚300元以内' : preferences.budget === '600' ? '每晚300—600元' : '你能接受的预算');
  const dates = context?.checkInDate && context?.checkOutDate ? `已记下${context.checkInDate}入住、${context.checkOutDate}退房。\n` : '';
  const followUp = dates ? '你更想住城区、乡村还是山居？也可以补充入住人数，继续缩小范围。' : '告诉我入住日期、人数和是否自驾，还能继续缩小范围。';
  return `${dates}住得舒心才是正经。${transport}\n${group}\n\n可以先比较：\n${candidates.map((candidate, index) => `${index + 1}. ${candidate.name}（${candidate.area}）：${candidate.intro}`).join('\n')}\n\n我尚未取得这些候选的实时房价、房态与设施。请按${budget}在预订渠道核价；这份排序只参考位置和出行需求，不能保证预算内有房。${followUp}`;
}

export async function answerTravelService(serviceId, question, { history = [], preferences = stayDefaults, node } = {}) {
  if (serviceId === 'weather') {
    if (/北京|上海|杭州|苏州|广州|深圳|成都|重庆|丽水|镇江|扬州|常州|无锡|南通|合肥|武汉|西安|青岛|天津|长沙|福州|宁波|黄山|东京|伦敦/.test(question)) return reply('weather', '当前天气入口覆盖南京溧水城区与南京城区。请指定这两个地点之一；“溧水”与浙江“丽水”是不同地方。');
    const previousPlace = [...history].reverse().find((message) => message.role === 'user' && /溧水|lishui|南京|nanjing/i.test(message.content))?.content || '';
    const placeContext = /溧水|lishui|南京|nanjing/i.test(question) ? question : previousPlace;
    const locationId = /溧水|lishui/i.test(placeContext) ? 'lishui' : /南京|nanjing/i.test(placeContext) ? 'nanjing' : 'lishui';
    try {
      const data = await getWeather(locationId);
      const day = selectWeatherDay(data, question);
      if (!day) return reply('weather', '请用今天、明天、后天或YYYY-MM-DD指定未来7天内的日期。更远日期先作弹性安排，临近出发再确认天气。', { source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/' });
      const rain = Number.isFinite(day.rain) ? `，最高降水概率${day.rain}%` : '';
      const adjustment = /下雨|雨天|调整|怎么办/.test(question) ? '\n雨天可先考虑室内展陈或减少户外停留，例如周园；先确认开放与预约，再决定替换哪一段行程。' : '';
      return reply('weather', `${data.location} ${day.date}：${weatherText(day.code)}，${Math.round(day.min)}—${Math.round(day.max)}℃${rain}。\n${weatherAdvice(day)}${adjustment}\n\n预报数据时间：${data.modelTime || '当前接口返回'}（北京时间）。这是城区网格预报，不能代替湖边、山间的现场判断或官方预警。`, { kind: 'weather', source: '天气数据：Open-Meteo（模型预报）', sourceUrl: 'https://open-meteo.com/' });
    } catch { return reply('weather', '天气服务暂时没有返回有效的最新数据，我无法给出当前温度或是否下雨。请稍后重试，或查看中国天气网、南京气象及景区公告；出行安排先留出雨天备选。', { kind: 'unavailable', source: '中国天气网', sourceUrl: 'https://www.weather.com.cn/' }); }
  }
  if (serviceId === 'stay') {
    const previous = history.filter((message) => message.role === 'user').slice(-3).map((message) => message.content).join('；');
    const pref = inferStayPreferences(`${previous}；${question}`, preferences);
    if (/退改|退款|取消/.test(question)) return reply('stay', '先看你的具体订单：入住日期、可取消时限、预付款和退款渠道。联系原预订平台或经营方确认；我不能替你预订、取消或承诺退款。', sourced(serviceSources.stays));
    const ctx = extractTripContext({ question, history, preferences, serviceId }, node);
    pref.transport = ctx.mode === 'driving' ? 'drive' : 'transit';
    pref.companions = ctx.companions;
    if (ctx.maxPrice) pref.budget = ctx.maxPrice <= 300 ? '300' : ctx.maxPrice <= 600 ? '600' : 'flexible';
    if (!ctx.checkInDate || !ctx.checkOutDate) return reply('stay', stayOverview(ctx), { kind: 'needs_input', ...sourced(serviceSources.stays), stayPreferences: pref, choiceGroups: followUpChoices('stay',ctx,{question,history,preferences}) });
    return reply('stay', accommodationAnswer(pref, question, ctx), { ...sourced(serviceSources.stays), stayPreferences: pref, links: [{ label: '按条件比较住宿', url: '/services?service=stay' }] });
  }
  if (serviceId === 'transport') {
    const ctx = extractTripContext({ question, history, preferences }, node);
    if (!ctx.origin || !ctx.destination) return reply('transport', transportOverview(ctx), { kind: 'needs_input', ...sourced(serviceSources.transit), choiceGroups: followUpChoices('transport',ctx,{question,history,preferences}) });
    let content = `先确认你的出发地和目的地${node ? `，当前正在看「${node.name}」` : ''}。\n高铁“溧水站”与地铁 S7“溧水站”是不同站点，搜索时请明确交通方式。\n从南京方向到溧水城区，可比较高铁到溧水站后接驳，或经机场线 S1 方向在空港新城江宁衔接 S7；具体换乘按当天线路图与列车指示安排。`;
    if (/S9|石臼湖|水上列车/i.test(question)) content = '想看跨湖列车风景，认识的是 S9 跨石臼湖路段；S7 主要服务溧水城区方向，两者不能互换。先核对你的出发站、目的地和当天运营信息，再安排换乘及到湖边的接驳。';
    if (/自驾|开车|停车/.test(question)) content = `自驾请在导航中确认「${node?.name || '你的目的地'}」的正式入口与停车场；节假日按现场指引停放。停车收费、开放车位与充电设施尚未接入实时信息，请先向景区或经营方确认。`;
    if (/末班|班次|几点|时刻|票价|多少钱/.test(question)) content += '\n我没有取得实时班次、末班车或票价。地铁查运营方公告，高铁在12306确认；不要据此把返程压到最后一班。';
    content += '\n南京地铁6号线已于2026-09-29开通，涉及S1及贯通列车调整，旧攻略中的时刻和交路可能不同。';
    return reply('transport', content, { ...sourced(serviceSources.transit), links: [{ label: '铁路12306', url: 'https://www.12306.cn/' }] });
  }
  if (serviceId === 'etiquette') {
    const phrases = /洗手间|厕所|toilet/i.test(question) ? 'Where is the restroom, please?\n请问洗手间在哪里？' : /拍照|photo/i.test(question) ? 'May I take a photo here?\n请问这里可以拍照吗？' : /求助|help/i.test(question) ? 'Could you help me, please?\n请问可以帮我一下吗？' : 'Hello, welcome to Lishui.\n你好，欢迎来到溧水。';
    return reply('etiquette', `${phrases}\n\n参观寺庙、展馆与乡村时保持安静，服装与行为遵守现场规定；拍照、录音、触摸展品或拍摄居民前先询问并征得同意。排队不插队，不堵住通道，也不要把其他地区的习俗直接当作溧水当地规则。`, sourced(serviceSources.etiquette));
  }
  if (serviceId === 'support') {
    if (emergency.test(question)) return reply('support', '如正发生紧急危险，请立即联系现场工作人员，并根据情况拨打：中国大陆公安110、医疗急救120、火警119。清楚说明所在位置与发生的情况。网页不能替你报警、呼叫救援或确认人员已到场。', sourced(serviceSources.hotlines));
    if (/丢|遗失|失物/.test(question)) return reply('support', '先联系物品最后出现的场所工作人员或游客中心，说明遗失时间、位置、物品外观与可辨认特征。贵重物品或涉嫌被盗时联系警方。这里提供流程指引，尚未向任何场所提交登记；证件号和个人联系方式请通过官方渠道提供。');
    if (/退|退款|发票/.test(question)) return reply('support', '找到订单原渠道，核对票种、使用状态、取消时限与退改条款，再联系平台或经营方处理。临时闭园时查景区公布的退改安排。发票向实际收款方申请；本网页不能代办或保证退款。');
    if (/厕所|卫生间|洗手间|母婴室/.test(question)) return reply('support', '请先说具体景区、车站或街区。可优先查看现场导览图，或询问游客中心和工作人员；母婴室、无障碍卫生间等设施的精确位置尚未逐点核实，我不会假定每个场所都有。');
    return reply('support', '先向现场工作人员或经营方说明问题，保留订单、收据和相关沟通记录。需要进一步咨询非紧急政务服务，可拨打12345；紧急危险联系110、120或119。这里提供渠道指引，尚未代你提交投诉或工单。', sourced(serviceSources.hotlines));
  }
  if (serviceId === 'accessibility') return reply('accessibility', '带长辈、孩子或轮椅出行，先向目标场所确认入口台阶、电梯、坡道、无障碍卫生间、休息点，以及接驳车是否能使用。住宿同步确认床型、浴室防滑与夜间通行。\n尽量安排同片区活动，减少折返并预留休息。我尚未逐点核实所有设施，请提供具体目的地后，再按这些项目联系场所确认。', { links: [{ label: '一起考虑住宿', url: '/services?service=stay' }] });
  if (serviceId === 'shopping') return reply('shopping', '喜欢乡味，可以比较玉带糕、云片糕等糕点；喜欢小物，可以寻找当地手艺相关文创。\n带回家前看清配料、过敏原、生产日期、保质期和保存条件，鲜果与需冷藏食品按返程时长挑选。不要默认糕点都能常温久放；包装、价格与售后由实际经营方确认，保留凭证。', { links: [{ label: '看看糕点与乡味', url: '/nodes?topic=flavors&group=sweet' }] });
  const ctx=extractTripContext({question,history,preferences,serviceId:'planning'},node);
  const context=[...history.filter(x=>x.role==='user').map(x=>x.content),question].join('；');
  const duration=[...context.matchAll(/两天一晚|两天|两日|一天|一日/g)].at(-1)?.[0];
  const days=duration?.startsWith('两')?2:duration?1:null;
  const transit=ctx.mode==='transit'&&/没有车|无车|公共交通|地铁|高铁/.test(context);
  const description=days===1?'一天时间可以围绕一个片区，安排少量喜欢的地点，留出吃饭和返程时间。':days===2?'两天一晚，可以先选落脚片区，再把两天的活动和返程衔接起来。':'先选喜欢的片区，把游玩、吃饭和休息放在一起考虑。';
  const known=ctx.origin?`从${ctx.origin}出发的条件已记下。`:'';
  const questionBack=!ctx.origin?'你准备从哪里出发？':!days?'准备来几天？':'更想看山水、尝乡味，还是听民俗故事？';
  return reply('planning',`${known}${description}${transit?'没有车的话，优先比较公共交通可达的去处，再确认最后一段接驳。':''}\n可以从天生桥的河谷、无想山的山林或周园的收藏中选一个主目的地；具体开放和预约在出发前再核对。\n${questionBack}`,{kind:'needs_input',choiceGroups:followUpChoices('planning',ctx,{question,history,preferences}),links:[{label:'看看这些地方',url:'/nodes'},{label:'整理我的行程',url:'/itinerary'}]});
}
