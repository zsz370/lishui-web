// 2026-10-05项目负责人提供并确认范围；是有日期的参考，不是实时售票接口。
export const ticketSource = {
  label: '项目票务核对记录（2026-10-05，参考价）', url: '/about#ticket-reference',
  kind: 'project_confirmation', publishedAt: '2026-10-05',
};
const reference = (nodeId, q, a) => ({
  id: `${nodeId}:${q}`, nodeId, q, a, keys: ['门票', '票价', '套票', '半价', '优惠', '多少钱'],
  status: 'approved', kind: 'reference-price', reviewedAt: '2026-10-05', sources: [ticketSource],
});
export const ticketQA = [
  reference('n_tsq', '天生桥门票和套票参考价是多少？', '天生桥可以先按想玩的项目选择：成人门票18元；坐船＋门票57元；门票＋彩虹滑道＋画舫＋天堑探索桥＋乐园85元。以上是2026年10月5日项目核对的参考价，不是实时售票报价；天生桥儿童、老人、学生等优惠及套票是否优惠尚未查明，不自行按半价计算。出行前确认票种、适龄限制、当天项目运营和退改条款。你更想散步看河谷、坐船，还是体验多个项目？'),
  reference('n_wx', '无想山天池门票参考价是多少？', '按2026年10月5日项目核对，所列收费景点为无想山天池：成人10元，儿童、老人、学生优待票半价，即5元。半价范围是天池景区，不套用到天生桥或其他项目；年龄、学生资格、所需证件及可能的免票条件还需向景区确认。此为有日期的参考价，不是实时报价；其他区域及项目以当天公告为准。你打算去天池，还是以山林慢步为主？'),
  reference('n_zy', '周园门票和优待票参考价是多少？', '按2026年10月5日项目核对，周园成人门票150元；儿童、老人、学生、军人、残障人士半价，即75元。这是有日期的参考价，不是实时售票报价。年龄、资格证件、是否另有免票或平台活动，以及票种包含的参观范围需向园方确认，不能把其他景区优惠直接套用。你方便说一下同行人数和需要优待票的人群吗？'),
];
export function queryTicketQA(nodeId, question) {
  if (/停车费|讲解费|接驳费|餐费|住宿费|单独(?:船票|游船)/.test(question) && !/门票|套票/.test(question)) return null;
  if (!/门票|票价|套票|半价|优惠票|优待票|多少钱|票种/.test(question)) return null;
  return ticketQA.find((item) => item.nodeId === nodeId) || null;
}
export const ticketOnlyQuestion = (question) => !/天气|怎么去|怎么到|怎么走|路线|交通|停车|住宿|订房|退票|退款|预约|开放|几点|轮椅.*(?:进入|通行|设施)/.test(question);
