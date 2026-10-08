import { nodes, getNode } from '../data/nodes.js';
import { hasDatePhrase, dialogueTopicText } from './tripConditions.js';
import { isRecommendationMessage } from './tripPlanningState.js';
import { hotelSearchIntent, hotelPreferenceFollowUp, hotelKeywordChoice } from './stayPreferences.js';

const aliases = { f_ydg: ['玉带糕'], f_ypg: ['云片糕'], f_szc: ['手抓鸡'], c_tj: ['明觉铁画'] };
export const nodeNames = node => [...node.name.split(/[·／/]/), ...(aliases[node.id] || [])].filter(name => name.length > 1);
const social = /^(?:你好|您好|嗨|哈喽|hello|hi|hey|早安|早上好|下午好|晚上好|在吗|在不在|今天好吗|今天怎么样|你(?:今天|最近)?(?:怎么样|好吗|还好吗)|你好[，,\s]*(?:你)?(?:今天)?怎么样|谢谢|感谢|好的|收到|明白了|再见|拜拜|晚安)[呀啊呢哦啦！!，,。.?？\s]*$/i;
export const isSocialQuestion = question => social.test(String(question||'').trim());
const separateTopic = /工作|学习|考试|健身|编程|代码|函数|闭包|作文|写作|写一句|写一段|写封|写个|写首|小说|虚构|电影|音乐|注册|登录|账号|账户|行程卡|保存|导出|退出/;
const planning = /行程|一日游|两日游|[一二两三四五六七\d]+天|游玩路线|旅游路线|旅行路线|路线推荐|怎么玩|怎么逛|怎么安排|怎么串|串起来|一起逛|完整安排|替代.*(?:推荐|地方)|帮.*安排|安排.*游|只有一天|玩点(?:什么|啥)/;
const services = [
  ['stay', /住宿|住哪|住在|住一|住两|想住|酒店|民宿|订房|入住|退房|每晚|过夜|房价|房态/],
  ['weather', /天气|气温|下雨|预报|冷不冷|热不热|带伞/],
  ['transport', /怎么去|怎么走|怎么到|怎么坐|换乘|末班|导航|交通路线/],
  ['etiquette', /翻译|英文|英语|日语|韩语/],
  ['shopping', /伴手礼|特产|买什么/],
  ['support', /退款|退票|投诉|丢失|遗失|求助/],
];
export const contextCorrection = question => /(?:我|我们)(?:并)?(?:没|没有|未)(?:有)?(?:说|提|选|让|想|要求)|不是(?:这个|那里|这里|我的意思)|你(?:理解|记|弄|搞)错|不要(?:默认|替我|自行|围绕)|别(?:默认|替我|围绕)|不是.*(?:是|而是)|^(?:那|我|我们)?(?:不去|不想去|不考虑|去掉|删去|避开|换掉)/.test(question);
export const contextFragment = question => /^(?:那|这|它|再|换|改|继续|还|有没有|有吗|可以吗|怎么样|好玩吗|好吃吗|远吗|方便吗|预算|日期|入住|退房|明天|后天|今天|几位|两人|两个人|[1-9一二两三四五六七八九十]+(?:人|位)|怎么|如何|为什么|多少钱|何时|什么时候|名字|名称|历史|故事|来源|非遗|能不能|要不要|我不想|不去|去掉|增加|想|带|我们|少走|轻松)/.test(question)
  || /(?:回答|方案|安排|路线).*(?:太差|差劲|不好|不满意|重复|不合理)|(?:别|不要)这么排|换个方案|重新推荐/.test(question)
  || hasDatePhrase(question) || /\d+\s*(?:以内|以下|元|块|人|位)|自然|山水|人文|亲子|出发|无车|没车|自驾|公共交通/.test(question);

export function mentionedPlaces(question) {
  const positive = [], negative = [];
  for (const node of nodes) {
    const mentions = nodeNames(node).flatMap(name => [...String(question).matchAll(new RegExp(name, 'g'))]);
    if (!mentions.length) continue;
    const last = mentions.at(-1), before = question.slice(0, last.index).split(/[，,。；;！？!?]/).at(-1);
    const after = question.slice(last.index + last[0].length);
    const denied = /(?:不去|不想去|不要去|不考虑|不用|不要围绕|别围绕|避开|去掉|删去|不是|并非|没(?:有)?(?:说|提|选|让|想|要求))[^，,。；;！？!?]{0,18}$/.test(before)
      || /^(?:就)?(?:不去|不要|去掉|删去|换成|改成|替换成|换为)/.test(after);
    (denied ? negative : positive).push(node);
  }
  const position=node=>Math.min(...nodeNames(node).map(name=>question.indexOf(name)).filter(index=>index>=0));
  return { positive:positive.sort((a,b)=>position(a)-position(b)), negative };
}

export function referencePlaces(input) {
  const question=String(input.question||'');
  if(!/它|那(?:里|边|个)|这(?:里|处|个|两处|两站|几个|俩)|刚才提到|第[一二三123](?:个|处|站)|上午那个|下午那个/.test(question))return[];
  const previous=(input.history||[]).filter(item=>['expert','assistant'].includes(item.role)&&!item.incomplete).at(-1)?.content||'';
  const candidates=mentionedPlaces(previous).positive;
  const order=question.match(/第([一二三123])(?:个|处|站)/)?.[1];
  if(order){const node=candidates[({一:1,二:2,三:3}[order]||Number(order))-1];return node?[node]:[];}
  if(candidates.length===1)return candidates;
  return candidates;
}
export function followUpKnowledgeQuestion(input,node) {
  const question=String(input.question||''),context=dialogueContext(input);
  if(!node||/门票|票价|开放|历史|名字|传说|看点|非遗|怎么吃|怎么做|天然|人工/.test(question))return question;
  if(!/呢|再|详细|具体|展开|它|那个/.test(question)||context.task!=='knowledge')return question;
  const previous=(input.history||[]).filter(item=>item.role==='user'&&/门票|票价|历史|名字|传说|看点|非遗|怎么吃|怎么做|天然|人工/.test(item.content)).at(-1)?.content;
  if(!previous)return question;
  let dimension=previous;
  for(const candidate of nodes)for(const name of nodeNames(candidate))dimension=dimension.replaceAll(name,'');
  return node.name+'，'+dimension.replace(/^(?:那|这个|它)/,'');
}

function taskOf(text) {
  text=dialogueTopicText(text);
  if (social.test(text.trim())) return undefined;
  if(hotelSearchIntent(text))return 'stay';
  if (separateTopic.test(text) && !/门票|住宿|酒店|天气|怎么去/.test(text)) return 'conversation';
  const service = services.find(([, pattern]) => pattern.test(text));
  if (service) return service[0];
  if(/门票|票价|历史|名字|传说|非遗|看点|天然|人工|怎么吃|怎么做/.test(text)&&!planning.test(text))return'knowledge';
  if (planning.test(text) || /(?:旅游|旅行|游玩|溧水|景点).*(?:推荐|安排)|(?:推荐|安排).*(?:旅游|旅行|游玩|溧水|景点)/.test(text)) return 'planning';
  if (mentionedPlaces(text).positive.length || /旅游|旅行|游玩|景点|溧水|南京|民俗|非遗/.test(text)) return 'knowledge';
  return undefined;
}
const replacesPlace=(text,places)=>places.length===1&&nodeNames(places[0]).some(name=>new RegExp('^(?:那|再|请|我想|我要)?(?:换成|改成|改去|换去)\\s*(?:去)?'+name).test(text));

// Assistant prose can explain a choice, but never establishes a user's destination or preference.
export function dialogueContext(input) {
  const history = (input.history || []).filter(item => item.role === 'user' && !item.incomplete);
  let activeTask, previous = '', lastPlace;
  const excluded = new Set();
  for (const { content } of history) {
    const mentions = mentionedPlaces(content);
    if(replacesPlace(content,mentions.positive)&&lastPlace&&lastPlace.id!==mentions.positive[0].id)excluded.add(lastPlace.id);
    for (const node of mentions.negative) { excluded.add(node.id); if (lastPlace?.id === node.id) lastPlace = undefined; }
    for (const node of mentions.positive) { excluded.delete(node.id); lastPlace = node; }
    if (contextCorrection(content)) continue;
    const task = taskOf(content);
    if (task === 'conversation') { activeTask = undefined; previous = ''; lastPlace = undefined; continue; }
    if (task) { activeTask = task; previous = content; }
  }
  const question = String(input.question || ''), mentions = mentionedPlaces(question);
  if(replacesPlace(question,mentions.positive)&&lastPlace&&lastPlace.id!==mentions.positive[0].id)excluded.add(lastPlace.id);
  for (const node of mentions.negative) { excluded.add(node.id); if (lastPlace?.id === node.id) lastPlace = undefined; }
  for (const node of mentions.positive) excluded.delete(node.id);
  const correction = contextCorrection(question);
  let currentTask = correction && !/酒店|住宿|天气|怎么去|行程|推荐/.test(question) ? undefined : taskOf(question);
  if(activeTask==='stay'&&hotelPreferenceFollowUp(question)&&!social.test(question.trim()))currentTask='stay';
  const conditionOnly = !/历史|名字|由来|为什么|是什么|是谁|看点|介绍|非遗|名录|门票|设施/.test(question)
    && (contextFragment(question) || mentions.positive.length);
  if (activeTask && currentTask === 'knowledge' && conditionOnly) currentTask = undefined;
  const independent = currentTask === 'conversation';
  const continuation = !social.test(question.trim()) && !independent && Boolean(activeTask || input.serviceId || input.nodeId)
    && (correction || contextFragment(question) || conditionOnly || activeTask==='stay'&&(hotelPreferenceFollowUp(question)||hotelSearchIntent(question)) || /^(?:有什么推荐|推荐一下|推荐几个|安排一下)[？?。\s]*$/.test(question));
  const task = independent ? 'conversation' : currentTask || (continuation ? activeTask || input.serviceId || 'knowledge' : undefined);
  const scoped = getNode(input.nodeId);
  const references=referencePlaces(input).filter(place=>!excluded.has(place.id));
  const node = mentions.positive[0] || (references.length===1?references[0]:undefined) || (continuation ? lastPlace : undefined) || (scoped && !excluded.has(scoped.id) ? scoped : undefined);
  return { task, activeTask, previous, continuation, correction, mentioned: mentions.positive, rejected: mentions.negative, excluded: [...excluded], node, references };
}

// Keep real user anchors inside the existing six-message request limit; never manufacture user history.
export function requestHistory(history, input) {
  const complete = (history || []).filter(item => !item.incomplete && ['user', 'expert', 'assistant'].includes(item.role));
  const context=dialogueContext({...input,history:complete});
  if(!context.task||context.task==='conversation'){
    const followUp=/^(?:那|这|它|再|换|改|继续|把|更|短|长|自然|口语|上面|上一|刚才|别|不要|不用|不必)/;
    if(!followUp.test(input.question||''))return complete.slice(-6);
    const anchor=complete.findLast(item=>item.role==='user'&&!social.test(item.content.trim())&&!followUp.test(item.content)&&[undefined,'conversation'].includes(taskOf(item.content)));
    if(!anchor)return complete.slice(-6);
    let socialTurn=false;
    const taskTurns=complete.slice(complete.indexOf(anchor)).filter(item=>{if(item.role==='user')socialTurn=social.test(item.content.trim());return!socialTurn;});
    return[anchor,...taskTurns.filter(item=>item!==anchor).slice(-5)];
  }
  if(complete.length<=6)return complete.slice(-6);
  const users=complete.filter(item=>item.role==='user'&&!social.test(item.content.trim())),selected=new Set();
  const topic=users.findLast(item=>planning.test(item.content));
  const active=users.findLast(item=>item.content===context.previous);
  if(context.task==='stay'){
    const keep=predicate=>{const item=users.findLast(predicate);if(item&&selected.size<5)selected.add(item);};
    keep(item=>hotelKeywordChoice(item.content)!==undefined);
    keep(item=>/评分|评价/.test(item.content));
    keep(item=>/预算|每晚|房价/.test(item.content)&&!/总预算|行程预算/.test(item.content));
    keep(item=>/入住|退房|住.*(?:晚|夜)/.test(item.content)&&hasDatePhrase(item.content));
    if(active&&selected.size<5)selected.add(active);
    for(const item of [...users].reverse())if(selected.size<5)selected.add(item);
    const answer=complete.findLast(item=>item.role!=='user');if(answer&&selected.size<6)selected.add(answer);
    return complete.filter(item=>selected.has(item)).slice(-6);
  }
  if(topic)selected.add(topic);if(active)selected.add(active);
  const occasion=users.findLast(item=>/国庆/.test(item.content));
  if(occasion && selected.size<4)selected.add(occasion);
  const corrections=users.filter(item=>contextCorrection(item.content)||/不去|去掉|換成|换成|改去|换为/.test(item.content));
  for(const item of corrections.slice(-2))if(selected.size<4)selected.add(item);
  for(const item of [...users].reverse())if(selected.size<4)selected.add(item);
  const assistants=complete.filter(item=>item.role!=='user');
  const reference=(context.task==='planning'&&assistants.findLast(isRecommendationMessage)) || assistants.findLast(item=>mentionedPlaces(item.content).positive.length>0);
  if(reference)selected.add(reference);
  for(const item of [...assistants].reverse())if(selected.size<6)selected.add(item);
  return complete.filter(item=>selected.has(item)).slice(-6);
}
