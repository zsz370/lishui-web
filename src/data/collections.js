// Visitor-facing collections. Individual records remain available for search and direct links.
export const topics = [
  {
    id: 'scenery', name: '山水漫游', shortName: '山水', icon: 'mountain', eyebrow: '沿着山水，慢慢走',
    description: '河谷、山林与湖光，选一种喜欢的风景出发。',
    cover: '/nodes/n_tsq.jpg', color: '#617a52',
    groups: [
      { id: 'river', name: '秦淮寻源', subtitle: '一段河谷，一路故事',
        intro: '沿着胭脂河看山水，也听听天生桥的故事。把脚步放慢，让一处风景带你认识溧水。',
        cover: '/nodes/n_tsq.jpg', expert: '03_yanzhike', nodeIds: ['n_tsq'] },
      { id: 'forest', name: '山林慢步', subtitle: '把喧嚣留在山外',
        intro: '在无想山的绿意里散散步，也可以走近东庐山。想听山间掌故，先找导游聊聊。',
        cover: '/nodes/n_wx.jpg', expert: '03_yanzhike', nodeIds: ['n_wx', 'n_dls'] },
      { id: 'lake', name: '湖畔放空', subtitle: '留一点时间给湖风',
        intro: '石臼湖的开阔，东屏湖的安静，都是放慢旅途的理由。挑一处喜欢的湖景，留给下一程。',
        cover: '/assets/catalog/lake-dongping.webp', expert: '09_shijiulang', nodeIds: ['n_dp', 'n_sj'] },
    ],
  },
  {
    id: 'flavors', name: '寻味溧水', shortName: '美食', icon: 'food', eyebrow: '一口乡味，一份记忆',
    description: '从洪蓝的一餐，到随手带走的糕点与田园鲜甜。',
    cover: '/assets/catalog/food-honglan-chicken.webp', color: '#9c7449',
    groups: [
      { id: 'honglan', name: '洪蓝一桌鲜', subtitle: '坐下来，尝一餐本地滋味',
        intro: '来洪蓝，坐下来尝尝本地滋味。手抓鸡、牛肉和明觉香菜，让一顿饭也成为认识溧水的开始。',
        cover: '/assets/catalog/food-honglan-chicken.webp', expert: '07_fuxiaomei', nodeIds: ['f_szc', 'f_nr', 'f_xc'] },
      { id: 'sweet', name: '糕点与乡味', subtitle: '把旅途里的甜，带回家',
        intro: '玉带糕、云片糕与乌饭，各有各的乡味。挑一两样慢慢尝，也为这趟旅行留下一份小小纪念。',
        cover: '/assets/catalog/food-jade-cake.webp', expert: '07_fuxiaomei', nodeIds: ['f_ydg', 'f_ypg', 'f_wf'] },
      { id: 'orchard', name: '田园鲜甜', subtitle: '去田园里，找一点新鲜',
        intro: '从一颗黑莓的鲜甜，到傅家边的田园风景，寻味也可以是一段亲近乡野的旅程。果品与采摘安排以当季信息为准。',
        cover: '/assets/catalog/food-blackberry.webp', expert: '07_fuxiaomei', nodeIds: ['f_hm', 'n_fjb'] },
    ],
  },
  {
    id: 'culture', name: '非遗乡里', shortName: '乡里', icon: 'culture', eyebrow: '听见乡里，走近手艺',
    description: '一幅铁画，一场龙舞，一段代代相传的乡里故事。',
    cover: '/assets/catalog/culture-iron.webp', color: '#897751',
    groups: [
      { id: 'craft', name: '手艺里的溧水', subtitle: '以铁作画，把匠心留下',
        intro: '从明觉铁画走近当地手艺。先认识一件作品，再听导游讲讲它背后的技艺与故事。',
        cover: '/assets/catalog/culture-iron.webp', expert: '04_dalonggu', nodeIds: ['c_tj', 'c_lh'] },
      { id: 'dragon', name: '跟着大龙听乡情', subtitle: '一场龙舞，连着一方乡土',
        intro: '一场龙舞，连接着乡里的记忆与热闹。让大龙姑陪你走近骆山大龙，听听流传至今的故事。',
        cover: '/assets/catalog/culture-luoshan-dragon.png', expert: '04_dalonggu', nodeIds: ['c_ldl', 'c_hl', 'c_ljd'] },
      { id: 'festivals', name: '节庆里的热闹', subtitle: '听一听，人间烟火的声音',
        intro: '庙会、马灯和乡间节俗，是认识地方生活的另一扇窗。先听一个故事，再按兴趣继续了解。',
        cover: '/assets/catalog/culture-cishan.jpg', expert: '05_gusanniang', nodeIds: ['c_cs', 'c_xsm', 'c_xz', 'c_tdd', 'c_dsh', 'c_dw', 'c_syg', 'c_qh'] },
    ],
  },
  {
    id: 'leisure', name: '慢享时光', shortName: '慢游', icon: 'leisure', eyebrow: '不赶路，也是一种旅行',
    description: '逛园林、住进田园，或把一段时间留给研学与街巷。',
    cover: '/assets/catalog/garden-zhouyuan.webp', color: '#657c71',
    groups: [
      { id: 'garden', name: '园林与田园', subtitle: '给旅途留一点闲暇',
        intro: '在园林里看看建筑，在庄园里亲近田野。选一个想停留的地方，把空闲也放进旅程。',
        cover: '/assets/catalog/garden-zhouyuan.webp', expert: '02_laizhusheng', nodeIds: ['n_zy', 'n_gx', 'n_fjb'] },
      { id: 'learning', name: '一起去研学', subtitle: '让每一次出发，多一点发现',
        intro: '带着好奇出发，走近大金山的国防教育与研学故事。具体参观与活动安排，请以园区发布的信息为准。',
        cover: '/assets/catalog/learning-dajinshan.webp', expert: '02_laizhusheng', nodeIds: ['n_djs'] },
      { id: 'streets', name: '街巷日常', subtitle: '逛逛街，把烟火气带回去',
        intro: '通济街与城区街区，可以留给随心走走的一段时间。找吃的、选礼物，或者歇一歇，都不必赶。',
        cover: '/assets/catalog/street-tongji.jpg', expert: '10_meiguisao', nodeIds: ['s_tj', 's_hl', 's_wxsz'] },
    ],
  },
];

export const getTopic = (id) => topics.find((topic) => topic.id === id);
export const getGroup = (topic, id) => topic?.groups.find((group) => group.id === id) || topic?.groups[0];
export const getNodeCollection = (id) => {
  for (const topic of topics) {
    const group = topic.groups.find((entry) => entry.nodeIds.includes(id));
    if (group) return { topic, group };
  }
  return null;
};
export const belongsToTopic = (node, topic) => {
  if (!topic) return true;
  if (topic.groups.some((group) => group.nodeIds.includes(node.id))) return true;
  return (topic.id === 'flavors' && node.cat === '美食') || (topic.id === 'culture' && node.cat === '民俗');
};
export const collectionUrl = (topicId, groupId) => `/nodes?topic=${topicId}${groupId ? `&group=${groupId}` : ''}`;
export const detailUrl = (nodeId, topicId, groupId) => `/nodes/${nodeId}?from=${topicId}&group=${groupId}`;
