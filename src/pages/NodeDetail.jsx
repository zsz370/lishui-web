import { Link, useParams } from 'react-router-dom';
import { getNode } from '../data/nodes.js';
import { getPersona } from '../data/personas.js';
import ChatPanel from '../components/ChatPanel.jsx';
import { useItinerary } from '../data/store.jsx';

export default function NodeDetail() {
  const { id } = useParams();
  const node = getNode(id);
  const { add, has } = useItinerary();
  if (!node) return <div>节点不存在，<Link to="/nodes" className="text-ls-lake underline">回到目录</Link></div>;
  const p = getPersona(node.expert);
  return (
    <div className="grid md:grid-cols-[1.2fr_1fr] gap-6">
      <div className="space-y-4">
        <div className="card">
          <div className="aspect-[16/9] w-full relative" style={{ background: `linear-gradient(135deg, ${p?.color}22, ${p?.color}66)` }}>
            <img src={`/nodes/${node.id}.jpg`} alt={node.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <div className="p-4 md:p-6 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-cn text-2xl md:text-3xl">{node.name}</h1>
              {(node.tags || []).map((t, i) => <span key={i} className={`tag ${t.cls}`}>{t.text}</span>)}
            </div>
            <div className="text-sm text-ls-ink/80">{node.summary}</div>
            {node.facts && (
              <ul className="text-sm text-ls-ink/70 space-y-0.5 list-disc list-inside">
                {node.facts.map((f) => <li key={f}>{f}</li>)}
              </ul>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button className="btn-primary" onClick={() => add(node.id)} disabled={has(node.id)}>
                {has(node.id) ? '已加入行程' : '加入我的行程'}
              </button>
              <Link to="/nodes" className="btn-ghost">← 返回</Link>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-ls-ink/60 mb-1">由这位专家接待</div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full grid place-items-center text-white font-cn" style={{ background: p?.color }}>
              <img src={p?.avatar} alt={p?.name} className="w-full h-full rounded-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
              {p?.name?.[0]}
            </div>
            <div>
              <div className="font-medium">{p?.name} <span className="text-xs text-ls-ink/50">({p?.alt})</span></div>
              <div className="text-xs text-ls-ink/60">{p?.domain} · {p?.tagline}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <ChatPanel node={node} />
      </div>
    </div>
  );
}
