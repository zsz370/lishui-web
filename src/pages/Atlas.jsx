import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, MagnifyingGlass, X } from '@phosphor-icons/react';
import { atlasEntries, atlasCategories, filterAtlas } from '../data/atlas.js';
import { getPersona, guideLink } from '../data/personas.js';
import Photo from '../components/Photo.jsx';
import JourneyThread from '../components/JourneyThread.jsx';
import PageGuide from '../components/PageGuide.jsx';
import './Atlas.css';
import { useSearchDraft } from '../services/useSearchDraft.js';

export default function Atlas() {
  const [params, setParams] = useSearchParams();
  const heading = useRef(null);
  const category = atlasCategories.includes(params.get('cat')) ? params.get('cat') : '全部';
  const query = params.get('q') || '';
  const search = useSearchDraft(query, value => update('全部', value, undefined, true));
  const entries = filterAtlas(category, query);
  const requested = params.get('entry');
  const preferred = requested || (query.trim()?entries[0]?.id:'c_ldl');
  const index = Math.max(0, entries.findIndex((entry) => entry.id === preferred));
  const current = entries[index];
  const unavailable = requested && !atlasEntries.some((entry) => entry.id === requested);
  function update(categoryValue, queryValue, id, replace = false) {
    const next = new URLSearchParams();
    if (categoryValue !== '全部') next.set('cat', categoryValue);
    if (queryValue) next.set('q', queryValue);
    if (id) next.set('entry', id);
    setParams(next, { replace });
  }
  function select(id, focus = false) {
    update(category, query, id);
    if (focus) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }
  function turn(direction) {
    const target = entries[index + direction];
    if (target) select(target.id);
  }
  function keyboard(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || event.target.closest('input, select, textarea, button, a, summary, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      turn(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }
  const guide = getPersona(current?.expert);
  return <div className="atlas-page">
    <header className="atlas-heading"><div><p className="section-overline">山水与烟火，翻一页遇见</p><h1>溧水风物图鉴</h1><p>看一张图，读一小段。把感兴趣的风物，留给下一次出发。</p></div><span><BookOpen size={24} weight="light" aria-hidden="true" />{atlasEntries.length}项风物 · 四类慢读</span></header>
    <a className="page-guide-jump" href="#atlas-guide">边翻边问导游 <ArrowUpRight size={16} aria-hidden="true" /></a>
    <JourneyThread />
    <div className="atlas-tools">
      <nav aria-label="图鉴分类">{atlasCategories.map((cat) => <button type="button" key={cat} aria-pressed={category === cat} onClick={() => update(cat, query, filterAtlas(cat, query)[0]?.id)}>{cat}<small>{filterAtlas(cat).length}</small></button>)}</nav>
      <div className="atlas-search"><label htmlFor="atlas-query" className="sr-only">搜索图鉴</label><MagnifyingGlass size={18} aria-hidden="true" /><input id="atlas-query" type="search" autoComplete="off" value={search.value} onChange={search.onChange} onCompositionStart={search.onCompositionStart} onCompositionEnd={search.onCompositionEnd} />{search.value && <button type="button" aria-label="清空图鉴搜索" onClick={search.clear}><X size={16} aria-hidden="true" /></button>}</div>
    </div>
    {unavailable && <p className="atlas-unavailable" role="status">链接中的条目暂未收录，请从当前图鉴继续翻阅。</p>}
    {current ? <>
      <section className="atlas-reader" tabIndex={0} aria-label="图鉴阅读区，可用左右方向键翻阅" onKeyDown={keyboard}>
        <figure className="atlas-figure"><Photo src={current.photo} alt={`${current.name}资料配图`} eager fallback="暂无配图，先读一段介绍" /><figcaption>{current.photo ? '配图来自团队提供资料；不代表当前季节或活动安排。' : '文字页 · 保留风物介绍'}</figcaption></figure>
        <div className="atlas-copy"><p className="atlas-folio">{current.cat}<span>{String(atlasEntries.findIndex((entry) => entry.id === current.id) + 1).padStart(2, '0')} / {atlasEntries.length}</span></p><h2 ref={heading} tabIndex={-1}>{current.name}</h2><div className="atlas-description">{current.introduction.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</div>
          {current.introductionReviewNote && <p className="atlas-note">{current.introductionReviewNote}</p>}
          <div className="atlas-actions"><Link className="experience-button" to={`/nodes/${current.id}`}>打开风物名片 <ArrowUpRight size={16} aria-hidden="true" /></Link><Link to={guideLink({nodeId:current.id})}>向{guide?.name}提问 <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
          <details className="atlas-sources" key={current.id}><summary>这段介绍的参考出处</summary><ul>{current.introductionSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} <ArrowUpRight size={13} aria-hidden="true" /></a></li>)}</ul></details>
        </div>
      </section>
      <div className="atlas-pagination"><button type="button" disabled={index === 0} onClick={() => turn(-1)}><ArrowLeft size={17} aria-hidden="true" />上一页</button><p role="status" aria-live="polite" aria-atomic="true">第{index + 1} / {entries.length}页<span> · {current.name}</span></p><button type="button" disabled={index === entries.length - 1} onClick={() => turn(1)}>下一页<ArrowRight size={17} aria-hidden="true" /></button></div>
      <p className="atlas-key-hint">选择阅读区后，可用左右方向键翻页；也可从目录直接打开。</p>
      <details className="atlas-directory"><summary>翻阅目录 · {entries.length}项</summary><ol>{entries.map((entry) => <li key={entry.id}><button type="button" aria-current={entry.id === current.id ? 'page' : undefined} onClick={() => select(entry.id, true)}><Photo src={entry.photo} alt=""/><span className="atlas-index-caption"><small>{entry.cat}</small>{entry.name}{!entry.photo&&<small>文字页</small>}</span></button></li>)}</ol></details>
    </> : <section className="atlas-empty" role="status"><BookOpen size={34} weight="light" aria-hidden="true" /><h2>这次还没有找到</h2><p>换个名称，或回到完整图鉴慢慢翻。</p><button type="button" className="experience-button" onClick={() => update('全部', '', 'c_ldl')}>回到完整图鉴</button></section>}
    <PageGuide id="atlas-guide" title="这一页，还有哪些故事？" description={current ? `当前翻到「${current.name}」，可以带着当前风物向淮源姐提问，之前的对话仍会保留。` : '没有找到也没关系，可以把想了解的风物直接告诉导游。'} node={current} />
    <Link className="atlas-return" to="/nodes">回到探索栏目 <ArrowRight size={16} aria-hidden="true" /></Link>
  </div>;
}
