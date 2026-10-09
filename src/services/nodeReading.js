import { approvedQA } from '../data/presetQA.js';
import { visitorAnswer } from '../data/visitorAnswerCopy.js';

// 从已审正文补充阅读层次，不改问答，不让价格和开放提示占据风物介绍。
export function nodeReading(nodeId) {
 const qa=approvedQA.filter(item=>item.nodeId===nodeId&&['fact','legend'].includes(item.kind)&&!(/什么时候|采摘|门票|票价|开放|日期|班次/.test(item.q)));
 return qa.slice(0,3).map(item=>({id:item.id,title:item.q,content:visitorAnswer(item),sources:item.sources,kind:item.kind}));
}
