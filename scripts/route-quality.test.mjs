import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createChat, validateChat } from '../server/chat.mjs';
import { createApi } from '../server/index.mjs';
import { getConfig } from '../server/core.mjs';
import { getNode } from '../src/data/nodes.js';
import { emptyPlan } from '../src/data/itinerary.js';
import { readChatEvents } from '../src/services/chatStream.js';
import { prepareRecommendation, recommendationReply, adoptRecommendation } from '../src/services/itineraryRecommendation.js';
import { extractTripContext } from '../src/services/chatContext.js';
import { rememberGuideInput } from '../src/data/guideMemory.js';
import { requestHistory } from '../src/services/conversationContext.js';
import { tripDuration } from '../src/services/tripConditions.js';

const user = content => ({role:'user',content});
const assistant = content => ({role:'assistant',content});
const input = (question, extra={}) => validateChat({question,...extra});
const knowledge = {retrieve:async()=>{throw Error('应使用已审路线依据');}};
const original = '国庆溧水两天一夜三人旅游方案';
const visits = reply => reply.recommendedPlan.stops.filter(stop=>stop.role==='visit');
const assertDistinct = reply => {const ids=visits(reply).map(stop=>stop.nodeId);assert.equal(new Set(ids).size,ids.length);};

test('截图原问题不受保存的默认公共交通绑架，含两日不同主题、晚餐与三人住宿',async()=>{
 const reply=await createChat({},knowledge)(input(original,{preferences:{mode:'transit'}}));
 assert.equal(reply.kind,'planning');assert.equal(reply.recommendedPlan.days,2);assert.equal(reply.recommendedPlan.nights,1);
 assert.match(reply.content,/国庆.*3人/);assert.match(reply.content,/天生桥/);assert.match(reply.content,/无想山/);assert.match(reply.content,/大金山国防园/);assert.match(reply.content,/东屏湖/);
 assert.match(reply.content,/晚间｜无想水镇/);assert.match(reply.content,/住宿建议｜溧水城区住一晚/);assert.match(reply.content,/核定可入住三人.*两间房/);
 assert.match(reply.content,/毗邻东屏湖/);assertDistinct(reply);
 assert.doesNotMatch(reply.content,/已记下.*无想山|带孩子|灯会现场|秋季采摘|免费|待核|不能安排|\d+分钟|\d+元/);
 assert(visits(reply).filter(stop=>getNode(stop.nodeId).cat==='山水').length>=4);
});

for(const [text,days,nights]of[['两天一夜',2,1],['2天1晚',2,1],['三天两晚',3,2],['住一夜',2,1],['改成一日游',1,0],['两天零夜',2,0]])test(`时长“${text}”正确区分天与晚`,()=>{
 const duration=tripDuration(text);assert.equal(duration.days,days);assert.equal(duration.nights,nights);
});

test('国庆不是今天，不凭节日标签查询今日天气或假设入住日期',()=>{
 const ctx=extractTripContext(input(original),undefined,{today:'2026-10-08'});
 assert.equal(ctx.weatherDate,'');assert.equal(ctx.checkInDate,undefined);assert.equal(ctx.checkOutDate,undefined);assert.equal(ctx.departureDate,undefined);
});

test('明确日期加两天一夜可接回住宿，入住退房算一晚，总预算不变成每晚房价',async()=>{
 let query;const chat=createChat({stays:async received=>{query=received;return{hotels:[],provider:'测试',checkedAt:'2026-10-08'};}},knowledge);
 const history=[user('2026年10月10日出发，溧水两天一夜，三人，总预算2000元')];
 const reply=await chat(input('按这个行程找住宿',{history}));
 assert.equal(query.checkInDate,'2026-10-10');assert.equal(query.checkOutDate,'2026-10-11');assert.equal(query.maxPrice,undefined);assert.equal(reply.operations.context.tripBudget,2000);
});

test('亲子一天→少走路→两天自驾修订保留三人和节日，并移除过期的一天条件',async()=>{
 const chat=createChat({},knowledge);let history=[],preferences={mode:'transit'};
 for(const question of [original,'改成亲子一日游','想轻松一点，少走路','改成两天自驾游']){
  const selected=requestHistory(history,{question,preferences});const memory=rememberGuideInput(preferences,question,undefined,'2026-10-08',selected);preferences=memory.preferences;
  const reply=await chat(input(question,{history:selected,preferences}));assert.equal(reply.kind,'planning');assertDistinct(reply);
  assert.match(reply.content,/国庆.*3人/);
  if(question==='改成亲子一日游'){assert.equal(reply.recommendedPlan.days,1);assert.equal(reply.recommendedPlan.nights,0);assert.match(reply.content,/孩子/);assert.doesNotMatch(reply.content,/住宿建议｜|第2天|两天一夜/);}
  if(question.includes('少走路')){assert.match(reply.content,/少走路版/);assert.match(reply.content,/孩子/);assert(!visits(reply).some(stop=>['n_wx','n_dls'].includes(stop.nodeId)));}
  if(question.includes('自驾')){assert.equal(reply.recommendedPlan.days,2);assert.equal(reply.recommendedPlan.nights,1);assert.match(reply.content,/自驾/);assert.match(reply.content,/孩子/);assert.match(reply.content,/住宿建议｜/);}
  history.push(user(question),assistant(reply.content));
 }
});

test('批评上一份方案继续重排，不返回知识库无答案或另问日期人数',async()=>{
 const chat=createChat({},knowledge),first=await chat(input(original));
 const reply=await chat(input('这个回答真是太差劲了',{history:[user(original),assistant(first.content)]}));
 assert.equal(reply.kind,'planning');assert.equal(reply.recommendedPlan.days,2);assert.match(reply.content,/国庆.*3人/);assertDistinct(reply);
 assert.doesNotMatch(reply.content,/暂未找到|换个问法|从哪里出发|几位出行/);
});

test('午餐是就近餐饮建议，不能把每道菜当成另一个景区或冒充已找到餐厅',async()=>{
 const reply=await createChat({},knowledge)(input(original));
 for(const stop of reply.recommendedPlan.stops.filter(stop=>stop.role==='meal'&&getNode(stop.nodeId).cat==='美食'))assert.match(reply.content,new RegExp('菜单有'+getNode(stop.nodeId).name+'时可以尝尝'));
 assert.match(reply.content,/不为吃饭专程绕去另一片区/);assert.doesNotMatch(reply.content,/推荐餐厅：|人均\d|我已预订/);
});

test('模型反复选择商圈不能通过校验，兜底也有不同景点和晚间衔接',async()=>{
 const providers={generateStream:async(_, {onDelta})=>{
  for(const slot of prepareRecommendation(input(original)).slots)onDelta(JSON.stringify({day:slot.day,period:slot.period,nodeId:'s_hl',evidenceId:'N:s_hl'})+'\n');
 }};
 const reply=await createChat(providers,knowledge)(input(original));assertDistinct(reply);
 assert.equal(reply.operations.trace[1].method,'reviewed_knowledge_completion');assert.match(reply.content,/晚间｜/);assert.match(reply.content,/住宿建议｜/);
 assert(visits(reply).filter(stop=>getNode(stop.nodeId).cat==='山水').length>=4);
});

test('模型可交换同主题的上午下午，交换后不重复并保持真实知识依据',async()=>{
 const providers={generateStream:async(_, {onDelta})=>{
  for(const slot of prepareRecommendation(input(original)).slots){let nodeId=slot.nodeId;if(slot.day===1&&slot.role==='visit')nodeId=slot.period==='上午'?'n_wx':'n_tsq';onDelta(JSON.stringify({day:slot.day,period:slot.period,nodeId,evidenceId:'N:'+nodeId})+'\n');}
 }};
 const reply=await createChat(providers,knowledge)(input(original));assertDistinct(reply);assert.equal(reply.operations.trace[1].method,'model_selection');
 assert.equal(visits(reply)[0].nodeId,'n_wx');assert.equal(visits(reply)[1].nodeId,'n_tsq');
});

test('无效的数字、出处编号、新字段和未知地点继续被挡住',async()=>{
 const providers={generateStream:async(_, {onDelta})=>{
  for(const line of [{day:1,period:'上午',nodeId:'n_tsq',evidenceId:'N:fake'},{day:1,period:'上午',nodeId:'n_tsq',evidenceId:'N:n_tsq',hotel:'已订3人房999元'},{day:1,period:'上午',nodeId:'fake',evidenceId:'N:fake'}])onDelta(JSON.stringify(line)+'\n');
  throw Error('upstream-private');
 }};
 const reply=await createChat(providers,knowledge)(input(original));assertDistinct(reply);assert.doesNotMatch(reply.content,/999|fake|已订|upstream-private/);
 assert(reply.sources.every(source=>Object.values(reply.evidenceGroups).some(group=>group.sources.some(item=>item.url===source.url))));
});

test('明确保留周园、排除无想山之后，住宿和第二天仍完整',async()=>{
 const reply=await createChat({},knowledge)(input('保留周园，不去无想山',{history:[user(original)]}));assert.equal(reply.kind,'planning');assertDistinct(reply);
 assert(visits(reply).some(stop=>stop.nodeId==='n_zy'));assert(!visits(reply).some(stop=>stop.nodeId==='n_wx'));assert.match(reply.content,/住宿建议｜/);assert.match(reply.content,/第2天/);
});

test('明确无车选择城区衔接，两个游览时段不重复海乐城或通济街',async()=>{
 const reply=await createChat({},knowledge)(input('溧水一天，没有车，怎么安排'));assertDistinct(reply);
 assert(visits(reply).every(stop=>getNode(stop.nodeId).cat==='街区'));assert.match(reply.content,/上午｜通济街/);assert.match(reply.content,/下午｜无想水镇/);
});

test('保留两天改亲子等建议按钮不会偷偷改天数，进入住宿时不抹掉人数',async()=>{
 const chat=createChat({},knowledge),first=await chat(input(original));let history=[user(original),assistant(first.content)];
 const next=await chat(input(first.suggest[0],{history}));assert.equal(next.recommendedPlan.days,2);assert.match(next.content,/孩子/);assert.match(next.content,/国庆.*3人/);
 const stay=await chat(input(first.suggest.at(-1),{history}));assert.equal(stay.kind,'needs_input');assert.equal(stay.operations.context.companions,'general');assert.match(stay.content,/入住日期/);
});

test('旅游建议未选中的无想水镇不能当成游客酒店目的地',async()=>{
 const first=await createChat({},knowledge)(input(original));
 const next=await createChat({},knowledge)(input('按这个行程找住宿',{history:[user(original),assistant(first.content)]}));
 assert.equal(next.operations.context.destination,undefined);assert.match(next.content,/入住日期/);
});

test('夜游也进入保存的行程卡，日期跨日，原有总预算与人数不覆盖',()=>{
 const reply=recommendationReply(prepareRecommendation(input(original)));
 const previous={...emptyPlan(),date:'2026-10-10',adults:'3',budget:'2000',mode:'driving'};
 const plan=adoptRecommendation(reply.recommendedPlan,previous);
 assert(plan.stops.some(stop=>stop.nodeId==='s_wxsz'&&stop.note.includes('晚餐后')));
 assert.equal(plan.returnDate,'2026-10-11');assert.equal(plan.budget,'2000');assert.equal(plan.adults,'3');assert.equal(plan.mode,'driving');
 assert(plan.stops.every(stop=>!stop.cost&&!stop.place&&!stop.arrival));
});

test('七天长行程不循环把相同商圈当新景点，已审内容耗尽时明确留出休息',async()=>{
 const reply=await createChat({},knowledge)(input('溧水七天旅行方案'));assert.equal(reply.recommendedPlan.days,7);assertDistinct(reply);
 assert(reply.content.includes('休息')&&reply.content.includes('第7天'));assert(!reply.content.includes('继续留在这里逛逛'));
});

test('HTTP SSE流式与最终答复完全一致，住宿段只出现一次、夜游进入计划',async t=>{
 const config={...getConfig({}),llm:{key:'test'},rateLimit:100};
 const providers={generateStream:async(_, {onDelta})=>{for(const slot of prepareRecommendation(input(original)).slots){const line=JSON.stringify({day:slot.day,period:slot.period,nodeId:slot.nodeId,evidenceId:slot.evidenceId})+'\n';onDelta(line.slice(0,18));onDelta(line.slice(18));}}};
 const server=createApi({config,providers,knowledge,log:()=>{}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/chat/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:original})});
 const deltas=[];const reply=await readChatEvents(response,()=>{},event=>{if(event.type==='delta')deltas.push(event.delta);});
 assert.equal(reply.content,deltas.join(''));assert.equal(reply.content.split('住宿建议｜').length-1,1);assertDistinct(reply);assert(reply.recommendedPlan.stops.some(stop=>stop.period==='晚间'));
 assert(deltas.some(delta=>delta.includes('第1天 · 上午｜')));assert(deltas.some(delta=>delta.includes('第2天 · 下午｜')));
});
