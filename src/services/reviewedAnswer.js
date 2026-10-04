import { getPersona } from '../data/personas.js';

export function reviewedAnswer(qa, expertId) {
  return {
    kind: 'preset', serviceId: qa.serviceId, speaker: getPersona(qa.expertId || expertId),
    content: qa.a, source: `${qa.kind === 'guidance' ? '咨询建议；参考：' : '资料来源：'}${qa.sources[0].label}`,
    sourceUrl: qa.sources[0].url, sources: qa.sources, reviewedAt: qa.reviewedAt,
    links: qa.sources.slice(1).map(({ label, url }) => ({ label, url })),
  };
}
