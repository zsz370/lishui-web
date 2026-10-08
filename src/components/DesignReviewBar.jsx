import { useLocation, useNavigate } from 'react-router-dom';
import { useDesignReview } from '../data/designReview.jsx';
import '../pages/DesignPreview.css';
import '../styles/WholeSiteDesign.css';

const pages = [['/design-preview','首页'],['/nodes','发现溧水'],['/nodes/n_tsq','地点详情'],['/atlas','风物图鉴'],['/guide','导览对话'],['/itinerary','我的行程'],['/services','出行服务'],['/culture/dragon','文化体验'],['/login','用户登录']];
export default function DesignReviewBar() {
  const { modern, setModern, mobile, setMobile, framed } = useDesignReview();
  const location = useLocation(), navigate = useNavigate();
  if (framed) return null;
  const current = pages.some(([path]) => path === location.pathname) ? location.pathname : location.pathname.startsWith('/nodes/') ? '/nodes/n_tsq' : '/design-preview';
  return <aside className="site-review-bar" aria-label="本地整站设计对比">
    <div><strong>整站设计预览</strong><span>本地对比工具</span></div>
    <nav aria-label="设计对比工具">
      <div role="group" aria-label="选择整站设计"><button type="button" aria-pressed={!modern} onClick={() => setModern(false)}>现有设计</button><button type="button" aria-pressed={modern} onClick={() => setModern(true)}>新版设计</button></div>
      <label><span className="sr-only">预览页面</span><select aria-label="预览页面" value={current} onChange={event => navigate(event.target.value)}>{pages.map(([path,label]) => <option key={path} value={path}>{label}</option>)}</select></label>
      <button type="button" aria-pressed={mobile} onClick={() => setMobile(value => !value)}>{mobile ? '返回页面' : '手机预览'}</button>
    </nav>
  </aside>;
}
