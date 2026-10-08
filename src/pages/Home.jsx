import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Plus, Check, BookOpen, ChatCircleDots, MapTrifold, Car, MapPin, Baby, Wheelchair, SuitcaseRolling, PawPrint, CaretDown } from '@phosphor-icons/react';
import HomeHero from '../components/HomeHero.jsx';
import Photo from '../components/Photo.jsx';
import TopicIcon from '../components/TopicIcon.jsx';
import { useItinerary } from '../data/store.jsx';
import { getNode } from '../data/nodes.js';
import { guideLink } from '../data/personas.js';
import { collectionUrl } from '../data/collections.js';
import { nodePhotos } from '../data/nodeMedia.js';
import { homeTopics, homeQuestions, preparationTopics } from '../data/homeDiscovery.js';
import { themeRoutes } from '../data/themeRoutes.js';
import { visitorAnswer } from '../data/visitorAnswerCopy.js';
import './Home.css';
import { useDesignReview } from '../data/designReview.jsx';

const facilityIcons = { Car, MapPin, Baby, Wheelchair, SuitcaseRolling, PawPrint };
const chapterLinks = [ ['home-discover', '选一处风景'], ['home-routes', '看看主题线路'], ['home-culture', '体验乡里故事'], ['home-questions', '问问淮源姐'], ['home-preparation', '准备出发'] ];

export default function Home({ designPreview = false }) {
  const { modern } = useDesignReview();
  const { items, add, has, savedLocally } = useItinerary();
  const [topicId, setTopicId] = useState(homeTopics[0].id);
  const [routeId, setRouteId] = useState(themeRoutes[0].id);
  const [facilityId, setFacilityId] = useState(preparationTopics[0].id);
  const [notice, setNotice] = useState('');
  const topic = homeTopics.find(item => item.id === topicId);
  const route = themeRoutes.find(item => item.id === routeId);
  const facility = preparationTopics.find(item => item.id === facilityId);
  const save = node => { add(node.id); setNotice('已把' + node.name + '加入我的行程。'); };

  return <div className="home-journal">
    <HomeHero editorial={designPreview || modern} />
    <nav className="home-chapters" aria-label="首页内容导航">{chapterLinks.map(([id, label]) => <a key={id} href={'#'+id}>{label}<ArrowRight size={15} aria-hidden="true" /></a>)}</nav>
    <section className="journal-section" id="home-discover" aria-labelledby="discover-title">
      <header className="journal-heading"><h2 id="discover-title">从一处喜欢的地方开始。</h2><p>看山水、尝乡味、听故事，或在街巷里慢慢走。</p></header>
      <div className="home-topic-switch" role="group" aria-label="选择探索主题">{homeTopics.map(item => <button type="button" key={item.id} aria-pressed={topicId === item.id} onClick={() => setTopicId(item.id)}><TopicIcon name={item.icon} size={23} /><span>{item.name}<small>{item.count}处内容</small></span></button>)}</div>
      <div className="home-discovery-grid" aria-label={topic.name+'推荐内容'}>
        {topic.previews.map((group, index) => <article key={group.id} className={index === 0 ? 'discovery-lead' : 'discovery-small'}>
          <Link className="discovery-image" to={'/nodes/'+group.node.id}><Photo src={group.cover} alt={group.node.name+'资料配图'} /></Link>
          <div className="discovery-copy"><p className="discovery-category">{group.name}</p><h3><Link to={'/nodes/'+group.node.id}>{group.node.name}<ArrowUpRight size={21} aria-hidden="true" /></Link></h3><p>{group.node.summary}</p><button type="button" onClick={() => save(group.node)} disabled={has(group.node.id)}>{has(group.node.id) ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}{has(group.node.id) ? '已加入我的行程' : '加入我的行程'}</button></div>
        </article>)}
      </div>
      <Link className="journal-text-link" to={collectionUrl(topic.id)}>浏览{topic.name}<ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
    <section className="journal-section home-route-section" id="home-routes" aria-labelledby="routes-title">
      <header className="journal-heading"><h2 id="routes-title">选一条主题线路。</h2><p>先看地点顺序，再按同行者、天气与交通安排自己的节奏。</p></header>
      <div className="route-switch" role="group" aria-label="主题线路预览">{themeRoutes.map(item => <button type="button" key={item.id} onClick={() => setRouteId(item.id)} aria-pressed={routeId === item.id}>{item.name}</button>)}</div>
      <div className="home-route-board">
        <div className="route-story"><MapTrifold size={32} weight="light" aria-hidden="true" /><h3>{route.name}</h3><p>{route.description}</p><small>行程灵感草案，顺序示意不代表实际距离。</small><Link className="experience-button" to="/itinerary#scene-title">在我的行程中选用<ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        <ol className="home-route-stops">{route.nodeIds.map((id, index) => { const node = getNode(id); return <li key={id}><span className="route-stop-number" aria-label={'第'+(index+1)+'站'}>{index+1}</span><Link className="route-stop-photo" to={'/nodes/'+id}><Photo src={nodePhotos[id]} alt={node.name} /></Link><div><h4><Link to={'/nodes/'+id}>{node.name}<ArrowUpRight size={17} aria-hidden="true" /></Link></h4><p>{route.stopNotes[id]}</p></div></li>; })}</ol>
      </div>
      <details className="route-check"><summary>这条线路，出发前要确认什么？<CaretDown size={18} aria-hidden="true" /></summary><p>{route.unknowns}</p></details>
    </section>
    <section className="journal-section home-culture-section" id="home-culture" aria-labelledby="culture-title">
      <header className="journal-heading"><h2 id="culture-title">走近溧水的龙舞。</h2><p>从一张图、一段故事开始，把旅行里的好奇多留一会儿。</p></header>
      <div className="home-culture-layout"><div className="culture-gallery"><figure><Link className="culture-photo" to="/nodes/c_ldl"><Photo src={nodePhotos.c_ldl} alt="骆山大龙资料配图" /></Link><figcaption><Link to="/nodes/c_ldl">骆山大龙<ArrowUpRight size={17} aria-hidden="true"/></Link></figcaption></figure><figure><Link className="culture-photo" to="/nodes/c_ljd"><Photo src={nodePhotos.c_ljd} alt="陆家大龙资料配图"/></Link><figcaption><Link to="/nodes/c_ljd">陆家大龙<ArrowUpRight size={17} aria-hidden="true"/></Link></figcaption></figure></div><div className="culture-experience"><BookOpen size={30} weight="light" aria-hidden="true" /><h3>认识骆山大龙</h3><p>认清名字、读懂规模、分清传说与史料。用三道小题，带走一份自己的学习记录。</p><Link className="experience-button" to="/culture/dragon">开始文化小体验<ArrowUpRight size={18} aria-hidden="true" /></Link><Link className="journal-text-link" to="/atlas">翻阅风物图鉴<ArrowRight size={18} aria-hidden="true" /></Link></div></div>
    </section>
    <section className="journal-section home-guide-section" id="home-questions" aria-labelledby="questions-title">
      <header className="journal-heading"><h2 id="questions-title">先问一个感兴趣的问题。</h2><p>先听一个回答，再带着自己的问题继续聊。</p></header>
      <div className="home-question-board">{homeQuestions.map(qa=><article key={qa.id}><Link className="question-photo" to={'/nodes/'+qa.nodeId}><Photo src={nodePhotos[qa.nodeId]} alt={getNode(qa.nodeId).name}/></Link><details><summary>{qa.q}<Plus size={19} aria-hidden="true"/></summary><div><p>{visitorAnswer(qa)}</p><Link to={guideLink({nodeId:qa.nodeId,question:qa.q})}>继续问这个地方<ChatCircleDots size={18} aria-hidden="true"/></Link></div></details></article>)}</div><Link className="journal-text-link" to="/guide">和淮源姐聊聊<ArrowRight size={18} aria-hidden="true"/></Link>
    </section>
    <section className="journal-section" id="home-preparation" aria-labelledby="preparation-title">
      <header className="journal-heading"><h2 id="preparation-title">出发前，确认这些小事。</h2><p>停车、照护和行李，提前确认会更从容。具体设施以场所答复为准。</p></header>
      <div className="preparation-layout"><div className="preparation-topics" role="group" aria-label="选择出行准备事项">{preparationTopics.map(item => {const Icon = facilityIcons[item.icon];return <button type="button" key={item.id} aria-pressed={facilityId === item.id} onClick={() => setFacilityId(item.id)}><Icon size={23} weight="light" aria-hidden="true" />{item.name}</button>;})}</div><div className="preparation-answers" aria-label={facility.name+'出行建议'}>{facility.questions.map((qa, index) => <details key={qa.id} open={index === 0} name={'preparation-'+facility.id}><summary>{qa.q}<CaretDown size={17} aria-hidden="true" /></summary><p>{visitorAnswer(qa)}</p></details>)}</div></div>
      <Link className="journal-text-link" to="/services">查看天气、交通与住宿工具<ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
    <section className="journal-section home-saved-section" aria-labelledby="saved-title"><div><MapTrifold size={30} weight="light" aria-hidden="true" /><h2 id="saved-title">把喜欢的地方，留给下一程。</h2><p>{items.length ? '已选'+items.length+'处。补好日期、交通与停留安排，再带走行程卡。' : '看到喜欢的地方，点击“加入我的行程”。再按自己的时间和兴趣整理。'}</p>{!savedLocally && <p role="status">当前浏览器无法保存，请及时导出行程。</p>}</div><div className="home-saved-places">{items.slice(0,3).map(id => {const node=getNode(id);return <Link key={id} to={'/nodes/'+id}><Photo src={nodePhotos[id]} alt={node.name} /><span>{node.name}</span></Link>;})}<Link className="experience-button" to="/itinerary">整理我的行程<ArrowUpRight size={18} aria-hidden="true" /></Link></div></section>
    <p className="home-sr-only" role="status">{notice}</p>
  </div>;
}
