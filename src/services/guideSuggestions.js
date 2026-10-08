import { approvedQA } from '../data/presetQA.js';
import { getNode, mainNodes } from '../data/nodes.js';
import { host } from '../data/personas.js';
import { agentPersona } from '../data/agentPersona.js';

export function guideSuggestions(nodeId) {
  const node = getNode(nodeId);
  const topics = node ? [node] : mainNodes.slice(0,3);
  return topics.map(topic => ({
    nodeId:topic.id, title:topic.name, url:'/nodes/'+topic.id,
    questions:approvedQA.filter(qa=>qa.nodeId===topic.id).slice(0,node ? 3 : 1).map(qa=>qa.q),
  })).filter(topic=>topic.questions.length);
}
export function enhanceGuideReply(reply, nodeId) {
  if (!['fallback','unavailable'].includes(reply.kind)) return reply;
  return { ...reply, relatedTopics:guideSuggestions(nodeId) };
}
export function guideFallback(question, nodeId) {
  return enhanceGuideReply({kind:'fallback',speaker:host,content:agentPersona.refusals.unknown,source:null},nodeId);
}
