import { useRef, useState } from 'react';
import { ask } from '../services/chat.js';

export default function ChatPanel({ node }) {
  const [msgs, setMsgs] = useState([
    {
      role: 'host',
      content: `你好，我是溧水主控导游淮源姐。关于「${node.name}」你可以问我任何事，我会把问题转给最合适的专家。`,
    },
  ]);
  const [q, setQ] = useState('');
  const [pending, setPending] = useState(false);
  const bottom = useRef(null);

  const send = async (text) => {
    const question = (text ?? q).trim();
    if (!question || pending) return;
    setQ('');
    setMsgs((m) => [...m, { role: 'user', content: question }]);
    setPending(true);
    const r = await ask({ nodeId: node.id, question });
    setMsgs((m) => [
      ...m,
      {
        role: 'expert',
        speaker: r.speaker,
        kind: r.kind,
        content: r.content,
        source: r.source,
        suggest: r.suggest,
      },
    ]);
    setPending(false);
    setTimeout(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  return (
    <div className="card flex flex-col h-[480px]">
      <div className="px-4 py-2 border-b border-ls-ink/10 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-ls-ink text-white grid place-items-center text-xs">溧</div>
        <div className="text-sm font-medium">问导游</div>
        <div className="ml-auto text-[11px] text-ls-ink/50">演示：预置问答优先 · RAG 兜底</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {msgs.map((m, i) => <Bubble key={i} m={m} onPick={(t) => send(t)} />)}
        {pending && <div className="text-sm text-ls-ink/50">专家正在回答…</div>}
        <div ref={bottom} />
      </div>
      <div className="border-t border-ls-ink/10 p-2 flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded-md border border-ls-ink/15 outline-none focus:border-ls-lake text-sm"
          placeholder={`问关于「${node.name}」的任何事…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="btn-primary" onClick={() => send()}>发送</button>
      </div>
    </div>
  );
}

function Bubble({ m, onPick }) {
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
        <div className="w-8 h-8 rounded-full bg-ls-lake text-white grid place-items-center text-xs shrink-0">淮</div>
        <div className="max-w-[80%] bg-ls-mist rounded-2xl rounded-tl-sm px-3 py-2 text-sm">{m.content}</div>
      </div>
    );
  }
  const p = m.speaker;
  return (
    <div className="flex gap-2 items-start">
      <div className="w-8 h-8 rounded-full text-white grid place-items-center text-xs shrink-0" style={{ background: p?.color }}>
        {p?.name?.[0] ?? '专'}
      </div>
      <div className="max-w-[80%] space-y-1">
        <div className="bg-white border border-ls-ink/10 rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
          <span className="text-[11px] text-ls-ink/50 mr-2">{p?.name}·{p?.domain}</span>
          {m.content}
        </div>
        {m.source && <div className="text-[11px] text-ls-ink/50">📎 来源：{m.source}（预置问答）</div>}
        {m.suggest?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {m.suggest.map((s) => (
              <button key={s} className="text-[11px] px-2 py-1 rounded-full bg-ls-mist hover:bg-ls-ink/10" onClick={() => onPick(s.replace(/^试试/, '').replace(/[“”"]/g, ''))}>{s}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
