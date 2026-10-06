import { approvedQA } from '../src/data/presetQA.js';
import { today, addDays } from '../server/core.mjs';

const fact=(id,nodeId,question,reference,keywords)=>({id,category:'地方事实',input:{nodeId,question},referenceIds:approvedQA.filter((qa)=>qa.nodeId===nodeId&&qa.q===reference).map((qa)=>qa.id),expected:{keywords,citation:true},ablation:true});
export function evaluationScenarios(){
  const arrival=addDays(today(),1),departure=addDays(today(),2);
  return [
    fact('F01','n_tsq','天生桥的形成与人工开河有什么关系？','天生桥是天然的还是人工的？',['人工','巨石']),
    fact('F02','n_tsq','胭脂河红色景观指的是水还是两岸岩土？','胭脂河的水为什么是红的？',['岩土','氧化']),
    fact('F03','n_wx','韩熙载是什么人？','韩熙载是谁？',['南唐','不能证明']),
    fact('F04','n_wx','周邦彦在溧水任什么官？','周邦彦和溧水有什么关系？',['县令']),
    fact('F05','n_fjb','青梅采收与观赏梅花有哪些区别？','傅家边青梅和赏梅是一回事吗？',['不同阶段','不能据此']),
    fact('F06','n_sj','S9水上列车实际如何过湖？','石臼湖水上列车是什么？',['桥梁','S9']),
    fact('F07','c_ldl','龙舞骆山大龙的项目级别是什么？','骆山大龙是几级非遗？',['国家级','2008']),
    fact('F08','c_ldl','骆山大龙断尾故事应该当作历史吗？','骆山大龙为什么是断尾的？',['传说','史实']),
    fact('F09','c_dw','打五件的正式类别是什么？','打五件属于舞蹈还是曲艺？',['曲艺','JSⅤ-25']),
    fact('F10','c_syg','石臼渔歌在正式名录中属于哪类？','石臼渔歌是什么？',['传统音乐','NJⅡ-13']),
    fact('F11','f_ydg','洪蓝玉带糕对应省级非遗哪个项目？','洪蓝玉带糕是什么来头？',['省级','制作技艺']),
    fact('F12','c_xz','虾子灯的正式非遗类别是什么？','虾子灯列入哪一级、哪一类非遗？',['传统舞蹈','NJⅢ-33']),
    {id:'S01',category:'天气',input:{question:'今天溧水城区天气怎么样？'},expected:{keywords:[today(),'℃'],services:['weather']}},
    {id:'S02',category:'天气地点',input:{question:'今天南京城区天气怎么样？'},expected:{keywords:['南京城区'],services:['weather']}},
    {id:'S03',category:'缺日期住宿',input:{question:'想订溧水住宿'},expected:{keywords:['入住','退房'],services:['stay'],noOperations:['stays']}},
    {id:'S04',category:'住宿日期预算',input:{question:`${arrival}入住、${departure}退房，想订300元内的溧水住宿`},expected:{keywords:[arrival,departure,'300'],services:['stay']}},
    {id:'S05',category:'交通',input:{question:'从南京南站怎么去天生桥？'},expected:{keywords:['南京南站','入口'],services:['transport']}},
    {id:'S06',category:'缺目的地',input:{question:'怎么去最方便？'},expected:{keywords:['目的地'],services:['transport'],noOperations:['places','route']}},
    {id:'S07',category:'纯翻译',input:{nodeId:'n_tsq',question:'请把“我想去天生桥”翻译成英文'},expected:{keywords:[],services:['etiquette'],operations:['translate'],noOperations:['search','weather','stays','places']}},
    {id:'S08',category:'求助退改',input:{question:'退票退款应该准备哪些信息？'},expected:{keywords:['订单'],services:['support']}},
    {id:'S09',category:'无障碍',input:{question:'带轮椅出行需要先确认什么？'},expected:{keywords:['坡道'],services:['accessibility']}},
    {id:'S10',category:'伴手礼',input:{question:'购买伴手礼要核对什么？'},expected:{keywords:['保质期'],services:['shopping']}},
    {id:'M01',category:'天气+景点+路线',input:{nodeId:'n_wx',question:'今天无想山天气和文化看点是什么，从南京南站怎么去无想山？'},expected:{keywords:['℃','无想','南京南站'],services:['weather','transport'],citation:true}},
    {id:'M02',category:'跨节点',input:{question:'天生桥和洪蓝玉带糕分别有什么文化线索？'},expected:{keywords:['开河','玉带糕'],citation:true}},
    {id:'M03',category:'住宿+交通',input:{question:`从南京南站去无想山，${arrival}入住、${departure}退房，住宿300元内，交通怎么衔接？`},expected:{keywords:[arrival,'300','南京南站'],services:['stay','transport']}},
    {id:'M04',category:'多轮预算',input:{question:'预算改成300元以内',serviceId:'stay',history:[{role:'user',content:`${arrival}入住、${departure}退房，找600元内的溧水住宿`}]},expected:{keywords:[arrival,'300'],services:['stay']}},
    {id:'N01',category:'待核隔离',input:{nodeId:'c_syg',question:'来首溧水童谣？'},expected:{keywords:['尚未核准'],noOperations:['search','generate']}},
    {id:'N02',category:'有日期的票价参考',input:{nodeId:'n_tsq',question:'今天的天生桥门票多少钱？'},expected:{keywords:['18元','57元','85元','参考价'],forbidden:['现行票价为'],citation:true}},
    {id:'E01',category:'故障注入',input:{question:'今天溧水天气和退票怎么处理？'},failure:'weather',expected:{keywords:['暂时','退'],services:['weather','support']}},
    {id:'E02',category:'紧急求助',input:{nodeId:'c_ldl',question:'看骆山大龙时孩子走失了，请帮忙'},expected:{keywords:['110'],services:['support'],noOperations:['generate','search']}},
  ];
}
