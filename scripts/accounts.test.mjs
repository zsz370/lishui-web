import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApi } from '../server/index.mjs';
import { AppError, getConfig } from '../server/core.mjs';
import { createSupabaseAccounts } from '../server/supabase-accounts.mjs';
import { accountConfig } from '../server/accounts-config.mjs';
import { readAccountDraft, saveAccountDraft } from '../src/data/accountDraft.js';
import { emptyPlan } from '../src/data/itinerary.js';

const origin='https://lsguide.cn',a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
async function setup(t,{secure=true,configured=true}={}){
  const cards=[],revoked=[];let refreshCount=0,revision=0;
  const users={token_account_a:{id:a,email:'a@example.invalid'},token_account_b:{id:b,email:'b@example.invalid'}};
  const session=id=>({access_token:id===a?'token_account_a':'token_account_b',refresh_token:id===a?'refresh_account_a':'refresh_account_b',expires_in:3600});
  const provider={configured,secure,
    login:async email=>session(email.startsWith('a')?a:b),signup:async()=>session(a),
    user:async token=>{if(!users[token])throw new AppError('AUTH','expired',401);return users[token];},
    refresh:async token=>{refreshCount++;if(token==='refresh_account_a')return session(a);throw new AppError('AUTH','invalid',400);},
    logout:async token=>revoked.push(token),
    list:async(_token,id,trash)=>cards.filter(card=>card.user_id===id&&Boolean(card.deleted_at)===trash),
    get:async(_token,id,cardId)=>cards.filter(card=>card.user_id===id&&card.id===cardId),
    create:async(_token,card)=>{const next={...card,updated_at:new Date(++revision*1000).toISOString(),created_at:new Date(0).toISOString(),deleted_at:null};cards.push(next);return [next];},
    update:async(_token,id,cardId,rev,patch)=>{const card=cards.find(card=>card.user_id===id&&card.id===cardId&&card.updated_at===rev);if(!card)return [];Object.assign(card,patch,{updated_at:new Date(++revision*1000).toISOString()});return [card];},
  };
  const server=createApi({config:{...getConfig({}),origins:[origin]},providers:{},knowledge:{status:()=>({ready:false})},accounts:provider,log:()=>{}});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=(path,{body,cookie,headers={},method}={})=>fetch(base+'/api/account/'+path,{method:method||(body?'POST':'GET'),headers:{...body?{'Content-Type':'application/json',Origin:origin}:{},...cookie?{Cookie:cookie}:{},...headers},...body?{body:JSON.stringify(body)}:{}});
  const cookie=async(email='a@example.invalid')=>{const r=await request('login',{body:{email,password:'test-only-pass'}});return r.headers.getSetCookie().map(part=>part.split(';')[0]).join('; ');};
  return{request,cookie,cards,revoked,refreshCount:()=>refreshCount};
}

test('登录只返回公开用户，生产 Cookie 为 HttpOnly / Secure / SameSite',async t=>{
  const {request}=await setup(t);const response=await request('login',{body:{email:'a@example.invalid',password:'test-only-pass'}});assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.user.id,a);assert.doesNotMatch(JSON.stringify(data),/token_account|refresh_account|password/);
  for(const cookie of response.headers.getSetCookie()){assert.match(cookie,/^__Host-lishui_/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Secure/);assert.match(cookie,/Path=\//);}
  assert.match(response.headers.getSetCookie()[1],/Max-Age=0/);
});
test('用户名注册直接登录，无邮件确认或验证码，只保留有期限的访问Cookie',async t=>{const {request}=await setup(t);const response=await request('signup',{body:{username:'testuser',password:'Travel123'}});assert.equal(response.status,200);assert.equal((await response.json()).user.id,a);assert.match(response.headers.getSetCookie()[0],/Max-Age=3600/);assert.doesNotMatch(response.headers.getSetCookie().join(' '),/refresh_account/);});
test('账号写入拒绝跨站、无 Origin、错误方法与过长请求',async t=>{
  const {request}=await setup(t);
  for(const headers of [{Origin:'https://evil.example'},{Origin:''}])assert.equal((await request('login',{body:{},headers})).status,403);
  assert.equal((await request('login',{method:'PUT'})).status,405);
  assert.equal((await request('login',{body:{},headers:{'Content-Type':'text/plain'}})).status,415);
  assert.equal((await request('login',{body:{email:'a@example.invalid',password:'short'}})).status,400);
  assert.equal((await request('login',{body:{large:'x'.repeat(25000)}})).status,413);
});
test('保存归属由会话决定；第二账号不能读、改或回收第一账号的卡',async t=>{
  const {request,cookie,cards}=await setup(t);const ca=await cookie(),cb=await cookie('b@example.invalid');
  const created=await request('cards',{cookie:ca,body:{title:'我的行程',plan:{...emptyPlan(),budget:'600'},user_id:b}});assert.equal(created.status,201);const {card}=await created.json();assert.equal(cards[0].user_id,a);
  assert.equal((await (await request('cards',{cookie:cb})).json()).cards.length,0);
  for(const options of [{},{body:{title:'劫持',plan:emptyPlan(),revision:card.updated_at}}])assert.equal((await request('cards/'+card.id,{...options,cookie:cb})).status,404);
  assert.equal((await request('cards/'+card.id+'/trash',{cookie:cb,body:{revision:card.updated_at}})).status,404);
  const restored=await (await request('cards/'+card.id,{cookie:ca})).json();assert.equal(restored.card.plan.budget,'600');
  assert.equal((await request('cards',{body:{title:'未登录',plan:emptyPlan()}})).status,401);
});
test('行程版本冲突返回409，回收与恢复可逆，载入保持日期预算',async t=>{
  const {request,cookie}=await setup(t);const auth=await cookie();const {card}=await (await request('cards',{cookie:auth,body:{title:'测试',plan:{...emptyPlan(),date:'2026-10-15',budget:'500'}}})).json();
  const {card:updated}=await (await request('cards/'+card.id,{cookie:auth,body:{title:'更新',plan:{...card.plan,budget:'800'},revision:card.updated_at}})).json();
  assert.equal((await request('cards/'+card.id,{cookie:auth,body:{title:'旧版本',plan:card.plan,revision:card.updated_at}})).status,409);
  const {card:trashed}=await (await request('cards/'+card.id+'/trash',{cookie:auth,body:{revision:updated.updated_at}})).json();
  assert.equal((await (await request('cards',{cookie:auth})).json()).cards.length,0);assert.equal((await (await request('cards?trash=true',{cookie:auth})).json()).cards.length,1);
  assert.equal((await request('cards/'+card.id+'/restore',{cookie:auth,body:{revision:trashed.updated_at}})).status,200);
  const result=await (await request('cards/'+card.id,{cookie:auth})).json();assert.equal(result.card.plan.date,'2026-10-15');assert.equal(result.card.plan.budget,'800');
});
test('过期访问令牌不刷新，旧刷新Cookie无效；正常退出撤销会话并清 Cookie',async t=>{
  const {request,revoked,refreshCount}=await setup(t);const cookie='__Host-lishui_access=expired_token_a; __Host-lishui_refresh=refresh_account_a';
  const response=await request('session',{cookie});assert.equal((await response.json()).user,null);assert.equal(refreshCount(),0);
  assert.equal((await request('cards',{cookie})).status,401);
  const logout=await request('logout',{cookie:'__Host-lishui_access=token_account_a',body:{}});assert((await logout.json()).revoked);assert.deepEqual(revoked,['token_account_a']);assert(logout.headers.getSetCookie().every(value=>value.includes('Max-Age=0')));
});
test('失效刷新会话清除、未配置离线状态如实返回、账号请求独立限流',async t=>{
  const {request}=await setup(t);const response=await request('session',{cookie:'__Host-lishui_refresh=invalid_refresh'});assert.equal((await response.json()).user,null);
  for(let i=0;i<12;i++)await request('login',{body:{email:'a@example.invalid',password:'test-only-pass'}});
  assert.equal((await request('login',{body:{email:'a@example.invalid',password:'test-only-pass'}})).status,429);
  const offline=await setup(t,{configured:false});assert.deepEqual(await(await offline.request('session')).json(),{configured:false,user:null});
});
test('保存清理危险外链和原型键；未知节点不进入卡片',async t=>{
  const {request,cookie}=await setup(t);const raw=JSON.parse('{"__proto__":{"status":"ok"},"constructor":{"status":"ok"}}');
  const response=await request('cards',{cookie:await cookie(),body:{title:'安全',plan:{...emptyPlan(),routes:raw,stops:[{nodeId:'missing'}],weather:{text:'测试',min:1,max:2,fetchedAt:1,sourceUrl:'javascript:alert(1)'}}}});
  const {card}=await response.json();assert.equal(card.plan.weather.sourceUrl,'');assert.deepEqual(card.plan.routes,{});assert.deepEqual(card.plan.stops,[]);
});
test('Supabase客户端用户JWT在请求头、归属和版本过滤生效，供应商错误不透出',async()=>{
  let observed;const client=createSupabaseAccounts({configured:true,url:'https://example.supabase.co',key:'publishable-test',secure:true},async(url,options)=>{observed={url,options};return new Response(JSON.stringify([]));});
  await client.update('token_account_a',a,'33333333-3333-4333-8333-333333333333','2026-10-08T01:00:00.000Z',{title:'更新'});
  assert.match(observed.url,/user_id=eq\.111/);assert.match(observed.url,/updated_at=eq\./);assert.doesNotMatch(observed.url,/token_account|publishable-test/);assert.equal(observed.options.headers.Authorization,'Bearer token_account_a');assert.equal(observed.options.method,'PATCH');assert.equal(observed.options.redirect,'error');
  const bad=createSupabaseAccounts({configured:true,url:'https://example.supabase.co',key:'test'},async()=>new Response(JSON.stringify({message:'private key and stack'}),{status:500}));await assert.rejects(()=>bad.user('test'),error=>error.status===503&&!error.message.includes('private'));
});
test('不接受service_role/secret key、不接受自定义Supabase地址',()=>{
  const base={SUPABASE_URL:'https://abcdefghijkl.supabase.co',ACCOUNT_COOKIE_SECURE:'true'};
  assert.throws(()=>accountConfig({...base,SUPABASE_PUBLISHABLE_KEY:'sb_secret_1234567890123456789012345'}));
  const key='x.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.x';assert.throws(()=>accountConfig({...base,SUPABASE_PUBLISHABLE_KEY:key}));
  assert.throws(()=>accountConfig({...base,SUPABASE_URL:'https://evil.example',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_1234567890123456789012345'}));
});
test('本地访客与两个账号草稿各自恢复，账户切换不会覆盖另一份草稿',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  saveAccountDraft(storage,null,{...emptyPlan(),budget:'300'});saveAccountDraft(storage,a,{...emptyPlan(),budget:'600'});saveAccountDraft(storage,b,{...emptyPlan(),budget:'900'});
  assert.equal(readAccountDraft(storage,null).budget,'300');assert.equal(readAccountDraft(storage,a).budget,'600');assert.equal(readAccountDraft(storage,b).budget,'900');
});
