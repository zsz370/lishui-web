import test from 'node:test';
import assert from 'node:assert/strict';
import { createChat, validateChat } from '../server/chat.mjs';
import { routeDialogue } from '../server/dialogueRouting.mjs';
import { dialogueContext, requestHistory } from '../src/services/conversationContext.js';
import { planChat } from '../src/data/chatRouting.js';
import { extractTripContext } from '../src/services/chatContext.js';
import { rememberGuideInput } from '../src/data/guideMemory.js';
import { isItineraryRecommendation } from '../src/services/itineraryRecommendation.js';
import { today, addDays } from '../server/core.mjs';

const user = content => ({role:'user',content}), assistant = content => ({role:'expert',content});
const input = (question, extra={}) => validateChat({question,...extra});
const noKnowledge = {retrieve:async()=>{throw Error('不应进入地方知识检索');}};

test('问好跨过已选地点和服务直接流式闲聊，不深入知识库',async()=>{
  let generated=0;
  const chat=createChat({generateStream:async(messages,{onDelta})=>{generated++;onDelta('我在呢。');return '我在呢。';}},noKnowledge);
  for(const question of ['你好','今天好吗','你怎么样','谢谢']){
    const reply=await chat(input(question,{nodeId:'n_wx',serviceId:'stay',history:[user('有什么酒店推荐'),assistant('你想哪天入住？')]}));
    assert.equal(reply.kind,'casual');assert.equal(reply.content,'我在呢。');
  }
  assert.equal(generated,4);
});

test('导游建议或行程草稿的地点不能被当作游客已选择的酒店片区',async()=>{
  const history=[user('溧水一日游路线推荐'),assistant('推荐天生桥、手抓鸡、无想山。')];
  const reply=await createChat({},noKnowledge)(input('有没有酒店推荐',{nodeId:'n_wx',history}));
  assert.equal(reply.kind,'needs_input');assert.doesNotMatch(reply.content,/围绕无想山|无想山附近|已记下.*无想山/);
  assert(reply.choiceGroups.some(group=>group.id==='stay-date'));
  assert.equal(extractTripContext(input('有没有酒店推荐',{history}),{name:'无想山'}).destination,undefined);
});

test('反驳被记错的地点继续住宿流程，清除被否定条件并保留真实日期预算',async()=>{
  const history=[user('有没有酒店推荐'),assistant('已记下：围绕无想山。请补充日期。')];
  const preferences={destination:'无想山',budget:'300',checkInDate:addDays(today(),1),checkOutDate:addDays(today(),2)};
  let stayQuery;
  const reply=await createChat({stays:async query=>{stayQuery=query;return {hotels:[],provider:'测试住宿',checkedAt:'测试时间'};}},noKnowledge)(input('我没有说围绕无想山',{nodeId:'n_wx',history,preferences}));
  assert.deepEqual(planChat(input('我没有说围绕无想山',{nodeId:'n_wx',history})).services,['stay']);
  assert.equal(stayQuery.poiName,undefined);assert.equal(stayQuery.maxPrice,300);assert.equal(stayQuery.checkInDate,preferences.checkInDate);
  assert.doesNotMatch(reply.content,/未能完整核对|围绕无想山/);
  const remembered=rememberGuideInput(preferences,'我没有说围绕无想山',undefined,today(),history);
  assert.equal(remembered.preferences.destination,undefined);assert.equal(remembered.preferences.budget,'300');
});

test('纠正为另一个地点、随后补日期及预算，查询只使用最新真实条件',async()=>{
  const history=[user('想住无想山附近'),assistant('哪天入住？'),user('不是无想山，是天生桥'),assistant('明白。')];
  let query;
  const reply=await createChat({stays:async q=>{query=q;return {hotels:[],provider:'测试',checkedAt:'测试时间'};}},noKnowledge)(input('明天住一晚，300以内',{nodeId:'n_wx',history,preferences:{destination:'无想山'}}));
  assert.equal(query.poiName,'天生桥');assert.equal(query.maxPrice,300);
  assert.equal(query.checkInDate,addDays(today(),1));assert.equal(query.checkOutDate,addDays(today(),2));assert.notEqual(reply.kind,'unavailable');
  assert.equal(dialogueContext(input('那有没有别的酒店',{history,nodeId:'n_wx'})).node.id,'n_tsq');
});

test('截图中的逗号分隔条件接回规划，预算记成总预算且不变成酒店每晚预算',async()=>{
  const history=[user('帮我推荐一日游'),assistant('可以说说地点、兴趣和预算。')];
  const question='溧水，自然，2000以内，明天出发';
  const reply=await createChat({},noKnowledge)(input(question,{history}));
  assert.equal(reply.kind,'planning');assert.equal(reply.recommendedPlan.stops.length,3);assert.doesNotMatch(reply.content,/未能完整核对|待核|不能安排/);
  const memory=rememberGuideInput({},question,undefined,'2026-10-08',history);
  assert.equal(memory.planPatch.budget,'2000');assert.equal(memory.planPatch.date,'2026-10-09');assert.equal(memory.preferences.budget,undefined);
  const stay=extractTripContext(input('有没有酒店推荐',{history:[...history,user(question),assistant(reply.content)]}));
  assert.equal(stay.maxPrice,undefined);assert.equal(stay.checkInDate,undefined);
  assert.equal(stay.tripBudget,2000);assert.equal(stay.departureDate,addDays(today(),1));
});

test('问候插入多轮规划后仍可继续，主动换成学习写作时不沿用旅游任务',()=>{
  const history=[user('溧水两日游，自驾'),assistant('推荐路线。'),user('你好'),assistant('你好呀。')];
  assert(isItineraryRecommendation(input('想轻松一点，带两位老人',{history})));
  const reply=dialogueContext(input('解释一下JS闭包',{history,nodeId:'n_wx',serviceId:'planning'}));
  assert.equal(reply.task,'conversation');assert.equal(reply.continuation,false);
});

test('长对话压缩保留真实规划和纠正锚点，仍遵守六条历史的原校验上限',()=>{
  const history=[user('溧水两日游，自驾'),assistant('无想山'),user('我没有说去无想山'),assistant('已更正'),user('你好'),assistant('你好'),user('谢谢'),assistant('不客气'),user('两人'),assistant('记下了')];
  const compact=requestHistory(history,{question:'那有什么推荐'});
  assert.equal(compact.length,6);assert(compact.some(item=>item.content==='溧水两日游，自驾'));assert(compact.some(item=>item.content==='我没有说去无想山'));
  assert(compact.every(item=>history.includes(item)));assert.equal(validateChat({question:'那有什么推荐',history:compact}).history.length,6);
  assert(dialogueContext({question:'那有什么推荐',history:compact}).excluded.includes('n_wx'));
});

test('含糊旅游推荐由语义分类接入推荐，分类器不生成条件或放行事实约束',async()=>{
  let classification;
  const providers={generate:async(messages)=>{classification=messages;return '{"route":"planning"}';}};
  const routed=await routeDialogue(input('给我推荐一些适合散心的地方'),providers);
  assert.equal(routed.input.dialogueRoute,'planning');assert(isItineraryRecommendation(routed.input));
  assert.match(classification[0].content,/不要从导游推荐的地点推断用户已选择那里/);
  const protectedInput=input('天生桥门票多少钱');
  assert.deepEqual(await routeDialogue(protectedInput,{generate:async()=>{throw Error('不应分类');}}),{input:protectedInput});
  const bad=await routeDialogue(input('给我推荐一些适合散心的地方'),{generate:async()=>'{"route":"planning","destination":"假景点"}'});
  assert.equal(bad.input.dialogueRoute,undefined);
});

test('仅纠正知识话题时直接确认更正，不把否认地名当新知识问题',async()=>{
  const reply=await createChat({},noKnowledge)(input('我没说无想山',{nodeId:'n_wx',history:[user('天生桥的历史'),assistant('无想山历史')]}));
  assert.equal(reply.kind,'guide');assert.match(reply.content,/移除/);assert.doesNotMatch(reply.content,/未能完整核对|名字怎么来/);
});
