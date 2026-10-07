// 一个智能体拥有完整知识与工具。模块分类不是专家或子智能体。
export const agentPlans = [{id:'01_huaiyuanjie',sourceName:'淮源姐',level:'guide',tools:['knowledge_retrieval','web_search','weather_forecast','stay_search','map_search','route_plan','translate']}];
export const departmentPlans = []; // 仅保留旧诊断脚本的导出兼容，当前没有部门路由。
export const collaborationPlan = {status:'retired',reason:'2026-10-07用户决定收敛为淮源姐单智能体'};
