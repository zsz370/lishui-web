import { Link } from 'react-router-dom';
import { getNode } from '../data/nodes.js';
import { useItinerary } from '../data/store.jsx';

export default function Itinerary() {
  const { items, remove, clear } = useItinerary();
  const nodes = items.map(getNode).filter(Boolean);
  const copy = async () => {
    const text = nodes.map((n, i) => `${i + 1}. ${n.name} —— ${n.summary}`).join('\n');
    await navigator.clipboard.writeText(`我的溧水行程：\n${text}`);
    alert('行程已复制到剪贴板');
  };
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="font-cn text-2xl">我的溧水行程</h1>
          <span className="text-xs text-ls-ink/60">共 {nodes.length} 个节点</span>
          <div className="ml-auto flex gap-2">
            <button className="btn-ghost text-sm" onClick={clear} disabled={!nodes.length}>清空</button>
            <button className="btn-primary text-sm" onClick={copy} disabled={!nodes.length}>复制行程</button>
          </div>
        </div>
        {nodes.length === 0 ? (
          <div className="py-12 text-center text-ls-ink/50">
            还没有点亮任何节点。<Link to="/" className="text-ls-lake underline">回会客厅</Link>，或从<Link to="/nodes" className="text-ls-lake underline">目录</Link>开始。
          </div>
        ) : (
          <ol className="space-y-2">
            {nodes.map((n, i) => (
              <li key={n.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ls-mist">
                <div className="w-7 h-7 rounded-full bg-ls-ink text-white grid place-items-center text-xs">{i + 1}</div>
                <Link className="flex-1" to={`/nodes/${n.id}`}>
                  <div className="font-medium">{n.name}</div>
                  <div className="text-xs text-ls-ink/60 line-clamp-1">{n.summary}</div>
                </Link>
                <button className="text-xs text-ls-fire" onClick={() => remove(n.id)}>移除</button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="text-xs text-ls-ink/50">
        下一步（10/16–10/17）：加"几天 × 人数 × 偏好"参数、路线顺序优化、分享链接与二维码。
      </div>
    </div>
  );
}
