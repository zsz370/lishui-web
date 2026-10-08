import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PaperPlaneRight, SpeakerHigh, Stop, ArrowClockwise } from '@phosphor-icons/react';
import { host } from '../data/personas.js';
import { useGuideSession } from '../data/guideSessionContext.js';
import { planChat } from '../data/chatRouting.js';
import { agentPersona } from '../data/agentPersona.js';
import GuideCollaboration, { ExpertProgress } from './GuideCollaboration.jsx';
import { createAnswerSpeech } from '../services/answerSpeech.js';
import { keyboardViewport, nearMessageEnd } from '../services/chatViewport.js';
import { useItinerary } from '../data/store.jsx';
import { adoptRecommendation } from '../services/itineraryRecommendation.js';
import GuidePortrait from './GuidePortrait.jsx';
import GuideChoices from './GuideChoices.jsx';
import './ChatProgress.css';

export default function ChatPanel() {
  const session=useGuideSession(), {plan,updatePlan}=useItinerary(), navigate=useNavigate();
  const scroll=useRef(null), speechController=useRef(null), panel=useRef(null), atEnd=useRef(session.scrollState.current.pinned), forceEnd=useRef(false), firstScroll=useRef(true);
  const [params,setParams]=useSearchParams(), [newContent,setNewContent]=useState(false);
  const [speech,setSpeech]=useState({status:'idle',messageId:null});
  const [viewport,setViewport]=useState({active:false,height:0,top:0});
  useLayoutEffect(()=>{
    const element=scroll.current, saved={...session.scrollState.current};
    if(!element)return;
    // 等路由内容完成布局再恢复，忽略挂载期间的临时零位置滚动事件。
    const frame=window.requestAnimationFrame(()=>{
      element.scrollTop=saved.pinned?element.scrollHeight:saved.top;
      atEnd.current=saved.pinned;firstScroll.current=false;
    });
    return ()=>{
      window.cancelAnimationFrame(frame);
      if(!firstScroll.current)session.scrollState.current={top:element.scrollTop,pinned:atEnd.current};
    };
  },[]);
  useEffect(()=>{speechController.current=createAnswerSpeech({onState:setSpeech});return ()=>speechController.current?.dispose();},[]);
  useEffect(()=>{if(session.pending)speechController.current?.stop();},[session.pending]);
  useEffect(()=>{
    const visual=window.visualViewport;
    let baseline=window.innerHeight, frame;
    const measure=()=>{
      const focused=panel.current?.contains(document.activeElement)&&document.activeElement?.matches('textarea,input');
      if(!focused)baseline=window.innerHeight;
      const value=keyboardViewport({layoutHeight:Math.max(baseline,window.innerHeight),height:visual?.height||window.innerHeight,offsetTop:visual?.offsetTop||0,scale:visual?.scale||1,focused,mobile:window.innerWidth<768});
      setViewport(value); document.body.classList.toggle('chat-keyboard-open',value.active);
    };
    const update=()=>{window.cancelAnimationFrame(frame);frame=window.requestAnimationFrame(measure);};
    measure();
    window.addEventListener('resize',update);visual?.addEventListener('resize',update);visual?.addEventListener('scroll',update);
    document.addEventListener('focusin',update);document.addEventListener('focusout',update);
    return ()=>{window.cancelAnimationFrame(frame);window.removeEventListener('resize',update);visual?.removeEventListener('resize',update);visual?.removeEventListener('scroll',update);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);document.body.classList.remove('chat-keyboard-open');};
  },[]);
  useLayoutEffect(()=>{
    const element=scroll.current;if(!element)return;
    if(firstScroll.current)return;
    if(forceEnd.current||atEnd.current||!session.messages.length){element.scrollTop=session.messages.length?element.scrollHeight:0;atEnd.current=true;forceEnd.current=false;setNewContent(false);}
    else setNewContent(true);
  },[session.messages,session.drafts,session.tasks,viewport.active,viewport.height]);
  const rememberScroll=()=>{const element=scroll.current;if(!element||firstScroll.current)return;atEnd.current=nearMessageEnd(element);session.scrollState.current={top:element.scrollTop,pinned:atEnd.current};if(atEnd.current)setNewContent(false);};
  const send=(text,options={})=>{
    speechController.current?.stop();forceEnd.current=true;
    const q=String(text??session.question).trim(), mentioned=planChat({question:q}).mentioned[0];session.send(text,options);
    const nodeId=mentioned?.id||options.nodeId;
    if(nodeId&&params.get('node')!==nodeId){const next=new URLSearchParams(params);next.set('node',nodeId);next.delete('service');setParams(next,{replace:true});}
  };
  const choose=choice=>send(choice.question,{preferences:choice.preferences,planPatch:choice.planPatch});
  const adopt=recommended=>{speechController.current?.stop();updatePlan(adoptRecommendation(recommended,plan));navigate('/itinerary');};
  return <div ref={panel} className={'guide-conversation'+(viewport.active?' is-keyboard-open':'')} style={{'--chat-visible-height':viewport.height+'px','--chat-viewport-top':viewport.top+'px'}}>
    <aside className="guide-presence"><GuidePortrait persona={host} /><h2>淮源姐</h2><p>{session.pending?'正在为你整理答复':speech.status==='playing'?'正在朗读':'你的溧水旅行向导'}</p><small>数字人形象为AI生成</small></aside>
    <div className="guide-dialogue"><div className="guide-dialogue-top"><span>从一个问题开始，慢慢聊。</span><button type="button" onClick={()=>{speechController.current?.stop();session.clear();document.getElementById('huaiyuan-question')?.focus();}}>新对话</button></div>
      <div className="guide-dialogue-messages" ref={scroll} onScroll={rememberScroll} role="log" aria-label="与淮源姐的对话记录" aria-live="polite" aria-busy={session.pending}>
        {!session.messages.length&&<div className="guide-chat-welcome"><h2>{agentPersona.opening.welcome}</h2><p>{agentPersona.opening.capabilities}</p><p>{agentPersona.opening.invitation}</p><div>{agentPersona.opening.examples.map(q=><button type="button" key={q} onClick={()=>send(q)}>{q}</button>)}</div></div>}
        {session.messages.map((m,i)=><Message key={i} message={m} speech={speech.messageId===i?speech:null} onPlay={()=>speechController.current?.play(i,m.content.replace(/\[(?:K|W)\d+\]/g,''))} onStop={()=>speechController.current?.stop()} pending={session.pending} onSend={send} onChoose={choose} onAdopt={adopt} plan={plan}/>)}
        {session.drafts.length>0&&<div className="guide-response-draft">{session.drafts.map((m,i)=><Message key={i} message={m} pending />)}</div>}
        {session.pending&&<div className="guide-query-state" role="status"><p>{session.drafts.length?'正在继续整理…':'正在查阅，请稍等。'}</p><ExpertProgress tasks={session.tasks}/><button type="button" onClick={session.cancel}>停止查询</button></div>}
      </div>
      {newContent&&<button type="button" className="guide-new-content" onClick={()=>{atEnd.current=true;scroll.current.scrollTop=scroll.current.scrollHeight;rememberScroll();}}>查看最新内容</button>}
      {session.retry&&!session.pending&&<div className="guide-retry"><button type="button" aria-label="使用上次的条件重试这个问题" onClick={()=>{forceEnd.current=true;session.send(session.retry.question,{retry:true});}}><ArrowClockwise size={16} aria-hidden="true"/>重试这个问题</button></div>}
      <form className="guide-composer" onSubmit={e=>{e.preventDefault();send();}}><label className="sr-only" htmlFor="huaiyuan-question">向淮源姐提问</label><textarea id="huaiyuan-question" rows={2} maxLength={1000} value={session.question} onChange={e=>session.setQuestion(e.target.value)} placeholder="说说你想去哪里，或问一个感兴趣的问题…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><button type="submit" disabled={session.pending||!session.question.trim()} aria-label="发送问题"><PaperPlaneRight size={22} aria-hidden="true"/></button></form><p className="guide-input-note">{session.memorySaved?'出行条件与未发送草稿保存在本机；历史对话刷新后结束。':'当前浏览器无法保存，请及时导出行程。'} Enter发送，Shift＋Enter换行。</p>
    </div>
  </div>;
}
function Message({message:m,speech,onPlay,onStop,pending,onSend,onChoose,onAdopt,plan}) {
 if(m.role==='user')return <div className="guide-user-message">{m.content}</div>;
 const active=['starting','playing'].includes(speech?.status);
 const groups=(m.choiceGroups||[]).filter(group=>!(group.id==='trip-budget'&&plan?.budget));
 return <article className={'guide-assistant-message'+(m.incomplete?' is-incomplete':'')}><p className="guide-message-author">淮源姐{m.kind==='casual'&&m.source?.includes('AI生成')?' · AI生成':''}</p><div className="guide-message-text">{m.content.replace(/\[(?:K|W)\d+\]/g,'')}</div>
  {m.isDraft&&!m.draftComplete&&<small className="guide-stream-state">正在回答…</small>}
  {m.incomplete&&<p className="guide-stream-state">答复未完成，请重试后参考完整结果。</p>}
  {!m.isDraft&&!m.incomplete&&onSend&&<>
    {groups.length>0&&<GuideChoices groups={groups} pending={pending} onChoose={onChoose}/>}
    {m.relatedTopics?.length>0&&<div className="guide-related-topics" aria-label="可以继续了解的主题">{m.relatedTopics.map(topic=><section key={topic.nodeId}><h3><Link to={topic.url}>{topic.title}</Link></h3>{topic.questions.map(question=><button type="button" key={question} disabled={pending} onClick={()=>onSend(question,{nodeId:topic.nodeId})}>{question}</button>)}</section>)}</div>}
    {m.suggest?.length>0&&<div className="guide-follow-up" aria-label="继续提问">{m.suggest.map(question=><button type="button" key={question} disabled={pending} onClick={()=>onSend(question)}>{question}</button>)}</div>}
  </>}
  {!m.isDraft&&!m.incomplete&&m.role!=='host'&&<div className="guide-answer-actions"><button type="button" aria-label={active?'停止朗读淮源姐答复':'朗读淮源姐答复'} aria-pressed={active} disabled={pending&&!active} onClick={active?onStop:onPlay}>{active?<Stop size={16} aria-hidden="true"/>:<SpeakerHigh size={16} aria-hidden="true"/>} {active?'停止朗读':'朗读答复'}</button>{m.recommendedPlan&&onAdopt&&<button type="button" disabled={pending} onClick={()=>onAdopt(m.recommendedPlan)}>用这份推荐生成行程</button>}{speech?.status==='error'&&<small role="status">{speech.error}</small>}</div>}
  {!m.isDraft&&!m.incomplete&&m.role!=='host'&&<GuideCollaboration message={m}/>}
  {!m.isDraft&&!m.incomplete&&m.links?.length>0&&<div className="guide-answer-links">{m.links.filter(l=>!m.sources?.some(s=>s.url===l.url)).map(l=>l.url.startsWith('/')?<Link key={l.url} to={l.url}>{l.label}</Link>:<a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>)}</div>}
 </article>;
}
