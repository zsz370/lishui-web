import { hotelSearchKeywords } from '../data/hotelBrands.js';

export function hotelKeywordChoice(text) {
  text=String(text||'');
  if(/品牌不限|不限品牌|不限制品牌|不挑品牌|任何品牌/.test(text))return '';
  const found=hotelSearchKeywords.flatMap(keyword=>[...text.matchAll(new RegExp(keyword,'gi'))].filter(match=>!/(?:不要|不住|不考虑|不选|不想(?:住|要)?|排除)[^，。；]{0,3}$/.test(text.slice(0,match.index))).map(match=>({keyword,index:match.index,length:keyword.length})));
  found.sort((a,b)=>a.index-b.index||b.length-a.length);
  const last=found.at(-1);if(!last)return undefined;
  const overlap=found.find(item=>item.index<=last.index&&item.index+item.length>=last.index+last.length);
  return ['华住','华住会'].includes(overlap?.keyword||last.keyword)?'华住':overlap?.keyword||last.keyword;
}
export function hotelSearchIntent(text) {
  const keyword=hotelKeywordChoice(text);
  return Boolean(keyword&&!/股价|股票|证券|集团历史|品牌历史|什么时候成立/.test(text)&&(/想住|住|找|看看|推荐|换|优先|旗下|酒店|连锁|有吗|有没有|呢|怎么样/.test(text)||text.trim()===keyword));
}
export const hotelBudgetUnrestricted = text => /预算(?:不限|灵活)|不限(?:预算|价格)|不设(?:价格|预算)?上限|取消预算|去掉预算|不限制价格/.test(text);
export const hotelPreferenceFollowUp = text => /^(?:评分|品牌|档次|房价|换一批|换几家|再推荐几家|不住|不考虑|不要刚才)|住好(?:点|一点)|便宜(?:点|一点)|预算(?:不限|灵活)/.test(text);
export function extractHotelPreferences(input) {
  const messages=[...(input.history||[]).filter(item=>item.role==='user').map(item=>item.content),input.question||''];
  const result={sort:'comfort',keyword:'',excludeNames:[],excludeKeywords:[]};
  for(const text of messages){
    for(const word of hotelSearchKeywords)if(new RegExp('(?:不要|不住|不考虑|不选|不想(?:住|要)?|排除)[^，。；]{0,3}'+word,'i').test(text)){
      const excluded=['华住','华住会'].includes(word)?'华住':word;
      if(!result.excludeKeywords.includes(excluded))result.excludeKeywords.push(excluded);
      if(result.keyword===excluded)result.keyword='';
    }
    const keyword=hotelKeywordChoice(text);if(keyword!==undefined)result.keyword=keyword;
    if(keyword)result.excludeKeywords=result.excludeKeywords.filter(word=>word!==keyword);
    if(/舒适|住好点|住好一点|档次高|好一点|别.*(?:太便宜|小旅馆)|(?:不要|不住).*(?:旅社|低价|便宜)/.test(text))result.sort='comfort';
    if(/评分(?:优先|高|排序)|高评分|按评分|评价好/.test(text))result.sort='rating';
    if(/便宜(?:优先|点|一点)|最便宜|最低价|价格(?:从低到高|升序)|经济实惠|省钱|低价优先/.test(text))result.sort='budget';
    if(/距离优先|按距离|最近的|离.+最近/.test(text))result.sort='nearby';
    if(hotelBudgetUnrestricted(text)){delete result.minPrice;delete result.maxPrice;result.budgetCleared=true;}
    const range=text.match(/(?:每晚|房价|住宿预算|酒店预算|预算)\s*(\d{1,5})\s*(?:到|至|[-—~～])\s*(\d{1,5})(?:元|块)?/) || text.match(/(?<![\d./-])(\d{2,5})\s*(?:到|至|[-—~～])\s*(\d{2,5})\s*(?:元|块)/);
    if(range&&!/总预算|行程预算/.test(text)){result.minPrice=Number(range[1]);result.maxPrice=Number(range[2]);delete result.budgetCleared;}
    else if(/预算|每晚|房价|以内|以下/.test(text)&&!/总预算|行程预算/.test(text)&&/\d{2,5}\s*(?:元|块|以内|以下)/.test(text)){delete result.minPrice;delete result.maxPrice;delete result.budgetCleared;}
    if(/不限制评分|评分不限|取消评分|去掉评分/.test(text))delete result.minScore;
    const minimum=text.match(/(?:评分|评价)\s*(?:至少|不低于|高于|要|在)?\s*([0-5](?:\.\d{1,2})?)\s*(?:分)?\s*(?:及以上|以上|起|都行)/) || text.match(/(?:评分|评价)\s*(?:至少|不低于|高于)\s*([0-5](?:\.\d{1,2})?)/);
    if(minimum)result.minScore=Number(minimum[1]);
  }
  const latest=String(input.question||'');
  if(/换一批|换几家|其他酒店|别的酒店|再推荐几家|不要刚才/.test(latest)){
    const previous=(input.history||[]).findLast(item=>['expert','assistant'].includes(item.role)&&!item.incomplete&&/^\d+\.\s+.+[：:]/m.test(item.content));
    if(previous)result.excludeNames=[...previous.content.matchAll(/^\d+\.\s+(.+?)[：:]/gm)].map(match=>match[1].trim()).slice(0,20);
  }
  return result;
}
