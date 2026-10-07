import { Link } from 'react-router-dom';
import './JourneyThread.css';

// 原创抽象河线与停靠点，表达发现→理解→带走；不描摹真实水系或历史纹样。
export function JourneyMark({ className = '' }) {
  return <svg className={className} viewBox="0 0 240 72" fill="none" aria-hidden="true"><path d="M8 50C40 50 34 18 70 18S104 54 144 54 188 20 232 20" stroke="currentColor" strokeWidth="2" /><path d="M8 60C40 60 34 28 70 28S104 64 144 64 188 30 232 30" stroke="currentColor" strokeWidth="1" opacity=".45" />{[[47,28],[121,49],[196,28]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="5" fill="currentColor" />)}</svg>;
}
const steps = [{ id: 'discover', to: '/nodes', text: '遇见山水' }, { id: 'learn', to: '/culture/dragon', text: '听懂故事' }, { id: 'carry', to: '/itinerary', text: '带走行程' }];
export default function JourneyThread() {
  return <nav className="journey-thread" aria-label="秦淮源头的一程"><div><JourneyMark /><span>秦淮源头的一程</span></div><ol>{steps.map((item, index) => <li key={item.id}><Link to={item.to}><span aria-hidden="true">0{index + 1}</span>{item.text}</Link></li>)}</ol></nav>;
}
