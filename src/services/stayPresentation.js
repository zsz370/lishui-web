export const stayPrice = hotel => hotel.price ? /^\d+(?:\.\d{1,2})?$/.test(hotel.price) ? '¥'+hotel.price : hotel.price : '详情页查看报价';
export function staySearchDescription(data) {
  const pref=data.query?.hotelPreference;
  if(!pref)return '';
  return `${pref.keyword?`按“${pref.keyword}”筛选。`:''}${{comfort:'优先比较舒适型连锁酒店。',rating:'按平台评分优先查询。',budget:'按价格从低到高比较。',nearby:'优先比较靠近目标地点的住宿。'}[pref.sort]||''}${pref.minPrice!=null?data.query.maxPrice!=null?`报价范围${pref.minPrice}—${data.query.maxPrice}元。`:`报价${pref.minPrice}元以上。`:''}${pref.minScore!=null?`评分条件${pref.minScore}分以上。`:''}`;
}
export function stayHotelLine(hotel,index) {
  return `${index+1}. ${hotel.name}：${stayPrice(hotel)}${hotel.score!=null?` · 平台评分${hotel.score}分`:''}${hotel.hotelType?` · ${hotel.hotelType}`:''}\n${hotel.address||''}`;
}
export function stayEmptyReason(data) {
  if(data.query?.hotelPreference?.minScore!=null&&data.ratingUnavailable)return '平台没有返回可用于评分筛选的数值；可以先按品牌比较，再在详情页查看评价。';
  return '本次日期与条件下没有匹配的住宿；可调整品牌、预算或片区继续找。';
}
