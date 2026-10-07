import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PaperPlaneRight, SpeakerHigh, Stop, ArrowClockwise } from '@phosphor-icons/react';
import { host } from '../data/personas.js';
import { useGuideSession } from '../data/guideSession.jsx';
import { taskLabel, planChat } from '../data/chatRouting.js';
import { createAnswerSpeech } from '../services/answerSpeech.js';
import GuidePortrait from './GuidePortrait.jsx';
import './ChatProgress.css';
export default function ChatPanel() {
  const session=useGuideSession(),scroll=useRef(null),speechController=useRef(null);
  const [params,setParams]=useSearchParams();
  const [speech,setSpeech]=useState({status:'idle',messageId:null});
  useEffect(()=>{speechController.current=createAnswerSpeech({onState:setSpeech});return ()=>speechController.current?.dispose();},[]);
  useEffect(()=>{if(session.pending)speechController.current?.stop();},[session.pending]);
  useEffect(()=>{const el=scroll.current;if(el)el.scrollTop=el.scrollHeight;},[session.messages,session.drafts,session.tasks]);
  const send=(text)=>{speechController.current?.stop();const q=String(text??session.question).trim();const mentioned=planChat({question:q}).mentioned[0];session.send(text);if(mentioned&&params.get('node')!==mentioned.id){const next=new URLSearchParams(params);next.set('node',mentioned.id);next.delete('service');setParams(next,{replace:true});}};
  return <div className="guide-conversation">
    <aside className="guide-presence"><GuidePortrait persona={host} state={speech.status==='playing'?'speaking':session.pending?'thinking':'idle'} /><h2>淮源姐</h2><p>{session.pending?'正在为你整理答复':speech.status==='playing'?'正在朗读':'你的溧水旅行向导'}</p><small>数字人形象为AI生成</small></aside>
    <div className="guide-dialogue"><div className="guide-dialogue-top"><span>从一个问题开始，慢慢聊。</span><button type="button" onClick={()=>{speechController.current?.stop();session.clear();}}>新对话</button></div>
      <div className="guide-dialogue-messages" ref={scroll} role="log" aria-label="与淮源姐的对话记录" aria-live="polite">
        {!session.messages.length&&<div className="guide-chat-welcome"><h2>你好，我是淮源姐。</h2><p>想看山水、尝乡味，还是先安排吃住行？告诉我你的想法，我们一起把这一程理清楚。</p><div>{['只有一天，没有车，怎么逛溧水？','无想山的名字有什么故事？','洪蓝手抓鸡怎么吃？'].map(q=><button type="button" key={q} onClick={()=>send(q)}>{q}</button>)}</div></div>}
        {session.messages.map((m,i)=><Message key={i} message={m} speech={speech.messageId===i?speech:null} onPlay={()=>speechController.current?.play(i,m.content)} onStop={()=>speechController.current?.stop()} pending={session.pending}/>)}
        {session.drafts.length>0&&<div className="guide-response-draft">{session.drafts.map((m,i)=><Message key={i} message={m} pending />)}</div>}
        {session.pending&&<div className="guide-query-state" role="status"><p>{session.drafts.length?'正在继续整理…':'正在查阅，请稍等。'}</p><div>{session.tasks.filter(t=>t.status==='running').map(t=><span key={t.taskId}>{taskLabel(t.taskId)}</span>)}</div><button type="button" onClick={session.cancel}>停止查询</button></div>}
      </div>
      {session.retry&&!session.pending&&<div className="guide-retry"><button type="button" onClick={()=>session.send(session.retry.question,{retry:true})}><ArrowClockwise size={16}/>重试这个问题</button></div>}
      <form className="guide-composer" onSubmit={e=>{e.preventDefault();send();}}><label className="sr-only" htmlFor="huaiyuan-question">向淮源姐提问</label><textarea id="huaiyuan-question" rows={2} maxLength={1000} value={session.question} onChange={e=>session.setQuestion(e.target.value)} placeholder="说说你想去哪里，或问一个感兴趣的问题…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><button type="submit" disabled={session.pending||!session.question.trim()} aria-label="发送问题"><PaperPlaneRight size={22}/></button></form><p className="guide-input-note">Enter发送，Shift＋Enter换行。对话保留在本次浏览中，刷新后结束。</p>
    </div>
  </div>;
}
function Message({message:m,speech,onPlay,onStop,pending}) {
 if(m.role==='user')return <div className="guide-user-message">{m.content}</div>;
 const active=['starting','playing'].includes(speech?.status);
 return <article className={'guide-assistant-message'+(m.incomplete?' is-incomplete':'')}><p className="guide-message-author">淮源姐</p><div className="guide-message-text">{m.content}</div>
  {m.isDraft&&!m.draftComplete&&<small className="guide-stream-state">正在回答…</small>}
  {m.incomplete&&<p className="guide-stream-state">答复未完成，请重试后参考完整结果。</p>}
  {!m.isDraft&&!m.incomplete&&m.role!=='host'&&<div className="guide-answer-actions"><button type="button" disabled={pending&&!active} onClick={active?onStop:onPlay}>{active?<Stop size={16}/>:<SpeakerHigh size={16}/>} {active?'停止朗读':'朗读答复'}</button>{speech?.status==='error'&&<small role="status">{speech.error}</small>}</div>}
  {!m.incomplete&&(m.sources?.length>0||m.source)&&<details className="guide-sources"><summary>查看答复出处</summary>{m.sources?.length?m.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label}</a>):m.sourceUrl?<a href={m.sourceUrl} target="_blank" rel="noreferrer">{m.source}</a>:<p>{m.source}</p>}</details>}
  {!m.isDraft&&!m.incomplete&&m.links?.length>0&&<div className="guide-answer-links">{m.links.filter(l=>!m.sources?.some(s=>s.url===l.url)).map(l=>l.url.startsWith('/')?<Link key={l.url} to={l.url}>{l.label}</Link>:<a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>)}</div>}
 </article>;
}
