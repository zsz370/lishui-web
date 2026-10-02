import { Link, NavLink } from 'react-router-dom';
import { useItinerary } from '../data/store.jsx';

const nav = [
  { to: '/', label: '会客厅', end: true },
  { to: '/nodes', label: '景点·美食·民俗' },
  { to: '/itinerary', label: '我的溧水行程' },
  { to: '/about', label: '关于作品' },
];

export default function Layout({ children }) {
  const { items } = useItinerary();
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-ls-ink/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-ls-ink text-white grid place-items-center font-cn text-lg">溧</div>
            <div className="leading-tight">
              <div className="font-cn text-lg">溧水数字人导览</div>
              <div className="text-[11px] text-ls-ink/60">秦淮源头的山水与烟火</div>
            </div>
          </Link>
          <nav className="ml-auto flex flex-wrap gap-1 text-sm">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md ${
                    isActive ? 'bg-ls-ink text-white' : 'text-ls-ink hover:bg-ls-ink/10'
                  }`
                }
              >
                {n.label}
                {n.to === '/itinerary' && items.length > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-ls-fire text-white">{items.length}</span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      <footer className="border-t border-ls-ink/10 bg-white/60 text-xs text-ls-ink/70">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-3">
          <div>© 2026 数媒参赛作品 · 1–2 人小队</div>
          <div className="ml-auto">知识库 100% 团队原创 · 非遗约 50–60 项（以官方名录为准）</div>
        </div>
      </footer>
    </div>
  );
}
