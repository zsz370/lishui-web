import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApi } from '../server/index.mjs';
import { getConfig, AppError } from '../server/core.mjs';
import { createSupabaseAccounts } from '../server/supabase-accounts.mjs';
import { normalizeUsername, validUsername, passwordPattern } from '../src/services/accountCredentials.js';
const id='00000000-0000-4000-8000-000000000001',origin='https://lsguide.cn';
async function setup(t){
 const calls=[],users=new Map();let active;
 const provider={configured:true,secure:true,signup:async(email,password,redirect,username)=>{calls.push({email,password,redirect,username});if(users.has(email))throw new AppError('ACCOUNT_EXISTS','用户名已注册',400);active={id,email,user_metadata:{username}};users.set(email,{user:active,password});return{access_token:'token_username_account',expires_in:3600};},login:async(email,password)=>{calls.push({email,password});const found=users.get(email);if(!found||found.password!==password)throw new AppError('ACCOUNT_UNAUTHORIZED','用户名或密码不正确',401);active=found.user;return{access_token:'token_username_account'};},user:async()=>active};
 const server=createApi({config:{...getConfig({}),origins:[origin]},providers:{},knowledge:{status:()=>({ready:false})},accounts:provider,log:()=>{}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const request=(path,body)=>fetch(`http://127.0.0.1:${server.address().port}/api/account/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
 return{calls,request};
}
test('中文用户名规范化，大小写和全角同名不能重复注册',async t=>{
 const{request,calls}=await setup(t);let response=await request('signup',{username:' Ｔｒａｖｅｌ小溧 ',password:'Travel123'});assert.equal(response.status,200);assert.deepEqual((await response.json()).user,{id,username:'travel小溧'});assert.match(calls[0].email,/^[a-f0-9]{64}@users\.lsguide\.cn$/);assert.equal(calls[0].username,'travel小溧');
 response=await request('login',{username:'Travel小溧',password:'Travel123'});assert.equal(response.status,200);assert.equal(calls[0].email,calls[1].email);assert.doesNotMatch(JSON.stringify(await response.json()),/token_|@users|password/);
 assert.equal((await request('signup',{username:'travel小溧',password:'Travel456'})).status,400);
});
test('新账号前后端共同限制密码8至15位及大小写数字',async t=>{
 const{request,calls}=await setup(t);
 for(const password of ['Abc1234','Abc12345678901234','abcdef12','ABCDEF12','Abcdefgh','Abcd12 3'])assert.equal((await request('signup',{username:'user1',password})).status,400,password);
 assert.equal(calls.length,0);for(const password of ['Abcdef12','Abc123456789012'])assert(passwordPattern.test(password));
 assert.equal((await request('signup',{username:'user1',password:'Abcdef12'})).status,200);
});
test('用户名校验不接受空格、邮箱、控制符及非法长度',()=>{
 for(const text of ['ab','x'.repeat(25),'abc def','abc@example.cn','abc\nxyz','<img>'])assert.equal(validUsername(text),false,text);
 assert(validUsername('游客_小溧'));assert.equal(normalizeUsername(' ABC '),'abc');
});
test('注册元数据只承载用户名，Supabase原密码认证不变',async()=>{
 let captured;const provider=createSupabaseAccounts({configured:true,url:'https://example.supabase.co',key:'test'},async(url,options)=>{captured={url,options};return new Response('{}');});await provider.signup('mapped@users.lsguide.cn','Travel123',origin+'/login','游客001');assert.deepEqual(JSON.parse(captured.options.body),{email:'mapped@users.lsguide.cn',password:'Travel123',data:{username:'游客001'}});assert.equal(captured.options.headers.apikey,'test');
});
