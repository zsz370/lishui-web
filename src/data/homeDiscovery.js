import { nodes, getNode } from './nodes.js';
import { topics, belongsToTopic } from './collections.js';
import { expansionNodeQA, expansionServiceQA } from './contentExpansionQA.js';

// 首页只编排既有已审内容，不在展示层补充地点事实或设施承诺。
export const homeTopics = topics.map(topic => ({
  ...topic, count: nodes.filter(node => belongsToTopic(node, topic)).length,
  previews: topic.groups.map(group => ({ ...group, node: getNode(group.nodeIds[0]) })),
}));
export const homeQuestions = [
  '周园主要看哪些建筑与藏品？', '手抓鸡和洪蓝乡味怎么搭配成一餐？',
  '欣赏溧水剪纸可以看哪些细节？', '去通济街找乡味要先查什么？',
].map(question => expansionNodeQA.find(qa => qa.q === question && qa.status === 'approved')).filter(Boolean);
export const preparationTopics = [
  { id: 'parking', name: '停车', icon: 'Car' }, { id: 'toilet', name: '卫生间', icon: 'MapPin' },
  { id: 'nursing', name: '母婴', icon: 'Baby' }, { id: 'accessibility', name: '无障碍', icon: 'Wheelchair' },
  { id: 'luggage', name: '寄存', icon: 'SuitcaseRolling' }, { id: 'pets', name: '宠物', icon: 'PawPrint' },
].map(topic => ({ ...topic, questions: expansionServiceQA.filter(qa => qa.facilityTopic === topic.id && qa.status === 'approved') }));
