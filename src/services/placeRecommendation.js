import {nodes,mainNodes} from '../data/nodes.js';
import {host} from '../data/personas.js';
import {guideSuggestions} from './guideSuggestions.js';
import {reviewedEvidence} from './guideCollaboration.js';
import {nodeNames,dialogueContext} from './conversationContext.js';
import {hotelSearchIntent} from './stayPreferences.js';

const unrelated=/工作|学习|编程|代码|写作|作文|文案|小说|电影|音乐|书籍|一本书|星座|生日|注册|登录|账号|退款|救命|急救/;
const specificFacts=/门票|票价|价格|多少钱|档期|几点|班次|末班|开放|预约|演出|历史|关系|联系|是什么|什么意思|名字|由来|非遗|天气|酒店|住宿|民宿|入住|退房|交通|怎么去|怎么走|翻译|美食|好吃|吃什么|乡味|特产|伴手礼/;
const broadPlaces=/推荐(?:几个|些|个)?(?:地方|景点|去处)|有什么好玩(?:的)?|有什么推荐|哪里好玩|哪里值得去|去哪玩|值得去的地方|有什么值得去|溧水怎么玩|景点推荐/;
const shortRequest=/^(?:有没有推荐|推荐一下|推荐几个|推荐些)[？?。！!\s]*$/;
const seasonalRequest=/(?:十[一二]?|[一二三四五六七八九]|1[0-2]|[1-9])月(?:份)?|月份|季节|春天|春季|夏天|夏季|秋天|秋季|冬天|冬季|春夏秋冬/;
export function isPlaceRecommendation(input){
 const question=String(input.question||'');
 if(unrelated.test(question)||specificFacts.test(question)||hotelSearchIntent(question))return false;
 const context=dialogueContext(input);
 if(shortRequest.test(question)&&(input.serviceId&&input.serviceId!=='planning'||context.task&&!['planning','knowledge'].includes(context.task)))return false;
 if(nodes.some(node=>nodeNames(node).some(name=>question.includes(name))))return false;
 return broadPlaces.test(question)||shortRequest.test(question)||seasonalRequest.test(question);
}
export function placeRecommendation(input){
 if(!isPlaceRecommendation(input))return null;
 const choices=mainNodes.slice(0,4);
 const sources=[...new Map(choices.flatMap(node=>node.introductionSources).map(source=>[source.url,source])).values()];
 const relatedTopics=choices.flatMap(node=>guideSuggestions(node.id));
 return {kind:'guide',speaker:host,content:'可以先从这四处认识溧水，挑一处喜欢的，再把行程连起来：\n\n'+choices.map((node,index)=>`${index+1}. ${node.name}——${node.introduction[0]}`).join('\n\n')+'\n\n开放、票价和当期活动，出发前再向景区或主办方确认。想先了解哪一处？也可以告诉我有几天、同行人和出行方式。',sources,source:'已审景点简介',sourceUrl:sources[0]?.url,evidenceGroups:reviewedEvidence(sources),relatedTopics,suggest:['只有一天，没有车，怎么逛溧水？','溧水两天一夜自驾游怎么安排？'],links:[...choices.map(node=>({label:node.name,url:'/nodes/'+node.id})),{label:'浏览全部风物',url:'/nodes'}]};
}
