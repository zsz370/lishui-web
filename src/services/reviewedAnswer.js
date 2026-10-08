import { getPersona } from '../data/personas.js';
import { visitorAnswer } from '../data/visitorAnswerCopy.js';
import { reviewedEvidence } from './guideCollaboration.js';

export function reviewedAnswer(qa, expertId) {
  return {
    kind: 'preset', nodeId: qa.nodeId, serviceId: qa.serviceId, speaker: getPersona(qa.expertId || expertId),
    content: qa.displayAnswer || visitorAnswer(qa), source: `${qa.kind === 'legend' ? '地方传说；出处：' : qa.kind === 'reference-price' ? '有日期的票务参考：' : qa.kind === 'guidance' ? '咨询建议；参考：' : '资料来源：'}${qa.sources[0].label}`,
    sourceUrl: qa.sources[0].url, sources: qa.sources, reviewedAt: qa.reviewedAt, evidenceGroups: reviewedEvidence(qa.sources),
    links: qa.sources.slice(1).map(({ label, url }) => ({ label, url })),
  };
}
