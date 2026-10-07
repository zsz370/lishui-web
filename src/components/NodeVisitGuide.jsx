import { visitorAnswer } from '../data/visitorAnswerCopy.js';
import { getVisitGuide } from '../data/nodeVisitGuides.js';
import './NodeVisitGuide.css';

export default function NodeVisitGuide({ nodeId }) {
  const guide = getVisitGuide(nodeId);
  if (!guide) return null;
  return <section className="node-visit-guide" aria-label="游览前确认">
    <p className="section-overline">把介绍变成自己的安排</p>
    <h2>出发前，先确认这几件事</h2>
    <div className="visit-guide-items">{guide.items.map(({ label, question, qa }) => <details key={question}>
      <summary><span>{label}</span><span>{question}</span></summary>
      <div className="visit-guide-answer">
        <p>{(qa && visitorAnswer(qa)) || '尚未取得可用答案，请查看下方待确认项。'}</p>
      </div>
    </details>)}</div>
    <div className="visit-guide-unknowns"><h3>这次出行还需确认</h3><p>{guide.unknowns}</p></div>
  </section>;
}
