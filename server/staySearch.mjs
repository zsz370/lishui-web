import { AppError, textField } from './core.mjs';
import { comfortKeywords, isHworldName } from '../src/data/hotelBrands.js';

const fail=()=>{throw new AppError('INVALID_INPUT','住宿筛选条件格式不正确');};
export function normalizeStaySearch(query) {
  const raw=query.hotelPreference??{};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail();
  const sort=raw.sort??'comfort';if(!['comfort','rating','budget','nearby'].includes(sort))fail();
  const keyword=raw.keyword==null?'':textField(raw.keyword,'酒店品牌关键词',80,false)||'';
  const result={sort,keyword,excludeNames:[],excludeKeywords:[]};
  for(const key of ['minPrice','minScore'])if(raw[key]!==undefined){if(!Number.isFinite(raw[key])||raw[key]<(key==='minScore'?0:1)||raw[key]>(key==='minScore'?5:100000))fail();result[key]=raw[key];}
  if(result.minPrice!=null&&query.maxPrice!=null&&result.minPrice>query.maxPrice)fail();
  for(const key of ['excludeNames','excludeKeywords'])if(raw[key]!==undefined){if(!Array.isArray(raw[key])||raw[key].length>20)fail();result[key]=raw[key].map(value=>textField(value,'不再推荐的酒店条件',120));}
  return result;
}
export const stayProviderSort = preference => ({comfort:'rate_desc',rating:'rate_desc',budget:'price_asc',nearby:'distance_asc'}[preference.sort]);
export function stayQueryKeyword(destName,preference) {
  return preference.keyword?[destName.includes('溧水')?'溧水':destName,preference.keyword].join(' '):'';
}
const priceOf=value=>{
  const match=String(value??'').replace(/\s/g,'').match(/^(?:¥|￥)?(\d+(?:\.\d{1,2})?)(?:元)?(?:起)?$/);return match?Number(match[1]):null;
};
const scoreOf=value=>{if(value===null||value===undefined||value==='')return null;const score=Number(String(value).replace(/分$/,''));return Number.isFinite(score)&&score>=0&&score<=5?score:null;};
export function selectStayHotels(hotels,query) {
  const pref=query.hotelPreference||{sort:'comfort',keyword:'',excludeNames:[]};
  const isLocal=hotel=>{
    if(!query.destName?.includes('溧水'))return true;
    const location=hotel.name+' '+hotel.address;
    if(/秦淮区|建邺区|鼓楼区|玄武区|栖霞区|雨花台区|江宁区|浦口区|六合区|高淳区/.test(location)&&!/溧水区/.test(location))return false;
    return /溧水/.test(location);
  };
  const unique=new Map();
  hotels.forEach((hotel,index)=>{
    if(!hotel||typeof hotel!=='object'||Array.isArray(hotel))return;
    const name=String(hotel.name||''),address=String(hotel.address||''),priceValue=priceOf(hotel.price),score=scoreOf(hotel.score??hotel.rate);
    if(!isLocal(hotel))return;
    if(pref.keyword&&(pref.keyword==='华住'?!isHworldName(name):!name.toLowerCase().includes(pref.keyword.toLowerCase())))return;
    if(pref.excludeNames?.includes(name))return;
    if(pref.excludeKeywords?.some(word=>word==='华住'?isHworldName(name):name.toLowerCase().includes(word.toLowerCase())))return;
    if(pref.minPrice!=null&&(priceValue==null||priceValue<pref.minPrice))return;
    if(query.maxPrice!=null&&(priceValue==null||priceValue>query.maxPrice))return;
    if(pref.minScore!=null&&(score==null||score<pref.minScore))return;
    if(pref.sort==='comfort'&&/旅社|招待所|青年旅舍/.test(name)&&!query.hotelTypes)return;
    const id=String(hotel.shId||hotel.id||name+'|'+address);
    if(!unique.has(id))unique.set(id,{...hotel,score,priceValue,hotelType:typeof hotel.star==='string'?hotel.star.slice(0,40):'',brandName:typeof hotel.brandName==='string'?hotel.brandName.slice(0,80):null,supplierIndex:index});
  });
  const ranked=[...unique.values()];
  ranked.sort((a,b)=>{
    if(pref.sort==='budget')return (a.priceValue??Infinity)-(b.priceValue??Infinity)||a.supplierIndex-b.supplierIndex;
    if(pref.sort==='nearby')return a.supplierIndex-b.supplierIndex;
    if(a.score!=null||b.score!=null)return (b.score??-1)-(a.score??-1)||a.supplierIndex-b.supplierIndex;
    if(pref.sort==='comfort'||pref.sort==='rating'){
      const preferred=hotel=>comfortKeywords.some(word=>hotel.name.includes(word))?2:/舒适|高档|豪华/.test(hotel.hotelType)&&hotel.brandName?1:0;
      const difference=preferred(b)-preferred(a);if(difference)return difference;
      const category=hotel=>/舒适|高档|豪华/.test(hotel.hotelType)?1:0;if(category(a)!==category(b))return category(b)-category(a);
    }
    return a.supplierIndex-b.supplierIndex;
  });
  return {hotels:ranked.slice(0,5),candidateCount:ranked.length,ratingUnavailable:hotels.length>0&&hotels.every(hotel=>scoreOf(hotel.score??hotel.rate)===null)};
}
