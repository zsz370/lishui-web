// 定稿优先，其余采用矩阵目录中的最高版本；来源见 docs/人物素材接入清单.json。
const profiles = [
  { id: '01_huaiyuanjie', name: '淮源姐', category: 'welcome', domain: '全域行程导览', tagline: '从你喜欢的地方，开启溧水之旅。', intro: '欢迎来到秦淮源头。先告诉我你喜欢山水、乡味还是乡里故事，咱们选一个主题，慢慢认识溧水。', destination: '/nodes', action: '开始探索溧水' },
  { id: '02_laizhusheng', name: '濑渚生', category: 'stories', domain: '历史人文研学', tagline: '带着好奇出发，让旅行多一点发现。', intro: '园林中的建筑、收藏里的故事，还有研学途中的新发现，都值得细细看。先从周园或大金山认识这片土地。', destination: '/nodes?topic=leisure&group=learning', action: '走进研学主题' },
  { id: '03_yanzhike', name: '胭脂客', category: 'scenery', domain: '山水掌故讲述', tagline: '沿着胭脂河，听一段山水故事。', intro: '天生桥的河谷、无想山的绿意，都是故事的开头。跟我沿着风景走一走，听听溧水的地方掌故。', destination: '/nodes?topic=scenery&group=river', action: '听山水故事' },
  { id: '04_dalonggu', name: '大龙姑', category: 'stories', domain: '龙舞与乡土手艺', tagline: '一场龙舞，连着一方乡情。', intro: '从骆山大龙到乡土手艺，一代代流传的故事藏着地方生活的记忆。咱们先从一场龙舞认识这里。', destination: '/nodes?topic=culture&group=dragon', action: '走近龙舞与乡情' },
  { id: '05_gusanniang', name: '鼓三娘', category: 'stories', domain: '节庆民俗', tagline: '听见节庆里的热闹与烟火。', intro: '庙会、马灯与灯彩，让乡里的日子有了不同的声音。听一段民俗故事，再寻找你感兴趣的地方传统。', destination: '/nodes?topic=culture&group=festivals', action: '认识节庆民俗' },
  { id: '06_ruanyunan', name: '软语囡', category: 'stories', domain: '乡音与童谣', tagline: '在乡音里，认识溧水的日常。', intro: '方言、童谣与渔歌，藏着一方水土的生活记忆。先从石臼渔歌的介绍，走近这里的乡音故事。', destination: '/nodes/c_syg?from=culture&group=festivals', action: '认识乡音故事' },
  { id: '07_fuxiaomei', name: '傅小莓', category: 'flavors', domain: '美食与田园风物', tagline: '尝一口乡味，再逛一段田园。', intro: '洪蓝的一餐、糕点里的甜，还有田园中的鲜果，都可以成为认识溧水的开始。挑一样喜欢的，跟我慢慢尝。', destination: '/nodes?topic=flavors', action: '寻找地道乡味' },
  { id: '08_wuxiangsao', name: '无想嫂', category: 'welcome', domain: '住宿与民宿度假', tagline: '住得舒心，旅途才从容。', intro: '先告诉我预算、同行人群和是否自驾。城区酒店、乡村民宿与山居各有适合的逛法，咱们把住处和交通一起想清楚。', destination: '/services?service=stay', action: '选一处落脚点' },
  { id: '09_shijiulang', name: '石臼郎', category: 'welcome', domain: '交通与水陆出行', tagline: '从出发到抵达，每一段都想好。', intro: '高铁、地铁、自驾，还有到站后的最后一段接驳，都关系到这一程是否顺畅。先说出发地和目的地，我陪你比较出行方式。', destination: '/services?service=transport', action: '安排交通衔接' },
  { id: '10_meiguisao', name: '玫瑰嫂', category: 'flavors', domain: '伴手礼与街巷闲逛', tagline: '带一份喜欢的溧水回家。', intro: '在街巷里逛逛，看看地方糕点与小物。让旅途的味道与记忆，也能陪你回到日常生活里。', destination: '/nodes?topic=leisure&group=streets', action: '去街巷逛逛' },
  { id: '11_dongpingjie', name: '东屏姐', category: 'welcome', domain: '天气与游客服务', tagline: '旅途有疑问，先理清下一步。', intro: '看看天气、找求助渠道、了解退改与设施确认方法。带长辈或孩子出发，也可以先把需要的照顾安排妥当。', destination: '/services?service=weather', action: '查看旅途服务' },
  { id: '12_dongluke', name: '东庐客', category: 'welcome', domain: '双语与参观礼仪', tagline: 'Welcome to Lishui. 欢迎来溧水。', intro: 'Hello! 我是东庐客，欢迎来到溧水。常用旅游英文、拍照询问和参观礼仪，都可以先了解一点，让交流更从容。', destination: '/services?service=etiquette', action: '看看礼仪与双语' },
];
// 由用户确认的原视频剪出两种动作；讲话视频静音，由真实朗读事件驱动。
// thinking沿用站立；同视频首帧用于暂停/减少动态/加载失败，原定稿仍作后备。
export const personas = profiles.map((profile) => ({
  ...profile, color: '#4a654d',
  portrait: `/assets/personas/${profile.id}.webp`,
  avatar: `/assets/personas/${profile.id}-avatar.webp`,
  portraitMotion: {
    idle: `/assets/personas/motion/${profile.id}-idle.mp4`,
    speaking: `/assets/personas/motion/${profile.id}-speaking.mp4`,
  },
  motionPoster: `/assets/personas/motion/${profile.id}-poster.webp`,
}));
export const guideCategories = [
  { id: 'welcome', name: '迎宾与旅途服务' },
  { id: 'scenery', name: '山水与慢游' },
  { id: 'stories', name: '乡里与故事' },
  { id: 'flavors', name: '乡味与好物' },
];
export const HOST_ID = '01_huaiyuanjie';
export const getPersona = (id) => personas.find((persona) => persona.id === id);
export const guideUrl = (id) => `/guides?guide=${id}`;
