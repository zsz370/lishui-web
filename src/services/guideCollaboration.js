import { getDepartment } from '../../config/agent-system.plan.js';
import { taskLabel } from '../data/chatRouting.js';

const statusLabels = {running:'正在处理',completed:'已完成',needs_input:'待补条件',failed:'未完成',cancelled:'已停止'};
const activities = {conversation:'正在回答',weather:'正在查天气',stay:'正在查住宿',transport:'正在规划路线',knowledge:'正在查资料',etiquette:'正在翻译',planning_summary:'正在整理行程'};
export function taskPresentation(task) {
  const expert = getDepartment(task.agentId);
  const base = task.taskId.split(':')[0];
  return {name:expert?.name || '淮源姐',label:task.status === 'running' ? activities[base] || taskLabel(task.taskId) : statusLabels[task.status] || '处理中'};
}

// 只收集实际使用的证据及实际返回的工具来源；搜索到但未选中的网页不能算答案来源。
export function collectCollaboration(results, trace = []) {
  const groups = new Map();
  for (const result of results) for (const group of result.evidenceGroups || []) {
    if (!groups.has(group.id)) groups.set(group.id,{...group,sources:[],notes:[]});
    const target = groups.get(group.id);
    target.sources.push(...(group.sources || []));
    if (group.note) target.notes.push(group.note);
  }
  return {experts:trace.filter(task=>getDepartment(task.agentId)).map(({taskId,agentId,status,tools,dependsOn})=>({taskId,agentId,status,tools,dependsOn})),groups:[...groups.values()].map(group=>({...group,sources:[...new Map(group.sources.map(source=>[source.url,source])).values()],notes:[...new Set(group.notes)]}))};
}

export const reviewedEvidence = sources => [{id:'reviewed',title:'已审知识检索',sources,note:'来自项目已审资料；时效信息仍需核对出行日安排。'}];
export const liveEvidence = (sources,note) => [{id:'realtime',title:'实时工具',sources,note}];
