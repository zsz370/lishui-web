import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react';
import { getNode } from '../data/nodes.js';
import { getPersona } from '../data/personas.js';
import { getNodeCollection, getTopic, getGroup, collectionUrl } from '../data/collections.js';
import { nodePhotos } from '../data/nodeMedia.js';
import ChatPanel from '../components/ChatPanel.jsx';
import Photo from '../components/Photo.jsx';
import GuideAvatar from '../components/GuideAvatar.jsx';
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
  const focusQuestion = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    // 避免浏览器执行锚点跳转时覆盖输入框焦点，仍保留可分享的链接。
    event.preventDefault();
    window.history.replaceState(window.history.state, '', '#guide');
    document.getElementById('guide')?.scrollIntoView({ block: 'start' });
    const input = document.getElementById(`guide-question-${node.id}`);
    input?.scrollIntoView({ block: 'nearest' });
    input?.focus({ preventScroll: true });
  };
  return <div className="detail-experience">
    <Link className="detail-back" to={back}><ArrowLeft size={17} aria-hidden="true" />回到{searchQuery ? '搜索结果' : topic?.name || '探索栏目'}</Link>
    <div className="detail-layout">
      <section className="detail-story" aria-label={`${node.name}简介`}>
        <div className="detail-story-copy"><p className="section-overline">{group?.name || node.cat} · 简介</p><h1>{node.name}</h1>
          <div className="detail-description">{introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <a className="detail-ask-link" href="#guide" onClick={focusQuestion}><GuideAvatar className="chat-avatar" persona={persona} /><span>向{persona.name}提问</span><ArrowUpRight size={17} aria-hidden="true" /></a>
          <div className="detail-actions"><button className="experience-button" type="button" onClick={() => add(node.id)} disabled={has(node.id)}>{has(node.id) ? '已加入我的行程' : '+ 加入我的行程'}</button><Link to="/itinerary">看看我的行程 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
          {node.facts && <details className="detail-extra"><summary>再了解一点</summary><ul>{node.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul></details>}
          <div className="detail-sources" aria-label="简介参考资料">{node.introductionSources.map((source) => <a key={source.url} className="detail-source" href={source.url} target="_blank" rel="noreferrer">资料参考：{source.label} <ArrowUpRight size={13} aria-hidden="true" /></a>)}</div>
        </div>
        <div className="detail-photo"><Photo src={nodePhotos[node.id]} alt={node.name} eager /></div>
      </section>
      <section id="guide" className="detail-chat" aria-label="数字导游问答">
        <ChatPanel key={node.id} node={node} />
      </section>
    </div>
  </div>;
}
