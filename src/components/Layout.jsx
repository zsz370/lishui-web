import { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { House, Compass, MapTrifold, Info, BookOpen } from '@phosphor-icons/react';
import { useItinerary } from '../data/store.jsx';
import { offlineDemo } from '../services/api.js';

const nav = [
  { to: '/', label: '会客厅', mobile: '首页', icon: House, end: true },
  { to: '/nodes', label: '景点·美食·民俗', mobile: '探索', icon: Compass },
  { to: '/atlas', label: '风物图鉴', mobile: '图鉴', icon: BookOpen },
  { to: '/itinerary', label: '我的溧水行程', mobile: '行程', icon: MapTrifold },
  { to: '/about', label: '关于作品', mobile: '说明', icon: Info },
];

export default function Layout({ children }) {
  const { items } = useItinerary();
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const target = hash ? document.getElementById(hash.slice(1)) : null;
      if (target) target.scrollIntoView({ block: 'start' }); else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);
  const toTop = () => window.scrollTo({ top: 0, behavior: 'instant' });
  return (
    <div className="app-shell">
      <header className="app-header"><div className="app-header-inner">
        <Link to="/" className="app-brand" onClick={toTop}><span className="app-brand-mark">溧</span><span><strong>遇见美溧</strong><small>秦淮源头的山水与烟火</small></span></Link>
        <nav className="desktop-nav" aria-label="主要导航">{nav.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={toTop} className={({ isActive }) => isActive ? 'is-active' : ''}>{item.label}{item.to === '/itinerary' && items.length > 0 && <span className="nav-count">{items.length}</span>}</NavLink>)}</nav>
        <span className="mobile-header-greeting">欢迎来溧水</span>
      </div></header>
      <main className="app-main">{offlineDemo && <aside className="offline-demo-notice" aria-label="离线演示说明"><strong>离线演示版</strong><p>可浏览资料、已审固定问答、文化小任务与行程编辑/导出。实时天气、地图、住宿和开放问答未连接；外部出处及导航需要联网打开。</p></aside>}{children}</main>
      <footer className="app-footer"><p>欢迎来到溧水，愿这一程有山水，也有烟火。</p><span>慢慢逛，尽兴玩。下次再见，也欢迎常来。</span></footer>
      <nav className="mobile-tabbar" aria-label="手机导航">{nav.map((item) => {
        const Icon = item.icon;
        return <NavLink key={item.to} to={item.to} end={item.end} onClick={toTop} className={({ isActive }) => isActive ? 'is-active' : ''}><span className="tabbar-icon"><Icon size={23} weight="light" aria-hidden="true" />{item.to === '/itinerary' && items.length > 0 && <span className="tabbar-count">{items.length}</span>}</span><span>{item.mobile}</span></NavLink>;
      })}</nav>
    </div>
  );
}
