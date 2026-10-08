import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '../data/account.jsx';
import { useItinerary } from '../data/store.jsx';
import './Account.css';
export default function AccountPlanSave(){
  const account=useAccount(),{plan,cloudCard,markAccountCard}=useItinerary();
  const current=cloudCard?.ownerId===account.user?.id?cloudCard:null;
  const [open,setOpen]=useState(false),[title,setTitle]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const save=async event=>{event.preventDefault();if(busy)return;setBusy(true);setNotice('');try{
    const result=await account.request(current?'cards/'+current.id:'cards',{body:{title:title.trim(),plan,...current?{revision:current.updatedAt}:{}}});
    markAccountCard(result.card);setNotice('已保存到你的账号，可在其他设备登录后载入。');setOpen(false);
  }catch(error){setNotice(error.message);}finally{setBusy(false);}};
  return <div className="account-plan-save">
    {account.user?<button className="experience-text-button" type="button" disabled={busy} onClick={()=>{setTitle((current?.title||plan.goal||'我的溧水行程').slice(0,80));setOpen(value=>!value);}}>{current?'更新账号行程卡':'保存到账号'}</button>:<Link className="experience-text-button" to="/login?next=itinerary">登录后保存行程卡</Link>}
    {open&&account.user&&<form className="account-save-form" onSubmit={save}><div className="plan-field"><label htmlFor="account-card-title">行程卡名称</label><input id="account-card-title" value={title} maxLength={80} required onChange={event=>setTitle(event.target.value)} autoFocus/></div><button className="experience-button" type="submit" disabled={busy||!title.trim()}>{busy?'正在保存…':'确认保存'}</button><button className="experience-text-button" type="button" disabled={busy} onClick={()=>setOpen(false)}>取消</button><p className="plan-source-note">只在确认保存后上传这份行程；天气和路线仍是带查询时间的参考。</p></form>}
    {notice&&<p className="plan-source-note" role="status">{notice}</p>}
  </div>;
}
