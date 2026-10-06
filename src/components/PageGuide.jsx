import ChatPanel from './ChatPanel.jsx';
import './PageGuide.css';

export default function PageGuide({ id, title, description, node, service, preferences, prompts }) {
  return <section id={id} className="page-guide" aria-labelledby={`${id}-title`}>
    <div className="page-guide-heading"><div><p className="section-overline">有个懂溧水的伙伴，陪你慢慢选</p><h2 id={`${id}-title`}>{title}</h2></div><p>{description}</p></div>
    <ChatPanel node={node} service={service} preferences={preferences} prompts={prompts} />
  </section>;
}
