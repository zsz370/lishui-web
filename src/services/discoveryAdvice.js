import { getNode } from '../data/nodes.js';
import { host } from '../data/personas.js';
export function discoveryAdvice(question, plan) {
  if(plan.mentioned.length||/级别|依据|编号|几级|名字|由来|怎么做|怎么吃|怎样做|如何做|天气|门票|票价|开放|预约|演出|档期|住宿|酒店|退票|翻译|英文|求助|救命|急救|走失|退款|投诉|厕所|卫生间|母婴室|交通|换乘|怎么去|怎么到|怎么走|轮椅|无障碍/.test(question)) return null;
  const general=/哪里|哪些|什么|哪儿|推荐|找|想看|想吃|尝|看看/.test(question);
  const food=general&&/美食|好吃|吃什么|乡味|特产/.test(question),scenery=general&&/景点|好玩|风景|山水/.test(question),culture=general&&/民俗|非遗|乡里故事/.test(question);
  if(Number(food)+Number(scenery)+Number(culture)!==1)return null;
  const choices=(food?['f_szc','f_nr','f_ydg']:scenery?['n_tsq','n_wx','n_sj']:['c_ldl','c_tj','c_xsm']).map(getNode);
  const lead=food?'想尝乡味，可以先从这三样认识：':scenery?'想看山水，可以先挑一种喜欢的风景：':'想了解乡里故事，可以从这三项开始：';
  const notes=food?['按口味手撕鸡肉，搭配店家蘸料。','认识洪蓝的本地乡味。','看看当地的传统糕点制作技艺。']:scenery?['沿河谷认识胭脂河的开河故事。','在山林间慢步，了解无想寺与地方掌故。','欣赏开阔湖景，具体效果取决于水位和天气。']:['从龙舞、传统形制和流传故事认识乡情。','了解以铁为材料的锻制与画面构图。','认识使用马形道具的传统舞蹈。'];
  const sources=[...new Map(choices.flatMap(node=>node.introductionSources).map(source=>[source.url,source])).values()];
  return {kind:'guide',speaker:host,content:lead+'\n'+choices.map((node,i)=>`${node.name}：${notes[i]}`).join('\n')+'\n你对哪一项更感兴趣？可以继续问，也可以先打开风物名片。',sources,source:'风物资料与游览建议',sourceUrl:sources[0]?.url,links:choices.map(node=>({label:node.name,url:'/nodes/'+node.id}))};
}
