// chat service: MVP 阶段用 presetQA 命中；未命中提示"资料待补"，不编造。
// 10/8 起把 ask() 换成后端 RAG 调用即可（保持接口形状）。
import { getNode } from '../data/nodes.js';
import { getPersona } from '../data/personas.js';
import { queryQA } from '../data/presetQA.js';

export async function ask({ nodeId, question, expertId }) {
  const node = getNode(nodeId);
  const persona = getPersona(expertId || node?.expert);
  const hit = queryQA(nodeId, question);
  // 模拟一次网络延迟
  await new Promise((r) => setTimeout(r, 350));
  if (hit) {
    return {
      kind: 'preset',
      speaker: persona,
      content: hit.a,
      source: hit.q,
      suggest: [`${node?.name}附近还有什么？`, '怎么去最方便？', '能不能推荐同类型的？'],
    };
  }
  return {
    kind: 'fallback',
    speaker: persona,
    content: `关于"${question}"，我这版还没接入溧水完整知识库。10/8 之后会启用 RAG 检索兜底，现在先演示预置路径。`,
    source: null,
    suggest: ['试试"什么时候去最好？"', '试试"怎么过去？"'],
  };
}
