import { agentPersona } from '../data/agentPersona.js';
import { host } from '../data/personas.js';
import { nodes } from '../data/nodes.js';

const normalize = text => String(text || '').toLowerCase().replace(/[\s,，。.？?!！、：:~～“”"']/g, '');
const greetings = /^(?:(?:你好|您好|嗨|哈喽|hello|hi|hey|早上好|早安|下午好|晚上好|在吗|在不在|淮源姐|淮源姐姐)(?:呀|啊|呢|哦)?)+$/;
const social = /^(?:(?:你好|您好|hi|hello|淮源姐))?(?:(?:你|您)(?:今天|最近)?(?:怎么样|还好吗|好吗)|今天好吗|今天怎么样|howareyou|谢谢(?:你|您)?|感谢|多谢|辛苦了|再见|拜拜|晚安|下次聊|好的|好呀|好啊|嗯嗯?|收到|明白了|哈哈|ok|okay|你是谁|你叫什么(?:名字)?|你能做什么|你会做什么|介绍一下你自己|你是机器人吗)(?:呀|啊|呢|啦|了)?$/;
// 保护需要证据/工具的出行事实；普通问题无需进入一个“能回答的问题”白名单。
const travel = /溧水|南京|景点|景区|门票|票价|档期|非遗|酒店|住宿|民宿|交通|公交|地铁|列车|班次|演出|出游|旅行|旅游|旅途|行程|导览|天气|气温|预报|穿什么|带伞|订房|住哪|露营|自驾|停车|换乘|末班|怎么去|怎么走|怎么到|怎么坐|一日游|两日游|无障碍|轮椅|母婴室|卫生间|洗手间|厕所|寄存|伴手礼|特产|退票|退款|投诉|丢失|遗失|翻译|英文|英语|日语|韩语|虾子灯|打社火|打五件|hotel|weather|forecast|itinerary|translate|metro|refund/i;
const aliases = ['玉带糕', '云片糕', '手抓鸡', '明觉铁画', '韩熙载', '周邦彦', 'S9'];
const mentionsPlace = text => aliases.some(name => text.includes(name)) || nodes.some(node => node.name.split(/[·／/]/).some(name => name.length > 1 && text.includes(name)));
const travelFollowUp = /^(?:那|这|它|再|换|改|继续|还有|有没有|有吗|可以吗|怎么样|好玩吗|好吃吗|远吗|方便吗|预算|日期|入住|退房|明天|后天|今天|几位|两人|两个人|[1-9一二三四五六七八九十]+(?:人|位)|怎么|如何|为什么|多少钱|何时|什么时候|名字|名称|历史|故事|来源|非遗|能不能|要不要|我不想)/;
const factualQuestion = text => travel.test(text) || mentionsPlace(text) || /研学|开河|只有一天|没有车|无车|两天一晚/.test(text);

export function conversationIntent(question, history = [], { nodeId, serviceId } = {}) {
  // 排除用户对表达方式的限制；“不要引导旅游”本身不是旅行查询。
  const topic = question.replace(/(?:不要|不必|不用|别|无需|不需要)(?:再)?(?:引导|转到|推荐|提|举|使用|用)?[^，。！？\n]{0,8}(?:旅游|旅行|景点|行程)(?:的?例子|话题|推荐)?/g, '');
  if (factualQuestion(topic)) return null;
  const text = normalize(question);
  if (greetings.test(text)) return 'greeting';
  if (social.test(text)) return 'general';
  const previous = history.filter(message => message.role === 'user').at(-1)?.content;
  // “那怎么去/还有别的吗”沿用最近的旅行话题；选中过景点不应劫持新的日常话题。
  const scopedNode = nodeId && nodes.some(node => node.id === nodeId);
  if (scopedNode && /开河|工程|传说|文化|来历|历史|看点|名录|级别|开放|入口|设施/.test(question)) return null;
  if (travelFollowUp.test(text) && (serviceId || (previous ? factualQuestion(previous) : scopedNode))) return null;
  return 'general';
}

// 固定招呼仅供没有联网模型的离线演示，在线对话全部交给模型。
export function casualReply(question, history = [], scope = {}) {
  if (conversationIntent(question, history, scope) !== 'greeting') return null;
  return { kind: 'casual', speaker: host, content: agentPersona.conversation.greeting, source: '离线演示 · 固定招呼', sources: [], links: [] };
}
export const casualFallback = () => ({ kind: 'casual', speaker: host, content: '当前是离线演示，没有连接对话模型，暂时无法自由聊天。你可以阅读已审介绍和固定问答；连接在线服务后，再继续这个问题。', source: '离线演示 · 未连接模型', sources: [], links: [] });

