import { nodes, getNode } from '../data/nodes.js';
import { host } from '../data/personas.js';
import { createStop, validDate } from '../data/itinerary.js';
import { approvedQA } from '../data/presetQA.js';
import { dialogueContext, mentionedPlaces } from './conversationContext.js';
import { transportMode, destinationStatement, routingText, partyDescription, tripDuration, explicitDates } from './tripConditions.js';
import { extractTripContext } from './chatContext.js';
import { recommendationRevision } from './tripPlanningState.js';

const itineraryWords = /一日游|两日游|[一二两三四五六七\d]+(?:天|日(?:自驾|亲子|旅游|旅行|游玩))|游玩路线|旅游路线|旅行路线|行程|怎么玩|怎么逛|怎么安排|怎么串|串起来|一起逛|完整安排|替代.*(?:推荐|地方)|安排行程|路线推荐|推荐.*路线|itinerary/i;
const revisions = /^(?:那|再|改|换|继续|不去|不想去|去掉|增加|加入|带|我们|想|我想|慢|轻松|少走|多看)/;
const externalFacts = /天气|气温|预报|房价|房态|订房|住宿|酒店|民宿|入住|退房|怎么去|怎么坐|换乘|班次|末班|门票|票价|开放时间|几点开|预约|演出|展演|灯会|大龙|庙会|马灯|翻译|英文|英语|急救|报警/;
const names = node => node.name.split(/[·／/]/).filter(name => name.length > 1);
const visitable = node => ['山水', '街区'].includes(node.cat);

// 推荐是游览编排，具体票务、表演档期、天气和预订仍交给原来的证据与工具流程。
export function isItineraryRecommendation(input) {
  const question = routingText(input.question);
  if (externalFacts.test(question) || /学习|工作|健身|编程|作文|写作|虚构|小说|翻译|注册|登录|账号|账户|行程卡|保存|导出|丢失|退出/.test(question)) return false;
  const normalize = text => text.replace(/[\s，。？?!！]/g, '');
  if (approvedQA.some(qa => normalize(qa.q) === normalize(question)) || /前要准备|准备哪些|准备什么|能进入|可以进入/.test(question)) return false;
  if (input.dialogueRoute === 'planning') return true;
  const context = dialogueContext(input);
  if(context.task==='conversation')return false;
  const previous = context.previous;
  const trip = /溧水|旅游|游玩|旅行|游览|一日游|两日游|只有一天|没有车|无车/.test(question) || nodes.some(node => names(node).some(name => question.includes(name))) || input.serviceId === 'planning';
  return itineraryWords.test(question) && (trip || context.activeTask || /行程|路线推荐|怎么安排/.test(question))
    || context.continuation && context.task === 'planning'
    || revisions.test(question) && itineraryWords.test(previous) && !externalFacts.test(previous)
    || /^(?:有什么推荐|推荐一下|推荐几个|帮我推荐(?:一下)?|帮我安排(?:一下)?|安排一下|玩点(?:什么|啥))[？?。\s]*$/.test(question) && (!context.task || ['planning','knowledge'].includes(context.task));
}

const periods = ['上午', '午间', '下午'];
const profiles = {
  scenery: [['n_tsq', 'f_szc', 'n_wx'], ['n_djs', 'f_nr', 'n_dp'], ['n_zy', 's_hl', 'n_sj']],
  city: [['s_tj', 's_hl', 's_wxsz'], ['n_zy', 'f_szc', 'n_dp']],
  family: [['n_djs', 'f_szc', 'n_dp'], ['n_zy', 's_hl', 's_wxsz']],
  culture: [['n_zy', 'f_szc', 'n_tsq'], ['n_dls', 's_tj', 's_wxsz']],
  lake: [['n_sj', 'f_nr', 's_wxsz'], ['n_djs', 's_hl', 'n_dp']],
};
const profileCopy = {
  scenery: '以人文山水为主，每天最多两个主要游览点，午餐就近解决。',
  city: '先逛城区街巷，再看文旅街区；跨日增加不同的游览主题。',
  family: '围绕展品、建筑和湖景来玩，把午餐与休息穿插进去。',
  culture: '看园林收藏、开河遗迹与寺院建筑，每站选一个主题细看。',
  lake: '以湖景为主，搭配街区或展馆，避免整趟都在不同湖边来回跑。',
};
// 编辑游览动作取自各节点已审简介，不补项目、设施、具体时刻或收费。
const activities = {
  n_tsq: '把石桥、两侧岩壁与河谷连起来看，认识开河通航的历史。',
  n_wx: '选山林慢步或人文寻访，留意沿途遗址说明与石刻。',
  n_zy: '从门窗、梁柱和庭院布局看起，挑一两类雕刻或家具慢慢看。',
  n_dls: '放慢脚步看寺院建筑和山间环境，拍照遵守现场提示。',
  n_djs: '从展品了解国防知识，选一个感兴趣的主题参观。',
  s_wxsz: '沿街巷慢步，留意唐风建筑与沿水空间。',
  s_tj: '从通济街的街边店铺开始逛，把街巷游览与城区生活连起来。',
  s_hl: '把购物或补给集中在这一站，不把商场反复排成全天的游览主题。',
  n_sj: '看开阔湖面与远岸；湖岸观景和S9车窗看湖选一种作为主体验。',
  n_dp: '在允许到达的岸边看湖，留意水面、远岸与光影。',
};

export function recommendationContext(input) {
  const messages = [...(input.history || []).filter(message => message.role === 'user').map(message => message.content), input.question];
  // 保存的交通默认值不是“只逛城区”的指令；兴趣、节奏与交通分别记录。
  let days = 1, nights = 0, durationGiven = false, month = '', holiday = '', party = input.preferences?.companions || '', pace = input.preferences?.companions === 'seniors' ? 'light' : 'normal', mode = input.preferences?.mode || '', profile = input.preferences?.companions === 'family' ? 'family' : input.preferences?.companions === 'seniors' ? 'city' : 'scenery';
  const preferred = new Set(), excluded = new Set();
  for (const [index,message] of messages.entries()) {
    const duration = tripDuration(message);
    if (duration) { days = duration.days; nights = duration.nights; durationGiven = true; }
    if (/国庆/.test(message)) holiday = '国庆';
    else if (explicitDates(message).length || /改(?:成|为).*月/.test(message)) holiday = '';
    party = partyDescription(message) || party;
    const monthMatch = [...message.matchAll(/(十[一二]?|[一二三四五六七八九]|1[0-2]|[1-9])月(?:份)?/g)].at(-1)?.[0];
    if (monthMatch) month = monthMatch.replace('份', '');
    const positive=message.replace(/(?:不喜欢|不想|不要|不带|不看|不用|不考虑)[^，。；]{0,3}(?:孩子|老人|长辈|带娃|亲子|研学|人文|历史|收藏|建筑|湖景|看湖|湖畔)/g,'');
    if(positive!==message)profile='scenery';
    if(/自然|山水|风景/.test(positive))profile='scenery';
    if (/亲子|孩子|带娃|研学/.test(positive)) profile = 'family';
    if (/人文|历史|收藏|建筑/.test(positive)) profile = 'culture';
    if (/湖景|看湖|湖畔/.test(positive)) profile = 'lake';
    if (/少走|轻松|不爬山|老人|长辈/.test(positive)) pace = 'light';
    if (/正常节奏|可以爬山|多走一点/.test(positive)) pace = 'normal';
    if ((['transit','walking'].includes(transportMode(message)) || /老人|长辈/.test(positive)) && profile === 'scenery') profile = 'city';
    else if (transportMode(message)==='driving' && profile === 'city') profile = 'scenery';
    mode = transportMode(message) || mode;
    const mentions = mentionedPlaces(message);
    for (const node of mentions.negative.filter(visitable)) { excluded.add(node.id); preferred.delete(node.id); }
    const task=dialogueContext({question:message,history:messages.slice(0,index).map(content=>({role:'user',content}))}).task;
    if(destinationStatement(message,task))for (const node of mentions.positive.filter(visitable)) { preferred.add(node.id); excluded.delete(node.id); }
  }
  const question = String(input.question || '');
  const dialogue=dialogueContext(input);
  if(itineraryWords.test(question))for(const node of dialogue.references.filter(visitable))preferred.add(node.id);
  for(const id of dialogue.excluded){excluded.add(id);preferred.delete(id);}
  // 景点页发起的编排沿用当前地点；首页默认选中状态不替代用户明确的目的地。
  if (!preferred.size && !excluded.has(input.nodeId) && getNode(input.nodeId) && /这里|这个地方|围绕|如何安排行程/.test(question)) preferred.add(input.nodeId);
  // 少走路保留亲子或人文兴趣，降低山路比重，而不是抹掉原有主题。
  if (pace === 'light' && profile === 'scenery') profile = 'city';
  return { days, nights, durationGiven, month, holiday, party, pace, mode, profile, preferred: [...preferred], excluded: [...excluded] };
}

export function prepareRecommendation(input) {
  const context = recommendationContext(input);
  const revision = recommendationRevision(input, mentionedPlaces(input.question));
  // 季节体验只有用户明确选中才进入候选，不从“十月”等月份推断花期或采摘。
  const candidates = nodes.filter(node => !context.excluded.includes(node.id) && (visitable(node) && (!['n_fjb', 'n_gx'].includes(node.id) || context.preferred.includes(node.id)) || ['f_szc', 'f_nr', 'f_xc', 'f_ydg'].includes(node.id))).map(node => ({
    nodeId: node.id, evidenceId: 'N:' + node.id, name: node.name, cat: node.cat,
    fact: node.introduction[0].split('。')[0] + '。', sources: node.introductionSources,
  }));
  const byId = new Map(candidates.map(candidate => [candidate.nodeId, candidate]));
  const profile = profiles[context.profile];
  const wanted = context.preferred.filter(id => !revision.assignments.some(item=>item.nodeId===id));
  const slots = [], plannedVisits = new Set();
  for (let day = 1; day <= context.days; day++) {
    const route = profile[(day - 1) % profile.length];
    for (let index = 0; index < periods.length; index++) {
      const assigned = revision.assignments.find(item=>item.day===day&&item.period===periods[index]);
      const retained = revision.preserve && revision.previous.find(item=>item.day===day&&item.period===periods[index]&&!context.excluded.includes(item.nodeId)&&!revision.assignments.some(assignment=>assignment.nodeId===item.nodeId&&(assignment.day!==day||assignment.period!==periods[index])));
      const preferred = index !== 1 && (assigned?.nodeId || retained?.nodeId || wanted.shift());
      const meal = index === 1;
      const eligible = candidates.filter(candidate => meal ? ['美食', '街区'].includes(candidate.cat) : visitable(candidate) && !revision.assignments.some(assignment=>assignment.nodeId===candidate.nodeId&&(assignment.day!==day||assignment.period!==periods[index])) && (context.pace !== 'light' || preferred || !['n_wx','n_dls'].includes(candidate.nodeId)));
      const available = eligible.filter(candidate => meal || !plannedVisits.has(candidate.nodeId));
      const fallback = [preferred, route[index], ...route, ...available.map(candidate => candidate.nodeId)].map(id => byId.get(id)).find(candidate => candidate && available.includes(candidate));
      if (!fallback) continue;
      // 同一天的模型候选围绕默认主题；指定目的地优先，不在任意景点间拼凑。
      const routeIds = route.filter(id => byId.has(id));
      const previousDays = slots.filter(slot => slot.day < day && slot.role === 'visit').map(slot => slot.nodeId);
      const allowedIds = preferred ? [fallback.nodeId] : meal ? eligible.map(candidate => candidate.nodeId) : [...new Set([fallback.nodeId, ...routeIds.filter(id => !previousDays.includes(id) && eligible.some(candidate => candidate.nodeId === id && visitable(candidate)))])];
      slots.push({ day, period: periods[index], role: meal ? 'meal' : 'visit', nodeId: fallback.nodeId, evidenceId: fallback.evidenceId, allowedIds });
      if (!meal) plannedVisits.add(fallback.nodeId);
    }
  }
  const eveningAssignment=revision.assignments.find(item=>item.day===1&&item.period==='晚间');
  const eveningId=eveningAssignment?.nodeId || 's_wxsz';
  const overnightNode = context.nights && !plannedVisits.has(eveningId) && byId.has(eveningId) ? byId.get(eveningId) : null;
  // 留给晚餐后的短逛，不再在后面的白天时段重复排同一街区。
  if (overnightNode) for (const slot of slots.filter(slot => slot.role === 'visit')) slot.allowedIds = slot.allowedIds.filter(id => id !== overnightNode.nodeId);
  const durationTitle = context.days === 1 ? '一日游' : context.nights ? `${context.days}天${context.nights}夜` : `${context.days}日游`;
  const title = `${context.holiday || context.month}溧水${durationTitle}${context.party && !['general','family','seniors'].includes(context.party) ? ' · '+context.party : ''}`;
  const trip=extractTripContext(input),given=[trip.departureDate&&`${trip.departureDate}出发`,context.party&&!['general','family','seniors'].includes(context.party)&&`同行${context.party}`,trip.tripBudget!=null&&`这趟总预算${trip.tripBudget}元`].filter(Boolean);
  const follow=(input.history||[]).some(item=>item.role==='user'&&itineraryWords.test(item.content));
  const header = title + '\n' + (follow?'按你刚补充的条件重新排。\n':'') + (given.length?`${given.join('，')}。\n`:'') + (context.durationGiven ? '' : '先按一天安排。') + profileCopy[context.profile] + (context.pace === 'light' ? '少走路版：游览只选一段，走累就休息，不追求全部打卡。' : '') + '\n';
  return { context, candidates, slots, title, header, overnightNode, revision };
}

// 地点与证据仍严格校验；同一景点或商圈不能反复充作新的游览站。
export function recommendationCanUse(slot, candidate, selected) {
  return Boolean(candidate && slot.allowedIds.includes(candidate.nodeId) && (slot.role === 'meal'
    ? candidate.cat !== '美食' || !selected.some(item => item.nodeId === candidate.nodeId)
    : !selected.some(item => item.role === 'visit' && item.nodeId === candidate.nodeId)));
}

export function recommendationParagraph(slot, candidate, prepared) {
  const { context } = prepared;
  const prefix = context.days > 1 ? `第${slot.day}天 · ` : '';
  if (slot.role === 'rest') return `\n${prefix}${slot.period}｜休息与自由活动\n这一段不再增加景点，留给休息、整理行李或返程。\n`;
  const meal = slot.period === '午间';
  const title = meal && candidate.cat === '美食' ? '就近午餐 · ' + candidate.name : candidate.name;
  const advice = meal ? candidate.cat === '美食' ? `在游览点周边选餐厅，不为吃饭专程绕去另一片区。菜单有${candidate.name}时可以尝尝，先问配料与份量，饭后留出休息时间。` : '把午餐、补给和休息放在这一段，吃完再开始下一站。' : activities[candidate.nodeId] || '选一个感兴趣的看点细看，把余下时间留给休息。';
  const focus = !meal && context.profile === 'family' ? candidate.nodeId === 'n_zy' ? '和孩子挑一个门窗纹样或雕刻细节，一起找找它在哪里出现。' : candidate.nodeId === 'n_djs' ? '和孩子选一个展品聊聊，不把整段变成赶项目。' : '让孩子选一个喜欢的景物，边看边聊，按体力决定何时结束。' : '';
  const light = !meal && context.pace === 'light' ? '只走自己体力能承受的一段，不安排登顶或长距离徒步。' : '';
  const night = context.nights && slot.day === 1 && slot.period === '下午' ? recommendationOvernight(prepared) : '';
  return `\n${prefix}${slot.period}｜${title}\n${advice}${focus}${light}\n${night}`;
}

export function recommendationOvernight({ context, overnightNode }) {
  const room = /3(?:人|位)|三人/.test(context.party) ? '三人优先比较核定可入住三人的家庭房；没有合适房型就选两间房，不默认双床房可以住三人。' : context.profile === 'family' ? '选房时一起比较床型、儿童入住要求与早餐，按实际同行人数订。' : '按同行人数比较房型、早餐与取消条款。';
  const evening = overnightNode ? `\n第1天 · 晚间｜${overnightNode.name}\n晚餐后留一段短逛。${activities[overnightNode.nodeId] || '选一个感兴趣的看点。'}当天开放允许时再去，累了就直接回酒店休息。` : '\n第1天 · 晚间｜晚餐与休息\n晚餐放在住宿落脚点周边，晚上不再增加远处的景点。';
  return `${evening}\n住宿建议｜溧水城区${context.nights > 1 ? '连住' + context.nights + '晚' : '住一晚'}\n建议选城区作落脚点，把晚餐与补给放在一起。${room}这是住宿选择建议，具体酒店与报价按入住日期查询。\n`;
}

export function recommendationReply(prepared, slots = prepared.slots) {
  const selected = slots.map(slot => ({ slot, candidate: prepared.candidates.find(candidate => candidate.nodeId === slot.nodeId) }));
  const sources = [...new Map([...selected.flatMap(({ candidate }) => candidate.sources), ...(prepared.overnightNode?.sources || []), ...(prepared.context.nights ? getNode('s_tj').introductionSources : [])].map(source => [source.url, source])).values()];
  const dayRoutes = Array.from({length:prepared.context.days}, (_,index) => { const visits=selected.filter(({slot})=>slot.day===index+1&&slot.role==='visit').map(({candidate})=>candidate.name);if(index===0&&prepared.overnightNode)visits.push(prepared.overnightNode.name+'（晚餐后可选）');return `第${index+1}天：${visits.length ? visits.join(' → ') : '休息与自由活动'}`; });
  const transport = prepared.context.mode === 'driving' ? '自驾把景点间移动交给导航，午餐就近，不为打卡来回折返；停车位置按景区指引选择。' : prepared.context.mode === 'transit' || prepared.context.mode === 'walking' ? '城区街巷按步行体力选择一段；跨片区用公交、地铁或打车衔接，具体班次再按出发地查询。' : '交通方式还没指定，这份先给游玩顺序；自驾按导航衔接，无车则把跨片区接驳单独查好。';
  const linkedLake = selected.some(({slot,candidate})=>candidate.nodeId==='n_djs'&&selected.some(other=>other.slot.day===slot.day&&other.candidate.nodeId==='n_dp')) ? '\n大金山国防园毗邻东屏湖，把展馆与湖景放在同一天，减少跨片区换点。' : '';
  const ending = `\n路线串联\n${dayRoutes.join('\n')}${linkedLake}\n${transport}${prepared.context.pace === 'light' ? `${prepared.context.days > 1 ? '最后一天' : ''}下午可提前结束，把返程和休息放在游览前面。` : '最后一天下午按返程时间收尾，不再额外加点。'}${prepared.context.holiday ? '\n国庆出行建议把入园安排和住宿先落实，不把未公布的节庆表演当作必看项目。' : ''}`;
  const content = prepared.header + selected.map(({ slot, candidate }) => recommendationParagraph(slot, candidate, prepared)).join('') + ending;
  const planStops = selected.filter(({slot})=>slot.role!=='rest').map(({ slot, candidate }) => ({ nodeId: slot.nodeId, day: slot.day, period: slot.period, role: slot.role, note: `${slot.period}：${activities[candidate.nodeId] || candidate.fact}` }));
  if(prepared.overnightNode)planStops.splice(planStops.findLastIndex(stop=>stop.day===1)+1,0,{nodeId:prepared.overnightNode.nodeId,day:1,period:'晚间',role:'visit',note:`晚餐后可选：${activities[prepared.overnightNode.nodeId] || '按兴趣短逛。'}按当天开放与体力选择。`});
  return { kind: 'planning', serviceId: 'planning', speaker: host, content, source: '知识库行程推荐', sources,
    evidenceGroups: [{ id: 'reviewed', title: '知识库依据', sources, note: '地点看点取自项目已审介绍；游览顺序与停留节奏是本次推荐。' }],
    recommendedPlan: { title: prepared.title, days: prepared.context.days, nights: prepared.context.nights, stops: planStops },
    links: [...new Map([...selected.map(({ candidate }) => candidate), ...(prepared.overnightNode ? [prepared.overnightNode] : [])].map(candidate => [candidate.nodeId, { label: candidate.name, url: '/nodes/' + candidate.nodeId }])).values()],
    suggest: [prepared.context.profile === 'family' ? '保留亲子主题，少走路' : '保留天数，改成亲子游', prepared.context.pace === 'light' ? '保持轻松，改成自驾' : '保留天数，想轻松一点', prepared.context.nights ? '按刚才条件找住宿' : '改成两天一夜'],
  };
}

// 采用推荐只替换站点，保留游客已填的日期、人数和预算；不虚构地点坐标、耗时与费用。
export function adoptRecommendation(recommended, previous) {
  const unique = new Map();
  for (const item of recommended.stops) {
    if (!getNode(item.nodeId)) continue;
    const note = `第${item.day}天 · ${item.note}`;
    if (unique.has(item.nodeId)) { unique.get(item.nodeId).note += `；${note}`; continue; }
    const date = validDate(previous.date) ? new Date(Date.parse(previous.date + 'T12:00:00Z') + (item.day - 1) * 86400000).toISOString().slice(0, 10) : '';
    unique.set(item.nodeId, { ...createStop(item.nodeId), date, note });
  }
  const returnDate = validDate(previous.date) ? new Date(Date.parse(previous.date + 'T12:00:00Z') + (recommended.days - 1) * 86400000).toISOString().slice(0, 10) : previous.returnDate;
  return { ...previous, goal: recommended.title, stops: [...unique.values()], routes: {}, returnDate };
}
