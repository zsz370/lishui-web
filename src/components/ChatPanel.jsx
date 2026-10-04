import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { ask } from '../services/chat.js';
import { getPersona, guideUrl, HOST_ID } from '../data/personas.js';
import GuideAvatar from './GuideAvatar.jsx';
import GuidePortrait from './GuidePortrait.jsx';
import { Link } from 'react-router-dom';
import { getTravelService } from '../data/travelServices.js';
import { qaByNode } from '../data/presetQA.js';
import { serviceQAById } from '../data/foundationQA.js';

export default function ChatPanel({ node, service, preferences }) {
  const [activeService, setActiveService] = useState(service?.id);
  const [activeGuide, setActiveGuide] = useState(getPersona(service?.expert || node?.expert || HOST_ID));
  const [viewedGuide, setViewedGuide] = useState(null);
  const [msgs, setMsgs] = useState([
    {
      role: 'host',
      content: service ? `你好，可以问「${service.name}」，也可以继续问天气、住宿、交通或日常需求，我会帮你找到对应伙伴。` : `你好，关于「${node?.name || '溧水旅行'}」可以问这里的导游；天气、住宿、交通和礼仪问题也可以直接问，我会帮你转接。`,
    },
  ]);
  const [q, setQ] = useState('');
  const [pending, setPending] = useState(false);
  const scrollArea = useRef(null);
  useEffect(() => {
    if (scrollArea.current) scrollArea.current.scrollTop = scrollArea.current.scrollHeight;
  }, [msgs, pending]);

  const send = async (text) => {
    const question = (text ?? q).trim();
    if (!question || pending) return;
    setQ('');
    setMsgs((m) => [...m, { role: 'user', content: question }]);
    setPending(true);
    try {
      const followup = /^(那|那么|明天|后天|周末|周[一二三四五六日]|预算|每晚|\d+元|\d+块|没有车|带老人|带孩子|带娃|还有|能带宠物)/.test(question);
      const r = await ask({ nodeId: node?.id, question, serviceId: service ? (activeService || service.id) : followup ? activeService : undefined, history: msgs, preferences });
      const replies = r.replies || [r];
      setActiveGuide(replies[replies.length - 1]?.speaker || r.speaker || getPersona(HOST_ID));
      setViewedGuide(null);
      setActiveService(r.serviceId);
      setMsgs((m) => [
        ...m,
        ...replies.map((answer, index) => ({
          role: 'expert',
          ...answer,
          collaboration: index === 0 ? r.collaboration : undefined,
        })),
      ]);
    } catch {
      setMsgs((m) => [...m, { role: 'host', content: '暂时没能取得答复，请稍后再试。页面中的介绍和服务指引仍可阅读。' }]);
    } finally { setPending(false); }
  };

  const portraitGuide = viewedGuide || activeGuide;
  const participantIds = [...new Set([activeGuide.id, node?.expert, service?.expert, ...msgs.map((message) => message.role === 'host' ? HOST_ID : message.speaker?.id), ...msgs.flatMap((message) => message.collaboration?.trace?.map((task) => task.agentId) || [])].filter(Boolean))];
  return (
    <div className="agent-conversation">
      <aside className="agent-character" aria-label="智能体全身形象">
        <GuidePortrait key={portraitGuide.id} persona={portraitGuide} state={pending && portraitGuide.id === activeGuide.id ? 'thinking' : 'idle'} />
        <div className="agent-character-copy">
          <p className="section-overline">{portraitGuide.id === activeGuide.id ? '当前接待' : '协作伙伴'}</p>
          <h2>{portraitGuide.name}</h2><p className="agent-character-domain">{portraitGuide.domain}</p>
          <p className="agent-character-tagline">{portraitGuide.tagline}</p>
          <span className="agent-character-status" role="status">{pending ? '正在整理答复' : '随时可以提问'}</span>
          <Link to={guideUrl(portraitGuide.id)}>认识这位导游 <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </div>
        {participantIds.length > 1 && <div className="agent-participants"><p>查看伙伴形象</p><div>{participantIds.map((id) => {
          const participant = getPersona(id);
          if (!participant) return null;
          return <button type="button" key={id} aria-label={`查看${participant.name}的全身形象`} aria-pressed={portraitGuide.id === id} onClick={() => setViewedGuide(participant)}><GuideAvatar className="chat-avatar" persona={participant} /></button>;
        })}</div></div>}
      </aside>
      <div className="card agent-chat-panel flex flex-col">
      <div className="px-4 py-2 border-b border-ls-ink/10 flex items-center gap-2">
        <GuideAvatar className="chat-avatar" persona={activeGuide} />
        <div className="text-sm font-medium">{activeGuide.name}接待</div>
        <div className="ml-auto text-[11px] text-ls-ink/50">{activeService ? getTravelService(activeService)?.name : '讲解与旅途咨询'}</div>
      </div>
      <div ref={scrollArea} className="chat-messages flex-1 overflow-y-auto px-4 py-3 space-y-3" aria-live="polite" role="log" aria-label="与智能体的对话记录">
        {msgs.map((m, i) => <Bubble key={i} m={m} pending={pending} onPick={(t) => send(t)} />)}
        {pending && <div className="text-sm text-ls-ink/50" role="status">正在整理建议与查询所需资料…</div>}
      </div>
      {msgs.length === 1 && <div className="chat-starter-prompts">{(service ? [...(serviceQAById[service.id]?.slice(0, 1) || []), ...service.prompts].slice(0, 3) : qaByNode[node?.id]?.slice(0, 3) || ['溧水明天天气怎么样？', '附近住哪方便？', '怎么去这里？']).map((prompt) => <button type="button" key={prompt} disabled={pending} onClick={() => send(prompt)}>{prompt}</button>)}</div>}
      <div className="border-t border-ls-ink/10 p-2 flex gap-2">
        <label className="sr-only" htmlFor={`guide-question-${node?.id || service?.id || 'general'}`}>向导游提问</label>
        <input
          id={`guide-question-${node?.id || service?.id || 'general'}`}
          className="flex-1 min-w-0 px-3 py-2 rounded-md border border-ls-ink/15 focus:border-ls-lake text-sm"
          placeholder="问景点、住宿、天气或交通…"
          maxLength={1000}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onInput={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && send()}
        />
        <button type="button" className="btn-primary" disabled={pending || !q.trim()} onClick={() => send()}>发送</button>
      </div>
      </div>
    </div>
  );
}

function Bubble({ m, onPick, pending }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-ls-ink text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm">{m.content}</div>
      </div>
    );
  }
  if (m.role === 'host') {
    return (
      <div className="flex gap-2 items-start">
        <GuideAvatar className="chat-avatar" persona={getPersona(HOST_ID)} />
        <div className="max-w-[80%] bg-ls-mist rounded-2xl rounded-tl-sm px-3 py-2 text-sm">{m.content}</div>
      </div>
    );
  }
  const p = m.speaker;
  return (
    <div className="flex gap-2 items-start">
      <GuideAvatar className="chat-avatar" persona={p} />
      <div className="max-w-[80%] space-y-1">
        <div className="bg-white border border-ls-ink/10 rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
          <span className="text-[11px] text-ls-ink/50 mr-2">{p?.name}·{p?.domain}</span>
          <span className="chat-answer-text">{m.content}</span>
        </div>
        {m.source && <div className="text-[11px] text-ls-ink/50">{m.sourceUrl ? <a href={m.sourceUrl} target="_blank" rel="noreferrer">{m.source}</a> : `参考：${m.source}`}</div>}
        {m.collaboration?.trace?.length > 0 && <details className="text-xs bg-ls-mist rounded-xl p-2">
          <summary className="cursor-pointer">{m.collaboration.coordinator ? `${getPersona(m.collaboration.coordinator).name}统筹 · ` : ''}{new Set(m.collaboration.trace.map((task) => task.agentId)).size}位伙伴参与</summary>
          <div className="space-y-2 pt-2">{m.collaboration.trace.map((task) => <div className="flex items-center gap-2" key={task.taskId}>
            <GuideAvatar className="chat-avatar" persona={getPersona(task.agentId)} />
            <span>{getPersona(task.agentId).name} · {task.taskId === 'coordinator' ? '汇总安排' : task.taskId === 'knowledge' ? '查阅资料' : task.taskId.startsWith('dispatch:') ? '栏目分工' : getTravelService(task.taskId)?.shortName || '协作'} · {task.status === 'completed' ? '已完成' : task.status === 'needs_input' ? '待补充条件' : '暂未完成'}</span>
          </div>)}</div>
        </details>}
        {m.links?.length > 0 && <div className="chat-answer-links">{m.links.map((item) => item.url.startsWith('/') ? <Link key={item.url} to={item.url}>{item.label}</Link> : <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.label}</a>)}</div>}
        {m.suggest?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {m.suggest.map((s) => (
              <button type="button" key={s} disabled={pending} className="text-[11px] px-2 py-1 rounded-full bg-ls-mist hover:bg-ls-ink/10" onClick={() => onPick(s.replace(/^试试/, '').replace(/[“”"]/g, ''))}>{s}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
