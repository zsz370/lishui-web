import { approvedQA } from './presetQA.js';
// Explicit question dimensions reuse reviewed facts, never just a place name.
const variants = [
  ['天生桥是天然的还是人工的？', /天然|人工|怎么形成|如何形成|怎样形成/],
  ['胭脂河的水为什么是红的？', /(?:为什么|为何|原因).*(?:红|颜色)|(?:红色|红的).*(?:原因|来由)/],
  ['无想山名字是怎么来的？', /名字|得名|名称由来|无想寺名|龙鸣山/],
  ['周邦彦和溧水有什么关系？', /周邦彦/],
  ['韩熙载是谁？', /韩熙载.*(?:是谁|人物|联系|关系|读书台)/],
  ['洪蓝手抓鸡怎么吃？', /怎么吃|怎样吃|如何吃|吃法|蘸料|蘸什么|手撕/],
  ['石臼湖水上列车是什么？', /水上列车.*(?:是什么|如何过湖|怎样过湖|为什么)|S9.*(?:跨湖|过湖).*原理/i],
  ['石臼湖名字怎么来的？', /名字|名称|得名|由来/],
  ['骆山大龙是几级非遗？', /非遗.*(?:级|类别)|(?:级|类别).*非遗/],
  ['骆山大龙有多大？', /多大|多长|几节|多少人|龙身/],
  ['骆山大龙为什么是断尾的？', /断尾|白龙/],
  ['明觉铁画怎么做的？', /怎么做|怎样做|如何做|锻打|制作方法/],
  ['看明觉铁画可以观察哪些细节？', /看.*细节|欣赏|构图/],
  ['玉带糕怎么挑、怎么带？', /怎么挑|如何挑|怎么带|如何带|保存|保质期/],
  ['白马黑莓有什么特别？', /特别|地理标志|产地/],
];
export function queryVisitorQA(nodeId, question) {
  if (!nodeId || /今天|明天|后天|今年|最新|日期|天气|住宿|酒店|交通|怎么去|怎么走|末班|订单|退款|轮椅|翻译|英文|英语|预算|元以内/.test(question)) return null;
  if (/非遗|级别|几级|哪一级/.test(question) && /怎么吃|怎样吃|如何吃|吃法|蘸/.test(question)) return null;
  const candidates = variants.filter(([q, pattern]) => pattern.test(question)).map(([q]) => approvedQA.find((qa) => qa.nodeId === nodeId && qa.q === q)).filter(Boolean);
  if (nodeId === 'f_szc' && /非遗|级别|几级|哪一级/.test(question) && !/怎么吃|怎样吃|如何吃|吃法|蘸/.test(question)) {
    const qa = approvedQA.find((qa) => qa.nodeId === nodeId && qa.q === '洪蓝手抓鸡怎么吃？');
    if (!qa) return null;
    return { ...qa, displayAnswer: /国家级|省级/.test(question) ? '现有核对资料支持2023年的南京市级认定，尚未取得国家级或省级认定依据。' : '洪蓝手抓鸡制作技艺是南京市级非遗，列入2023年第五批正式名录。' };
  }
  return candidates.length === 1 ? candidates[0] : null;
}
