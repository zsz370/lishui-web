import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuideSpeechActivity } from '../src/services/guideSpeechActivity.js';
import { createAnswerSpeech } from '../src/services/answerSpeech.js';
import { GUIDE_MEMORY_KEY, normalizeGuidePreferences, readGuideMemory, saveGuideMemory, rememberGuideInput, snapshotGuideRequest } from '../src/data/guideMemory.js';
import { followUpChoices, customFollowUp } from '../src/services/followUpChoices.js';
import { extractTripContext } from '../src/services/chatContext.js';
import { keyboardViewport, nearMessageEnd } from '../src/services/chatViewport.js';
import { guideFallback } from '../src/services/guideSuggestions.js';
import { approvedQA } from '../src/data/presetQA.js';
import { createChat, validateChat } from '../server/chat.mjs';
import { inferStayPreferences } from '../src/services/travelAdvice.js';

test('语音开始/结束控制形象，多个播报来源不会互相误清状态',()=>{
  const activity=createGuideSpeechActivity(),a=Symbol(),b=Symbol(),updates=[];
  const remove=activity.subscribe(()=>updates.push(activity.getSnapshot()));
  activity.set(a,true);activity.set(b,true);activity.set(a,false);assert(activity.getSnapshot());
  activity.set(b,false);assert(!activity.getSnapshot());assert.deepEqual(updates,[true,false]);
  remove();activity.set(a,true);assert.deepEqual(updates,[true,false]);
});
test('准备声音时保持站立，真实start进入讲话，最后end与取消自动切回',()=>{
  const activity=createGuideSpeechActivity(),spoken=[],timers=new Map();let next=0;
  const synthesis={getVoices:()=>[{name:'测试中文',lang:'zh-CN',localService:true}],speak:utterance=>spoken.push(utterance),cancel:()=>{}};
  const speech=createAnswerSpeech({activity,synthesis,Utterance:class {constructor(text){this.text=text;}},schedule:(fn)=>{timers.set(++next,fn);return next;},unschedule:id=>timers.delete(id)});
  speech.play(1,'你好。欢迎。');assert(!activity.getSnapshot());spoken[0].onstart();assert(activity.getSnapshot());
  spoken[0].onend();assert(activity.getSnapshot());spoken[1].onstart();spoken[1].onend();assert(!activity.getSnapshot());
  speech.play(2,'再次开始。');spoken[2].onstart();assert(activity.getSnapshot());speech.stop();assert(!activity.getSnapshot());
  spoken[2].onstart();assert(!activity.getSnapshot());speech.dispose();assert.equal(timers.size,0);
});
test('出行条件与输入草稿刷新保留，存储不可用和损坏时安全恢复',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
  assert(saveGuideMemory(storage,{version:1,preferences:{budget:'300',companions:'2人',weatherDate:'2026-10-10',mode:'transit'},draft:'还没发出去'}));
  const restored=readGuideMemory(storage);assert.equal(restored.draft,'还没发出去');assert.equal(restored.preferences.companions,'2人');assert.equal(restored.preferences.weatherDate,'2026-10-10');
  assert(!JSON.parse(data.get(GUIDE_MEMORY_KEY)).history);
  data.set(GUIDE_MEMORY_KEY,'broken');assert.deepEqual(readGuideMemory(storage).preferences,{});
  assert.equal(saveGuideMemory({setItem:()=>{throw Error('disabled');}},{version:1}),false);
});
test('保存条件只接收白名单字符串，非法日期和未知交通方式不恢复',()=>{
  assert.deepEqual(normalizeGuidePreferences({weatherDate:'2026-02-30',mode:'unsafe',budget:{secret:'value'},history:['private'],origin:'南京南站'}),{origin:'南京南站'});
  assert.equal(normalizeGuidePreferences({origin:'a'.repeat(300)}).origin.length,120);
});
test('游客明确输入才更新偏好，总预算不会被当作每晚住宿预算',()=>{
  const result=rememberGuideInput({},'2人出行，计划明天出发，行程总预算500元',undefined,'2026-10-07');
  assert.equal(result.preferences.companions,'2人');assert.equal(result.planPatch.date,'2026-10-08');assert.equal(result.planPatch.budget,'500');assert.equal(result.preferences.budget,undefined);
  assert.equal(extractTripContext({question:'总预算500元',preferences:{}}).maxPrice,undefined);
  assert.equal(inferStayPreferences('行程总预算500元，想找住宿',{budget:'flexible'}).budget,'flexible');
  assert.equal(inferStayPreferences('行程总预算1000元，住宿每晚300元',{budget:'flexible'}).budget,'300');
  assert.equal(rememberGuideInput({},'住宿每晚300元以内').preferences.budget,'300');
  assert.equal(rememberGuideInput({},'想吃手抓鸡').preferences.weatherDate,undefined);
});
test('重试快照不受后来修改的地点、偏好和历史消息影响',()=>{
  const input={question:'查询住宿',nodeId:'n_tsq',preferences:{budget:'300',checkInDate:'2026-10-10'},history:[{role:'user',content:'原出发地'}]};
  const retry=snapshotGuideRequest(input);input.nodeId='n_wx';input.preferences.budget='600';input.history[0].content='后来的出发地';
  assert.equal(retry.nodeId,'n_tsq');assert.equal(retry.preferences.budget,'300');assert.equal(retry.history[0].content,'原出发地');
});
test('缺条件选项保留未知数量边界，已有条件不被重复询问',()=>{
  const groups=followUpChoices('planning',{weatherDateAssumed:true},{question:'想安排行程'},'2026-10-07');
  assert(groups.some(group=>group.id==='travel-date'));assert(groups.some(group=>group.id==='companions'));assert(groups.some(group=>group.id==='trip-budget'));
  const many=groups.find(group=>group.id==='companions').choices[2];assert.equal(many.preferences.companions,'3人以上');assert.equal(many.planPatch.adults,undefined);
  const known=followUpChoices('planning',{weatherDateAssumed:false,origin:'南京南站'},{question:'总预算500元',preferences:{companions:'2人',weatherDate:'2026-10-10'}},'2026-10-07');
  assert.deepEqual(known,[]);
});
test('自填日期和住宿选项使用真实用户条件，查询天气不会改写行程日期',()=>{
  const weather=followUpChoices('weather',{}, {},'2026-10-07')[0];assert.deepEqual(weather.choices[1].planPatch,{});
  const stay=customFollowUp({custom:'stay-date'},'2026-10-10');assert.deepEqual(stay.preferences,{checkInDate:'2026-10-10',checkOutDate:'2026-10-11'});
  assert.equal(customFollowUp({custom:'weather-date'},'2026-10-11').question,'查询2026-10-11的天气');
});
test('服务端needs_input仍不调用住宿提供商，选项穿过合并回复完整到达',async()=>{
  let calls=0;
  const providers={stays:async()=>{calls++;throw Error('不应查库存');}};
  const result=await createChat(providers,{retrieve:async()=>[]})(validateChat({question:'想找住宿'}));
  assert.equal(result.kind,'needs_input');assert.equal(calls,0);assert(result.choiceGroups.some(group=>group.id==='stay-date'));
  const mixed=await createChat(providers,{retrieve:async()=>[]})(validateChat({question:'上海天气和住宿'}));
  assert(mixed.choiceGroups.some(group=>group.id==='weather-location'));assert(mixed.choiceGroups.some(group=>group.id==='stay-date'));
});
test('无资料时相关卡片只指向当前节点和已有已审问题',()=>{
  const response=guideFallback('未收录的问题','n_tsq');assert.equal(response.relatedTopics.length,1);assert.doesNotMatch(response.content,/换个问法/);
  for(const topic of response.relatedTopics)for(const question of topic.questions)assert(approvedQA.some(qa=>qa.nodeId===topic.nodeId&&qa.q===question));
  assert(guideFallback('未知问题').relatedTopics.length>=2);
});
test('键盘缩小可视区域时输入面板跟随，缩放及未聚焦不会误判键盘',()=>{
  assert.equal(keyboardViewport({layoutHeight:844,height:400,focused:true,mobile:true}).active,true);
  assert.equal(keyboardViewport({layoutHeight:844,height:400,focused:false,mobile:true}).active,false);
  assert.equal(keyboardViewport({layoutHeight:844,height:400,focused:true,mobile:true,scale:2}).active,false);
  assert.equal(keyboardViewport({layoutHeight:844,height:844,focused:true,mobile:true}).active,false);
});
test('阅读旧消息时不追随新答复，接近底部才继续跟随',()=>{
  assert.equal(nearMessageEnd({scrollHeight:1000,scrollTop:100,clientHeight:400}),false);
  assert.equal(nearMessageEnd({scrollHeight:1000,scrollTop:570,clientHeight:400}),true);
});
