import { queryVisitorQA } from '../data/visitorQuery.js';
import { discoveryAdvice } from './discoveryAdvice.js';
// 已审的固定QA优先；其余问题经服务端检索、联网与工具查询。
import { planChat } from '../data/chatRouting.js';
import { getPersona } from '../data/personas.js';
import { queryQA, queryPendingQA } from '../data/presetQA.js';
import { getNode } from '../data/nodes.js';
import { answerTravelService } from './travelAdvice.js';
import { apiChatStream, backendEnabled } from './api.js';
import { queryServiceQA } from '../data/foundationQA.js';
import { reviewedAnswer } from './reviewedAnswer.js';
import { queryTicketQA, ticketOnlyQuestion } from '../data/ticketReference.js';

export async function ask({ nodeId, question, expertId, serviceId, history, preferences, signal, onProgress, onAnswer }) {
  signal?.throwIfAborted();
  question = String(question || '').trim();
  const plan = planChat({ question, nodeId, expertId, serviceId, history });
  const mentioned = plan.mentioned.length > 0;
  const node = plan.node;
  const persona = getPersona(expertId || node?.expert || '01_huaiyuanjie');
  const requested = plan.services;
  const hit = queryQA(node?.id, question);
  // 具体的已核知识问答可优先于宽泛服务词（如“水上列车是什么”）。
  // 实际求助和办理需求始终交给服务规则，不能被知识关键词抢走。
  const serviceIntent = /救命|晕倒|无法呼吸|严重受伤|火灾|遇险|落水|走失|走丢|报警|急救|emergency|怎么去|怎么走|怎么到|怎么坐|换乘|末班|停车|订房|住宿|住哪|酒店|民宿|天气|下雨|退票|退改|退款|投诉|求助|丢失|遗失|英文|英语|翻译|轮椅|无障碍|带老人|带孩子|带娃|带长辈|带婴儿|how to get|refund|lost|help|english|translate|hotel|weather/i.test(question);
  const urgent = /救命|晕倒|无法呼吸|严重受伤|火灾|遇险|落水|孩子走失|孩子走丢|报警|急救|emergency/i.test(question);
  if (urgent) return answerTravelService('support', question);
  const discovery = !plan.literalTranslation && discoveryAdvice(question, plan);
  if(discovery)return discovery;

  const ticket = !plan.literalTranslation && queryTicketQA(node?.id, question);
  if (ticket && ticketOnlyQuestion(question) && plan.knowledgeTargets.length <= 1) return reviewedAnswer(ticket, node.expert);
  const held = !plan.literalTranslation && queryPendingQA(node?.id, question);
  if (held) return {
    kind: 'unavailable', speaker: getPersona(getNode(held.nodeId).expert),
    content: `这个问题的具体结论尚未核准。${held.reason} 可先查看已审的地方文化介绍，出行条件请向景区或主办方确认。`,
    source: '资料待核，未作为事实回答',
  };
  const foundation = queryServiceQA(question);
  if (foundation) return reviewedAnswer(foundation);
  const friendly = !plan.literalTranslation && !requested.length && plan.knowledgeTargets.length <= 1 && queryVisitorQA(node?.id, question);
  if (friendly) return reviewedAnswer(friendly, persona.id);
  const exact = hit && hit.q.replace(/[\s，。？?!！]/g, '') === question.replace(/[\s，。？?!！]/g, '');
  if (backendEnabled && (!exact || serviceIntent || plan.knowledgeTargets.length > 1)) {
    return apiChatStream({ nodeId: node?.id, question, expertId,
      serviceId: mentioned ? undefined : serviceId, preferences,
      history: (history || []).filter((message) => !message.incomplete && ['user', 'expert'].includes(message.role)).slice(-6).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
    }, { signal, onProgress, onAnswer });
  }
  if (requested.length && (!hit || serviceIntent)) {
    const replies = await Promise.all(requested.map((id) => answerTravelService(id, question, { history, preferences, node })));
    return { ...replies[0], speaker:getPersona('01_huaiyuanjie'), content:replies.map(reply=>reply.content).join('\n\n'), replies:[{...replies[0],content:replies.map(reply=>reply.content).join('\n\n')}], serviceId:requested[0] };
  }
  if (exact) return { ...reviewedAnswer(hit, persona.id), suggest: ['怎么去最方便？', '如何安排行程？'] };
  return {
    kind: 'fallback',
    speaker: persona,
    content: `关于“${question}”，我目前没有找到足够可靠的资料。你可以换个问法，或先阅读这个主题的介绍。`,
    source: null,
    suggest: ['试试"什么时候去最好？"', '试试"怎么过去？"'],
  };
}
