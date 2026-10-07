// 2026-10-04 基础知识补齐。guidance 为结合公开指引的产品建议，
// 不证明具体场所已有设施、库存、开放项目或当前价格。
import { knowledgeSources } from './qaReview.js';
import { serviceSources } from './travelServices.js';

export const foundationSources = {
  preparation: { label: '文化和旅游部：2026中秋、国庆假期出游提示', url: 'https://www.mct.gov.cn/whzx/whyw/202609/t20260922_967218.htm', publishedAt: '2026-09-23' },
  learning: { label: '南京市体育局：大金山庄国防园（2023介绍）', url: 'https://sports.nanjing.gov.cn/ztzl/njtyxfxcj/hwyd/202307/t20230725_3970450.html', publishedAt: '2023-07-25' },
  farming: { label: '南京市农业农村局：2025吴村桥乌饭主题研学', url: 'https://nyncj.nanjing.gov.cn/nygzdt/202505/t20250506_5140493.html', publishedAt: '2025-05-06' },
  booking: { label: '大兴安岭地区市场监管局：网上预订住宿消费提示（通用建议）', url: 'https://www.dxal.gov.cn/dxal/c100025/202501/c13_302931.shtml', publishedAt: '2025-01-21' },
  labels: { label: '市场监管总局：月饼标签与保存消费提示（食品标签参考）', url: 'https://www.samr.gov.cn/xw/zj/art/2023/art_172d59d5f16f4e96aa99761130379d5c.html', publishedAt: '2018-09-17' },
  etiquette: serviceSources.etiquette,
  hotlines: serviceSources.hotlines,
  zoom: { label: 'Microsoft：Edge键盘快捷方式', url: 'https://support.microsoft.com/zh-cn/edge/keyboard-shortcuts-in-microsoft-edge' },
  blackberry: knowledgeSources.blackberry,
};

const serviceQA = (expertId, serviceId, q, a, sourceIds) => ({ expertId, serviceId, q, a, sourceIds, scope: 'service', kind: 'guidance' });
const nodeQA = (nodeId, q, a, sourceIds) => ({ nodeId, q, a, sourceIds, scope: 'node', kind: 'fact' });

export const foundationQA = [
  serviceQA('01_huaiyuanjie', 'planning', '只有一天时间，推荐哪条线？', '建议先选一个片区，围绕自己的兴趣安排少量地点，留出用餐、接驳和返程时间。请补充出发地、交通方式和同行人群，再细化路线；先核对天气、开放和预约，不预设湖滩可露营或全部景点都能串联。', ['preparation']),
  serviceQA('01_huaiyuanjie', 'planning', '安排溧水行程前要准备哪些信息？', '先确定日期、出发地、交通方式、同行人群和兴趣，再核对天气、开放、预约和返程安排。这是规划建议；具体票价、班次和设施仍需查当日公告。', ['preparation']),
  serviceQA('01_huaiyuanjie', 'planning', '溧水行程能进入未开放区域吗？', '不要进入未开发开放、缺乏安全保障的区域。以场所开放路线和现场指引为准，无法确认的湖滩、山道先从行程中移除。', ['preparation']),

  nodeQA('n_djs', '大金山国防园有哪些学习主题？', '南京市体育局2023年介绍列有党史国史教育馆、国防教育馆、雷锋文化馆、普法教育馆和生命安全体验馆等。可以按主题了解展陈；这份介绍不证明各馆当天全部开放。', ['learning']),
  nodeQA('n_djs', '大金山的展馆参观和训练体验一样吗？', '2023年官方介绍分别列出教育展馆和军事拓展、消防救援等体验项目。参观与实践是不同安排；项目是否开放、适龄条件和团体预约须向园区逐项确认，不能由介绍推定人人都能参加。', ['learning']),
  nodeQA('n_djs', '大金山国防园在哪里，周边有什么环境？', '南京市体育局2023年介绍，大金山国防园位于南京南郊、溧水之东，与东屏湖相邻。可结合山湖环境认识国防园；具体入口、路线和当天可进入的区域需另行确认。', ['learning']),

  serviceQA('01_huaiyuanjie', 'stay', '预订溧水住宿前要核对什么？', '先核对入住和退房日期、人数、房型、总价及退订规则，保存预订页面和订单。需要电梯、儿童床或接驳时，另向住宿方确认；介绍和报价不能证明库存与设施已经落实。', ['booking']),
  serviceQA('01_huaiyuanjie', 'stay', '看到住宿报价就代表订到了吗？', '查询报价只用于比较。应在正规预订渠道核对房型、日期和费用，完成订单并确认预订结果后再安排行程；本网页的查询不会锁房或提交付款。', ['booking']),
  serviceQA('01_huaiyuanjie', 'stay', '酒店取消规则应该在哪里查？', '在原预订页面和订单条款查看退订时限、费用与违约责任，保存相关页面，再联系原平台或酒店核实。不能把一家酒店的规则套用到其他订单，也不能承诺必定免费取消。', ['booking']),

  serviceQA('01_huaiyuanjie', 'shopping', '买糕点伴手礼要看哪些标签？', '查看实际包装的配料表、生产日期、保质期、贮存条件和生产者信息；有过敏需求时仔细核对配料。不同产品不共用一个保存期限。', ['labels']),
  serviceQA('01_huaiyuanjie', 'shopping', '糕点都能常温带回家吗？', '按实际包装的贮存条件携带；标注冷藏、冷冻或开封后冷藏的产品不能当作常温食品。结合返程时间选择，不自行给玉带糕、云片糕统一保质期。', ['labels']),
  serviceQA('01_huaiyuanjie', 'shopping', '黑莓果酱都属于白马黑莓地理标志产品吗？', '不能仅凭黑莓口味或商品名称判断。国家知识产权局对白马黑莓规定了保护范围和产品要求；购买时核对实际产地与标识，任意加工品不能自动获得该资格。', ['blackberry']),

  serviceQA('01_huaiyuanjie', 'weather', '去山间湖边前怎样核对天气风险？', '出发前关注途经地和目的地天气、交通及场所开放信息，按官方预警和现场指引调整。城区预报只能作参考，无法保证山间湖边现场条件。', ['preparation']),
  serviceQA('01_huaiyuanjie', 'support', '南京非紧急政务咨询可以打哪个电话？', '南京市政府公共服务电话页面列出的政务服务号码是12345。这里提供渠道指引，不代为登记或承诺处理时间；紧急危险应直接联系相应应急渠道。', ['hotlines']),
  serviceQA('01_huaiyuanjie', 'accessibility', '带长辈如何确认场所适合参观？', '先联系具体场所询问入口台阶、步行强度、休息点和可用接驳，再按体力规划开放路线。这是行前核对建议，不代表已经确认场所有电梯、坡道或轮椅。', ['preparation']),

  serviceQA('01_huaiyuanjie', 'etiquette', '参观寺庙和展馆有什么礼仪？', '尊重现场和宗教习俗，保持秩序，衣着与行为遵守场所要求。留意禁烟、禁食、拍照与闪光灯规定，不随意触摸文物或展品。', ['etiquette']),
  serviceQA('01_huaiyuanjie', 'etiquette', '拍摄居民或表演者前要注意什么？', '先征得对方同意，不强行合影，不堵住公共通道；有禁止拍照标志的地方不拍摄。具体活动另按主办方现场规则执行。', ['etiquette']),
  serviceQA('01_huaiyuanjie', 'etiquette', '字体能调大吗？', '如果在Windows版Microsoft Edge浏览网页，可以按Ctrl与加号放大，Ctrl与减号缩小，Ctrl与0恢复。这里说明的是浏览器缩放；当前网页没有原稿所说的小程序大字版或导览屏设置。', ['zoom']),
].map((item) => ({ ...item, id: `${item.serviceId ? `service:${item.serviceId}` : item.nodeId}:${item.q}`, status: 'approved', reviewedAt: '2026-10-04', sources: item.sourceIds.map((id) => foundationSources[id]) }));

export const approvedServiceQA = foundationQA.filter((qa) => qa.scope === 'service');
export const foundationNodeQA = foundationQA.filter((qa) => qa.scope === 'node');
// Only exact, self-contained foundational questions bypass live tools. A follow-up,
// new dates, budget or combined intent always continues through the service router.
const normalize = (text) => String(text || '').toLowerCase().replace(/[\s，,。.!！?？]/g, '');
export function queryServiceQA(question) {
  const q = normalize(question);
  return q ? approvedServiceQA.find((item) => normalize(item.q) === q) || null : null;
}
export const serviceQAById = approvedServiceQA.reduce((result, qa) => {
  (result[qa.serviceId] ||= []).push(qa.q);
  return result;
}, {});
