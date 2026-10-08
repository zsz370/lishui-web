import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createChat,validateChat} from '../server/chat.mjs';
import {createApi} from '../server/index.mjs';
import {getConfig,today,addDays} from '../server/core.mjs';
import {readChatEvents} from '../src/services/chatStream.js';
import {canDisplayAnswerEvent} from '../src/services/chatDisplay.js';
import {boundedChatRequest,chatBodyBytes} from '../src/services/chatPayload.js';
import {dialogueContext,requestHistory} from '../src/services/conversationContext.js';
import {extractTripContext} from '../src/services/chatContext.js';
import {rememberGuideInput} from '../src/data/guideMemory.js';
import {prepareRecommendation,isItineraryRecommendation} from '../src/services/itineraryRecommendation.js';
import {approvedQA} from '../src/data/presetQA.js';
const user=content=>({role:'user',content}),assistant=content=>({role:'expert',content});
const input=(question,extra={})=>validateChat({question,...extra});
const noKnowledge={retrieve:async()=>{throw Error('不应检索不相关知识');}};
const roundHistory=[user('溧水两天自驾游，想去周园，不去无想山'),assistant('推荐周园和天生桥。'),user('总预算2000元'),assistant('已记下。'),...Array.from({length:7},()=>[user('你好'),assistant('你好呀。')]).flat()];

test('18轮消息后仍保留两天、周园、排除无想山，而不是被问候挤出上下文',async()=>{
 const history=requestHistory(roundHistory,{question:'那怎么安排？'});
 const reply=await createChat({},noKnowledge)(input('那怎么安排？',{history}));
 assert.equal(history.length,6);assert.equal(reply.kind,'planning');assert.equal(reply.recommendedPlan.days,2);
 assert(reply.recommendedPlan.stops.some(x=>x.nodeId==='n_zy'));assert(!reply.recommendedPlan.stops.some(x=>x.nodeId==='n_wx'));
});
test('酒店任务经过多轮闲聊仍接收新的预算，保留入住退房和目的地',async()=>{
 const preferences={checkInDate:addDays(today(),1),checkOutDate:addDays(today(),3),destination:'天生桥',budget:'600'};
 const history=[user('想住天生桥附近的酒店'),assistant('哪天入住？'),...Array.from({length:5},()=>[user('谢谢'),assistant('不客气')]).flat()];
 let query;
 const reply=await createChat({stays:async q=>{query=q;return{hotels:[],provider:'受控测试',checkedAt:'测试时间'};}},noKnowledge)(input('预算改成300元以内',{history:requestHistory(history,{question:'预算改成300元以内'}),preferences}));
 assert.equal(reply.serviceId,'stay');assert.equal(query.maxPrice,300);assert.equal(query.poiName,'天生桥');assert.equal(query.checkOutDate,preferences.checkOutDate);
});
for(const [question,expected]of[['明天',addDays(today(),1)],['后天',addDays(today(),2)],['2026年10月10日','2026-10-10']])test(`日期单独回复“${question}”接回规划并保存`,()=>{
 const memory=rememberGuideInput({},question,undefined,today(),[user('请规划溧水两天行程')]);
 assert.equal(memory.planPatch.date,expected);assert.equal(memory.preferences.weatherDate,expected);
});
for(const [question,expected]of[['三个人','3人'],['两位','2人'],['3人以上','3人以上'],['我一个人','1人']])test(`人数“${question}”原样保留人数边界`,()=>{
 const memory=rememberGuideInput({},question,undefined,today(),[user('溧水一日游')]);
 assert.equal(memory.preferences.companions,expected);assert.equal(memory.planPatch.adults,undefined);
});
for(const [question,expected]of[['不带孩子，只有两个人','general'],['不带老人，我们是朋友','general'],['带两个孩子','family'],['带两位老人','seniors']])test(`同行需求修订“${question}”覆盖旧条件`,()=>{
 const ctx=extractTripContext({question,history:[user('带老人和孩子旅行')],preferences:{companions:'family'}});
 assert.equal(ctx.companions,expected);
});
for(const [question,expected]of[['不是没车，是自驾','driving'],['不自驾，改坐公交','transit'],['不坐公交，改成步行','walking'],['没车','transit']])test(`交通修订“${question}”不被否定词劫持`,()=>{
 const ctx=extractTripContext({question,history:[user('没有车，规划两天')],preferences:{mode:'transit'}});
 assert.equal(ctx.mode,expected);const memory=rememberGuideInput({},question,undefined,today(),[user('规划两天')]);assert.equal(memory.planPatch.mode,expected);
});
for(const question of ['天生桥门票多少钱','洪蓝手抓鸡怎么吃','无想山有哪些看点'])test(`知识问题“${question}”不等于选择旅游目的地`,()=>{
 const memory=rememberGuideInput({},question,undefined,today(),[]);assert.equal(memory.preferences.destination,undefined);
 const ctx=extractTripContext({question:'有没有酒店推荐',history:[user(question)],preferences:memory.preferences});assert.equal(ctx.destination,undefined);
});
test('“无想山呢”继承上一轮门票维度，回答无想山票价，不转成名字传说',async()=>{
 const reply=await createChat({},noKnowledge)(input('那无想山呢',{history:[user('天生桥门票多少钱'),assistant('这是天生桥参考票价。')]}));
 assert.match(reply.content,/天池.*10元/s);assert.doesNotMatch(reply.content,/龙鸣山|韩熙载/);assert(reply.sources.length);
});
for(const [question,word]of[['第一站门票多少钱','18元'],['第二个门票多少钱','天池'],['第三个有哪些看点','石臼湖']])test(`“${question}”按上一轮列出的地点顺序定位`,async()=>{
 const history=[user('有什么山水景点推荐'),assistant('天生桥·胭脂河，无想山，石臼湖。')];
 const scope=dialogueContext(input(question,{history}));assert.equal(scope.references.length,1);
 if(/门票/.test(question)){const reply=await createChat({},noKnowledge)(input(question,{history}));assert.match(reply.content,new RegExp(word));}
 else assert.equal(scope.node.id,'n_sj');
});
test('多个地点后的“它的门票”明确让用户选一处，不随机解释无想山',async()=>{
 const reply=await createChat({},noKnowledge)(input('那它的门票呢',{history:[user('有什么景点推荐'),assistant('天生桥、无想山和石臼湖。')]}));
 assert.equal(reply.kind,'needs_input');assert.equal(reply.choiceGroups[0].choices.length,3);assert.doesNotMatch(reply.content,/龙鸣山|未能完整核对/);
});
test('知识介绍后说“这两处怎么串起来”进入知识库路线安排',async()=>{
 const history=[user('天生桥和无想山有什么看点'),assistant('天生桥与无想山的已审介绍。')];
 const reply=await createChat({},noKnowledge)(input('这两处怎么串起来',{history}));assert.equal(reply.kind,'planning');assert.equal(reply.recommendedPlan.stops.length,3);
 assert(reply.recommendedPlan.stops.some(x=>x.nodeId==='n_tsq'));assert(reply.recommendedPlan.stops.some(x=>x.nodeId==='n_wx'));
});
test('旅游后切换考试、电影、代码安排，不返回溧水路线',()=>{
 for(const question of ['考试复习怎么安排','推荐一部电影','这两个函数怎么串起来'])assert.equal(isItineraryRecommendation(input(question,{history:roundHistory.slice(0,4)})),false,question);
});
test('改为自驾以后，旧“没车”条件不再强制城中路线',()=>{
 const prepared=prepareRecommendation(input('不是没车，是自驾',{history:[user('溧水一日游，没有车')]}));assert.equal(prepared.context.profile,'scenery');
});
test('不完整的周末日期不悄悄使用今天，明确星期可以按日历查预报',async()=>{
 const ctx=extractTripContext({question:'周末溧水天气',preferences:{weatherDate:today()}});assert.equal(ctx.weatherDate,'');assert.equal(ctx.weatherDateAssumed,false);
 const dated=extractTripContext({question:'下周二溧水天气',preferences:{}},null,{today:'2026-10-08'});assert.equal(dated.weatherDate,'2026-10-13');
 const reply=await createChat({weather:async()=>({days:[{date:today()}]})},noKnowledge)(input('周末溧水天气'));assert.equal(reply.kind,'needs_input');
});
test('长中文历史不触发24KB拒绝，保留用户条件与最新回答，不修改原消息',async t=>{
 const history=[user('两天自驾，不去无想山'),assistant('长'.repeat(4000)),user('总预算2000元'),assistant('文'.repeat(4000)),user('天生桥附近'),assistant('答'.repeat(4000))];
 const raw={question:'再详细说明一下',history,preferences:{origin:'南京南站',mode:'driving'}};assert(chatBodyBytes(raw)>24000);
 const bounded=boundedChatRequest(raw);assert(chatBodyBytes(bounded)<24000);assert.equal(history[1].content.length,4000);assert(bounded.history.some(x=>x.content==='两天自驾，不去无想山'));assert.equal(bounded.history.at(-1).content,history.at(-1).content);
 const server=createApi({config:{...getConfig({}),rateLimit:100},providers:{generateStream:async()=> '按上下文回答'},knowledge:noKnowledge,log:()=>{}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/chat/stream`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...bounded,question:'你好'})});assert.equal(response.status,200);assert.equal((await readChatEvents(response)).kind,'casual');
});
test('实际知识模型流先给无依据数字，接口与前端都只接收校验后失败结果',async t=>{
 const qa=approvedQA.find(x=>x.nodeId==='n_tsq'&&x.kind==='fact');
 const server=createApi({config:{...getConfig({}),rateLimit:100},providers:{generate:async()=>'{"selectedIds":["K1"]}',generateStream:async(messages,{onDelta})=>{onDelta('门票只要999999元[K1]');return'门票只要999999元[K1]';}},knowledge:{retrieve:async()=>[{...qa,question:qa.q,answer:qa.a,score:.95}]},log:()=>{}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/chat/stream`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'天生桥的开河通航背景是什么',nodeId:'n_tsq'})});
 const visible=[],raw=[];const reply=await readChatEvents(response,()=>{},event=>{raw.push(event);if(canDisplayAnswerEvent(event))visible.push(event);});
 assert(!raw.some(event=>event.delta?.includes('999999')));assert(!visible.some(event=>event.delta?.includes('999999')));assert.equal(reply.kind,'unavailable');
});
test('普通聊天与校验过的推荐仍在完成之前显示真实delta',()=>{
 assert(canDisplayAnswerEvent({taskId:'conversation',type:'delta',delta:'你好'}));assert(canDisplayAnswerEvent({taskId:'planning_summary',type:'delta',verified:true,delta:'天生桥'}));assert(!canDisplayAnswerEvent({taskId:'knowledge',type:'delta',delta:'未经校验'}));
});
test('明确“换成周园”替换原选无想山，而不是同时保留两个目的地',async()=>{
 const reply=await createChat({},noKnowledge)(input('换成周园',{history:[user('溧水一日游，想去无想山'),assistant('上午无想山。')]}));
 assert.equal(reply.kind,'planning');assert(reply.recommendedPlan.stops.some(x=>x.nodeId==='n_zy'));assert(!reply.recommendedPlan.stops.some(x=>x.nodeId==='n_wx'));
});
for(const question of ['2026-10-09出发，2026-10-10返程','明天出发，后天返回'])test(`出发与返程日期各自对应“${question}”`,()=>{
 const memory=rememberGuideInput({},question,undefined,'2026-10-08',[user('规划溧水两天')]);assert.equal(memory.planPatch.date,'2026-10-09');assert.equal(memory.planPatch.returnDate,'2026-10-10');assert.equal(memory.preferences.checkInDate,undefined);
});
for(const question of ['推荐溧水一日游，不需要酒店','不用查天气，给我完整行程'])test(`否定的服务“${question}”不抢走路线安排`,async()=>{
 const reply=await createChat({},noKnowledge)(input(question));assert.equal(reply.kind,'planning');assert.doesNotMatch(reply.content,/入住日期|未来7天预报/);
});
test('补充预算日期后的推荐明确衔接本轮，记住的条件可从正文核对',async()=>{
 const reply=await createChat({},noKnowledge)(input('明天出发，总预算2000元',{history:[user('溧水两日游')],preferences:{companions:'2人'}}));
 assert.equal(reply.kind,'planning');assert.match(reply.content,/刚补充的条件/);assert.match(reply.content,/2人.*2000元/s);assert.match(reply.content,new RegExp(addDays(today(),1)));
});
test('只问周园看点不强行选入行程，但明确“这两处串起来”采用刚介绍的两处',async()=>{
 const history=[user('周园和石臼湖有哪些看点'),assistant('周园有收藏展示；石臼湖有湖景。')];
 const ordinary=prepareRecommendation(input('溧水一日游推荐',{history}));assert.deepEqual(ordinary.context.preferred,[]);
 const selected=await createChat({},noKnowledge)(input('这两处怎么串起来',{history}));assert(selected.recommendedPlan.stops.some(x=>x.nodeId==='n_zy'));assert(selected.recommendedPlan.stops.some(x=>x.nodeId==='n_sj'));
});
test('多轮普通改写保留最初的小林与忘浇花要求，不进入旅游检索',async()=>{
 const history=[user('给小林写一句道歉，我忘记帮他浇花了'),assistant('小林，对不起，我忘记帮你浇花。'),user('再口语一点'),assistant('小林，真不好意思，忘记帮你浇花了。'),...Array.from({length:5},()=>[user('谢谢'),assistant('不客气')]).flat()];
 const selected=requestHistory(history,{question:'再改得自然一点'});let messages;
 const reply=await createChat({generateStream:async received=>{messages=received;return'小林，抱歉啊，我把浇花的事给忘了。';}},noKnowledge)(input('再改得自然一点',{history:selected}));
 assert(selected.length<=6);assert(!selected.some(x=>x.role==='user'&&x.content==='谢谢'));assert(messages.some(x=>x.role==='user'&&/小林.*浇花/.test(x.content)));assert.equal(reply.kind,'casual');
});
test('普通聊天明确换到闭包问题不继承前一项道歉写作',()=>{
 const history=[user('给小林写一句道歉'),...Array.from({length:6},()=>[user('再短点'),assistant('抱歉，小林。')]).flat()];
 assert(!requestHistory(history,{question:'解释JavaScript闭包'}).some(x=>x.content==='给小林写一句道歉'));
});
for(const question of ['把上面的回答翻译成英文','翻译一下','翻译上一段成日语'])test(`“${question}”翻译上一条完整答案，不检索新事实`,async()=>{
 let q,to;const history=[user('介绍一下天生桥'),assistant('天生桥的已审介绍。'),{role:'expert',content:'未完成的错误文字',incomplete:true}];
 const reply=await createChat({translate:async(text,lang)=>{q=text;to=lang;return{content:'Verified translation'};}},noKnowledge)({question,history,preferences:{}});
 assert.equal(q,'天生桥的已审介绍。');assert.equal(to,/日语/.test(question)?'jp':'en');assert.equal(reply.kind,'translation');assert.deepEqual(reply.operations.trace.map(x=>x.agentId),['expert_translate']);
});
test('引用翻译没有上一条答案时要求提供文字，不把指令本身翻译',async()=>{
 const reply=await createChat({translate:async()=>{throw Error('不应翻译空内容');}},noKnowledge)(input('把上面的回答翻译成英文'));assert.equal(reply.kind,'needs_input');assert.match(reply.content,/提供.*文字/);
});
test('明确带引号的新文本优先于上一条答案',async()=>{
 let q;await createChat({translate:async text=>{q=text;return{content:'hello'};}},noKnowledge)(input('翻译“你好”成英文',{history:[assistant('上面的旧内容')]}));assert.equal(q,'你好');
});
test('“不要旅游例子”是写作限制，后续改写和问候不被记成旅行需求',async()=>{
 const chat=createChat({generateStream:async()=> '小林，抱歉啊，我忘记帮你浇花了。'},noKnowledge);let history=[];
 for(const question of ['给小林写一句道歉，我忘记帮他浇花了。不要旅游例子。','再口语一点','谢谢','你好','再短一点','再改得自然一点，别加开头说明']){
  const reply=await chat(input(question,{history:requestHistory(history,{question})}));assert.equal(reply.kind,'casual',question);history.push(user(question),assistant(reply.content));
 }
});
test('短对话中的礼貌招呼不替换待改写作品；传给模型的原始消息仍逐字保留',()=>{
 const history=[user('给小林写一句道歉，我忘记帮他浇花了'),assistant('小林，对不起，我忘记帮你浇花。'),user('你好'),assistant('你好，今天好吗？')];
 const selected=requestHistory(history,{question:'再短一点'});assert.deepEqual(selected,history.slice(0,2));assert.equal(history.length,4);
});
for(const [original,question,expected]of[['亲子溧水一日游','不带孩子，朋友两个人自驾','scenery'],['溧水人文一日游','不喜欢人文，想看自然山水','scenery'],['溧水山水一日游','改成人文收藏建筑','culture']])test(`推荐兴趣修订“${question}”覆盖旧主题`,()=>{
 const prepared=prepareRecommendation(input(question,{history:[user(original)]}));assert.equal(prepared.context.profile,expected);
});
test('纯问候生成不携带旧住宿任务，但下一轮酒店追问仍能接回用户条件',async()=>{
 let messages;const chat=createChat({generateStream:async received=>{messages=received;return'你好呀。';}},noKnowledge);
 const history=[user('天生桥附近找酒店，预算300元'),assistant('哪天入住？')];
 let reply;for(const question of ['今天好吗','你好，怎么样','在吗','早上好']){reply=await chat(input(question,{history}));assert.equal(reply.kind,'casual',question);assert.equal(messages.length,2,question);assert(!messages.some(x=>x.content==='哪天入住？'));}
 const next=await chat(input('明天住一晚',{history:[...history,user('今天好吗'),assistant(reply.content)]}));assert.equal(next.operations.context.maxPrice,300);assert.equal(next.operations.context.destination,'天生桥');
});
test('两天模型选择重复周园时，后一天改用同知识库的不同地点，街区可继续停留',async()=>{
 const prepared=prepareRecommendation(input('溧水两天自驾游，想去周园'));
 const repeated=prepared.slots.map(slot=>({...slot,nodeId:slot.period==='午间'?'f_szc':'n_zy',evidenceId:slot.period==='午间'?'N:f_szc':'N:n_zy'}));
 const reply=await createChat({generateStream:async(_, {onDelta})=>{onDelta(repeated.map(({day,period,nodeId,evidenceId})=>JSON.stringify({day,period,nodeId,evidenceId})).join('\n'));return'complete';}},noKnowledge)(input('溧水两天自驾游，想去周园'));
 const selected=reply.recommendedPlan.stops.filter(stop=>!['s_tj','s_ws','s_sq'].includes(stop.nodeId)).map(stop=>stop.nodeId);assert.equal(new Set(selected).size,selected.length);assert(reply.recommendedPlan.stops.some(x=>x.nodeId==='n_zy'));
});
