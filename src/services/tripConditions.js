import { validDate } from '../data/itinerary.js';

const numbers={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
// 只解释游客给出的时长；“国庆”是旅行标签，不补成某年某日。
export function tripDuration(text) {
  const days = [...text.matchAll(/(?<![第\d十])([一二两三四五六七]|[1-7])\s*(?:天|日(?:游|(?=自驾|亲子|旅游|旅行|游玩)))/g)].at(-1)?.[1];
  const nights = [...text.matchAll(/(?<![\d十])([零一二两三四五六七]|[0-7])\s*(?:晚|夜)/g)].at(-1)?.[1];
  if (!days && !nights) return undefined;
  const count = value => value === '零' ? 0 : numbers[value] ?? Number(value);
  return { days: days ? count(days) : count(nights) + 1, nights: nights ? count(nights) : Math.max(0, count(days) - 1), nightsGiven: Boolean(nights) };
}
export const routingText = text => String(text||'').replace(/(?:不住|不订|不需要|不用|不要|无需)(?:再)?(?:查询|查|安排|推荐|找|订)?(?:酒店|住宿|民宿|订房|天气|预报|交通路线)/g,'');
export const dialogueTopicText = text => routingText(text).replace(/(?:不要|不必|不用|别|无需|不需要)(?:再)?(?:引导|转到|推荐|提|举|使用|用)?[^，。！？\n]{0,8}(?:旅游|旅行|景点|行程)(?:的?例子|话题|推荐)?/g,'');
export const partyDescription = text => {
  const match=text.match(/(\d{1,2}|[一二两三四五六七八九十])\s*(?:个?人|位)(以上)?/);
  return match?`${numbers[match[1]]||Number(match[1])}人${match[2]||''}`:/独行|一个人|独自/.test(text)?'1人':undefined;
};
export function companionProfile(preference,messages) {
  let profile=preference==='family'?'family':preference==='seniors'?'seniors':'general';
  for(const message of messages){
    const text=message.replace(/(?:不带|没带|没有|不用|不需要)[^，。；]{0,3}(?:孩子|老人|长辈|轮椅|娃)/g,'');
    if(text!==message||partyDescription(text))profile='general';
    if(/老人|长辈|轮椅/.test(text))profile='seniors';
    else if(/孩子|带娃|亲子/.test(text))profile='family';
  }
  return profile;
}
export function destinationStatement(text,task) {
  if(/(?:想|要|准备|计划|打算|决定|希望)(?:一起)?去|目的地|从.+(?:到|去)|怎么去|怎么到|想住|住在|住哪|围绕|附近|周边/.test(text))return true;
  return ['planning','stay','transport'].includes(task)&&!/门票|票价|历史|名字|传说|看点|是什么|怎么形成/.test(text);
}
export function explicitDates(text) {
  return [...text.matchAll(/(20\d{2})[-年/](\d{1,2})[-月/](\d{1,2})(?:日|号)?/g)]
    .map(([,year,month,day])=>`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`).filter(validDate);
}
export function relativeDate(text,today,addDays) {
  if(/后天/.test(text))return addDays(today,2);
  if(/明天/.test(text))return addDays(today,1);
  if(/今天|今晚/.test(text))return today;
  const weekday=text.match(/(?:(下|本)周|(?:周|星期|礼拜))([一二三四五六日天])/);
  if(!weekday)return undefined;
  const current=new Date(today+'T12:00:00Z').getUTCDay(),target={一:1,二:2,三:3,四:4,五:5,六:6,日:0,天:0}[weekday[2]];
  const mondayOffset=-(current+6)%7;
  const offset=weekday[1]?mondayOffset+(weekday[1]==='下'?7:0)+(target+6)%7:(target-current+7)%7;
  return addDays(today,offset);
}
export const hasDatePhrase = text => /20\d{2}[-年/]|今天|明天|后天|今晚|下周|本周|周末|国庆|星期|礼拜|(?:\d{1,2}|[一二三四五六七八九十]+)月|下个月|月底|(?:周)[一二三四五六日天]/.test(text);
export function transportMode(message) {
  const text=message.replace(/(?:不是|并非)(?:没有车|没车|无车)|(?:不|不用|不坐|不考虑|不选择)(?:自驾|开车|公交|地铁|公共交通|步行)/g,'');
  if(/自驾|开车/.test(text))return'driving';
  if(/公共交通|地铁|公交|无车|没有车|没车/.test(text))return'transit';
  if(/步行|走路/.test(text))return'walking';
}
export function namedDates(text,today,addDays) {
  const datePattern='(?:20\\d{2}[-年/]\\d{1,2}[-月/]\\d{1,2}(?:日|号)?|明天|后天|今天|今晚|(?:下周|本周|星期|礼拜|周)[一二三四五六日天])';
  const roles={出发:'departureDate',出行:'departureDate',入住:'checkInDate',退房:'checkOutDate',返程:'returnDate',返回:'returnDate'};
  const values={};
  for(const match of text.matchAll(new RegExp('('+datePattern+')\\s*(出发|出行|入住|退房|返程|返回)','g'))){const date=explicitDates(match[1])[0]||relativeDate(match[1],today,addDays);if(date)values[roles[match[2]]]=date;}
  for(const match of text.matchAll(new RegExp('(出发|出行|入住|退房|返程|返回)(?:日期)?(?:是|为|改成|改为|：|:)?\\s*('+datePattern+')','g'))){const date=explicitDates(match[2])[0]||relativeDate(match[2],today,addDays);if(date)values[roles[match[1]]]=date;}
  return values;
}
