import { memo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Pause, Play, PaperPlaneRight } from '@phosphor-icons/react';
import { getPersona, HOST_ID } from '../data/personas.js';
import WelcomeGuide from './WelcomeGuide.jsx';

const scenes = [
  { id: 'lakeside', name: '湖畔暮色', src: '/assets/images/hero-lakeside.webp', alt: '湖畔弯曲的道路与落日，来自项目溧水风景素材' },
  { id: 'wuxiang', name: '无想山', src: '/assets/images/hero-wuxiang.webp', alt: '无想山层叠的山林与远处湖泊' },
  { id: 'bridge', name: '天生桥', src: '/assets/images/hero-tianshengqiao.webp', alt: '天生桥景区河道与山林航拍' },
];
const nextScene = (current, available) => {
  for (let offset = 1; offset <= scenes.length; offset++) {
    const candidate = (current + offset) % scenes.length;
    if (available.includes(candidate)) return candidate;
  }
  return current;
};

export default memo(function HomeHero({ itineraryCount }) {
  const [scene, setScene] = useState(0);
  const [question,setQuestion]=useState('');const navigate=useNavigate();
  const ask=(text)=>navigate('/guide?q='+encodeURIComponent(text||question||'只有一天，没有车，怎么逛溧水？'));
  const [failed, setFailed] = useState([]);
  const [loaded, setLoaded] = useState([]);
  const [paused, setPaused] = useState(false);
  const [manualTurn, setManualTurn] = useState(0);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => { media.removeEventListener('change', updateMotion); document.removeEventListener('visibilitychange', updateVisibility); };
  }, []);
  useEffect(() => {
    const available = loaded.filter((index) => !failed.includes(index));
    if (failed.includes(scene) && available.length) { setScene(nextScene(scene, available)); return undefined; }
    if (paused || reduced || !visible || available.length < 2) return undefined;
    const timer = window.setTimeout(() => setScene((current) => nextScene(current, available)), 5000);
    return () => window.clearTimeout(timer);
  }, [scene, paused, reduced, visible, loaded, failed, manualTurn]);
  const select = (index) => { setScene(index); setManualTurn((turn) => turn + 1); setNotice(`已切换为${scenes[index].name}。`); };

  return <section className="home-hero" aria-labelledby="home-title">
    <div className="home-scenery" aria-hidden="true">
      {scenes.map((item, index) => <img key={item.id} src={item.src} alt="" className={scene === index && !failed.includes(index) ? 'is-current' : ''} fetchpriority={index === 0 ? 'high' : 'auto'}
        onLoad={() => setLoaded((current) => current.includes(index) ? current : [...current, index])}
        onError={() => setFailed((current) => current.includes(index) ? current : [...current, index])} />)}
    </div>
    <div className="home-hero-wash" aria-hidden="true" />
    <div className="home-hero-copy">
      <p className="home-eyebrow">你的溧水旅行向导</p>
      <h1 id="home-title">来溧水，<br />问淮源姐。</h1>
      <p className="home-hero-description">想去哪里，想听什么故事？<br />山水、乡味与吃住行，陪你一起安排。</p>
      <form className="home-question-form" onSubmit={event=>{event.preventDefault();ask();}}><label className="home-sr-only" htmlFor="home-question">问淮源姐</label><input id="home-question" maxLength={1000} value={question} onChange={event=>setQuestion(event.target.value)} placeholder="例如：一天时间，没有车，怎么逛？"/><button type="submit" aria-label="和淮源姐开始对话"><PaperPlaneRight size={22}/></button></form>
      <div className="home-question-hints">{['帮我安排一天','想听无想山的故事','找一点本地乡味'].map(text=><button type="button" key={text} onClick={()=>ask(text)}>{text}<ArrowUpRight size={14}/></button>)}</div>
      <div className="home-scene-picker" aria-label="首页风景与轮播控制">
        <p>先遇见一处风景<span aria-hidden="true"> / </span><span lang="en">A FIRST GLIMPSE</span></p>
        <div className="home-scene-options">{scenes.map((item, index) => <button type="button" key={item.id} className={scene === index ? 'is-selected' : ''} onClick={() => select(index)} aria-pressed={scene === index} disabled={failed.includes(index)}>{!failed.includes(index) && <img src={item.src} alt="" />}<span>{item.name}</span></button>)}</div>
        <label className="home-mobile-scene"><span className="home-sr-only">选择首页风景</span><select value={scene} onChange={(event) => select(Number(event.target.value))}>{scenes.map((item, index) => <option key={item.id} value={index} disabled={failed.includes(index)}>{item.name}</option>)}</select></label>
        <div className="home-scene-playback"><button type="button" onClick={() => { setPaused((value) => !value); setNotice(paused ? '背景轮播已继续。' : '背景轮播已暂停。'); }} disabled={reduced || loaded.filter((index) => !failed.includes(index)).length < 2} aria-label={paused ? '继续背景轮播' : '暂停背景轮播'}>{paused || reduced ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{paused || reduced ? '已暂停' : '暂停轮播'}</button><span>{reduced ? '减少动态已开启' : paused ? '可手动选择风景' : '每5秒切换'}</span></div>
        <span className="home-sr-only">当前风景：{scenes[scene].alt}</span><span className="home-sr-only" aria-live="polite">{notice}</span>
        {failed.length === scenes.length && <p>风景暂时无法加载，仍可开始探索。</p>}
      </div>
    </div>
    <WelcomeGuide host={getPersona(HOST_ID)} />
  </section>;
});
