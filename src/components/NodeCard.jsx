import { Link } from 'react-router-dom';
import { getPersona } from '../data/personas.js';

export default function NodeCard({ node }) {
  const p = getPersona(node.expert);
  return (
    <Link to={`/nodes/${node.id}`} className="card hover:shadow-md transition block">
      <div
        className="h-28 md:h-36 w-full relative"
        style={{ background: `linear-gradient(135deg, ${p?.color || '#1c3a5a'}22, ${p?.color || '#1c3a5a'}66)` }}
      >
        <img
          src={`/nodes/${node.id}.jpg`}
          alt={node.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        {p && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/85 rounded-full pl-1 pr-2 py-0.5">
            <img src={p.avatar} alt={p.name} className="w-5 h-5 rounded-full object-cover bg-ls-mist" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <span className="text-[11px]">{p.name}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-cn text-base">{node.name}</div>
          {(node.tags || []).map((t, i) => <span key={i} className={`tag ${t.cls}`}>{t.text}</span>)}
        </div>
        <div className="text-xs text-ls-ink/70 mt-1 line-clamp-2">{node.summary}</div>
      </div>
    </Link>
  );
}
