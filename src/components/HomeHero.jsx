import { memo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PaperPlaneRight, ImageSquare, Pause, Play, ArrowUpRight } from '@phosphor-icons/react';
import WelcomeGuide from './WelcomeGuide.jsx';
import { getPersona, HOST_ID } from '../data/personas.js';
import { responsiveHero } from '../data/responsiveMedia.js';

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

export default memo(function HomeHero({ editorial = false }) {
  const [scene, setScene] = useState(0);
  const [question, setQuestion] = useState('');
  const [failed, setFailed] = useState([]);
  const [loaded, setLoaded] = useState([]);
  const [paused, setPaused] = useState(false);
  const [manualTurn, setManualTurn] = useState(0);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const available = loaded.filter(index => !failed.includes(index));
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);
  useEffect(() => {
    const ready = loaded.filter(index => !failed.includes(index));
    if (failed.includes(scene) && ready.length) { setScene(nextScene(scene, ready)); return undefined; }
    if (paused || reduced || !visible || ready.length < 2) return undefined;
    const timer = window.setTimeout(() => setScene(value => nextScene(value, ready)), 5000);
    return () => window.clearTimeout(timer);
  }, [scene, paused, reduced, visible, loaded, failed, manualTurn]);
  const select = index => {
    setScene(index);
    setManualTurn(value => value + 1);
    setNotice('已切换为' + scenes[index].name + '。');
  };
  const ask = event => { event.preventDefault(); navigate('/guide?q=' + encodeURIComponent(question.trim() || '只有一天，没有车，怎么逛溧水？')); };
  return <section className="home-hero" aria-labelledby="home-title">
    <div className="home-scenery" id="home-scenery">
      {scenes.map((item,index)=><img key={item.id} src={responsiveHero[item.id].src} srcSet={responsiveHero[item.id].srcSet}
        sizes="(max-width: 767px) 100vw, (min-width: 1440px) 1280px, calc(100vw - 80px)"
        alt={item.alt} aria-hidden={index!==scene} width="1600" height="1067"
        fetchpriority={index===0?'high':'auto'} loading={index===0?'eager':'lazy'}
        className={index===scene&&!failed.includes(index)?'is-current':''}
        onLoad={()=>setLoaded(previous=>previous.includes(index)?previous:[...previous,index])}
        onError={()=>setFailed(previous=>previous.includes(index)?previous:[...previous,index])}/>)}
      {failed.includes(scene)&&<div className="hero-photo-fallback" role="status"><ImageSquare size={36} weight="light" aria-hidden="true"/><p>风景暂时无法加载，仍可开始探索。</p></div>}
    </div>
    <div className="home-hero-wash" aria-hidden="true"/>
    <div className="home-hero-content">
      <div className="home-hero-copy">
        <p className="home-eyebrow">{editorial ? '南京 · 溧水' : '你的溧水旅行向导'}</p>
        <h1 id="home-title">{editorial ? <>山水之间，<br/>遇见美溧。</> : <>来溧水，<br/>问淮源姐。</>}</h1>
        <p className="home-hero-description">{editorial ? <>在秦淮源头，寻一段山水与烟火。</> : <>山水怎么逛，乡味怎么尝？<br/>从你的好奇，开始这一程。</>}</p>
        <form className="home-question-form" onSubmit={ask}>
          <label className="home-sr-only" htmlFor="home-question">问淮源姐</label>
          <input id="home-question" maxLength={1000} value={question} onChange={event=>setQuestion(event.target.value)} placeholder="只有一天，没车，怎么逛？"/>
          <button type="submit" aria-label="和淮源姐开始对话"><PaperPlaneRight size={23} aria-hidden="true"/></button>
        </form>
        <div className="hero-question-links"><Link to="/guide?q=只有一天，没有车，怎么逛溧水？">帮我规划一天<ArrowUpRight size={16} aria-hidden="true"/></Link><Link to="/guide?node=n_wx&q=无想山名字是怎么来的？">听无想山的故事<ArrowUpRight size={16} aria-hidden="true"/></Link></div>
        <div className="hero-scene-caption">
          <div role="group" aria-label="选择首页风景">{scenes.map((item,index)=><button type="button" key={item.id} aria-label={'查看'+item.name} aria-pressed={scene===index} disabled={failed.includes(index)} onClick={()=>select(index)}>{item.name}</button>)}</div>
          <button className="hero-carousel-toggle" type="button" aria-controls="home-scenery" aria-label={paused?'继续首页风景轮播':'暂停首页风景轮播'} aria-pressed={paused||reduced} disabled={reduced||available.length<2} onClick={()=>setPaused(value=>!value)}>{paused||reduced?<Play size={17} aria-hidden="true"/>:<Pause size={17} aria-hidden="true"/>}<span className="home-sr-only">{reduced?'静态模式':paused?'继续轮播':'暂停轮播'}</span></button>
        </div>
      </div>
      <WelcomeGuide host={getPersona(HOST_ID)}/>
    </div>
    <p className="home-sr-only" role="status">{notice}</p>
  </section>;
});
