// 仅用于品牌检索与名称匹配，不证明某家门店的设施、房型、评分或库存。
// 华住品牌目录来自官方投资者关系页，核对日期：2026-10-08。
export const hotelBrandReference = {label:'华住集团：品牌目录',url:'https://ir.hworld.com/zh-hans/',checkedAt:'2026-10-08'};
export const hworldKeywords = ['桔子水晶','全季大观','全季','桔子','汉庭','星程','漫心','美仑','城际','海友','你好酒店','怡莱','禧玥','花间堂','欢阁','CitiGO'];
export const comfortKeywords = ['桔子水晶','全季大观','全季','桔子','漫心','美仑','城际','禧玥','花间堂','星程'];
// 其他品牌只按游客给出的名字搜索，不在这里推断集团归属。
export const hotelSearchKeywords = [...hworldKeywords,'亚朵','如家','希尔顿','万豪','维也纳','开元','宜尚','华住会','华住'];
export const isHworldName = name => hworldKeywords.some(keyword=>String(name||'').toLowerCase().includes(keyword.toLowerCase()));
