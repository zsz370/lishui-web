import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { personas, HOST_ID, getPersona } from '../src/data/personas.js';
import { nodes } from '../src/data/nodes.js';
import { topics } from '../src/data/collections.js';
import { travelServices } from '../src/data/travelServices.js';
import { agentPlans } from '../config/agent-system.plan.js';
import { createChat, validateChat } from '../server/chat.mjs';
import { corpusHash, vectorText } from '../server/knowledge.mjs';
import { queryVisitorQA } from '../src/data/visitorQuery.js';
import { approvedQA } from '../src/data/presetQA.js';
import { approvedServiceQA } from '../src/data/foundationQA.js';

test('唯一角色注册，全部风物和服务由淮源姐负责，旧角色不能请求',()=>{
  assert.deepEqual(personas.map(x=>x.id),[HOST_ID]);assert.deepEqual(agentPlans.map(x=>x.id),[HOST_ID]);
  assert(nodes.every(x=>x.expert===HOST_ID));assert(travelServices.every(x=>x.expert===HOST_ID));assert(topics.every(x=>x.groups.every(g=>g.expert===HOST_ID)));
  assert.equal(getPersona('04_dalonggu'),undefined);assert.throws(()=>validateChat({question:'你好',expertId:'04_dalonggu'}));
});

test('扩展知识统一归属、向量与事实对应、童谣未被放行',async()=>{
  const corpus=JSON.parse(await readFile(new URL('../docs/corpus-audit/approved-corpus.json',import.meta.url))),index=JSON.parse(await readFile(new URL('../runtime.local/knowledge-index.json',import.meta.url)));
  assert.equal(corpus.chunks.length,approvedQA.length+approvedServiceQA.length);assert(corpus.chunks.length>=100);assert(corpus.chunks.every(x=>x.expertId===HOST_ID&&x.status==='approved'&&x.sources.length));
  assert.equal(corpusHash(corpus.chunks),index.hash);assert.deepEqual(index.ids,corpus.chunks.map(x=>x.id));assert.equal(index.vectors.length,corpus.chunks.length);assert.equal(index.dimensions,1024);
  assert(!corpus.chunks.some(x=>x.question==='来首溧水童谣？'));
});

test('发布角色素材仅含透明淮源姐，旧角色和不透明备选未混入',async()=>{
  const root=new URL('../public/assets/personas/',import.meta.url);
  async function walk(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.isDirectory())result.push(...await walk(new URL(e.name+'/',dir)));else result.push(e.name);}return result;}
  const files=await walk(root);assert.equal(files.length,4);assert(files.every(f=>f.startsWith(HOST_ID)));assert.equal(files.filter(f=>f.endsWith('.webm')).length,2);assert.equal(personas[0].transparent,true);
});

test('常见吃法、非遗级别与地名变体直接复用已有证据，不能按地名误答',async()=>{
  const unexpected=async()=>{throw Error('常见已核问法不应调用模型');};const chat=createChat({generate:unexpected,search:unexpected},{retrieve:unexpected});
  for(const [nodeId,question,expected]of [['f_szc','手抓鸡可以蘸什么，怎样吃方便？',/蘸料/],['f_szc','洪蓝手抓鸡属于哪一级非遗？',/市级/],['n_wx','无想山的名字有什么故事？',/传说.*尚无史料确证/]]){
    const result=await chat(validateChat({nodeId,question}));assert.equal(result.kind,'preset');assert.match(result.content,expected);assert.equal(result.speaker.id,HOST_ID);
  }
  assert.equal(queryVisitorQA('f_szc','手抓鸡怎么吃，又是哪一级非遗？'),null);
  assert.equal(queryVisitorQA('n_wx','无想山今天门票和天气怎么样？'),null);
  assert.equal(queryVisitorQA('n_fjb','傅家边有没有极光？'),null);
  assert.equal(queryVisitorQA('n_wx','周邦彦生日是哪天？'),null);
  assert.equal(queryVisitorQA('n_tsq','人工讲解多少钱？'),null);
});

test('一个答复合并工具结果和来源，部分失败不丢失已查项目，也不声称协作',async()=>{
  const chat=createChat({weather:async()=>{throw Error('offline');}},{retrieve:async()=>[]});
  const result=await chat(validateChat({question:'溧水今天天气和退票怎么处理？'}));
  assert.equal(result.replies.length,1);assert.equal(result.speaker.id,HOST_ID);assert.equal(result.collaboration,undefined);
  assert(result.operations.trace.every(t=>t.agentId===HOST_ID));assert(result.operations.trace.some(t=>t.taskId==='weather'&&t.status==='failed'));assert(result.operations.trace.some(t=>t.taskId==='support'&&t.status==='completed'));
  assert.match(result.content,/订单|退改/);assert.match(result.content,/未完成/);
});

test('宽泛行程问题先给有用概况，只追问缺项，新天数和交通优先',async()=>{
  const unexpected=async()=>{throw Error('宽泛行程不应先检索不相关事实');};
  const chat=createChat({generate:unexpected},{retrieve:unexpected});
  const first=await chat(validateChat({question:'只有一天，没有车，怎么安排？'}));
  assert.match(first.content,/一天时间.*没有车/s);assert.match(first.content,/从哪里出发/);assert.doesNotMatch(first.content,/先告诉我来几天/);
  const next=await chat(validateChat({question:'改成一天，自驾出行',history:[{role:'user',content:'两天，没有车，怎么安排？'}]}));
  assert.match(next.content,/一天时间/);assert.doesNotMatch(next.content,/两天一晚|没有车的话/);
});
