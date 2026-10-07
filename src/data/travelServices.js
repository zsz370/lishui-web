export const travelServices = [
  { id: 'weather', name: '天气与穿着', shortName: '查天气', icon: 'weather', expert: '01_huaiyuanjie', description: '看看近期预报，再决定带什么、怎样逛。', prompts: ['溧水明天天气怎么样？', '下雨了行程怎么调整？', '今天出门穿什么？'], points: ['联网获取溧水城区及南京城区的近期预报，标明地点、日期和数据时间。', '山区与湖边体感可能不同，出发前同时查看官方预警及景区公告。'] },
  { id: 'stay', name: '住宿与度假', shortName: '选住宿', icon: 'stay', expert: '01_huaiyuanjie', description: '按预算、同行人群和交通方式，选一处落脚点。', prompts: ['带老人，没有车，住哪方便？', '一家三口，预算300元，推荐住宿', '想住山里，有哪些民宿？'], points: ['先确定预算、入住日期、同行人群、想去的片区和出行方式。', '推荐住宿片区与可比较的民宿，房价、房态和设施由预订渠道确认。'] },
  { id: 'transport', name: '交通与出行', shortName: '问交通', icon: 'transport', expert: '01_huaiyuanjie', description: '高铁、地铁、自驾与最后一段接驳，都提前想好。', prompts: ['从南京南站怎么去溧水？', 'S7和S9有什么区别？', '自驾去天生桥怎么停车？'], points: ['高铁溧水站与地铁 S7 溧水站是不同站点，导航时核对交通方式。', 'S7 服务溧水城区方向，S9 有跨石臼湖路段；班次与末班车以运营方公布为准。', '把到站后的公交、出租车或接驳一起安排，避免只规划到车站。'] },
  { id: 'etiquette', name: '礼仪与双语', shortName: '礼仪双语', icon: 'etiquette', expert: '01_huaiyuanjie', description: '参观礼仪、拍照询问和常用英文，让交流更从容。', prompts: ['参观寺庙有什么礼仪？', '可以拍照吗，用英语怎么说？', '我想找洗手间，英文怎么说？'], points: ['参观寺庙、展馆和乡村时，尊重现场规则；拍照、录音与触摸展品先询问。', '拍摄居民、匠人或表演者时先征得同意，保持通道畅通。', '提供常用旅游中英短句，具体景点英文名称以现场官方标识为准。'] },
  { id: 'support', name: '求助与退改', shortName: '游客求助', icon: 'support', expert: '01_huaiyuanjie', description: '遗失物品、票务问题与现场求助，先找到正确渠道。', prompts: ['丢了东西怎么办？', '门票可以退吗？', '遇到服务问题找谁？'], points: ['遗失物品先联系场所工作人员或游客中心，说明时间、地点与物品特征。', '退改以具体订单条款、售票渠道和景区公告为准，不承诺退款结果。', '紧急情况直接联系现场工作人员及相应应急电话；网页不代替报警或登记。'] },
  { id: 'accessibility', name: '亲子与无障碍', shortName: '同行关怀', icon: 'accessibility', expert: '01_huaiyuanjie', description: '带娃、带长辈或使用轮椅，提前确认设施和路况。', prompts: ['带轮椅出行要提前确认什么？', '带老人孩子怎么安排？', '哪里有母婴室和卫生间？'], points: ['预约前向场所确认电梯、坡道、无障碍卫生间和休息点，避免把未知设施当作已具备。', '带长辈与孩子时减少跨片区折返，留出休息时间；住宿同步确认床型和防滑设施。'] },
  { id: 'shopping', name: '伴手礼与消费', shortName: '选伴手礼', icon: 'shopping', expert: '01_huaiyuanjie', description: '带走一点乡味，也看清保存方式、价格和购买渠道。', prompts: ['有什么适合带回家的伴手礼？', '糕点怎么保存，坐高铁能带吗？', '买文创需要注意什么？'], points: ['按预算和返程时长挑选糕点、果品或文创，不默认所有食品都能常温久放。', '查看生产日期、配料、保存条件和明码标价，保留购买凭证。'] },
  { id: 'planning', name: '日常与行程', shortName: '安排行程', icon: 'planning', expert: '01_huaiyuanjie', description: '把游玩、吃住行与休息，放进同一份出行计划。', prompts: ['只有一天，又没有车，怎么安排？', '两天一晚，要先考虑什么？', '下雨天适合怎样逛？'], points: ['先按天数、交通方式和兴趣选片区，再安排住宿与休息，不追求一次走完所有地点。', '行前查看天气、预约要求和返程交通，具体设施与开放信息需在出发前确认。'] },
];
export const getTravelService = (id) => travelServices.find((service) => service.id === id);
export const serviceUrl = (id) => `/services${id ? `?service=${id}` : ''}`;

export const serviceSources = {
  stays: { label: '溧水区政府：民宿特色品牌（2025）', url: 'https://www.njls.gov.cn/zwgk/qzxta/lszxschy/202512/t20251201_5701172.html' },
  transit: { label: '南京市政府：地铁运营调整（2026-09-29）', url: 'https://www.nanjing.gov.cn/msxx/202609/t20260929_5919052.html' },
  hotlines: { label: '南京市政府：公共服务电话', url: 'https://english.nanjing.gov.cn/LivinginNanjing/ServiceHotlines/' },
  etiquette: { label: '文化和旅游部门：文明旅游指引', url: 'https://wglj.jiyuan.gov.cn/14204/15220/19023/19035/t927096.html' },
};

// 来源可核对的住宿候选；不把档次、房价或未知设施当成已确认事实。
export const stayCandidates = [
  { id: 'city', name: '溧水城区酒店', area: '城区片区', kind: 'city', intro: '先比较靠近地铁站、餐饮与目标景点的酒店，适合希望减少乡村接驳的旅客。', checks: '核对车站距离、电梯、床型与夜间交通；这是选址建议，不是某家酒店的房态。' },
  { id: 'shanao', name: '山凹村民宿片区', area: '乡村片区', kind: 'rural', intro: '想住进乡村、围绕田园安排慢游，可以比较村内不同民宿。', checks: '逐家核对位置、院落台阶、停车、早餐与接驳，不默认宠物或儿童设施齐全。' },
  { id: 'weijianshan', name: '未见山', area: '石山下村', kind: 'rural', intro: '政府资料列举的村居民宿品牌，可作为乡村住宿的比较候选。', checks: '向经营方核对最新营业情况、客房类型和到景点的路线。' },
  { id: 'huaji', name: '花迹／竹上云想', area: '无想山居相关片区', kind: 'mountain', intro: '政府资料列举的山居品牌，想安静度假时可以分别查看两家的位置与客房。', checks: '两家是不同住宿品牌；分别核对地址、接驳、房价与设施。' },
];
export const stayDefaults = { budget: 'flexible', companions: 'general', transport: 'transit', area: 'any' };
export function recommendStays(preferences = stayDefaults) {
  const pref = { ...stayDefaults, ...preferences };
  const scored = stayCandidates.map((candidate) => {
    let score = 0;
    if (pref.area === candidate.kind) score += 8;
    if (candidate.kind === 'city' && pref.transport === 'transit') score += 6;
    if (candidate.kind === 'city' && pref.companions === 'seniors') score += 5;
    if (candidate.kind === 'rural' && pref.transport === 'drive') score += 2;
    if (candidate.kind === 'city' && pref.budget === '300') score += 2;
    return { ...candidate, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}
