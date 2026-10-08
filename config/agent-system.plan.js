// 对外唯一主导游。后台功能专家共享已审语料与安全规则，不注册独立人格。
export const agentPlans = [{id:'01_huaiyuanjie',sourceName:'淮源姐',level:'guide',tools:['knowledge_retrieval','web_search','weather_forecast','stay_search','map_search','route_plan','translate']}];

export const departmentPlans = [
  {id:'expert_route',name:'路线顾问',responsibility:'地点定位、步行/自驾/公交路线规划',tools:['map_search','route_plan'],intro:'核对地点和路线，提醒入口与实时交通仍需确认。'},
  {id:'expert_stay',name:'住宿顾问',responsibility:'按日期/预算查询住宿报价',tools:['stay_search'],intro:'按已给日期和预算找住宿，报价与库存以预订平台为准。'},
  {id:'expert_weather',name:'天气助理',responsibility:'溧水/南京城区7天预报',tools:['weather_forecast'],intro:'查询城区预报，保留查询时间与现场天气的边界。'},
  {id:'expert_culture',name:'文化学者',responsibility:'已审知识检索与联网补充核对',tools:['knowledge_retrieval','web_search'],intro:'优先查已审资料，联网补充单列待核。'},
  {id:'expert_translate',name:'翻译官',responsibility:'中英日韩等多语翻译',tools:['translate'],intro:'翻译用户文字或本次答复，不补充地方事实。'},
  {id:'expert_planning',name:'行程规划师',responsibility:'汇总各专家结果、编排日程',tools:['synthesis'],intro:'用实际返回结果整理日程，缺条件或查询失败会明说。'},
];
export const collaborationPlan = {status:'active',guideId:'01_huaiyuanjie',description:'1 位主导游 + 专家工具协作；功能分工协作、非独立人格，共享同一已审语料库与安全规则。'};
const taskExperts = {weather:'expert_weather',stay:'expert_stay',transport:'expert_route',knowledge:'expert_culture',translation:'expert_translate',planning_summary:'expert_planning'};
export const expertForTask = id => taskExperts[id.split(':')[0]] || collaborationPlan.guideId;
export const getDepartment = id => departmentPlans.find(expert => expert.id === id);
