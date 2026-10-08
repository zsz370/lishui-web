import { nodes } from '../data/nodes.js';

const readIndex = value => ({一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7}[value] || Number(value));
export const isRecommendationMessage = item => ['assistant','expert'].includes(item.role) && !item.incomplete && (/路线串联/.test(item.content) || /^[^\n]*溧水[^\n]*(?:日游|天)[^\n]*\n/.test(item.content) && /^(?:第[1-7一二两三四五六七]天\s*·\s*)?上午｜/m.test(item.content));

// 历史方案是导游提出的安排，只供用户明确修改时定位，绝不填充游客已选目的地。
export function previousRecommendation(history = []) {
  const message = history.findLast(isRecommendationMessage);
  if (!message) return [];
  return [...message.content.matchAll(/^(?:第([1-7一二两三四五六七])天\s*·\s*)?(上午|午间|下午|晚间)｜([^\n]+)$/gm)].flatMap(([,day,period,title]) => {
    const node = nodes.find(candidate => title === candidate.name || title.endsWith(' · '+candidate.name));
    return node ? [{day:day ? readIndex(day) : 1,period,nodeId:node.id,role:period==='午间'?'meal':'visit'}] : [];
  });
}

export function recommendationRevision(input, mentioned) {
  const previous = previousRecommendation(input.history);
  const text = String(input.question||'');
  const day = readIndex(text.match(/第([1-7一二两三四五六七])天/)?.[1]);
  const period = text.match(/上午|下午|午间|晚间/)?.[0];
  const station = readIndex(text.match(/第([1-7一二两三四五六七])站/)?.[1]);
  const preserve = previous.length > 0 && (/第[1-7一二两三四五六七](?:天|站)|上午|下午|午间|晚间|其他(?:不变|保持)|第一天不变/.test(text));
  const assignments = [];
  const target = station ? previous.filter(item=>item.role==='visit')[station-1] : previous.find(item=>item.day===(day||1)&&item.period===(period||'上午')) || (day ? {day,period:period||'上午',role:'visit'} : undefined);
  const place = mentioned.positive.find(node=>['山水','街区'].includes(node.cat));
  if ((preserve || day) && target && place) assignments.push({...target,nodeId:place.id});
  return { preserve, previous, assignments };
}
