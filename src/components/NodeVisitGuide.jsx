import { visitorAnswer } from '../data/visitorAnswerCopy.js';
import { getVisitGuide } from '../data/nodeVisitGuides.js';
import './NodeVisitGuide.css';

export default function NodeVisitGuide({ nodeId }) {
  const guide = getVisitGuide(nodeId);
  if (!guide) return null;
  return <section className="node-visit-guide" aria-label="游览前确认">
    <p className="section-overline">把介绍变成自己的安排</p>
    <h2>出发前，先确认这几件事</h2>
    <p className="visit-guide-date">资料核对：{guide.checkedAt}。展开查看讲解、规划建议与出处。</p>
    <div className="visit-guide-items">{guide.items.map(({ label, question, qa }) => <details key={question}>
      <summary><span>{label}</span><span>{question}</span></summary>
      <div className="visit-guide-answer">
        <p className="visit-guide-kind">{qa?.kind === 'guidance' ? '个人规划建议 · 背景有出处' : qa ? '资料讲解' : '资料待补'}</p>
        <p>{(qa && visitorAnswer(qa)) || '尚未取得可用答案，请查看下方待确认项。'}</p>
        {qa?.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}{source.publishedAt ? `（${source.publishedAt}）` : ''} ↗</a>)}
      </div>
    </details>)}</div>
    <div className="visit-guide-unknowns"><h3>这次出行还需确认</h3><p>{guide.unknowns}</p></div>
  </section>;
}
