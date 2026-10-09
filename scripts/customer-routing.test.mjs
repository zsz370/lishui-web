import test from 'node:test';
import assert from 'node:assert/strict';
import {createChat,validateChat} from '../server/chat.mjs';
import {approvedQA} from '../src/data/presetQA.js';
import {approvedServiceQA} from '../src/data/foundationQA.js';
import {visitorAnswer} from '../src/data/visitorAnswerCopy.js';
import {nodes,mainNodes} from '../src/data/nodes.js';
import {reviewedChunks} from '../src/data/reviewedCorpus.js';
import {isPlaceRecommendation,placeRecommendation} from '../src/services/placeRecommendation.js';
import {routeServices,inferStayPreferences} from '../src/services/travelAdvice.js';
import {once} from 'node:events';
import {createApi} from '../server/index.mjs';
import {getConfig} from '../server/core.mjs';
import {readChatEvents} from '../src/services/chatStream.js';
const input=question=>validateChat({question});
// 模拟分类器判断为闲聊，确保这些明确请求不能依赖模型碰巧选对分支；语料使用实际已审模块。
const providers={generate:async()=>JSON.stringify({route:'conversation',selectedIds:[]}),generateStream:async()=> '你好呀，我是淮源姐。',search:async()=>[]};
const knowledge={retrieve:async(question,{nodeId}={})=>reviewedChunks.filter(chunk=>(!nodeId||chunk.nodeId===nodeId)&&chunk.question===question).map(chunk=>({...chunk,score:1})).slice(0,5)};
const chat=createChat(providers,knowledge);
const noFailure=reply=>assert.doesNotMatch(reply.content,/暂未找到足够相关的资料|这次答复暂时未能完整核对/);

for(const question of ['有没有推荐','推荐几个地方','溧水有什么好玩的','帮我推荐些景点','哪里值得去','去哪玩'])test('P1 宽泛推荐：'+question,async()=>{
 const reply=await chat(input(question));assert(['planning','guide'].includes(reply.kind));noFailure(reply);assert.equal(reply.speaker.id,'01_huaiyuanjie');assert(reply.sources.length);
});
test('P1 已审完整问答在无节点、规划历史和错误模型路由下仍返回原游客版',async()=>{
 for(const qa of [...approvedQA,...approvedServiceQA]){
  const reply=await chat({...input(qa.q),history:[{role:'user',content:'帮我推荐一下溧水行程'}],dialogueRoute:'planning'});
  assert.equal(reply.kind,'preset',qa.q);assert.equal(reply.content,visitorAnswer(qa),qa.q);assert.deepEqual(reply.sources,qa.sources,qa.q);
 }
});
test('P1 具体节点及人物问题不被宽泛推荐劫持',()=>{
 for(const node of nodes)assert.equal(isPlaceRecommendation({question:node.name+'值得去吗'}),false,node.name);
 for(const question of ['周邦彦和溧水有什么关系？','溧水有什么关系','值得去','推荐一本书','十月出生的人是什么星座','写一段溧水景点推荐文案'])assert.equal(isPlaceRecommendation({question}),false,question);
});
test('P1 景点推荐使用主打节点已审简介，并附主题、引导和节点入口',()=>{
 const reply=placeRecommendation({question:'推荐几个地方'});assert.equal(reply.kind,'guide');assert(reply.relatedTopics.length);assert(reply.suggest.length);assert(reply.links.some(link=>link.url==='/nodes'));
 for(const node of mainNodes.slice(0,4))assert(reply.content.includes(node.introduction[0]));assert.match(reply.content,/开放、票价和当期活动.*确认/);
});
test('P1 住宿上下文或住宿页的简短求推荐仍接回住宿，明确景点推荐可换主题',async()=>{
 for(const extra of [{history:[{role:'user',content:'想找溧水酒店'}]},{serviceId:'stay'}]){
  const reply=await chat(validateChat({question:'有没有推荐',...extra}));assert.equal(reply.kind,'needs_input');assert.equal(reply.serviceId,'stay');assert(!reply.recommendedPlan);assert.match(reply.content,/入住|退房/);
 }
 assert.equal(isPlaceRecommendation({question:'推荐几个景点',history:[{role:'user',content:'想找溧水酒店'}]}),true);
});

test('P2 主题、预算和日期进入条件引导，不把旅游预算当作每晚房价',async()=>{
 const question='溧水，自然，2000以内，明天出发',reply=await chat(input(question));
 assert(['planning','guide','needs_input'].includes(reply.kind));noFailure(reply);assert.match(reply.content,/已记下.*2000元以内/);assert.match(reply.content,/自然山水/);assert.match(reply.content,/20\d{2}-\d{2}-\d{2}出发/);
 assert(reply.choiceGroups.length);assert(!reply.choiceGroups.some(group=>group.id==='trip-budget'));assert.doesNotMatch(reply.content,/每晚2000/);assert.deepEqual(routeServices(question),['planning']);
});
test('P2 裸预算支持以内、元以内和明确住宿，行程总预算不覆盖住宿偏好',()=>{
 assert(routeServices('预算200以内，想住酒店').includes('stay'));assert.equal(inferStayPreferences('200以内').budget,'300');assert.equal(inferStayPreferences('500元以内').budget,'600');
 assert.equal(inferStayPreferences('总预算200以内',{budget:'600'}).budget,'600');assert(routeServices('自然山水一日游规划').includes('planning'));
});

for(const question of ['能帮我完成三日游溧水的规划吗','溧水三日游','溧水3日游'])test('P3 多日完整行程：'+question,async()=>{
 const reply=await chat(input(question));assert.equal(reply.kind,'planning');assert.equal(reply.recommendedPlan.days,3);assert.equal(reply.recommendedPlan.nights,2);assert.match(reply.content,/溧水3天2夜/);noFailure(reply);
 for(const day of [1,2,3])assert.match(reply.content,new RegExp('第'+day+'天'));
 assert(reply.recommendedPlan.stops.every(stop=>nodes.some(node=>node.id===stop.nodeId)));
});
test('P3 HTTP SSE增量与完整三日行程一致，仍保留单导游与安全协议',async t=>{
 const server=createApi({config:{...getConfig({}),rateLimit:100},providers,knowledge,log:()=>{}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/chat/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'能帮我完成三日游溧水的规划吗'})});
 const events=[];const reply=await readChatEvents(response,()=>{},event=>events.push(event));assert.equal(reply.kind,'planning');assert.equal(reply.recommendedPlan.days,3);
 const deltas=events.filter(event=>event.type==='delta');assert(deltas.length>3);assert.equal(deltas.map(event=>event.delta).join(''),reply.content);assert(deltas.every(event=>event.speaker.id==='01_huaiyuanjie'));
});

for(const question of ['溧水十月有什么值得去的','溧水10月份推荐','十一月','溧水春天去哪玩','溧水秋季有什么推荐','溧水春夏秋冬推荐哪些地方'])test('P4 季节景点推荐：'+question,async()=>{
 const reply=await chat(input(question));assert.equal(reply.kind,'guide');noFailure(reply);assert(reply.relatedTopics.length);assert(reply.suggest.length);assert(reply.content.includes('傅家边'));
 assert.doesNotMatch(reply.content,/正在开花|已经开放|梅花盛开|一定能采|票价\d/);
});
test('P4 季节与明确三日行程同时出现时，按要求保留行程优先级',async()=>{assert.equal((await chat(input('溧水十月三日游怎么玩'))).recommendedPlan.days,3);});
test('P4 季节词不会覆盖具体节点事实、酒店、班次、人物或写作问题',()=>{
 for(const question of ['傅家边什么时候去最好？','无想山十月门票多少钱','十月全季酒店房价','十月想住全季','十月玉带糕怎么吃','溧水十月有什么美食','十月末班车几点','春秋战国的历史','写一段溧水秋天的文案'])assert.equal(isPlaceRecommendation({question}),false,question);
});

test('P5 动态问题无证据或只有未选中证据，都提供票价待核提示、主题卡片与引导',async()=>{
 for(const retrieve of [async()=>[],async()=>[{...reviewedChunks.find(chunk=>chunk.nodeId==='n_fjb'),score:1}]]){
  const reply=await createChat(providers,{retrieve})(input('傅家边门票多少钱'));
  assert.equal(reply.kind,'unavailable');assert.match(reply.content,/待核.*当前票价.*请向景区或运营方核对当日公告/);noFailure(reply);assert.equal(reply.relatedTopics[0].nodeId,'n_fjb');assert(reply.suggest.length);assert.doesNotMatch(reply.content,/\d+元|免费/);
 }
});
test('P5 非动态未知保留原话术并提供继续了解入口，不把无证据变成成功',async()=>{
 const reply=await chat(input('傅家边面积是多少'));assert.equal(reply.kind,'unavailable');assert.match(reply.content,/没查到能直接回答/);assert.doesNotMatch(reply.content,/当前票价|具体结论待核|知识库/);assert(reply.relatedTopics.length);assert(reply.suggest.length);
});
test('P5 有相关网页但没有现行票价证据，也保留待核边界和后续入口',async()=>{
 const reply=await createChat({...providers,search:async()=>[{label:'未审测试网页',url:'https://example.org/fjb',excerpt:'傅家边游览资料，请向园区核对具体活动。'}],generate:async()=>JSON.stringify({selectedIds:['W1']})},{retrieve:async()=>[]})(input('傅家边门票多少钱'));
 assert.equal(reply.kind,'rag');assert.match(reply.content,/待核.*当前票价/);assert(reply.relatedTopics.length);assert(reply.suggest.length);assert.doesNotMatch(reply.content,/\d+元|免费/);
});
const customerCases=[
 ['有没有推荐',['planning','guide']],['溧水，自然，2000以内，明天出发',['planning','guide','needs_input']],['能帮我完成三日游溧水的规划吗',['planning']],['溧水十月有什么值得去的',['guide']],['傅家边门票多少钱',['unavailable']],
 ...['周园值得去吗？','周邦彦和溧水有什么关系？','天生桥是天然的还是人工的？','胭脂河的水为什么是红的？','无想山名字是怎么来的？','傅家边什么时候去最好？','石臼湖名字怎么来的？','石臼湖水上列车是什么？','洪蓝手抓鸡怎么吃？','骆山大龙是几级非遗？'].map(question=>[question,['preset']]),
];
for(const [question,kinds]of customerCases)test('客户15问：'+question,async()=>{
 const reply=await chat(input(question));assert(kinds.includes(reply.kind),`${question}: ${reply.kind}`);assert.equal(reply.speaker.id,'01_huaiyuanjie');noFailure(reply);
 if(reply.kind==='preset'){const qa=approvedQA.find(item=>item.q===question);assert.equal(reply.content,visitorAnswer(qa));assert.deepEqual(reply.sources,qa.sources);}
});
