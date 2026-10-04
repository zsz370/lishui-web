import { Link } from 'react-router-dom';
import { ArrowUpRight, Compass, ChatCircleDots, MapTrifold } from '@phosphor-icons/react';
import Photo from '../components/Photo.jsx';
import GuideAvatar from '../components/GuideAvatar.jsx';
import { getPersona, guideUrl } from '../data/personas.js';

const steps = [
  { icon: Compass, title: '先选一种喜欢的逛法', text: '从山水、美食、乡里故事或慢游出发，每个栏目都为你整理了几个容易上手的主题。' },
  { icon: ChatCircleDots, title: '有好奇的，就问导游', text: '淮源姐迎接你，伙伴们也会回答住宿、天气、交通和日常需求。从旅途服务入口选择主题，或在地点介绍页直接提问。' },
  { icon: MapTrifold, title: '把心动留在行程里', text: '将喜欢的地方加入行程，按自己的节奏挑选，再复制成一份随身的小清单。' },
];
export default function About() {
  return <div className="about-experience">
    <section className="about-intro"><Photo src="/assets/catalog/lake-dongping.webp" alt="东屏湖水面与湖畔树林" eager /><div><p className="section-overline">欢迎来溧水</p><h1>把风景慢慢看，<br />把故事慢慢听。</h1><p>这是一份陪你认识溧水的数字导览。愿你在秦淮源头，找到适合自己的逛法，也遇见喜欢的山水与烟火。</p><Link className="experience-button" to="/nodes">开始探索 <ArrowUpRight size={17} aria-hidden="true" /></Link></div></section>
    <section className="about-how"><div className="section-heading"><h2>第一次来，可以这样逛</h2></div><ol>{steps.map((step, index) => {
      const Icon = step.icon;
      return <li key={step.title}><span className="about-step-number">0{index + 1}</span><Icon size={24} weight="light" aria-hidden="true" /><div><h3>{step.title}</h3><p>{step.text}</p></div></li>;
    })}</ol></section>
    <section className="about-kind-note"><h2>出发前的一点小提醒</h2><p>天气、开放时间、交通与票价可能变化，出发前请留意景区及有关部门的最新公告。地方传说作为故事欣赏，具体历史与项目级别以正式资料为准。</p></section>
    <div className="collection-companions"><Link to="/services">看看完整旅途服务 <ArrowUpRight size={15} aria-hidden="true" /></Link>{['08_wuxiangsao', '09_shijiulang', '11_dongpingjie', '12_dongluke'].map((id) => <Link key={id} to={guideUrl(id)}><GuideAvatar persona={getPersona(id)} /><span>{getPersona(id).name}</span></Link>)}</div>
    <p className="about-ai-note">数字人形象为 AI 生成，讲解与资料仅供游览参考。欢迎你带着好奇来，也带着自己的故事回去。</p>
  </div>;
}
