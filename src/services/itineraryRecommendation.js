import { nodes, getNode } from '../data/nodes.js';
import { host } from '../data/personas.js';
import { createStop, validDate } from '../data/itinerary.js';
import { approvedQA } from '../data/presetQA.js';

const itineraryWords = /一日游|两日游|[一二两三四五六七\d]+天|游玩路线|旅游路线|旅行路线|行程|怎么玩|怎么逛|怎么安排|安排行程|路线推荐|推荐.*路线|itinerary/i;
const revisions = /^(?:那|再|改|换|继续|不去|不想去|去掉|增加|加入|带|我们|想|我想|慢|轻松|少走|多看)/;
const externalFacts = /天气|气温|预报|房价|房态|订房|住宿|酒店|民宿|入住|退房|怎么去|怎么坐|换乘|班次|末班|门票|票价|开放时间|几点开|预约|演出|展演|灯会|大龙|庙会|马灯|翻译|英文|英语|急救|报警/;
const names = node => node.name.split(/[·／/]/).filter(name => name.length > 1);
const visitable = node => ['山水', '街区'].includes(node.cat);

// 推荐是游览编排，具体票务、表演档期、天气和预订仍交给原来的证据与工具流程。
export function isItineraryRecommendation(input) {
  const question = String(input.question || '');
  if (externalFacts.test(question) || /学习|工作|健身|编程|作文|写作|虚构|小说|翻译|注册|登录|账号|账户|行程卡|保存|导出|丢失|退出/.test(question)) return false;
  const normalize = text => text.replace(/[\s，。？?!！]/g, '');
  if (approvedQA.some(qa => normalize(qa.q) === normalize(question)) || /前要准备|准备哪些|准备什么|能进入|可以进入/.test(question)) return false;
  const previous = (input.history || []).filter(message => message.role === 'user').at(-1)?.content || '';
  const trip = /溧水|旅游|游玩|旅行|游览|一日游|两日游|只有一天|没有车|无车/.test(question) || nodes.some(node => names(node).some(name => question.includes(name))) || input.serviceId === 'planning';
  return itineraryWords.test(question) && (trip || /行程|路线推荐|怎么安排/.test(question))
    || revisions.test(question) && itineraryWords.test(previous) && !externalFacts.test(previous);
}

const dayNumbers = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7 };
const periods = ['上午', '午间', '下午'];
const profiles = {
  scenery: [['n_tsq', 'f_szc', 'n_wx'], ['n_zy', 's_tj', 's_wxsz'], ['n_sj', 'f_nr', 'n_dp']],
  city: [['s_tj', 's_hl', 's_hl'], ['s_wxsz', 's_tj', 's_tj']],
  family: [['n_djs', 'f_szc', 'n_dp'], ['n_zy', 's_hl', 's_tj']],
  culture: [['n_zy', 'f_szc', 'n_tsq'], ['n_dls', 's_tj', 's_wxsz']],
  lake: [['n_sj', 'f_nr', 'n_dp'], ['n_wx', 's_tj', 's_wxsz']],
};
const profileCopy = {
  scenery: '推荐把山水与乡味放进这趟旅行，按下面的顺序慢慢逛。',
  city: '这次把活动集中在城中，少换地方，把街巷、吃饭和休息连起来。',
  family: '带孩子把游玩、吃饭和休息穿插起来，每一段留够从容体验的时间。',
  culture: '按人文兴趣来安排：看建筑与收藏，也走进山水里的历史线索。',
  lake: '这次以湖景为主，给水面和岸边风景多留一点时间。',
};
// 编辑游览动作取自各节点已审简介，不补项目、设施、具体时刻或收费。
const activities = {
  n_tsq: '把石桥、两侧岩壁与河谷连起来看，认识开河通航的历史。',
  n_wx: '选山林慢步或人文寻访，留意沿途遗址说明与石刻。',
  n_zy: '从门窗、梁柱和庭院布局看起，挑一两类雕刻或家具慢慢看。',
  n_dls: '放慢脚步看寺院建筑和山间环境，拍照遵守现场提示。',
  n_djs: '围绕展品认识国防知识，带孩子一起找一个感兴趣的学习主题。',
  s_wxsz: '沿街巷慢步，留意唐风建筑与沿水空间。',
};

export function recommendationContext(input) {
  const messages = [...(input.history || []).filter(message => message.role === 'user').map(message => message.content), input.question];
  let days = 1, durationGiven = false, month = '', profile = input.preferences?.companions === 'family' ? 'family' : input.preferences?.companions === 'seniors' || ['transit', 'walking'].includes(input.preferences?.mode) || input.preferences?.transport === 'transit' ? 'city' : 'scenery';
  const preferred = new Set(), excluded = new Set();
  for (const message of messages) {
    const duration = [...message.matchAll(/([一二两三四五六七]|[1-7])\s*(?:天|日游)/g)].at(-1)?.[1];
    if (duration) { days = dayNumbers[duration] || Number(duration); durationGiven = true; }
    const monthMatch = [...message.matchAll(/(十[一二]?|[一二三四五六七八九]|1[0-2]|[1-9])月(?:份)?/g)].at(-1)?.[0];
    if (monthMatch) month = monthMatch.replace('份', '');
    if (/亲子|孩子|带娃|研学/.test(message)) profile = 'family';
    if (/人文|历史|收藏|建筑/.test(message)) profile = 'culture';
    if (/湖景|看湖|湖畔/.test(message)) profile = 'lake';
    if (/没有车|没车|无车|公共交通|步行|老人|长辈|少走|轻松|不爬山/.test(message)) profile = 'city';
    else if (/自驾|开车/.test(message) && profile === 'city') profile = 'scenery';
    for (const node of nodes.filter(visitable)) {
      if (!names(node).some(name => message.includes(name))) continue;
      const negative = names(node).some(name => new RegExp('(?:不去|不想去|不要去|避开|去掉|删去)[^，。；！？]{0,4}' + name).test(message));
      if (negative) { excluded.add(node.id); preferred.delete(node.id); }
      else { preferred.add(node.id); excluded.delete(node.id); }
    }
  }
  const question = String(input.question || '');
  // 景点页发起的编排沿用当前地点；首页默认选中状态不替代用户明确的目的地。
  if (!preferred.size && !excluded.has(input.nodeId) && getNode(input.nodeId) && /这里|这个地方|围绕|如何安排行程/.test(question)) preferred.add(input.nodeId);
  return { days, durationGiven, month, profile, preferred: [...preferred], excluded: [...excluded] };
}

export function prepareRecommendation(input) {
  const context = recommendationContext(input);
  // 季节体验只有用户明确选中才进入候选，不从“十月”等月份推断花期或采摘。
  const candidates = nodes.filter(node => !context.excluded.includes(node.id) && (visitable(node) && (!['n_fjb', 'n_gx'].includes(node.id) || context.preferred.includes(node.id)) || ['f_szc', 'f_nr', 'f_xc', 'f_ydg'].includes(node.id))).map(node => ({
    nodeId: node.id, evidenceId: 'N:' + node.id, name: node.name, cat: node.cat,
    fact: node.introduction[0].split('。')[0] + '。', sources: node.introductionSources,
  }));
  const byId = new Map(candidates.map(candidate => [candidate.nodeId, candidate]));
  const profile = profiles[context.profile];
  const wanted = [...context.preferred];
  const slots = [];
  for (let day = 1; day <= context.days; day++) {
    const route = profile[(day - 1) % profile.length];
    for (let index = 0; index < periods.length; index++) {
      const preferred = index !== 1 && wanted.shift();
      const fallback = byId.get(preferred) || byId.get(route[index]) || candidates.find(candidate => index === 1 ? candidate.cat === '美食' || candidate.cat === '街区' : visitable(candidate));
      const cityOnly = context.profile === 'city' && !preferred;
      const allowed = candidates.filter(candidate => preferred ? candidate.nodeId === preferred : cityOnly ? candidate.cat === '街区' : index === 1 ? ['美食', '街区'].includes(candidate.cat) : visitable(candidate));
      slots.push({ day, period: periods[index], nodeId: fallback.nodeId, evidenceId: fallback.evidenceId, allowedIds: allowed.map(candidate => candidate.nodeId) });
    }
  }
  for (const [index, slot] of slots.entries()) slot.repeat = slots.slice(0, index).some(item => item.day === slot.day && item.nodeId === slot.nodeId);
  const title = `${context.month}溧水${context.days === 1 ? '一日游' : context.days + '日游'}推荐`;
  const header = title + '\n' + (context.durationGiven ? '' : '先按一天安排。') + profileCopy[context.profile] + '\n';
  return { context, candidates, slots, title, header };
}

export function recommendationParagraph(slot, candidate, { context }) {
  const prefix = context.days > 1 ? `第${slot.day}天 · ` : '';
  const meal = slot.period === '午间';
  const title = meal && candidate.cat === '美食' ? '乡味午餐 · ' + candidate.name : candidate.name;
  let advice = meal ? candidate.cat === '美食' ? '午餐推荐尝这道地方菜，吃饭后留一点休息时间。' : '把午餐和休息放在这一段，按自己的口味选择餐饮。' : candidate.nodeId === 'n_dp' || candidate.nodeId === 'n_sj' ? '在允许到达的岸边看湖，慢慢欣赏水面与远岸。' : candidate.cat === '街区' ? '留一段不赶路的时间，看看街巷和店铺。' : '围绕这里的看点慢慢游览，不用把所有地方一次逛完。';
  if (!meal && activities[candidate.nodeId]) advice = activities[candidate.nodeId];
  if (slot.repeat) advice = '继续留在这里逛逛，累了就休息，把节奏放慢。';
  return `\n${prefix}${slot.period}｜${title}\n${slot.repeat ? '' : candidate.fact}${advice}\n`;
}

export function recommendationReply(prepared, slots = prepared.slots) {
  const selected = slots.map(slot => ({ slot, candidate: prepared.candidates.find(candidate => candidate.nodeId === slot.nodeId) }));
  const sources = [...new Map(selected.flatMap(({ candidate }) => candidate.sources).map(source => [source.url, source])).values()];
  const content = prepared.header + selected.map(({ slot, candidate }) => recommendationParagraph(slot, candidate, prepared)).join('') + '\n按上午、午间、下午这个节奏走，最后留出返程时间。想换成另一种玩法，告诉我想保留或替换哪一站。';
  return { kind: 'planning', serviceId: 'planning', speaker: host, content, source: '知识库行程推荐', sources,
    evidenceGroups: [{ id: 'reviewed', title: '知识库依据', sources, note: '地点看点取自项目已审介绍；游览顺序与停留节奏是本次推荐。' }],
    recommendedPlan: { title: prepared.title, days: prepared.context.days, stops: selected.map(({ slot, candidate }) => ({ nodeId: slot.nodeId, day: slot.day, period: slot.period, note: `${slot.period}：${candidate.fact}` })) },
    links: [...new Map(selected.map(({ candidate }) => [candidate.nodeId, { label: candidate.name, url: '/nodes/' + candidate.nodeId }])).values()],
    suggest: ['改成亲子一日游', '想轻松一点，少走路', '改成两天自驾游'],
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
