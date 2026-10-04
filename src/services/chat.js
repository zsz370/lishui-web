// 已审的固定QA优先；其余问题经服务端检索、联网与工具查询。
import { getNode, nodes } from '../data/nodes.js';
import { getPersona } from '../data/personas.js';
import { queryQA } from '../data/presetQA.js';
import { routeServices, answerTravelService } from './travelAdvice.js';
import { apiRequest, backendEnabled } from './api.js';
import { queryServiceQA } from '../data/foundationQA.js';
import { reviewedAnswer } from './reviewedAnswer.js';

export async function ask({ nodeId, question, expertId, serviceId, history, preferences }) {
  question = String(question || '').trim();
  const mentioned = nodes.find((candidate) => candidate.name.split(/[·／/]/).some((name) => name.length > 1 && question.includes(name)));
  const node = mentioned || getNode(nodeId);
  const persona = getPersona(expertId || node?.expert || '01_huaiyuanjie');
  const requested = routeServices(question, mentioned ? undefined : serviceId);
  const hit = queryQA(node?.id, question);
  // 具体的已核知识问答可优先于宽泛服务词（如“水上列车是什么”）。
  // 实际求助和办理需求始终交给服务规则，不能被知识关键词抢走。
  const serviceIntent = /救命|晕倒|无法呼吸|严重受伤|火灾|遇险|落水|走失|走丢|报警|急救|emergency|怎么去|怎么走|怎么到|怎么坐|换乘|末班|停车|订房|住宿|住哪|酒店|民宿|天气|下雨|退票|退改|退款|投诉|求助|丢失|遗失|英文|英语|翻译|轮椅|无障碍|带老人|带孩子|带娃|带长辈|带婴儿|how to get|refund|lost|help|english|translate|hotel|weather/i.test(question);
  const urgent = /救命|晕倒|无法呼吸|严重受伤|火灾|遇险|落水|孩子走失|孩子走丢|报警|急救|emergency/i.test(question);
  if (urgent) return answerTravelService('support', question);
  const foundation = queryServiceQA(question);
  if (foundation) return reviewedAnswer(foundation);
  if (backendEnabled && (!hit || serviceIntent)) {
    return apiRequest('chat', { nodeId: node?.id, question, expertId,
      serviceId: mentioned ? undefined : serviceId, preferences,
      history: (history || []).filter((message) => ['user', 'expert'].includes(message.role)).slice(-6).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
    });
  }
  if (requested.length && (!hit || serviceIntent)) {
    const replies = await Promise.all(requested.map((id) => answerTravelService(id, question, { history, preferences, node })));
    return { ...replies[0], replies, serviceId: requested[0] };
  }
  // 模拟一次网络延迟
  await new Promise((r) => setTimeout(r, 350));
  if (hit) {
    return {
      kind: 'preset',
      speaker: persona,
      content: hit.a,
      source: `${hit.kind === 'guidance' ? '出行建议；背景参考：' : '资料来源：'}${hit.sources[0]?.label || '审核资料'}`,
      sourceUrl: hit.sources[0]?.url,
      sources: hit.sources,
      reviewedAt: hit.reviewedAt,
      links: hit.sources.slice(1).map((source) => ({ label: source.label, url: source.url })),
      suggest: ['怎么去最方便？', '如何安排行程？'],
    };
  }
  return {
    kind: 'fallback',
    speaker: persona,
    content: `关于“${question}”，我目前没有找到足够可靠的资料。你可以换个问法，或先阅读这个主题的介绍。`,
    source: null,
    suggest: ['试试"什么时候去最好？"', '试试"怎么过去？"'],
  };
}
