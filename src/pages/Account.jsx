import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from '../data/account.jsx';
import { useItinerary } from '../data/store.jsx';
import { useGuideSession } from '../data/guideSessionContext.js';
import './Itinerary.css';
import '../components/Account.css';
import { createLatestRequest } from '../services/latestRequest.js';

export default function Account(){
  const account=useAccount(),{loadAccountCard}=useItinerary(),guide=useGuideSession(),navigate=useNavigate(),[params]=useSearchParams();
  const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[cards,setCards]=useState([]),[trash,setTrash]=useState(false),[listError,setListError]=useState('');
  const listing=useRef(createLatestRequest()),[listLoading,setListLoading]=useState(false);
  const loadCards=async()=>{const ticket=listing.current.begin();setListError('');setListLoading(true);try{const result=await account.request('cards'+(trash?'?trash=true':''),{signal:ticket.controller.signal});if(listing.current.current(ticket))setCards(result.cards||[]);}catch(error){if(listing.current.current(ticket))setListError(error.message);}finally{if(listing.current.current(ticket))setListLoading(false);}};
  useEffect(()=>{if(/access_token=|refresh_token=/.test(window.location.hash)){window.history.replaceState(null,'',window.location.pathname+window.location.search);setNotice('请用邮箱和密码登录。');}},[]);
  useEffect(()=>{listing.current.cancel();setCards([]);setListError('');setListLoading(false);if(account.user)loadCards();return()=>listing.current.cancel();},[account.user?.id,trash]);
  const authenticate=async event=>{event.preventDefault();if(busy)return;if(mode==='signup'&&password!==confirm){setNotice('两次密码不一致，请重新确认。');return;}setBusy(true);setNotice('');try{await account.authenticate(mode,email,password);setPassword('');setConfirm('');guide.clear();if(params.get('next')==='itinerary')navigate('/itinerary');}catch(error){setNotice(error.message);}finally{setBusy(false);}};
  const openCard=async card=>{if(busy)return;setBusy(true);setNotice('');try{const result=await account.request('cards/'+card.id);loadAccountCard(result.card);navigate('/itinerary');}catch(error){setNotice(error.message);}finally{setBusy(false);}};
  const moveCard=async card=>{if(busy)return;setBusy(true);setNotice('');try{await account.request('cards/'+card.id+'/'+(trash?'restore':'trash'),{body:{revision:card.updated_at}});setNotice(trash?'已恢复行程卡。':'已移到回收站，可以恢复。');await loadCards();}catch(error){setNotice(error.message);}finally{setBusy(false);}};
  const logout=async()=>{if(busy)return;setBusy(true);try{const result=await account.logout();guide.clear();setNotice(result.revoked?'已退出登录，账号里的行程卡仍然保留。':'已退出当前浏览器，远端会话撤销暂未得到确认。');}catch(error){setNotice(error.message);}finally{setBusy(false);}};
  return <div className="itinerary-experience account-experience">
    <div className="itinerary-heading"><div><p className="section-overline">把这一程，留在自己的账号里</p><h1>{account.user?'我的账号':'登录遇见美溧'}</h1><p>{account.user?`已登录：${account.user.email}`:'登录后保存行程卡，换一台设备也可以接着安排。'}</p></div>{account.user&&<button className="experience-text-button" type="button" disabled={busy} onClick={logout}>退出登录</button>}</div>
    {account.status==='loading'&&<p className="account-notice" role="status">正在确认登录状态…</p>}
    {account.error&&<div className="account-notice" role="status"><p>{account.error}</p><button className="experience-text-button" type="button" onClick={()=>account.refresh().catch(()=>{})}>重试连接</button></div>}
    {account.status==='ready'&&!account.configured&&<p className="account-notice" role="status">账号服务正在准备中。可以先在本机编辑行程，复制文字或导出行程卡。</p>}
    {!account.user&&<><div className="account-tabs" aria-label="选择登录或注册"><button type="button" aria-pressed={mode==='login'} onClick={()=>{setMode('login');setNotice('');}}>登录</button><button type="button" aria-pressed={mode==='signup'} onClick={()=>{setMode('signup');setNotice('');}}>注册账号</button></div><form className="account-form" onSubmit={authenticate}>
      <div className="plan-field"><label htmlFor="account-email">邮箱</label><input id="account-email" type="email" autoComplete="email" value={email} maxLength={254} required onChange={event=>setEmail(event.target.value)}/></div>
      <div className="plan-field"><label htmlFor="account-password">密码</label><input id="account-password" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} minLength={8} maxLength={128} required onChange={event=>setPassword(event.target.value)}/></div>
      {mode==='signup'&&<div className="plan-field"><label htmlFor="account-confirm">再次输入密码</label><input id="account-confirm" type="password" autoComplete="new-password" value={confirm} minLength={8} maxLength={128} required onChange={event=>setConfirm(event.target.value)}/></div>}
      <p className="plan-source-note">{mode==='signup'?'邮箱作为登录名，无需邮件确认或验证码。注册成功后即可登录。':'用注册邮箱和密码登录；登录过期后请重新登录。'}当前草稿不会自动上传，进入行程页点“保存到账号”才会保存。</p>
      <button className="experience-button" type="submit" disabled={busy||!account.configured||account.status!=='ready'}>{busy?'正在处理…':mode==='signup'?'注册账号':'登录'}</button>
    </form></>}
    {notice&&<p className="account-notice" role="status">{notice}</p>}
    {account.user&&<section aria-labelledby="account-cards-heading"><div className="plan-section-heading"><h2 id="account-cards-heading">{trash?'行程回收站':'已保存的行程卡'}</h2><div><button type="button" className="experience-text-button" disabled={busy} onClick={()=>{listing.current.cancel();setCards([]);setTrash(value=>!value);}}>{trash?'返回行程卡':'查看回收站'}</button><button type="button" className="experience-text-button" disabled={listLoading||busy} onClick={loadCards}>刷新列表</button></div></div>{listLoading&&<p role="status">正在读取行程卡…</p>}{listError&&<p role="status">{listError}</p>}<div className="account-cards">{cards.map(card=><article key={card.id}><h3>{card.title}</h3><p className="plan-source-note">更新于 {new Date(card.updated_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</p><div>{!trash&&<button type="button" className="experience-button" disabled={busy||listLoading} onClick={()=>openCard(card)}>载入编辑</button>}<button type="button" className="experience-text-button" disabled={busy||listLoading} onClick={()=>moveCard(card)}>{trash?'恢复卡片':'移到回收站'}</button></div></article>)}</div>{!listLoading&&!cards.length&&!listError&&<p>{trash?'回收站还没有卡片。':'还没有保存的卡片。先把喜欢的地方加入行程，再保存到账号。'}</p>}<p className="plan-source-note">载入卡片会替换本机当前草稿。每张卡保留保存时的条件；实时天气、报价和路线仍需行前重查。</p><Link className="experience-text-button" to="/itinerary">去整理行程</Link></section>}
    <details><summary>账号与行程怎样保存</summary><p>账号由 Supabase 提供认证，邮箱和密码通过本站后端用于注册或登录。登录令牌保存在浏览器受保护的 Cookie 中，页面不保存你的密码。只有点“确认保存”后，行程条件、地点与备注才会保存到 Supabase 项目的个人行程表；其他账号不能读取你的卡片。</p><p>未登录仍能编辑并导出本机行程；登录后的草稿按账号分开在本机保存，退出后回到访客草稿，不会展示另一个账号的草稿。云端卡片可移到回收站和恢复。</p><p>淮源姐是 AI 数字导游，日常聊天和动态整理为 AI 辅助生成。对话不作为行程卡自动保存；最近对话只用于本次问答，日期、价格、班次与活动仍按已审资料或实际查询核对。</p></details>
  </div>;
}
