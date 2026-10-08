import { nodes, getNode } from './nodes.js';
import { HOST_ID } from './personas.js';
import { routeServices } from '../services/travelAdvice.js';
import { dialogueContext, followUpKnowledgeQuestion } from '../services/conversationContext.js';

export const translationIntent = /英文|英语|翻译|双语|english|translate|日语|韩语|法语/i;
const aliases = { f_ydg: ['玉带糕'], f_ypg: ['云片糕'], f_szc: ['手抓鸡'], c_tj: ['明觉铁画'] };
const namesOf = (node) => [...node.name.split(/[·／/]/), ...(aliases[node.id] || [])].filter((name) => name.length > 1);
export function focusKnowledgeQuestion(question, target, targets) {
  question=target.question||question;
  if (targets.length < 2) return question;
  let focused = question;
  for (const other of targets.filter((item) => item.node?.id !== target.node?.id)) {
    for (const name of other.node ? namesOf(other.node) : []) focused = focused.replaceAll(name, '');
  }
  return focused.replace(/(?:和|与|及)?分别/g, '').replace(/^(?:和|与|及)/, '').replace(/(?:和|与|及)(?=有|是|的)/g, '').trim();
}

export function planChat(input) {
  const question = input.question;
  const context = dialogueContext(input);
  const mentioned = context.mentioned;
  const followUp = context.continuation;
  const history = (input.history || []).filter((item) => item.role === 'user');
  const previous = context.previous || history.at(-1)?.content || '';
  const node = context.node;
  const expertId = HOST_ID;
  const literalTranslation = translationIntent.test(question) && /翻译|translate/i.test(question) && (/[“「"](.+?)[”」"]/s.test(question)||/上(?:面|一(?:条|段|个|轮))|刚才|前面|这(?:段|条|个)(?:回答|答案|内容|文字)?/.test(question)||/^(?:请|帮我)?翻译(?:一下)?(?:成(?:英文|英语|日语|韩语|法语))?[。！？\s]*$/.test(question));
  const explainsTrain = /水上列车|S9/i.test(question) && /是什么|原理|为什么|如何.*(?:过湖|跨湖)|实际.*(?:过湖|跨湖)/.test(question) && !/怎么坐|在哪坐|车票|班次|末班|换乘|出发/.test(question);
  let services = literalTranslation ? ['etiquette'] : routeServices(question, mentioned.length ? undefined : input.serviceId).filter((id) => !explainsTrain || id !== 'transport');
  if (!literalTranslation && !services.length && followUp && previous) services.push(...routeServices(previous));
  if (!literalTranslation && !services.length && followUp && getTravelContextService(context.task)) services.push(context.task);
  if (!literalTranslation && followUp && context.task === 'stay' && !/怎么去|怎么走|怎么到|换乘|末班|导航/.test(question)) services = ['stay'];
  if (context.correction && context.activeTask && context.activeTask !== 'knowledge') services = [context.activeTask];
  // A transport preference in a lodging revision is not itself a route request.
  if (!literalTranslation && /^(?:预算|日期|入住|退房|明天入住|后天入住|改成|改为)/.test(question) && routeServices(previous).includes('stay') && !/怎么去|怎么走|怎么到|换乘|末班|导航/.test(question)) {
    services = ['stay', ...services.filter((id) => !['stay', 'transport', 'accessibility'].includes(id))];
  }
  if (!literalTranslation && /行程|安排|两天一晚/.test(question) && !services.includes('planning')) services.push('planning');
  // 明确的跨日地点旅行同时检查天气、住宿和交通；“周末”不会被补成具体日期。
  if (!literalTranslation && node && /两天|两日|两天一晚|[2-9]天|[2-9]日/.test(question) && services.includes('planning')) {
    services = [...new Set([...services, 'weather', 'stay', 'transport'])];
  }
  if(services.includes('planning') && /自驾|没有车|无车|公共交通/.test(question) && !/怎么去|怎么走|怎么到|换乘|末班|导航|路线|交通/.test(question)) services=services.filter(id=>id!=='transport');
  if (translationIntent.test(question) && !services.includes('etiquette')) services.push('etiquette');
  const needKnowledge = !literalTranslation && !context.correction && (!services.length || (services.includes('planning') && Boolean(node)) || /门票|票价|套票|历史|非遗|童谣|方言|糕|故事|研学|龙舞|节庆|游览|游玩|看点|介绍|参观/.test(question));
  const knowledgeTargets = !needKnowledge ? [] : mentioned.length ? mentioned.slice(0, 3).map((item) => ({ node: item, expertId: HOST_ID, question:followUpKnowledgeQuestion(input,item) })) : [{ node, expertId, question:followUpKnowledgeQuestion(input,node) }];
  return { node, expertId, services, knowledgeTargets, literalTranslation, mentioned };
}

const getTravelContextService = id => ['stay','weather','transport','planning','etiquette','shopping','support'].includes(id);

export const taskLabels = {
  knowledge: '查阅地方资料', weather: '查询天气', stay: '查询住宿', transport: '查询交通',
  etiquette: '整理礼仪与译文', accessibility: '核对同行需求', shopping: '整理伴手礼建议',
  planning: '梳理行程条件', support: '整理求助指引', coordinator: '汇总出行安排',
  planning_summary: '整理行程建议',
};
export const taskLabel = (id) => id.startsWith('dispatch:') ? '处理出行需求' : id.startsWith('knowledge:') ? taskLabels.knowledge : taskLabels[id] || '处理问题';
