import { agentPersona } from '../data/agentPersona.js';

// 只整理本次执行状态，不补地点、价格、设施或演出安排。
export function planningFallback(question, results) {
  const twoDays = /两天|两日|两天一晚|2天|2日/.test(question);
  const hasMissing = results.some(result=>result.kind==='needs_input');
  const failed = results.some(result=>result.kind==='unavailable');
  return `${twoDays ? '第一天：围绕想了解的地方安排，先核对开放与当期活动。\n第二天：留出休息与返程时间。\n待核：这是一份两天草案，不保证有演出。' : '先围绕你想去的地方安排，给吃饭、休息和返程留些余地。'}${hasMissing ? '下面列出了还缺的条件，补齐后再查。' : ''}${failed ? '有查询没完成，这部分先待核，不能据此确定出行安排。' : ''}住宿以平台确认结果为准，活动以主办方当期公告为准。`;
}

// 输出排版兜底，放在原有证据校验之后，不放行或修补被拒绝的事实。
export function planningExpression(content, question, results) {
  // 日期未补齐时使用条件草案，避免用模型的即时推断替代未取得的报价或活动公告。
  if (/两天|两日|两天一晚|2天|2日/.test(question) && results.some(result=>result.kind==='needs_input' && result.serviceId==='stay')) return planningFallback(question,results);
  if (/两天|两日|两天一晚|2天|2日/.test(question) && (!/第一天/.test(content) || !/第二天/.test(content))) return planningFallback(question,results)+'\n'+content;
  return content;
}

// 模型只收到用户明确给定的出行日期，默认天气查询日期不充当行程条件。
export const explicitConditions = ctx => ({...ctx,weatherDate:ctx.weatherDateAssumed?undefined:ctx.weatherDate,location:ctx.locationAssumed?undefined:ctx.location});

export const unknownAnswer = searchFailed => searchFailed ? '这次搜索暂时没完成，点“重试”我再帮你查。也可以补充具体地点或想了解的内容。' : agentPersona.refusals.unknown;
