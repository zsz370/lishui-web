import { queryQA } from './presetQA.js';
import { expansionNodeQA } from './contentExpansionQA.js';

const expansionVisitQuestions = expansionNodeQA.reduce((result, qa) => {
  (result[qa.nodeId] ||= []).push([qa.kind === 'guidance' ? '游览建议' : '认识风物', qa.q]);
  return result;
}, {});

// 每一项指向实际获审正文；当前运营数据另行确认。
export const visitGuideQuestions = {
  ...expansionVisitQuestions,
  n_tsq: [
    ['文化看点', '天生桥是天然的还是人工的？'],
    ['漕运背景', '胭脂河开凿与漕运有什么关系？'],
    ['岩土与河水', '胭脂河的水为什么是红的？'],
    ['停留安排', '天生桥行程里的停留时间怎样填写？'],
    ['开放与体验', '去天生桥要注意什么？'],
    ['票种与参考价', '天生桥门票和套票参考价是多少？'],
  ],
  n_wx: [
    ['人文看点', '无想山有哪些文化看点？'],
    ['诗词线索', '周邦彦和溧水有什么关系？'],
    ['人物背景', '韩熙载是谁？'],
    ['交通时效', '无想山公共交通资料有哪些时效限制？'],
    ['停留与体验', '无想山值得爬多久、怎么玩？'],
    ['山寺传说', '无想山名字是怎么来的？'],
    ['天池参考价', '无想山天池门票参考价是多少？'],
  ],
  n_fjb: [
    ['季节与花况', '傅家边什么时候去最好？'],
    ['果品线索', '傅家边能采摘什么？'],
    ['梅花与青梅', '傅家边青梅和赏梅是一回事吗？'],
    ['停留安排', '傅家边行程里的停留时间怎样填写？'],
    ['预约与费用', '去傅家边采摘要注意什么？'],
  ],
  n_sj: [
    ['景观与季节', '石臼湖什么时候最美？'],
    ['交通看点', '石臼湖水上列车是什么？'],
    ['地名背景', '石臼湖名字怎么来的？'],
    ['停留安排', '石臼湖观景行程里的停留时间怎样填写？'],
    ['渔事活动边界', '石臼湖捕捞节是什么时候？'],
  ],
};

export const visitGuideUnknowns = {
  ...Object.fromEntries(Object.keys(expansionVisitQuestions).map(id => [id, '出行日开放、实际入口、活动与体验安排、设施和费用仍需向场所或主办方确认；历史介绍不能替代当前公告。'])),
  n_tsq: '已有2026-10-05核对的门票及套票参考价；出行日售价、优惠范围、停止入园、游船班次与适龄要求尚未确认。先在行程页选择实际入口，再查逐段交通；地图估时不替代景区运营公告。',
  n_wx: '山名按地方流传故事介绍，尚未核得所据原始史料。已有2026-10-05核对的天池10元/优待5元参考；出行日开放区域、优惠资格、步道强度和接驳安排未确认，2025公交资料需重新核对。',
  n_fjb: '出行日花况、可采果品、具体园区入口、预约、价格及适龄条件未确认。农业采收报道不代表游客可入园，交通在行程页按所选园区查询。',
  n_sj: '出行日水位与天气、可到达的观景入口、岸线开放和地铁班次未确认。没有统一最佳观景时刻或票价结论；禁止进入的湖滩不能作为路线终点。',
};

export function getVisitGuide(nodeId) {
  if (!visitGuideQuestions[nodeId]) return null;
  return {
    checkedAt: expansionVisitQuestions[nodeId] ? '2026-10-07' : ['n_wx', 'n_tsq'].includes(nodeId) ? '2026-10-05' : '2026-10-04', unknowns: visitGuideUnknowns[nodeId],
    items: visitGuideQuestions[nodeId].map(([label, question]) => ({ label, question, qa: queryQA(nodeId, question) })),
  };
}
