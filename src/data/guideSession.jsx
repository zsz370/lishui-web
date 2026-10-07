import { useEffect, useRef, useState } from 'react';
import { ask } from '../services/chat.js';
import { host } from './personas.js';
import { planChat } from './chatRouting.js';
import {GuideSessionContext as Context} from './guideSessionContext.js';
export function GuideSessionProvider({children}) {
  const [messages,setMessages]=useState([]),[drafts,setDrafts]=useState([]),[pending,setPending]=useState(false),[tasks,setTasks]=useState([]),[question,setQuestion]=useState(''),[scope,setScope]=useState({}),[retry,setRetry]=useState(null);
  const request=useRef({id:0,controller:null}),draft=useRef({}),history=useRef([]),latest=useRef(null);
  const stoppedDrafts=()=>Object.values(draft.current).map(x=>({...x,isDraft:false,incomplete:true,links:[],sources:[],source:null}));
  const send=async(text,options={})=>{
    const q=String(text??question).trim();if(!q||request.current.controller)return;
    setQuestion('');setPending(true);setTasks([]);setRetry(null);draft.current={};setDrafts([]);
    const attempt=options.retry&&latest.current?latest.current:{...scope,...options,question:q,history:history.current.filter(x=>!x.incomplete)};
    const routing=planChat(attempt);
    if(routing.mentioned.length) { attempt.nodeId=routing.mentioned[0].id;attempt.serviceId=undefined;setScope(current=>({...current,nodeId:attempt.nodeId,serviceId:undefined})); }
    latest.current=attempt;
    const controller=new AbortController(),id=++request.current.id;request.current.controller=controller;
    const user={role:'user',content:q};history.current=[...history.current,user];setMessages(history.current);
    const active=()=>id===request.current.id&&!controller.signal.aborted;
    try {
      const result=await ask({...attempt,signal:controller.signal,onProgress:e=>{if(active())setTasks(old=>[...old.filter(x=>x.taskId!==e.taskId),e]);},onAnswer:e=>{
        if(!active()||!e.taskId)return;
        const prior=draft.current[e.taskId];draft.current[e.taskId]=e.type==='complete'?{role:'expert',...e.reply,isDraft:true,draftComplete:true}:{role:'expert',speaker:host,content:(prior?.content||'')+(e.delta||''),isDraft:true};
        setDrafts(Object.values(draft.current));
      }});
      if(!active())return;
      const answer={role:'expert',...result,speaker:host};history.current=[...history.current,answer];setMessages(history.current);
      if(result.kind==='unavailable'||result.operations?.trace?.some(t=>t.status==='failed'))setRetry(attempt);
    } catch(error) {
      if(!active())return;
      history.current=[...history.current,...stoppedDrafts(),{role:'host',content:error.message||'这次查询未完成，可以稍后重试。'}];setMessages(history.current);setRetry(attempt);
    } finally {if(id===request.current.id){request.current.controller=null;draft.current={};setDrafts([]);setPending(false);}}
  };
  const cancel=()=>{if(!request.current.controller)return;request.current.id++;request.current.controller.abort();request.current.controller=null;history.current=[...history.current,...stoppedDrafts(),{role:'host',content:'已停止这次查询，可以调整问题后继续。'}];setMessages(history.current);draft.current={};setDrafts([]);setPending(false);setRetry(latest.current);setTasks(old=>old.map(t=>t.status==='running'?{...t,status:'cancelled'}:t));};
  const clear=()=>{cancel();history.current=[];setMessages([]);setDrafts([]);setTasks([]);setRetry(null);setScope({});setQuestion('');};
  useEffect(()=>()=>{request.current.id++;request.current.controller?.abort();request.current.controller=null;},[]);
  return <Context.Provider value={{messages,drafts,pending,tasks,question,setQuestion,scope,setScope,send,cancel,clear,retry}}>{children}</Context.Provider>;
}

