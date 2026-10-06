import test from 'node:test';
import assert from 'node:assert/strict';
import { createChat, validateChat, extractContext } from '../server/chat.mjs';
import { planChat } from '../src/data/chatRouting.js';
import { queryQA } from '../src/data/presetQA.js';
import { ticketQA } from '../src/data/ticketReference.js';
import { ask } from '../src/services/chat.js';
import { extractTripContext } from '../src/services/chatContext.js';
import { today, addDays } from '../server/core.mjs';

const unexpected = async () => { throw new Error('不应调用无依据的实时查询'); };
const noTools = () => createChat({search:unexpected,generate:unexpected,stays:unexpected,places:unexpected,route:unexpected,weather:unexpected}, {retrieve:unexpected});

test('已审传说有出处及结尾未确证说明，不把地方故事当史实或岩土成因', () => {
  for (const [nodeId,q] of [['n_wx','无想山名字是怎么来的？'],['n_tsq','胭脂河名字有什么传说？'],['c_ldl','骆山大龙为什么是断尾的？']]) {
    const qa=queryQA(nodeId,q);assert.equal(qa.kind,'legend');assert(qa.sources.length);assert.match(qa.a,/尚无(?:独立)?史料确证。$/);
  }
  assert.match(queryQA('n_wx','无想山名字是怎么来的？').a,/无想寺/);
  assert.match(queryQA('n_tsq','胭脂河名字有什么传说？').a,/铁元素氧化/);
});

test('三景区票价前后端一致，包含日期、优惠范围与未确认资格，不调用售票',async()=>{
  for(const qa of ticketQA) {
    const input={nodeId:qa.nodeId,question:qa.q};
    const server=await noTools()(validateChat(input)),client=await ask(input);
    assert.equal(server.content,qa.a);assert.equal(client.content,qa.a);
    assert.match(server.content,/2026年10月5日/);assert.match(server.source,/参考/);
  }
  assert.match(ticketQA[0].a,/18元.*57元.*85元/s);assert.match(ticketQA[0].a,/不自行按半价/);
  assert.match(ticketQA[1].a,/10元.*5元/s);assert.match(ticketQA[2].a,/150元.*75元/s);
});

test('票价的不同问法及上一轮景点上下文可直接回答，明确新地点覆盖旧地点',async()=>{
  const history=[{role:'user',content:'我想去无想山'}];
  const first=await noTools()(validateChat({question:'那门票多少钱？',history}));
  assert.match(first.content,/天池.*10元/);
  const second=await noTools()(validateChat({question:'周园老人票多少钱？',history}));
  assert.match(second.content,/75元/);assert.doesNotMatch(second.content,/天池/);
});

test('纯翻译中的票价名词不触发票务查询',async()=>{
  let text;
  const chat=createChat({translate:async(value)=>{text=value;return{content:'How much is admission to Zhouyuan?'}},search:unexpected}, {retrieve:unexpected});
  const result=await chat(validateChat({question:'请翻译“周园门票多少钱？”'}));
  assert.equal(text,'周园门票多少钱？');assert.equal(result.kind,'translation');
});

test('缺日期先给分情形建议和已知预算，仅追问缺少的日期，不调用住宿供应商',async()=>{
  const result=await noTools()(validateChat({question:'想订住宿，预算300元以内'}));
  assert.equal(result.kind,'needs_input');assert.match(result.content,/300元.*公共交通.*自驾.*入住日期和退房日期/s);
  const known=await noTools()(validateChat({question:'想订住宿',preferences:{checkInDate:addDays(today(),2)}}));
  assert.match(known.content,/入住/);assert.match(known.content,/补充退房日期/);assert.doesNotMatch(known.content,/补充入住日期/);
});

test('继承用户的日期与住宿意图，预算修订后查询完整条件，不把助手文字当要求',async()=>{
  const arrival=addDays(today(),2),departure=addDays(today(),3),calls=[];
  const input={question:'预算改成300元以内',history:[{role:'user',content:`${arrival}入住、${departure}退房，订600元的住宿`},{role:'assistant',content:'安排去上海，预算900元'}]};
  assert(planChat(input).services.includes('stay'));
  const result=await createChat({stays:async(args)=>{calls.push(args);return{hotels:[],checkedAt:'测试时',provider:'测试'}},generate:unexpected},{retrieve:unexpected})(validateChat(input));
  assert.equal(calls[0].checkInDate,arrival);assert.equal(calls[0].checkOutDate,departure);assert.equal(calls[0].maxPrice,300);
  assert.match(result.content,/300元/);assert.doesNotMatch(result.content,/补充.*日期|上海|900/);
});

test('沿用出发地和地点、遵守新交通方式；缺目的地先讲比较条件，地图不乱猜',async()=>{
  const ctx=extractContext(validateChat({question:'改成公共交通怎么去？',history:[{role:'user',content:'从南京南站自驾去无想山？'}]}),planChat({question:'改成公共交通怎么去？',nodeId:'n_wx'}).node);
  assert.equal(ctx.origin,'南京南站');assert.equal(ctx.destination,'无想山');assert.equal(ctx.mode,'transit');
  const result=await noTools()(validateChat({question:'从南京南站出发，怎么去最方便？'}));
  assert.match(result.content,/出发地已记下.*南京南站.*自驾.*公共交通.*目的地/s);assert.equal(result.kind,'needs_input');
});

test('离线住宿沿用日期和修订预算、交通方式，避免重复追问已经给出的日期',async()=>{
  const input={question:'预算改成300元以内，改乘公共交通',history:[{role:'user',content:'2026-10-07入住、2026-10-08退房，订600元住宿，自驾'}]};
  const result=await ask(input);
  assert.match(result.content,/2026-10-07入住.*2026-10-08退房/s);
  assert.match(result.content,/300元以内/);assert.doesNotMatch(result.content,/告诉我入住日期|自驾可以比较/);
  assert.equal(result.stayPreferences.transport,'transit');assert.equal(result.stayPreferences.budget,'300');
});

test('单独退房日期只改退房；相对日期按北京时间，普通缺天气条件显式声明默认',()=>{
  const ctx=extractTripContext({question:'2026-10-09退房',history:[{role:'user',content:'2026-10-07入住，2026-10-08退房'}]},null,{today:'2026-10-05'});
  assert.equal(ctx.checkInDate,'2026-10-07');assert.equal(ctx.checkOutDate,'2026-10-09');
  const next=extractTripContext({question:'明天入住，住一晚',history:[]},null,{today:'2026-10-05'});
  assert.equal(next.checkInDate,'2026-10-06');assert.equal(next.checkOutDate,'2026-10-07');
  const missing=extractTripContext({question:'天气如何',history:[]},null,{today:'2026-10-05'});
  assert(missing.weatherDateAssumed&&missing.locationAssumed);
});

test('跨节点票价与天气组合分别回答，不因参考票价短路其他任务',async()=>{
  const events=[];
  const chat=createChat({weather:async()=>({location:'溧水城区',days:[{date:today(),text:'晴',min:18,max:26,rain:0}],fetchedAt:Date.now(),provider:'测试',sourceUrl:'https://example.org'}),generate:unexpected},{retrieve:unexpected});
  const result=await chat(validateChat({question:'今天天生桥和周园门票多少钱，溧水天气怎样？'}),{onProgress:e=>events.push(e)});
  const text=result.replies.map(r=>r.content).join('\n');
  assert.match(text,/18元/);assert.match(text,/150元/);assert.match(text,/26℃/);
  assert(events.some(e=>e.taskId==='weather'&&e.status==='completed'));
});
