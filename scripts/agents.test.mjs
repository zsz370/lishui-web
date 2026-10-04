import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError, dates, today, addDays, getConfig } from '../server/core.mjs';
import { createProviders, normalizeHotels } from '../server/providers.mjs';
import { cosine } from '../server/knowledge.mjs';
import { createChat, validateChat, extractContext } from '../server/chat.mjs';
import { createApi } from '../server/index.mjs';
import { request } from 'node:http';
const config=getConfig({});
const chunk={id:'test',expertId:'03_yanzhike',nodeId:'n_tsq',question:'形成',answer:'天生桥的形成与人工开河工程有关。',score:0.9,kind:'fact',sources:[{label:'审核来源',url:'https://www.nju.edu.cn/info/3191/218951.htm'}]};
const knowledge={chunks:[chunk],retrieve:async()=>[chunk],status:()=>({ready:true,chunks:1})};
const noNetwork=()=>{throw new Error('Unexpected tool call');};
const defaults={search:noNetwork,weather:noNetwork,stays:noNetwork,places:noNetwork,route:noNetwork,translate:noNetwork,generate:async()=>JSON.stringify({claims:[{text:chunk.answer,evidenceIds:['K1']}]})};
test('住宿日期和预算校验，不把缺失价格和库存补成可用房',async()=>{
  const start=addDays(today(),1),end=addDays(today(),2);
  assert.throws(()=>dates('2026-02-30',end),AppError);assert.throws(()=>dates(end,start),AppError);assert.throws(()=>dates('2020-01-01','2020-01-02'),AppError);
  const data=normalizeHotels({status:0,data:{itemList:[{name:'测试酒店',address:'测试地址',detailUrl:'javascript:alert(1)'}]}},{checkInDate:start,checkOutDate:end});
  assert.equal(data.hotels[0].price,null);assert.equal(data.hotels[0].roomInventory,null);assert.equal(data.hotels[0].url,undefined);
  await assert.rejects(createProviders({...config,stay:{...config.stay,key:'test'}}).stays({checkInDate:start,checkOutDate:end,maxPrice:-1}),/预算/);
});
test('向量相似度与引用白名单，非法模型引用回退到真实证据',async()=>{
  assert.equal(cosine([1,0],[1,0]),1);assert.equal(cosine([1,0],[0,1]),0);assert.equal(cosine([1],[1,2]),0);
  const valid=await createChat(defaults,knowledge)(validateChat({nodeId:'n_tsq',question:'介绍它的人工开河关系'}));assert.equal(valid.kind,'rag');assert.ok(valid.content.includes('[K1]'));assert.equal(valid.sources[0].url,chunk.sources[0].url);
  const invalid=await createChat({...defaults,generate:async()=>JSON.stringify({claims:[{text:'虚构回答',evidenceIds:['K999']}]})},knowledge)(validateChat({nodeId:'n_tsq',question:'介绍开河关系'}));assert.ok(!invalid.content.includes('虚构回答'));assert.ok(invalid.content.includes(chunk.answer));
});
test('每位角色缺资料时使用联网补充，搜索资料保留未审标记',async()=>{
  const response=await createChat({...defaults,search:async()=>[{label:'网页',url:'https://example.org/',excerpt:'网页待核信息'}],generate:async()=>JSON.stringify({claims:[{text:'摘录内容待核实',evidenceIds:['W1']}]})},{...knowledge,retrieve:async()=>[]})(validateChat({expertId:'02_laizhusheng',question:'介绍研学项目'}));
  assert.equal(response.speaker.id,'02_laizhusheng');assert.match(response.content,/未入审核库/);assert.equal(response.retrieval.webResults,1);
});
test('跨板块按依赖执行，部分天气失败仍能查住宿、地图并翻译汇总',async()=>{
  const calls=[];
  const providers={...defaults,weather:async()=>{calls.push('weather');throw new AppError('UPSTREAM_FAILED','failed',502);},stays:async()=>{calls.push('stay');return {checkedAt:new Date().toISOString(),provider:'飞猪',hotels:[{name:'测试酒店',address:'测试地址',price:'¥200',url:'https://example.org/hotel'}]};},places:async(name)=>{calls.push('map');return {places:[{name,address:'测试地址',location:'119.02,31.65',url:'https://www.amap.com/'}]};},generate:async()=>{calls.push('summary');return '先确认入口与住宿条件，天气查询未完成。';},translate:async(text)=>{calls.push('translation');assert.match(text,/天气查询未完成/);return {content:'Confirm the hotel.'};}};
  const result=await createChat(providers,{...knowledge,retrieve:async()=>[]})(validateChat({question:'明天两天一晚，查天气和300元内酒店、住宿交通，给英文行程'}));
  assert.equal(result.replies[0].kind,'coordinator');assert.equal(result.collaboration.coordinator,'01_huaiyuanjie');assert.ok(calls.indexOf('map')>calls.indexOf('stay'));assert.ok(calls.indexOf('translation')>calls.indexOf('summary'));assert.equal(result.collaboration.trace.find((task)=>task.taskId==='weather').status,'failed');assert.ok(result.collaboration.trace.some((task)=>task.taskId==='dispatch:services'));assert.ok(result.replies.some((reply)=>reply.stayData?.hotels[0].price==='¥200'));
});
test('住宿没有日期时不触发供应商；新日期优先于历史，紧急求助直接答复',async()=>{
  const result=await createChat(defaults,knowledge)(validateChat({question:'找300元以内的酒店'}));assert.equal(result.kind,'needs_input');const ctx=extractContext(validateChat({question:'明天住一晚酒店',history:[{role:'user',content:'2026-10-10至2026-10-12入住'}]}));assert.equal(ctx.checkInDate,addDays(today(),1));assert.equal(ctx.checkOutDate,addDays(today(),2));const urgent=await createChat({},knowledge)(validateChat({question:'孩子走失，急救'}));assert.match(urgent.content,/110/);
});
test('服务端拒绝未知智能体、恶意来源和格式错误，日志与错误不泄漏凭据',async()=>{
  assert.throws(()=>validateChat({question:'hello',expertId:'unknown'}),AppError);assert.throws(()=>validateChat({question:'hello',history:'bad'}),AppError);
  const logs=[],secret='private-test-key';const server=createApi({config,knowledge,providers:{...defaults,weather:async()=>{throw new Error(secret);}},log:(line)=>logs.push(line)});await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  try {const denied=await fetch(`${base}/api/weather`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:'{}'});assert.equal(denied.status,403);const invalid=await fetch(`${base}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'q',nodeId:'fake'})});assert.equal(invalid.status,400);const failed=await fetch(`${base}/api/weather`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(failed.status,500);assert.ok(!(await failed.text()).includes(secret));const ready=await fetch(`${base}/ready`);assert.equal(ready.status,503);assert.equal((await ready.json()).llm.configured,false);assert.ok(!logs.join('').includes(secret));}finally{await new Promise((resolve)=>server.close(resolve));}
});
test('第三方错误体和密钥查询参数不流向客户端',async()=>{
  const providers=createProviders({...config,amapKey:'secret'},async()=>({ok:false,status:401,json:async()=>({error:'secret'})}));await assert.rejects(providers.places('天生桥'),(error)=>error instanceof AppError&&!error.message.includes('secret'));
});
test('票价搜索摘要有差异时不生成现行价格结论，旅行目的地决定天气地点',async()=>{
  const providers={...defaults,search:async()=>[{label:'旧价格',url:'https://example.org/a',excerpt:'票价20元'},{label:'其他价格',url:'https://example.org/b',excerpt:'票价30元'}],generate:async()=>JSON.stringify({selectedIds:['K1','W1','W2']})};
  const result=await createChat(providers,knowledge)(validateChat({nodeId:'n_tsq',question:'天生桥票价是多少，资料齐全吗'}));
  assert.ok(result.content.includes(chunk.answer));assert.match(result.content,/尚未取得/);assert.ok(!/20元|30元|资料齐全/.test(result.content));
  const ctx=extractContext(validateChat({question:'明天从南京南站去无想山，天气如何'}),{name:'无想山'});assert.equal(ctx.location,'lishui');
});
test('网络分片中的中文问题完整解码后再路由',async()=>{
  let captured;
  const server=createApi({config,providers:defaults,knowledge:{...knowledge,retrieve:async(question)=>{captured=question;return[];}},log:()=>{}});
  await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
  try {
    const body=Buffer.from(JSON.stringify({question:'中国甲'}));const split=body.indexOf(Buffer.from('中'))+1;
    const status=await new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port:server.address().port,path:'/api/chat',method:'POST',headers:{'Content-Type':'application/json'}},(res)=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.write(body.subarray(0,split));setImmediate(()=>req.end(body.subarray(split)));});
    assert.equal(status,200);assert.equal(captured,'中国甲');
  } finally {await new Promise((resolve)=>server.close(resolve));}
});
