import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react';
import { getNode } from '../data/nodes.js';
import { getPersona, guideLink } from '../data/personas.js';
import { getNodeCollection, getTopic, getGroup, collectionUrl } from '../data/collections.js';
import { nodePhotos } from '../data/nodeMedia.js';
import PageGuide from '../components/PageGuide.jsx';
import Photo from '../components/Photo.jsx';
import GuideAvatar from '../components/GuideAvatar.jsx';
import NodeVisitGuide from '../components/NodeVisitGuide.jsx';
import JourneyThread from '../components/JourneyThread.jsx';
import { useItinerary } from '../data/store.jsx';

export default function NodeDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const node = getNode(id);
  const { add, has } = useItinerary();
  if (!node) return <div className="experience-empty"><h1>这段旅程暂时没有找到</h1><Link className="experience-button" to="/nodes">回到探索栏目</Link></div>;
  const persona = getPersona(node.expert);
  const origin = getNodeCollection(id);
  const topic = getTopic(params.get('from')) || origin?.topic;
  const group = getGroup(topic, params.get('group') || origin?.group.id);
  const searchQuery = params.get('q');
  const searchOrigin = new URLSearchParams({ q: searchQuery || '' });
  if (params.get('from')) searchOrigin.set('topic', params.get('from'));
  const back = searchQuery ? `/nodes?${searchOrigin}` : topic ? collectionUrl(topic.id, group?.id) : '/nodes';
  const introduction = node.introduction;
  return <div className="detail-experience">
    <Link className="detail-back" to={back}><ArrowLeft size={17} aria-hidden="true" />回到{searchQuery ? '搜索结果' : topic?.name || '探索栏目'}</Link>
    <JourneyThread step="discover" />
    <div className="detail-layout">
      <section className="detail-story" aria-label={`${node.name}简介`}>
        <div className="detail-photo"><Photo src={nodePhotos[node.id]} alt={node.name} eager /></div>
        <div className="detail-story-copy"><p className="section-overline">{group?.name || node.cat} · 简介</p><h1>{node.name}</h1>
          <div className="detail-description">{introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <Link className="detail-ask-link" to={guideLink({nodeId:node.id})}><GuideAvatar className="chat-avatar" persona={persona} /><span>向{persona.name}提问</span><ArrowUpRight size={17} aria-hidden="true" /></Link>
          <div className="detail-actions"><button className="experience-button" type="button" onClick={() => add(node.id)} disabled={has(node.id)}>{has(node.id) ? '已加入我的行程' : '+ 加入我的行程'}</button><Link to="/itinerary">看看我的行程 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          <NodeVisitGuide nodeId={node.id} />
          {node.id === 'c_ldl' && <Link className="detail-ask-link" to="/culture/dragon">用三道小题认识骆山大龙 <ArrowUpRight size={17} aria-hidden="true" /></Link>}
          {node.facts && <details className="detail-extra"><summary>再了解一点</summary><ul>{node.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul></details>}
          <div className="detail-sources" aria-label="简介参考资料">{node.introductionSources.map((source) => <a key={source.url} className="detail-source" href={source.url} target="_blank" rel="noreferrer">资料参考：{source.label} <ArrowUpRight size={13} aria-hidden="true" /></a>)}</div>
        </div>
      </section>
      <section id="guide" className="detail-chat" aria-label="数字导游问答">
        <PageGuide node={node} title={`关于${node.name}，继续问淮源姐`} />
      </section>
    </div>
    {topic && <section className="destination-directory detail-related" aria-labelledby="detail-related-title"><header className="journal-heading"><h2 id="detail-related-title">沿这个主题，继续看一看。</h2><p>从{topic.name}里，选择下一处好奇。</p></header><div className="destination-grid">{[...new Set(topic.groups.flatMap(item => item.nodeIds))].filter(nodeId => nodeId !== id).slice(0, 3).map(nodeId => { const related = getNode(nodeId); return <article key={nodeId}><Link to={`/nodes/${nodeId}`}><Photo src={nodePhotos[nodeId]} alt={related.name} /><h3>{related.name}<ArrowUpRight size={18} aria-hidden="true" /></h3><p>{related.summary}</p></Link></article>; })}</div></section>}
  </div>;
}
