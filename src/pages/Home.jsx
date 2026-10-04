import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HOST_ID, getPersona } from '../data/personas.js';
import { topics, collectionUrl } from '../data/collections.js';
import { ArrowUpRight } from '@phosphor-icons/react';
import { useItinerary } from '../data/store.jsx';
import WelcomeGuide from '../components/WelcomeGuide.jsx';
import TopicIcon from '../components/TopicIcon.jsx';
import GuideAvatar from '../components/GuideAvatar.jsx';
import Photo from '../components/Photo.jsx';
import ServiceShortcuts from '../components/ServiceShortcuts.jsx';
import './Home.css';

const scenes = [
  { id: 'lakeside', name: '湖畔暮色', src: '/assets/images/hero-lakeside.webp', alt: '湖畔弯曲的道路与落日，来自项目溧水风景素材' },
  { id: 'wuxiang', name: '无想山', src: '/assets/images/hero-wuxiang.webp', alt: '无想山层叠的山林与远处湖泊' },
  { id: 'bridge', name: '天生桥', src: '/assets/images/hero-tianshengqiao.webp', alt: '天生桥景区河道与山林航拍' },
];
export default function Home() {
  const { items, applyScene } = useItinerary();
  const host = getPersona(HOST_ID);
  const [scene, setScene] = useState(0);
  const [failedScenes, setFailedScenes] = useState([]);

  return (
    <div className="home-experience">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-scenery" aria-hidden="true">
          {scenes.map((item, index) => <img key={item.id} src={item.src} alt="" className={scene === index ? 'is-current' : ''}
            fetchpriority={index === 0 ? 'high' : 'auto'}
            onError={() => setFailedScenes((failed) => failed.includes(index) ? failed : [...failed, index])} />)}
        </div>
        <div className="home-hero-wash" aria-hidden="true" />
        <div className="home-hero-copy">
          <div className="home-eyebrow"><span className="home-eyebrow-line" />南京 · 溧水 <span className="home-eyebrow-en">LISHUI, NANJING</span></div>
          <p className="home-hero-kicker">秦淮源头的山水与烟火</p>
          <h1 id="home-title">一程山水，<br />一味溧水。</h1>
          <p className="home-hero-description">跟着淮源姐，走进秦淮源头。<br />看湖光山色，听乡里故事，再尝一口地道风味。</p>
          <div className="home-hero-actions">
            <Link to="/nodes" className="home-start">开始我的溧水之旅 <ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link to="/itinerary" className="home-itinerary">我的行程{items.length > 0 ? ` · ${items.length} 处` : ''}<span aria-hidden="true">→</span></Link>
          </div>
          <div className="home-scene-picker" aria-label="选择首页风景">
            <p>先遇见一处风景<span aria-hidden="true"> / </span><span lang="en">A FIRST GLIMPSE</span></p>
            <div className="home-scene-options">
              {scenes.map((item, index) => <button type="button" key={item.id} className={scene === index ? 'is-selected' : ''} onClick={() => setScene(index)} aria-pressed={scene === index} disabled={failedScenes.includes(index)}>
                <img src={item.src} alt="" /><span>{item.name}</span>
              </button>)}
            </div>
            <span className="home-sr-only" aria-live="polite">当前风景：{scenes[scene].alt}{failedScenes.includes(scene) ? '，图片暂时无法加载，请选择其他风景。' : ''}</span>
          </div>
        </div>
        <WelcomeGuide host={host} />
      </section>

      <section className="home-topics" aria-labelledby="topics-title">
        <div className="section-heading"><div><p className="section-overline">随心出发</p><h2 id="topics-title">今天，想怎样逛溧水？</h2></div><Link to="/nodes">探索栏目 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div className="home-topic-shortcuts">
          {topics.map((topic) => <Link key={topic.id} to={collectionUrl(topic.id)} style={{ '--topic-color': topic.color }}>
            <span className="home-topic-icon"><TopicIcon name={topic.icon} /></span><span>{topic.name}</span><small>{topic.description.split('，')[0]}</small>
          </Link>)}
        </div>
      </section>

      <section className="home-trip-tasks" aria-labelledby="trip-tasks-title">
        <div className="section-heading"><div><p className="section-overline">秦淮源头的一天</p><h2 id="trip-tasks-title">先安排一天，再听一段故事。</h2></div><Link to="/itinerary">编辑我的行程 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <p>从两份设计草案开始，补上实际出行条件。替换当前地点，保留已填的日期、人数和预算。</p>
        <div><Link to="/itinerary" onClick={() => applyScene('culture')}><span>无车的一日文化游</span><p>从河谷故事到城区漫步，核对交通，再安排停留。</p><ArrowUpRight size={20} aria-hidden="true" /></Link><Link to="/itinerary" onClick={() => applyScene('rain')}><span>遇雨，保留文化体验</span><p>考虑收藏展陈与休息空间，先确认开放和室外衔接。</p><ArrowUpRight size={20} aria-hidden="true" /></Link></div>
      </section>
      <ServiceShortcuts />
      <section className="home-inspiration" aria-labelledby="inspiration-title">
        <Photo src="/nodes/n_tsq.jpg" alt="天生桥的山林与河谷" />
        <div><p className="section-overline">给这一次出发，一点灵感</p><h2 id="inspiration-title">沿着秦淮，<br />听一段山水故事。</h2><p>先从天生桥认识溧水，让河谷的风景和胭脂客的讲述，陪你打开这一程。</p><Link to={collectionUrl('scenery', 'river')}>开启这段漫游 <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
      </section>

      <section className="home-guide-note" aria-label="导游介绍">
        <div className="guide-avatar-stack">{['03_yanzhike', '07_fuxiaomei', '04_dalonggu'].map((id) => <GuideAvatar key={id} persona={getPersona(id)} />)}</div>
        <div><h2>一路有人陪你</h2><p>看风景、寻乡味、听故事，淮源姐会帮你找到懂这里的导游。</p></div>
        <Link to="/guides" className="home-meet-guides">认识导游 <ArrowUpRight size={20} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
