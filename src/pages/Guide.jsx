import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { X, MapTrifold, BookOpen, CloudSun } from '@phosphor-icons/react';
import ChatPanel from '../components/ChatPanel.jsx';
import { useGuideSession } from '../data/guideSessionContext.js';
import { getNode } from '../data/nodes.js';
import { getTravelService } from '../data/travelServices.js';
import { useItinerary } from '../data/store.jsx';
import { planChat } from '../data/chatRouting.js';
import '../styles/SingleGuide.css';
export default function Guide() {
 const session=useGuideSession(),[params,setParams]=useSearchParams(),location=useLocation(),handled=useRef(new Set()),{plan}=useItinerary();
 const node=getNode(params.get('node')),service=getTravelService(params.get('service'));
 useEffect(()=>{const scope={nodeId:node?.id,serviceId:service?.id,preferences:{weatherDate:plan.date,origin:plan.origin.place?.name||plan.origin.query,destination:plan.stops[0]?getNode(plan.stops[0].nodeId)?.name:'',mode:plan.mode,...location.state?.preferences}};session.setScope(scope);const q=params.get('q');const timer=q?window.setTimeout(()=>{if(handled.current.has(location.key))return;handled.current.add(location.key);session.cancel();session.send(q,scope);const next=new URLSearchParams(params);next.delete('q');const mentioned=planChat({question:q}).mentioned[0];if(mentioned)next.set('node',mentioned.id);setParams(next,{replace:true});},0):null;return ()=>window.clearTimeout(timer);},[location.key]);
 const currentNode=getNode(session.scope.nodeId);
 return <div className="single-guide-page"><header className="single-guide-heading"><div><h1>这一程，和淮源姐聊聊。</h1><p>一个向导，陪你认识溧水，也把吃住行安排妥当。</p></div><nav aria-label="随手工具"><Link to="/atlas"><BookOpen size={18}/>翻图鉴</Link><Link to="/itinerary"><MapTrifold size={18}/>看行程</Link><Link to="/services?service=weather"><CloudSun size={18}/>查天气</Link></nav></header>
  {currentNode&&<div className="guide-context">正在了解：{currentNode.name}<button type="button" aria-label="移除当前地点上下文" onClick={()=>session.setScope({...session.scope,nodeId:undefined})}><X size={16}/></button></div>}
  <ChatPanel />
 </div>;
}
