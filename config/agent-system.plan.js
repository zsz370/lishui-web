// Shared registry used by the frontend, server dispatcher and readiness audit.
// Roles reuse the character assets in src/data/personas.js.
export const agentPlans = [
  { id: '01_huaiyuanjie', sourceName: '淮源姐', legacyName: '阿城', level: 'global_coordinator', tools: ['web_search'], nextWork: '已有3条行程基础QA；扩展条件识别、多轮约束与协作评测' },
  { id: '02_laizhusheng', sourceName: '濑渚生', legacyName: '阿墨', level: 'department_coordinator', tools: ['web_search'], nextWork: '已有3条大金山基础QA；补周园与深度历史，核实预约与年龄适配' },
  { id: '03_yanzhike', sourceName: '胭脂客', legacyName: '老讲古', level: 'department_coordinator', tools: ['web_search'], nextWork: '补掌故来源；史实、传说、文学引文分别标注；核实无想山得名' },
  { id: '04_dalonggu', sourceName: '大龙姑', legacyName: '阿绣', level: 'department_coordinator', tools: ['web_search'], nextWork: '逐条核对非遗级别、名录与体验点；补陆家大龙与现场观看公告' },
  { id: '05_gusanniang', sourceName: '鼓三娘', legacyName: '鼓公', level: 'specialist', tools: ['web_search'], nextWork: '将传统节期与本年度活动分开；补年度公告和取消变更处理' },
  { id: '06_ruanyunan', sourceName: '软语囡', legacyName: '牙牙', level: 'specialist', tools: ['web_search'], nextWork: '核实方言与童谣采录来源；修复空答案，补乡音专属问答' },
  { id: '07_fuxiaomei', sourceName: '傅小莓', legacyName: '阿滋', level: 'department_coordinator', tools: ['web_search'], nextWork: '补食品工艺与配料来源；当季供应及采摘开放用新公告确认' },
  { id: '08_wuxiangsao', sourceName: '无想嫂', legacyName: '阿宿', level: 'specialist', tools: ['web_search', 'stay_search'], nextWork: '已有3条订房基础QA；核实具体住宿设施、房态与入住政策' },
  { id: '09_shijiulang', sourceName: '石臼郎', legacyName: '阿路', level: 'specialist', tools: ['web_search', 'map_search', 'route_plan'], nextWork: '补交通已审QA；核对末班车、班次、入口与步行接驳' },
  { id: '10_meiguisao', sourceName: '玫瑰嫂', legacyName: '阿商', level: 'specialist', tools: ['web_search'], nextWork: '已有3条消费基础QA；补具体产品与街区，不推定保存期限或地理标志资格' },
  { id: '11_dongpingjie', sourceName: '东屏姐', legacyName: '阿好', level: 'department_coordinator', tools: ['web_search', 'weather_forecast'], nextWork: '已有3条服务基础QA；核实具体设施、游客中心与渠道，不承诺代办理' },
  { id: '12_dongluke', sourceName: '天生桥', legacyName: '小译', level: 'specialist', tools: ['web_search', 'translate'], nextWork: '已有3条礼仪与网页阅读QA；核实官方英文名，扩展翻译质量与多语种验收' },
];

export const departmentPlans = [
  { id: 'scenery', name: '山水漫游', coordinator: '03_yanzhike', sections: [
    { id: 'river', name: '秦淮寻源', owner: '03_yanzhike' },
    { id: 'forest', name: '山林慢步', owner: '03_yanzhike' },
    { id: 'lake', name: '湖畔放空', owner: '09_shijiulang', collaborators: ['03_yanzhike'] },
  ] },
  { id: 'flavors', name: '寻味溧水', coordinator: '07_fuxiaomei', sections: [
    { id: 'honglan', name: '洪蓝一桌鲜', owner: '07_fuxiaomei' },
    { id: 'sweet', name: '糕点与乡味', owner: '07_fuxiaomei', collaborators: ['10_meiguisao'] },
    { id: 'orchard', name: '田园鲜甜', owner: '07_fuxiaomei' },
  ] },
  { id: 'culture', name: '非遗乡里', coordinator: '04_dalonggu', sections: [
    { id: 'craft', name: '手艺里的溧水', owner: '04_dalonggu' },
    { id: 'dragon', name: '跟着大龙听乡情', owner: '04_dalonggu' },
    { id: 'festivals', name: '节庆里的热闹', owner: '05_gusanniang' },
    { id: 'oral', name: '乡音与童谣', owner: '06_ruanyunan', currentUi: '尚未独立分区；目前入口在乡音节点和角色页' },
  ] },
  { id: 'leisure', name: '慢享时光', coordinator: '02_laizhusheng', sections: [
    { id: 'garden', name: '园林与田园', owner: '02_laizhusheng', collaborators: ['08_wuxiangsao'] },
    { id: 'learning', name: '一起去研学', owner: '02_laizhusheng' },
    { id: 'streets', name: '街巷日常', owner: '10_meiguisao' },
  ] },
  { id: 'services', name: '旅途服务', coordinator: '11_dongpingjie', sections: [
    { id: 'weather', name: '天气与穿着', owner: '11_dongpingjie' },
    { id: 'stay', name: '住宿与度假', owner: '08_wuxiangsao' },
    { id: 'transport', name: '交通与地图', owner: '09_shijiulang' },
    { id: 'etiquette', name: '礼仪与双语', owner: '12_dongluke' },
    { id: 'support', name: '求助与退改', owner: '11_dongpingjie' },
    { id: 'accessibility', name: '亲子与无障碍', owner: '11_dongpingjie' },
    { id: 'shopping', name: '伴手礼与消费', owner: '10_meiguisao' },
    { id: 'planning', name: '日常与行程', owner: '01_huaiyuanjie' },
  ] },
];

export const collaborationPlan = {
  status: 'implemented_local_pilot', globalCoordinator: '01_huaiyuanjie',
  sharedContext: ['travelDates', 'origin', 'destinations', 'budget', 'partySize', 'companions', 'transport', 'language', 'accessibilityNeeds'],
  agentOutput: ['taskId', 'agentId', 'status', 'answer', 'evidence', 'checkedAt', 'validUntil', 'missingFields'],
  example: {
    question: '明天带老人去无想山，两天一晚，没有车，想找300元内的住处，并给英文行程。',
    tasks: [
      { id: 'forecast', agentId: '11_dongpingjie', tools: ['weather_forecast'], dependsOn: [] },
      { id: 'stay', agentId: '08_wuxiangsao', tools: ['stay_search'], dependsOn: [] },
      { id: 'mobility', agentId: '09_shijiulang', tools: ['map_search', 'route_plan'], dependsOn: ['stay'] },
      { id: 'visit', agentId: '03_yanzhike', tools: ['knowledge_retrieval', 'web_search'], dependsOn: [] },
      { id: 'itinerary', agentId: '01_huaiyuanjie', dependsOn: ['forecast', 'stay', 'mobility', 'visit'] },
      { id: 'translation', agentId: '12_dongluke', tools: ['translate'], dependsOn: ['itinerary'] },
    ],
  },
  runtimeNeeded: ['approved knowledge retrieval', 'evidence-preserving web supplement', 'tool adapters', 'dependency execution', 'coordinator synthesis', 'visible agent handoffs', 'partial-failure handling'],
};
