import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createProviders,normalizeHotels } from '../server/providers.mjs';
import { normalizeStaySearch } from '../server/staySearch.mjs';
import { getConfig,today,addDays,AppError } from '../server/core.mjs';
import { createChat,validateChat,extractContext } from '../server/chat.mjs';
import { createApi } from '../server/index.mjs';
import { requestHistory } from '../src/services/conversationContext.js';
import { hotelKeywordChoice,extractHotelPreferences } from '../src/services/stayPreferences.js';
import { stayHotelLine,stayEmptyReason,staySearchDescription } from '../src/services/stayPresentation.js';
import { rememberGuideInput } from '../src/data/guideMemory.js';
const user=content=>({role:'user',content}),assistant=content=>({role:'expert',content});
const start=addDays(today(),1),end=addDays(today(),2);
const query=(extra={})=>({destName:'南京市溧水区',checkInDate:start,checkOutDate:end,hotelPreference:{sort:'comfort',keyword:'',excludeNames:[],excludeKeywords:[]},...extra});
const hotel=(name,price,extra={})=>({name,address:'南京市溧水区测试地址',price,detailUrl:'https://www.fliggy.com/',...extra});
const raw=list=>({status:0,data:{itemList:list}});
const cheap=Array.from({length:5},(_,i)=>hotel('溧水低价宾馆'+i,'¥'+(30+i),{star:'经济型'}));
const choices=[...cheap,hotel('全季南京溧水酒店','¥265',{star:'舒适型',rate:null}),hotel('桔子南京溧水酒店','¥249',{star:'舒适型'}),hotel('南京溧水开元名都酒店','¥366',{star:'豪华型',brandName:'百达屋'}),hotel('汉庭南京溧水酒店','¥125',{star:'经济型'})];
const noKnowledge={retrieve:async()=>{throw Error('酒店查询不能误入知识库');}};

test('不先截掉候选，默认舒适型查询包含排在旧低价前五之后的全季桔子',()=>{
 const result=normalizeHotels(raw(choices),query());
 assert.deepEqual(result.hotels.slice(0,2).map(item=>item.name),['全季南京溧水酒店','桔子南京溧水酒店']);assert(result.hotels.some(item=>item.name.includes('开元')));assert.equal(result.candidateCount,choices.length);assert.equal(result.hotels.length,5);
 assert.equal(result.ratingUnavailable,true);assert(result.hotels.every(item=>item.score===null));assert.equal(result.hotels[0].price,'¥265');
});

test('真实rate评分字段被正确读取，高分排序不被高价格代替，缺评分不补0或4.9',()=>{
 const result=normalizeHotels(raw([hotel('溧水甲酒店','¥600',{rate:'4.4'}),hotel('溧水乙酒店','¥250',{rate:'4.9'}),hotel('溧水丙酒店','¥800',{rate:null})]),query({hotelPreference:{sort:'rating'}}));
 assert.deepEqual(result.hotels.map(item=>item.score),[4.9,4.4,null]);assert.equal(result.hotels[0].price,'¥250');assert.equal(result.ratingUnavailable,false);
 assert.doesNotMatch(stayHotelLine(result.hotels.at(-1),2),/评分0|评分4\.9/);
});

test('要求评分优先但供应商缺少数值时，仍提供舒适连锁候选而不是原始低价前五',()=>{
 const result=normalizeHotels(raw(choices),query({hotelPreference:{sort:'rating'}}));
 assert.equal(result.ratingUnavailable,true);assert(result.hotels.every(item=>item.score===null));
 assert.deepEqual(result.hotels.slice(0,2).map(item=>item.name),['全季南京溧水酒店','桔子南京溧水酒店']);
 assert.match(staySearchDescription(result),/按平台评分优先查询/);
});

test('显式低预算仍能查便宜酒店，不强加价格下限；预算上下限都严格遵守',()=>{
 const low=normalizeHotels(raw(choices),query({maxPrice:40,hotelPreference:{sort:'budget'}}));assert.equal(low.hotels.length,5);assert(low.hotels.every(item=>Number(item.price.slice(1))<=40));
 const bounded=normalizeHotels(raw(choices),query({maxPrice:300,hotelPreference:{sort:'comfort',minPrice:200}}));assert.deepEqual(bounded.hotels.map(item=>item.name),['全季南京溧水酒店','桔子南京溧水酒店']);
});

test('华住明确筛选与全季单品牌筛选不混入其他集团或南京其他区',()=>{
 const list=[...choices,hotel('全季南京秦淮酒店','¥300',{address:'南京秦淮区后标营路'}),hotel('全季南京新街口溧水路酒店','¥300',{address:'南京市秦淮区溧水路'})];
 const group=normalizeHotels(raw(list),query({hotelPreference:{sort:'comfort',keyword:'华住'}}));assert(group.hotels.length);assert(group.hotels.every(item=>/全季|桔子|汉庭/.test(item.name)));
 const one=normalizeHotels(raw(list),query({hotelPreference:{sort:'comfort',keyword:'全季'}}));assert.deepEqual(one.hotels.map(item=>item.name),['全季南京溧水酒店']);
});

for(const [text,expected]of[['华住会旗下酒店','华住'],['优先桔子水晶','桔子水晶'],['想住全季大观','全季大观'],['不要全季，改找桔子','桔子'],['全季不考虑，想住汉庭','汉庭'],['品牌不限','']])test(`品牌条件“${text}”正确解析`,()=>{assert.equal(hotelKeywordChoice(text),expected);});

test('价格区间不会把入住日期里的2026-10误认为预算，之后提高上限或取消预算覆盖旧范围',()=>{
 const base=user(`${start}入住，${end}退房，华住酒店，每晚预算300-600元`);
 let ctx=extractContext(validateChat({question:'改找全季',history:[base]}));assert.equal(ctx.maxPrice,600);assert.equal(ctx.hotelPreference.minPrice,300);assert.equal(ctx.hotelPreference.keyword,'全季');
 ctx=extractContext(validateChat({question:'每晚800元以内',history:[base]}));assert.equal(ctx.maxPrice,800);assert.equal(ctx.hotelPreference.minPrice,undefined);
 ctx=extractContext(validateChat({question:'预算不限',history:[base],preferences:{budget:'600'}}));assert.equal(ctx.maxPrice,undefined);assert.equal(ctx.hotelPreference.minPrice,undefined);
 const memory=rememberGuideInput({budget:'600'},'预算不限',undefined,today(),[base]);assert.equal(memory.preferences.budget,undefined);
 assert.equal(extractHotelPreferences({question:`${start}入住，${end}退房`}).minPrice,undefined);
});

test('没有明确数值评分的结果不能冒充评分4.8以上，可返回清晰的品牌比较路径',()=>{
 const result=normalizeHotels(raw(choices),query({hotelPreference:{sort:'rating',minScore:4.8}}));assert.equal(result.hotels.length,0);assert.equal(result.ratingUnavailable,true);assert.match(stayEmptyReason(result),/没有返回.*评分.*品牌/);
 const known=normalizeHotels(raw([hotel('溧水高分酒店','¥300',{rate:'4.8'}),hotel('溧水低分酒店','¥600',{rate:'4.6'})]),query({hotelPreference:{sort:'rating',minScore:4.8}}));assert.equal(known.hotels.length,1);assert.equal(known.hotels[0].score,4.8);
});

test('换一批只排除上一批真实酒店，剩余候选重新筛选，不编造新酒店',()=>{
 const first=normalizeHotels(raw(choices),query());const content=first.hotels.map(stayHotelLine).join('\n\n');
 const pref=extractHotelPreferences({question:'换一批其他酒店',history:[user('找溧水酒店'),assistant(content)]});assert.equal(pref.excludeNames.length,5);
 const next=normalizeHotels(raw(choices),query({hotelPreference:pref}));assert(next.hotels.length);assert(next.hotels.every(item=>!first.hotels.some(previous=>previous.name===item.name)));
 const empty=normalizeHotels(raw([choices[5]]),query({hotelPreference:{sort:'comfort',keyword:'全季',excludeNames:[choices[5].name]}}));assert.equal(empty.hotels.length,0);
});

test('不要全季、品牌不限不会又排回全季；重新指定全季可撤销旧排除',()=>{
 let pref=extractHotelPreferences({question:'不要全季，品牌不限',history:[user('全季酒店')]});assert(pref.excludeKeywords.includes('全季'));assert.equal(pref.keyword,'');
 let result=normalizeHotels(raw(choices),query({hotelPreference:pref}));assert(!result.hotels.some(item=>item.name.includes('全季')));
 pref=extractHotelPreferences({question:'还是选择全季',history:[user('不要全季，品牌不限')]});assert.equal(pref.keyword,'全季');assert(!pref.excludeKeywords.includes('全季'));
});

test('长住宿对话中的品牌、评分和预算范围不会被问候挤掉',async()=>{
 let history=[user(`${start}入住，${end}退房，想住华住`),assistant('我按这些日期找。'),user('每晚预算200到600元'),assistant('收到。'),user('评分4.8分以上'),assistant('我会按返回评分筛选。')];
 for(let i=0;i<5;i++)history.push(user('你好'),assistant('你好呀。'));
 history=requestHistory(history,{question:'那看看全季'});assert(history.length<=6);let received;
 const reply=await createChat({stays:async value=>{received=value;return{provider:'测试',checkedAt:'测试时间',hotels:[]};}},noKnowledge)(validateChat({question:'那看看全季',history}));
 assert.equal(received.checkInDate,start);assert.equal(received.checkOutDate,end);assert.equal(received.maxPrice,600);assert.equal(received.hotelPreference.minPrice,200);assert.equal(received.hotelPreference.minScore,4.8);assert.equal(received.hotelPreference.keyword,'全季');assert.notEqual(reply.kind,'unavailable');
});

test('品牌或评分追问沿用酒店任务与日期，问好仍不触发酒店检索',async()=>{
 const history=[user(`${start}入住，${end}退房，酒店每晚600元以内`),assistant('已找到候选。')];let received;
 const chat=createChat({stays:async value=>{received=value;return{provider:'测试',checkedAt:'测试',hotels:[]};},generateStream:async()=> '你好呀。'},noKnowledge);
 for(const question of ['全季呢','评分高一点','住好一点，别那么便宜']){await chat(validateChat({question,history}));assert.equal(received.checkInDate,start);assert.equal(received.maxPrice,600);}
 received=null;const hello=await chat(validateChat({question:'你好',history}));assert.equal(hello.kind,'casual');assert.equal(received,null);
});

test('CLI用实际支持的rate_desc与带目的地的品牌关键词；价格与距离排序可明确改变',async()=>{
 const calls=[];const config={...getConfig({}),stay:{...getConfig({}).stay,key:'private-test-key'}};
 const runFile=(exe,args,options,callback)=>{calls.push({exe,args,options});callback(null,JSON.stringify(raw(choices)));};
 const provider=createProviders(config,()=>{throw Error('意外网络');},runFile);
 await provider.stays(query());await provider.stays(query({hotelPreference:{sort:'comfort',keyword:'全季'}}));await provider.stays(query({hotelPreference:{sort:'budget'}}));await provider.stays(query({hotelPreference:{sort:'nearby'}}));
 assert.deepEqual(calls.map(call=>call.args[call.args.indexOf('--sort')+1]),['rate_desc','rate_desc','price_asc','distance_asc']);
 assert.equal(calls[1].args[calls[1].args.indexOf('--key-words')+1],'溧水 全季');assert(calls.every(call=>!call.args.some(arg=>arg.includes('private-test-key'))));assert(calls.every(call=>call.options.windowsHide&&call.options.signal===undefined));
});

test('非法筛选条件在调用供应商前拒绝，原日期和maxPrice校验继续生效',async()=>{
 const config={...getConfig({}),stay:{...getConfig({}).stay,key:'test'}};let calls=0;
 const provider=createProviders(config,fetch,()=>{calls++;});
 for(const hotelPreference of [{sort:'--help'},{minPrice:-1},{minScore:7},{excludeNames:'酒店'},{keyword:['全季']},{excludeKeywords:Array(21).fill('全季')}])await assert.rejects(()=>provider.stays(query({hotelPreference})),AppError);
 await assert.rejects(()=>provider.stays(query({maxPrice:200,hotelPreference:{minPrice:300}})),AppError);await assert.rejects(()=>provider.stays(query({maxPrice:-1})),AppError);await assert.rejects(()=>provider.stays(query({checkOutDate:start})),AppError);assert.equal(calls,0);
 assert.throws(()=>normalizeStaySearch({hotelPreference:[]}),AppError);
});

test('未知报价、库存、星级和恶意链接不变成已确认事实，价格原样显示',()=>{
 const result=normalizeHotels(raw([hotel('溧水测试酒店',null,{rate:null,detailUrl:'javascript:alert(1)'})]),query());
 assert.equal(result.hotels[0].price,null);assert.equal(result.hotels[0].score,null);assert.equal(result.hotels[0].roomInventory,null);assert.equal(result.hotels[0].url,undefined);assert.doesNotMatch(stayHotelLine(result.hotels[0],0),/0元|4\.9分/);
 assert.equal(staySearchDescription({query:{hotelPreference:{sort:'comfort',minPrice:300}}}).includes('undefined'),false);
});

test('HTTP酒店接口与聊天使用同一筛选排序，聊天展示供应商评分和平台类型',async t=>{
 const config={...getConfig({}),stay:{...getConfig({}).stay,key:'test'},rateLimit:100};
 const providers=createProviders(config,()=>{throw Error('意外网络');},(exe,args,options,callback)=>callback(null,JSON.stringify(raw([hotel('全季南京溧水酒店','¥265',{rate:'4.8',star:'舒适型'})]))));
 const server=createApi({config,providers,knowledge:noKnowledge,log:()=>{}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const post=async(path,body)=>{const response=await fetch('http://127.0.0.1:'+server.address().port+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200);return response.json();};
 const hotels=await post('/api/stays',query());assert.equal(hotels.hotels[0].score,4.8);
 const answer=await post('/api/chat',{question:`${start}入住，${end}退房，想住全季`});assert.match(answer.content,/全季南京溧水酒店：¥265 · 平台评分4\.8分 · 舒适型/);assert.equal(answer.stayData.query.hotelPreference.keyword,'全季');
});
