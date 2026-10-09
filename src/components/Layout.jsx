import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { House, Compass, MapTrifold, UserCircle, BookOpen, ChatCircleDots } from '@phosphor-icons/react';
import { useItinerary } from '../data/store.jsx';
import { offlineDemo } from '../services/api.js';
import { useDesignReview } from '../data/designReview.jsx';
import { useAccount } from '../data/account.jsx';
import { preloadPage } from '../services/pageModules.js';
const DesignReviewBar = import.meta.env.DEV ? lazy(() => import('./DesignReviewBar.jsx')) : null;

const nav = [
  { to: '/', label: '首页', mobile: '首页', icon: House, end: true },
  { to: '/guide', label: '问淮源姐', mobile: '问淮源姐', icon: ChatCircleDots },
  { to: '/nodes', label: '发现溧水', mobile: '探索', icon: Compass },
  { to: '/atlas', label: '风物图鉴', mobile: '图鉴', icon: BookOpen },
  { to: '/itinerary', label: '我的行程', mobile: '行程', icon: MapTrifold },
  { to: '/login', label: '用户登录', mobile: '登录', icon: UserCircle },
];

export default function Layout({ children }) {
  const {user}=useAccount();
  const { items } = useItinerary();
  const { pathname, hash, search } = useLocation();
  const { modern, mobile, reviewEnabled } = useDesignReview();
  const frameParams = new URLSearchParams(search);
  frameParams.set('reviewFrame', '1');
  frameParams.set('version', modern ? 'modern' : 'original');
  const previousPath = useRef(pathname);
  useEffect(()=>{
    const warm=()=>nav.forEach(item=>preloadPage(item.to));
    const idle=window.requestIdleCallback?.(warm,{timeout:2500});
    const timer=idle===undefined?window.setTimeout(warm,1200):undefined;
    return()=>{if(idle!==undefined)window.cancelIdleCallback(idle);if(timer!==undefined)window.clearTimeout(timer);};
  },[]);
  useEffect(() => {
    if (previousPath.current === pathname) return undefined;
    previousPath.current = pathname;
    const main = document.getElementById('main-content');
    const focus = () => {
      const target = hash ? document.getElementById(hash.slice(1)) : [...(main?.querySelectorAll('h1')||[])].find(element=>element.getClientRects().length>0);
      if (!target) return false;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      if (hash) target.scrollIntoView({ block: 'start' });
      return true;
    };
    if (focus() || !main) return undefined;
    const observer = new MutationObserver(() => { if (focus()) observer.disconnect(); });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, hash]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const target = hash ? document.getElementById(hash.slice(1)) : null;
      if (target) target.scrollIntoView({ block: 'start' }); else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);
  const toTop = event => {if(new URL(event.currentTarget.href).pathname===pathname)window.scrollTo({ top: 0, behavior: 'instant' });};
  return (
    <div className={'app-shell' + (modern ? ' sample-modern travel-redesign' : '')}>
      {import.meta.env.DEV && reviewEnabled && <Suspense fallback={null}><DesignReviewBar/></Suspense>}
      <a className="skip-to-content" href="#main-content">跳到正文</a>
      <header className="app-header"><div className="app-header-inner">
        <Link to="/" className="app-brand" onClick={toTop}><span className="app-brand-mark">溧</span><span><strong>遇见美溧</strong><small>秦淮源头的山水与烟火</small></span></Link>
        <nav className="desktop-nav" aria-label="主要导航">{nav.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={toTop} onPointerEnter={()=>preloadPage(item.to)} onFocus={()=>preloadPage(item.to)} className={({ isActive }) => isActive ? 'is-active' : ''}>{item.to === '/login' && user ? '我的账号' : item.label}{item.to === '/itinerary' && items.length > 0 && <span className="nav-count">{items.length}</span>}</NavLink>)}</nav>
        <span className="mobile-header-greeting">欢迎来溧水</span>
      </div></header>
      <main className="app-main" id="main-content" tabIndex={-1}>{offlineDemo && <aside className="offline-demo-notice" aria-label="离线演示说明"><strong>离线演示版</strong><p>可浏览资料、已审固定问答、文化小任务与行程编辑/导出。实时天气、地图、住宿和开放问答未连接；外部出处及导航需要联网打开。</p></aside>}{mobile && import.meta.env.DEV && reviewEnabled ? <div className="design-device"><iframe title="390像素整站手机预览" src={pathname + '?' + frameParams + hash}/></div> : children}</main>
      <footer className="app-footer"><div><p>欢迎来到溧水，愿这一程有山水，也有烟火。</p><span>慢慢逛，尽兴玩。下次再见，也欢迎常来。</span><a className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-4" href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer">苏ICP备2026032900号-2</a></div><nav aria-label="页脚导航"><Link to="/atlas">风物图鉴</Link><Link to="/services">出行服务</Link><Link to="/login">{user?'我的账号':'用户登录'}</Link></nav></footer>
      <nav className="mobile-tabbar" aria-label="手机导航">{nav.filter(item=>item.to!=='/atlas').map((item) => {
        const Icon = item.icon;
        return <NavLink key={item.to} to={item.to} end={item.end} onClick={toTop} onPointerEnter={()=>preloadPage(item.to)} onFocus={()=>preloadPage(item.to)} className={({ isActive }) => isActive ? 'is-active' : ''}><span className="tabbar-icon"><Icon size={23} weight="light" aria-hidden="true" />{item.to === '/itinerary' && items.length > 0 && <span className="tabbar-count">{items.length}</span>}</span><span>{item.to === '/login' && user ? '账号' : item.mobile}</span></NavLink>;
      })}</nav>
    </div>
  );
}
