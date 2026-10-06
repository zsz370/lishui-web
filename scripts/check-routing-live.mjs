import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { getConfig } from '../server/core.mjs';
import { readChatEvents } from '../src/services/chatStream.js';

const base=`http://127.0.0.1:${getConfig().port}`;
const cases=[
  {category:'历史山水',input:{nodeId:'n_tsq',question:'开凿胭脂河和历史漕运有什么联系？'},speaker:'03_yanzhike'},
  {category:'非遗',input:{nodeId:'c_ldl',question:'龙舞骆山大龙的项目级别是什么？'},speaker:'04_dalonggu'},
  {category:'节庆曲艺',input:{nodeId:'c_dw',question:'打五件的正式类别是什么？'},speaker:'05_gusanniang'},
  {category:'乡音音乐',input:{nodeId:'c_syg',question:'石臼渔歌在正式名录中属于哪类？'},speaker:'06_ruanyunan'},
  {category:'地方美食',input:{nodeId:'f_ydg',question:'洪蓝玉带糕对应省级非遗哪个项目？'},speaker:'07_fuxiaomei'},
  {category:'园林研学',input:{nodeId:'n_zy',question:'周园有哪些建筑和收藏参观线索？'},speaker:'02_laizhusheng'},
  {category:'天气',input:{question:'今天溧水城区天气怎么样？'},speaker:'11_dongpingjie',service:'weather'},
  {category:'住宿缺日期',input:{question:'想订溧水的住宿'},speaker:'08_wuxiangsao',service:'stay',kind:'needs_input'},
  {category:'交通',input:{question:'从南京南站怎么去天生桥？'},speaker:'09_shijiulang',service:'transport'},
  {category:'双语',input:{question:'请把“我想去天生桥”翻译成英文'},speaker:'12_dongluke',service:'etiquette'},
  {category:'求助退改',input:{question:'退票退款应该准备哪些信息？'},speaker:'11_dongpingjie',service:'support'},
  {category:'同行需求',input:{question:'带轮椅出行需要先确认什么？'},speaker:'11_dongpingjie',service:'accessibility'},
  {category:'伴手礼',input:{question:'购买伴手礼要核对什么？'},speaker:'10_meiguisao',service:'shopping'},
  {category:'行程条件',input:{question:'安排一天行程要先给哪些条件？'},speaker:'01_huaiyuanjie',service:'planning'},
  {category:'跨节点',input:{question:'天生桥和洪蓝玉带糕分别有什么文化线索？'},speakers:['03_yanzhike','07_fuxiaomei']},
];
const output=[];
for(const item of cases){
  const events=[],started=Date.now();
  const response=await fetch(`${base}/api/chat/stream`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item.input),signal:AbortSignal.timeout(95000)});
  assert.equal(response.status,200,item.category);
  const result=await readChatEvents(response,(event)=>events.push({...event,receivedAfterMs:Date.now()-started}));
  const replies=result.replies||[result];
  if(item.speaker)assert(replies.some((reply)=>reply.speaker.id===item.speaker),item.category);
  if(item.service)assert(result.serviceId===item.service||replies.some((reply)=>reply.serviceId===item.service),item.category);
  if(item.kind)assert.equal(result.kind,item.kind,item.category);
  if(item.speakers)for(const id of item.speakers)assert(replies.some((reply)=>reply.speaker.id===id),id);
  assert(result.content.trim(),item.category);
  assert(events.every((event)=>['running','completed','needs_input','failed'].includes(event.status)));
  output.push({...item,durationMs:Date.now()-started,firstProgressMs:events[0]?.receivedAfterMs??null,events,result});
  console.log(JSON.stringify({category:item.category,kind:result.kind,durationMs:Date.now()-started,events:events.length}));
}
const ready=await(await fetch(`${base}/ready`)).json();assert(ready.ready);
await writeFile(new URL('../docs/agent-audit/routing-stream-live.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),scope:'15组真实本地流式HTTP：六类知识、八类服务及一组跨节点；未改远程服务器，不是游客试用或通用多智能体优越性结论',index:ready.index,cases:output},null,2)+'\n');
