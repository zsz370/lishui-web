import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, CaretRight, MagnifyingGlass, X } from '@phosphor-icons/react';
import { nodes, getNode } from '../data/nodes.js';
import { topics, getTopic, getGroup, belongsToTopic, collectionUrl, detailUrl } from '../data/collections.js';
import { getPersona, guideUrl } from '../data/personas.js';
import { useItinerary } from '../data/store.jsx';
import Photo from '../components/Photo.jsx';
import TopicIcon from '../components/TopicIcon.jsx';
import GuideAvatar from '../components/GuideAvatar.jsx';
import ServiceShortcuts from '../components/ServiceShortcuts.jsx';
import { departmentPlans } from '../../config/agent-system.plan.js';

export default function Nodes() {
  const [params, setParams] = useSearchParams();
  const topic = getTopic(params.get('topic'));
  const group = getGroup(topic, params.get('group'));
  const query = params.get('q') || '';
  const [limit, setLimit] = useState(6);
  const { add, has } = useItinerary();
  useEffect(() => setLimit(6), [query, topic?.id]);
  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    return nodes.filter((node) => belongsToTopic(node, topic))
      .filter((node) => `${node.name} ${node.summary} ${(node.facts || []).join(' ')}`.toLowerCase().includes(keyword));
  }, [query, topic]);
  const updateQuery = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  };
  const selectedNodes = (group?.nodeIds || []).map(getNode).filter(Boolean);
  const primary = selectedNodes[0];
  const department = departmentPlans.find((item) => item.id === topic?.id);
  const section = department?.sections.find((item) => item.id === group?.id);
  const guide = getPersona(section?.owner || primary?.expert || group?.expert);
  const primaryLink = primary ? detailUrl(primary.id, topic.id, group.id) : '/nodes';
  const searchDetailUrl = (nodeId) => {
    const origin = new URLSearchParams({ q: query });
    if (topic) origin.set('from', topic.id);
    return `/nodes/${nodeId}?${origin}`;
  };

  return (
    <div className="explore-page">
      <div className="explore-heading">
        <div><p className="section-overline">跟着心意，认识溧水</p><h1>{topic ? topic.name : '探索溧水'}</h1><p>{topic ? topic.description : '先选一个主题。山水、乡味与故事，慢慢遇见。'}</p></div>
        <div className="explore-search"><label className="sr-only" htmlFor="explore-query">搜索想去的地方或想尝的味道</label><MagnifyingGlass size={20} aria-hidden="true" /><input id="explore-query" type="search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="搜地点、乡味或故事" />{query && <button type="button" aria-label="清空搜索" onClick={() => updateQuery('')}><X size={16} aria-hidden="true" /></button>}</div>
      </div>

      <nav className="explore-topic-tabs" aria-label="探索栏目">
        <Link to="/nodes" className={!topic ? 'is-selected' : ''} aria-current={!topic ? 'page' : undefined}>全部栏目</Link>
        {topics.map((item) => <Link key={item.id} to={collectionUrl(item.id)} className={topic?.id === item.id ? 'is-selected' : ''} aria-current={topic?.id === item.id ? 'page' : undefined}><TopicIcon name={item.icon} size={18} />{item.name}</Link>)}
      </nav>
      {department && <Link className="collection-guide" to={guideUrl(department.coordinator)}><GuideAvatar persona={getPersona(department.coordinator)} /><div><h3>{getPersona(department.coordinator).name}统筹{department.name}</h3><p>小主题由对应伙伴负责，住宿、天气和交通可一起咨询。</p></div><CaretRight size={18} aria-hidden="true" /></Link>}

      {query.trim() ? <section className="search-results" aria-label="搜索结果" aria-live="polite">
        <div className="section-heading"><h2>找到 {results.length} 处相关内容</h2><button type="button" onClick={() => updateQuery('')}>回到栏目</button></div>
        {results.length === 0 ? <div className="experience-empty"><MagnifyingGlass size={36} weight="light" aria-hidden="true" /><h2>暂时没有找到这段关键词</h2><p>试试“湖”“糕点”或一个地点的名字。</p><button type="button" className="experience-button" onClick={() => updateQuery('')}>按栏目慢慢逛</button></div> : <>
          <div className="search-result-list">{results.slice(0, limit).map((node) => <Link key={node.id} to={searchDetailUrl(node.id)}><span className="result-category">{node.cat}</span><div><h3>{node.name}</h3><p>{node.summary}</p></div><CaretRight size={18} aria-hidden="true" /></Link>)}</div>
          {results.length > limit && <button type="button" className="explore-more" onClick={() => setLimit((value) => value + 6)}>查看更多搜索结果</button>}
        </>}
      </section> : !topic ? <>
        <div className="topic-overview">{topics.map((item, index) => <Link key={item.id} className={`topic-cover topic-cover-${index}`} to={collectionUrl(item.id)}>
          <Photo src={item.cover} alt={`${item.name}栏目代表照片`} eager={index < 2} />
          <div className="topic-cover-copy"><p>{item.eyebrow}</p><h2>{item.name}</h2><span>{item.description}</span><span className="topic-cover-action">走进这个栏目 <ArrowUpRight size={18} aria-hidden="true" /></span></div>
        </Link>)}</div>
        <ServiceShortcuts compact />
        <div className="explore-soft-note"><p>不用一次看完所有风景。</p><span>选一个喜欢的栏目，让导游陪你从一段故事开始。</span></div>
      </> : <>
        <div className="collection-navigation"><Link to="/nodes"><ArrowLeft size={16} aria-hidden="true" />全部栏目</Link><div className="collection-group-tabs" aria-label={`${topic.name}主题`}>
          {topic.groups.map((item) => <Link key={item.id} to={collectionUrl(topic.id, item.id)} className={group.id === item.id ? 'is-selected' : ''} aria-current={group.id === item.id ? 'page' : undefined}>{item.name}</Link>)}
        </div></div>
        <section className="collection-feature" aria-labelledby="collection-title">
          <div className={`collection-cover ${group.coverType === 'portrait' ? 'collection-cover--portrait' : ''}`}>
            <Photo src={group.cover} alt={group.coverType === 'portrait' ? `${guide?.name}的数字导游形象` : `${group.name}代表照片`} eager />
            <span className="collection-cover-label">{group.coverType === 'portrait' ? '数字导游形象 · AI 生成' : topic.eyebrow}</span>
          </div>
          <div className="collection-intro"><p className="section-overline">{group.subtitle}</p><h2 id="collection-title">{group.name}</h2><p>{group.intro}</p>
            {primary && <div className="collection-actions"><Link className="experience-button" to={primaryLink}>从{primary.name}开始 <ArrowUpRight size={17} aria-hidden="true" /></Link><button className="experience-text-button" type="button" onClick={() => add(primary.id)} disabled={has(primary.id)}>{has(primary.id) ? '已在我的行程' : '+ 加入我的行程'}</button></div>}
            {guide && <Link to={`${primaryLink}#guide`} className="collection-guide"><GuideAvatar persona={guide} /><div><h3>{guide.name}陪你逛</h3><p>想了解更多？问问这位数字导游。</p></div><CaretRight size={18} aria-hidden="true" /></Link>}
          </div>
        </section>
        {selectedNodes.length > 1 && <section className="collection-related" aria-labelledby="related-title"><div className="section-heading"><h2 id="related-title">顺着这个主题，再认识一点</h2><p>按兴趣继续，不用一次看完</p></div><div className="collection-related-list">
          {selectedNodes.slice(1, 3).map((node) => <Link key={node.id} to={detailUrl(node.id, topic.id, group.id)}><div><h3>{node.name}</h3><p>{node.summary}</p></div><CaretRight size={18} aria-hidden="true" /></Link>)}
        </div>
        {selectedNodes.length > 3 && <details className="collection-more"><summary>还有更多乡里故事，展开看看</summary><div>{selectedNodes.slice(3).map((node) => <Link key={node.id} to={detailUrl(node.id, topic.id, group.id)}><div><h3>{node.name}</h3><p>{node.summary}</p></div><CaretRight size={16} aria-hidden="true" /></Link>)}</div></details>}
        </section>}
        <div className="collection-companions"><span>陪你逛这个栏目</span>
          {({ scenery: ['03_yanzhike', '08_wuxiangsao', '09_shijiulang'], flavors: ['07_fuxiaomei', '10_meiguisao'], culture: ['04_dalonggu', '05_gusanniang', '06_ruanyunan'], leisure: ['02_laizhusheng', '08_wuxiangsao', '10_meiguisao'] }[topic.id] || []).map((id) => {
            const companion = getPersona(id);
            return <Link key={id} to={guideUrl(id)}><GuideAvatar persona={companion} /><span>{companion.name}</span></Link>;
          })}
        </div>
      </>}
    </div>
  );
}
