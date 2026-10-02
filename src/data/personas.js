// 12 位溧水文旅数字人 · 与《数媒竞赛项目规划》2.1 表一致
// 立绘路径预留在 public/personas/ 下，队友把 数字人素材\矩阵人物立绘\ 里的
// 静态 PNG 拷到 public/personas/ 即可（文件名用 01_huaiyuanjie.png 这种）。
export const personas = [
  { id: '01_huaiyuanjie', name: '淮源姐', alt: '阿城', domain: '全域行程导览', avatar: '/personas/01_huaiyuanjie.png', color: '#1c3a5a', tagline: '溧水怎么走？姐给你排。' },
  { id: '02_laizhusheng', name: '濑渚生', alt: '阿墨', domain: '历史人文研学', avatar: '/personas/02_laizhusheng.png', color: '#3d5a80', tagline: '研学、红色、非遗课堂。' },
  { id: '03_yanzhike', name: '胭脂客', alt: '老讲古', domain: '传说掌故说书', avatar: '/personas/03_yanzhike.png', color: '#a4553f', tagline: '天生桥、无想山，讲古。' },
  { id: '04_dalonggu', name: '大龙姑', alt: '阿绣', domain: '骆山大龙·非遗', avatar: '/personas/04_dalonggu.png', color: '#c0562a', tagline: '国家级骆山大龙守艺人。' },
  { id: '05_gusanniang', name: '鼓三娘', alt: '鼓公', domain: '节庆民俗', avatar: '/personas/05_gusanniang.png', color: '#8a2b2b', tagline: '秦淮灯会、祠山庙会。' },
  { id: '06_ruanyunan', name: '软语囡', alt: '牙牙', domain: '方言童谣', avatar: '/personas/06_ruanyunan.png', color: '#7b9e6b', tagline: '溧水闲话、童谣、叫卖。' },
  { id: '07_fuxiaomei', name: '傅小莓', alt: '阿滋', domain: '美食风物', avatar: '/personas/07_fuxiaomei.png', color: '#b8436b', tagline: '舌尖上的溧水非遗。' },
  { id: '08_wuxiangsao', name: '无想嫂', alt: '阿宿', domain: '民宿度假', avatar: '/personas/08_wuxiangsao.png', color: '#5a7f5a', tagline: '无想山下住一晚。' },
  { id: '09_shijiulang', name: '石臼郎', alt: '阿路', domain: '水陆交通', avatar: '/personas/09_shijiulang.png', color: '#3d8fbf', tagline: 'S7 湖上列车换乘指南。' },
  { id: '10_meiguisao', name: '玫瑰嫂', alt: '阿商', domain: '伴手礼文创', avatar: '/personas/10_meiguisao.png', color: '#c08490', tagline: '带一份溧水回家。' },
  { id: '11_dongpingjie', name: '东屏姐', alt: '阿好', domain: '游客服务', avatar: '/personas/11_dongpingjie.png', color: '#4d7ea8', tagline: '求助、失物、投诉都找我。' },
  { id: '12_tianshengqiao', name: '天生桥', alt: '小译', domain: '双语讲解', avatar: '/personas/12_tianshengqiao.png', color: '#2e4e72', tagline: 'Hello, Lishui.' },
];

// 主控导游（首页出镜的那位）
export const HOST_ID = '01_huaiyuanjie';
export const getPersona = (id) => personas.find((p) => p.id === id);
