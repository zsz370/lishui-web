import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react';
import { getPersona, personas, guideCategories, HOST_ID } from '../data/personas.js';
import GuideAvatar from '../components/GuideAvatar.jsx';
import GuidePortrait from '../components/GuidePortrait.jsx';

export default function Guides() {
  const [params, setParams] = useSearchParams();
  const selected = getPersona(params.get('guide')) || getPersona(HOST_ID);
  const companions = personas.filter((persona) => persona.category === selected.category || (selected.category === 'scenery' && ['08_wuxiangsao', '09_shijiulang'].includes(persona.id)));
  const select = (id) => setParams({ guide: id }, { replace: true });
  return <div className="guides-experience">
    <Link to="/" className="detail-back"><ArrowLeft size={17} aria-hidden="true" />回到会客厅</Link>
    <div className="section-heading"><div><p className="section-overline">一路有人陪你</p><h1>认识你的溧水导游</h1></div><p>选一位，开启一段旅程</p></div>
    <nav className="guide-category-tabs" aria-label="导游职责分类">
      {guideCategories.map((category) => <button key={category.id} type="button" aria-pressed={selected.category === category.id}
        className={selected.category === category.id ? 'is-selected' : ''}
        onClick={() => select(personas.find((persona) => persona.category === category.id).id)}>{category.name}</button>)}
    </nav>
    <section className="guide-room" aria-labelledby="selected-guide-name">
      <GuidePortrait persona={selected} />
      <div className="guide-room-copy" key={selected.id}><p className="section-overline">{selected.domain}</p><h2 id="selected-guide-name">{selected.name}</h2><p className="guide-room-tagline">{selected.tagline}</p><p className="guide-room-intro">{selected.intro}</p>
        <Link className="experience-button" to={selected.destination}>{selected.action}<ArrowUpRight size={17} aria-hidden="true" /></Link>
        <small>数字人形象为 AI 创作</small>
      </div>
    </section>
    <section className="guide-companions" aria-label="本组数字导游"><p className="section-overline">在这个主题里，还有这些同行伙伴</p><div className="guide-roster">
      {companions.map((persona) => <button type="button" key={persona.id} aria-pressed={persona.id === selected.id}
        className={persona.id === selected.id ? 'is-selected' : ''} onClick={() => select(persona.id)}>
        <GuideAvatar persona={persona} /><span><strong>{persona.name}</strong><small>{persona.domain}</small></span>
      </button>)}
    </div></section>
  </div>;
}
