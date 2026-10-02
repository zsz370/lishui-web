import { useMemo, useState } from 'react';
import { nodes, catFilters } from '../data/nodes.js';
import NodeCard from '../components/NodeCard.jsx';

export default function Nodes() {
  const [cat, setCat] = useState('全部');
  const [kw, setKw] = useState('');
  const list = useMemo(
    () =>
      nodes.filter((n) => (cat === '全部' ? true : n.cat === cat)).filter((n) => {
        if (!kw.trim()) return true;
        const k = kw.toLowerCase();
        return (n.name + n.summary + (n.facts || []).join('')).toLowerCase().includes(k);
      }),
    [cat, kw],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {catFilters.map((c) => (
          <button
            key={c}
            className={`px-3 py-1.5 rounded-full text-sm ${cat === c ? 'bg-ls-ink text-white' : 'bg-white border border-ls-ink/15 hover:bg-ls-mist'}`}
            onClick={() => setCat(c)}
          >
            {c}
            <span className="ml-1 text-[10px] opacity-70">
              {c === '全部' ? nodes.length : nodes.filter((n) => n.cat === c).length}
            </span>
          </button>
        ))}
        <input
          className="ml-auto px-3 py-1.5 rounded-md border border-ls-ink/15 text-sm outline-none focus:border-ls-lake w-48"
          placeholder="搜索景点 / 美食 / 民俗…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {list.map((n) => <NodeCard key={n.id} node={n} />)}
        {list.length === 0 && <div className="col-span-full text-center text-ls-ink/50 py-10">没有匹配的节点</div>}
      </div>
    </div>
  );
}
