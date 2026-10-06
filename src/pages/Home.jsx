import { Link } from 'react-router-dom';
import { getPersona } from '../data/personas.js';
import { topics, collectionUrl } from '../data/collections.js';
import { ArrowUpRight } from '@phosphor-icons/react';
import { useItinerary } from '../data/store.jsx';
import HomeHero from '../components/HomeHero.jsx';
import TopicIcon from '../components/TopicIcon.jsx';
import GuideAvatar from '../components/GuideAvatar.jsx';
import Photo from '../components/Photo.jsx';
import ServiceShortcuts from '../components/ServiceShortcuts.jsx';
import JourneyThread from '../components/JourneyThread.jsx';
import './Home.css';

export default function Home() {
  const { items, applyScene } = useItinerary();

  return (
    <div className="home-experience">
      <HomeHero itineraryCount={items.length} />
      <JourneyThread />

      <section className="home-topics" aria-labelledby="topics-title">
        <div className="section-heading"><div><p className="section-overline">随心出发</p><h2 id="topics-title">今天，想怎样逛溧水？</h2></div><Link to="/nodes">探索栏目 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div className="home-topic-shortcuts">
          {topics.map((topic) => <Link key={topic.id} to={collectionUrl(topic.id)} style={{ '--topic-color': topic.color }}>
            <span className="home-topic-icon"><TopicIcon name={topic.icon} /></span><span>{topic.name}</span><small>{topic.description.split('，')[0]}</small>
          </Link>)}
        </div>
      </section>

      <section className="home-culture-task" aria-labelledby="atlas-home-title"><div><p className="section-overline">翻一页，遇见一种风物</p><h2 id="atlas-home-title">把溧水，慢慢翻开。</h2><p>山水、乡味、民俗与街区。看一张图，读一小段，再向导游问问感兴趣的故事。</p></div><Link to="/atlas">翻阅风物图鉴 <ArrowUpRight size={18} aria-hidden="true" /></Link></section>

      <section className="home-trip-tasks" aria-labelledby="trip-tasks-title">
        <div className="section-heading"><div><p className="section-overline">秦淮源头的一天</p><h2 id="trip-tasks-title">先安排一天，再听一段故事。</h2></div><Link to="/itinerary">编辑我的行程 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <p>从两份设计草案开始，补上实际出行条件。替换当前地点，保留已填的日期、人数和预算。</p>
        <div><Link to="/itinerary" onClick={() => applyScene('culture')}><span>无车的一日文化游</span><p>从河谷故事到城区漫步，核对交通，再安排停留。</p><ArrowUpRight size={20} aria-hidden="true" /></Link><Link to="/itinerary" onClick={() => applyScene('rain')}><span>遇雨，保留文化体验</span><p>考虑收藏展陈与休息空间，先确认开放和室外衔接。</p><ArrowUpRight size={20} aria-hidden="true" /></Link></div>
      </section>
      <section className="home-culture-task" aria-labelledby="culture-task-title"><div><p className="section-overline">听懂一个乡里故事</p><h2 id="culture-task-title">一条大龙，三点认识。</h2><p>读名录、看规模、辨传说。用三道小题认识骆山大龙，再向大龙姑追问。</p></div><Link to="/culture/dragon">开始文化小任务 <ArrowUpRight size={18} aria-hidden="true" /></Link></section>
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
