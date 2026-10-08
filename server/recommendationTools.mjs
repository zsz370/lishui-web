import { dates, today, safeUrl } from './core.mjs';
import { getNode } from '../src/data/nodes.js';
import { validPoint } from '../src/data/itinerary.js';
import { extractTripContext } from '../src/services/chatContext.js';
import { transportMode } from '../src/services/tripConditions.js';
import { staySearchDescription, stayHotelLine } from '../src/services/stayPresentation.js';

// 既有适配器负责域名、凭据和数据校验。这里决定何时调用、如何把返回值接入方案。
export async function recommendationTools(input, prepared, slots, providers, runTask, {signal} = {}) {
  const check = () => signal?.throwIfAborted();
  const ctx = extractTripContext(input), results = [];
  const actualMode = [...(input.history||[]).filter(item=>item.role==='user').map(item=>transportMode(item.content)),transportMode(input.question)].filter(Boolean).at(-1);
  const jobs = [];
  const add = (id,tools,work) => jobs.push(runTask(id,tools,work).then(result=>{if(result)results.push(result);}));
  const offset = ctx.departureDate && ctx.weatherDate ? (Date.parse(ctx.departureDate)-Date.parse(today()))/86400000 : -1;
  if (providers.weather && offset>=0 && offset<7) add('weather',['weather_forecast'],async()=>{
    const data = await providers.weather(ctx.location);check();
    const days = (data.days||[]).filter(day=>day.date>=ctx.departureDate&&day.date<=(ctx.returnDate||ctx.departureDate)&&Number.isFinite(day.min)&&Number.isFinite(day.max));
    if(!days.length)return null;
    const sourceUrl = safeUrl(data.sourceUrl), sources=sourceUrl?[{label:data.provider,url:sourceUrl}]:[];
    const content = '\n出行天气\n'+days.map(day=>`${day.date} ${day.text}，${day.min}—${day.max}℃。${/雨|雪|雷/.test(day.text)?'把户外停留缩短，展馆或商场作为调整方向。':'按体感增减衣物。'}`).join('\n')+'\n这是查询时的城区预报，湖边和山间按现场天气调整。';
    return {kind:'weather',content,sources,checkedAt:new Date(data.fetchedAt).toISOString()};
  });
  if (prepared.context.nights && providers.stays && ctx.checkInDate && ctx.checkOutDate) {
    try {
      dates(ctx.checkInDate,ctx.checkOutDate);
      add('stay',['stay_search'],async()=>{
        const data = await providers.stays({destName:'南京市溧水区',checkInDate:ctx.checkInDate,checkOutDate:ctx.checkOutDate,maxPrice:ctx.maxPrice,poiName:ctx.destination,hotelPreference:ctx.hotelPreference});check();
        const hotels=(data.hotels||[]).slice(0,3);
        if(!hotels.length)return null;
        const sources=hotels.map(hotel=>({label:String(hotel.name).slice(0,120),url:safeUrl(hotel.url)})).filter(source=>source.url);
        const content=`\n住宿候选｜${ctx.checkInDate}入住，${ctx.checkOutDate}退房\n${staySearchDescription(data)}\n`+hotels.map(stayHotelLine).join('\n')+'\n候选来自本次日期查询；报价不是锁房结果，入住人数需在详情页核对房型与核定人数。';
        return {kind:'stay',content,sources,checkedAt:data.checkedAt};
      });
    } catch {check(); /* 无效日期不调用供应商，也不编造酒店结果。 */}
  }
  if (actualMode && providers.places && providers.route) add('transport',['map_search','route_plan'],async()=>{
    const visits=slots.filter(slot=>slot.role==='visit'),pairs=[];
    for(let day=1;day<=prepared.context.days&&pairs.length<2;day++){
      const dayVisits=visits.filter(slot=>slot.day===day);if(dayVisits.length>=2)pairs.push([dayVisits[0],dayVisits[1]]);
    }
    const cache=new Map();
    const locate=async id=>{
      if(!cache.has(id))cache.set(id,(async()=>{
        const name=getNode(id).name.split('·')[0],data=await providers.places(name,'320117');check();
        const matches=(data.places||[]).filter(place=>{
          const label=String(place.name||'').replace(/^(?:(?:南京市?|溧水区?))+/,'');
          return validPoint(place.location)&&place.adcode==='320117'&&(label===name||label===name+'风景区'||label===name+'景区');
        });
        // 多个正式入口或跨区同名候选交给游客选择，不能静默选错地点。
        const unique=[...new Map(matches.map(place=>[place.location,place])).values()];
        return unique.length===1?{...unique[0],checkedAt:data.checkedAt,provider:'高德地图'}:null;
      })());
      return cache.get(id);
    };
    const settled=await Promise.allSettled(pairs.map(async([fromSlot,toSlot])=>{
      const [from,to]=await Promise.all([locate(fromSlot.nodeId),locate(toSlot.nodeId)]);check();if(!from||!to)return null;
      const data=await providers.route(from.location,to.location,actualMode,{originCity:from.citycode,destinationCity:to.citycode});check();
      const path=data.paths?.[0],duration=Number(path?.duration),distance=Number(path?.distance);if(!path||!Number.isFinite(duration)||duration<=0||!Number.isFinite(distance)||distance<=0)return null;
      return {day:fromSlot.day,fromNodeId:fromSlot.nodeId,toNodeId:toSlot.nodeId,from,to,minutes:Math.ceil(duration/60),kilometers:(distance/1000).toFixed(1),checkedAt:data.checkedAt,mode:actualMode};
    }));check();
    const routes=settled.filter(item=>item.status==='fulfilled'&&item.value).map(item=>item.value);
    if(!routes.length)return null;
    const sources=[{label:'高德地图',url:'https://www.amap.com/'}];
    const content='\n景点间交通参考\n'+routes.map(route=>`第${route.day}天：${getNode(route.fromNodeId).name} → ${getNode(route.toNodeId).name}，${{driving:'自驾',transit:'公共交通',walking:'步行'}[route.mode]}参考约${route.minutes}分钟、${route.kilometers}公里。`).join('\n')+'\n按本次地图返回定位；正式入口、路况和现场接驳以出发时导航与景区指引为准。';
    return {kind:'transport',content,sources,routes,checkedAt:routes.at(-1).checkedAt};
  });
  await Promise.all(jobs);check();
  return {context:ctx,results,content:results.sort((a,b)=>['weather','stay','transport'].indexOf(a.kind)-['weather','stay','transport'].indexOf(b.kind)).map(result=>result.content).join('')};
}
