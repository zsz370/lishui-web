import { nodeIntroductions } from './nodeIntroductions.js';

// 主题线路是编辑草案；背景复用已审节点简介，不承诺日期、交通或设施。
export const themeRoutes = [
  {
    id: 'family-learning', name: '亲子山湖研学一日',
    goal: '围绕一个学习主题看展，再在开放岸线认识山湖环境',
    description: '先在大金山国防园选一个展馆主题，再按体力和天气决定是否到东屏湖观景。两处之间的入口与交通需另查。',
    nodeIds: ['n_djs', 'n_dp'],
    stopNotes: {
      n_djs: '先选国防或生命安全等学习主题，和孩子带着一个问题看展。训练体验另问适龄、预约与开放条件。',
      n_dp: '在确认开放的岸线观察湖面与远岸，也可以聊聊刚才的参观收获；不默认可露营、垂钓或下水。',
    },
    unknowns: '先确认展馆开放、活动适龄条件、岸线入口、交通和卫生间；遇雨或体力不足可取消湖边停留。',
  },
  {
    id: 'senior-city', name: '银发城中慢游一日',
    goal: '少赶路，按体力逛一段街巷、选一餐乡味',
    description: '从通济街看城区日常，再把海乐城作为就餐、购物或休息的候选。少选地点，步行条件和休息设施先问清。',
    nodeIds: ['s_tj', 's_hl'],
    stopNotes: {
      s_tj: '先选想逛的街段或店铺，核对营业和步行路况；疲劳时减少停留，不预设全程无台阶。',
      s_hl: '按需求选就餐或休息，提前确认入口、电梯、卫生间和休息点；需要轮椅协助时逐项核对。',
    },
    unknowns: '实际店铺、入口之间的交通、台阶、电梯、座椅和无障碍卫生间尚需向场所确认。',
  },
].map(route => ({
  ...route, kind: 'guidance', status: 'approved', reviewedAt: '2026-10-07',
  sources: [...new Map(route.nodeIds.flatMap(id => nodeIntroductions[id].sources).map(source => [source.url, source])).values()],
  reviewBasis: 'existing_reviewed_introduction_editorial_route',
}));
