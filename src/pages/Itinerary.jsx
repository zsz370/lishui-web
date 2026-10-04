import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapTrifold, ArrowUpRight, X, Copy, ArrowUp, ArrowDown, ArrowClockwise, CloudRain } from '@phosphor-icons/react';
import { getNode } from '../data/nodes.js';
import { getPersona } from '../data/personas.js';
import { useItinerary } from '../data/store.jsx';
import { calculatePlan, exportPlan, formatTime, navigationUrl, routeMinutes, validDate, planWeather } from '../data/itinerary.js';
import { queryLeg } from '../services/itinerary.js';
import { getWeather } from '../services/weather.js';
import ItineraryPlacePicker from '../components/ItineraryPlacePicker.jsx';
import ServiceShortcuts from '../components/ServiceShortcuts.jsx';
import './Itinerary.css';

const checkedTime = (value) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '查询时间未知';
function Field({ id, label, value, onChange, ...inputProps }) {
  return <div className="plan-field"><label htmlFor={id}>{label}</label><input id={id} value={value} onChange={(event) => onChange(event.target.value)} {...inputProps} /></div>;
}
function Leg({ leg, plan }) {
  const route = plan.routes[leg.key], minutes = routeMinutes(route), url = navigationUrl(leg, plan.mode);
  return <div className="plan-leg"><p><span aria-hidden="true">↳</span> {leg.from.name} → {leg.to.name}</p><div>{minutes !== null ? <span>地图估时 {minutes} 分钟{route.distance !== null && Number.isFinite(route.distance) ? ` · ${(route.distance / 1000).toFixed(1)} km` : ''}</span> : <span className="plan-unknown">{route?.status === 'unreachable' ? '未找到可达方案' : route?.status === 'unavailable' ? `查询未完成：${route.message}` : route?.checkedAt ? '保存的路线已过期，请重新查询' : '交通耗时待查询'}</span>}{url && <a href={url} target="_blank" rel="noreferrer">打开导航 <ArrowUpRight size={13} aria-hidden="true" /></a>}</div>{route?.checkedAt && <small>高德地图 · 查询于 {checkedTime(route.checkedAt)}（北京时间）</small>}{minutes !== null && (route.buses?.length > 0 || route.steps?.length > 0) && <details><summary>查看路线参考</summary><p>{route.buses?.length ? route.buses.join(' → ') : route.steps.join('；')}</p></details>}</div>;
}

export default function Itinerary() {
  const { plan, remove, clear, savedLocally, updatePlan, updateStop, move, applyScene, setRoute } = useItinerary();
  const [, refreshClock] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => refreshClock(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const result = calculatePlan(plan), text = exportPlan(plan);
  const [notice, setNotice] = useState(''), [showText, setShowText] = useState(false);
  const [routing, setRouting] = useState(''), [weatherState, setWeatherState] = useState('');
  const routeRequest = useRef(null), weatherRequest = useRef(0);
  const routeSignature = JSON.stringify(result.legs.map((leg) => [leg.id, leg.key]));
  useEffect(() => { routeRequest.current?.abort(); setRouting(''); return () => routeRequest.current?.abort(); }, [routeSignature]);
  useEffect(() => { weatherRequest.current += 1; setWeatherState(''); return () => { weatherRequest.current += 1; }; }, [plan.date]);
  const copy = async () => {
    setShowText(true);
    setNotice('行程文字已展开，可以全选手动复制。');
    let timer;
    try {
      await Promise.race([navigator.clipboard.writeText(exportPlan(plan)), new Promise((resolve, reject) => { timer = window.setTimeout(() => reject(new Error('COPY_TIMEOUT')), 2000); })]);
      setNotice('已复制当前行程，包含来源、冲突和待确认项。');
    } catch { setNotice('暂时无法自动复制，请选择下方文字手动复制。'); }
    finally { window.clearTimeout(timer); }
  };
  const calculateRoutes = async () => {
    if (!plan.mode) { setNotice('请先选择交通方式。'); return; }
    const ready = result.legs.filter((leg) => leg.from.place && leg.to.place);
    if (!ready.length) { setNotice('请先查地点并选用实际出发地、游览入口和返程终点。'); return; }
    routeRequest.current?.abort();
    const controller = new AbortController(); routeRequest.current = controller;
    let failures = 0;
    for (const leg of ready) {
      if (controller.signal.aborted) return;
      setRouting(`正在查询 ${leg.from.name} → ${leg.to.name}`);
      try {
        const route = await queryLeg(leg, plan.mode, controller.signal);
        if (!controller.signal.aborted) setRoute(leg.key, route);
      } catch (error) {
        if (controller.signal.aborted) return;
        failures += 1;
        setRoute(leg.key, { status: 'unavailable', message: error.message || '路线暂时无法查询', checkedAt: new Date().toISOString() });
      }
    }
    if (!controller.signal.aborted) { setRouting(''); setNotice(`已查询${ready.length}段交通${failures ? `，其中${failures}段失败，耗时保持未知` : ''}。未确认地点的路段仍需补充；公共交通班次请行前复核。`); }
  };
  const checkWeather = async () => {
    if (!validDate(plan.date)) { setWeatherState('请先填写有效的出行日期。'); return; }
    const token = ++weatherRequest.current;
    setWeatherState('正在核对出行日预报…');
    try {
      const weather = await getWeather('lishui', { refresh: true });
      if (weatherRequest.current !== token) return;
      const day = weather.days.find((entry) => entry.date === plan.date);
      updatePlan({ weather: day ? { ...day, provider: weather.provider, sourceUrl: weather.sourceUrl, fetchedAt: weather.fetchedAt, date: plan.date } : null });
      setWeatherState(day ? '' : '出行日期不在当前预报范围内，天气保持未知。');
    } catch {
      if (weatherRequest.current === token) { updatePlan({ weather: null }); setWeatherState('天气查询失败，请稍后重试，或查看天气服务。'); }
    }
  };
  const weather = planWeather(plan);
  const rain = plan.weatherCondition === 'rain' || weather && (/雨|雪|雷/.test(weather.text) || weather.rain >= 50);
  return <div className="itinerary-experience">
    <div className="itinerary-heading"><div><p className="section-overline">秦淮源头的一天</p><h1>我的溧水行程</h1><p>选好想去的地方，再把出发、停留和返程慢慢安排妥当。</p></div><div className="itinerary-actions"><button type="button" className="experience-text-button" onClick={() => { routeRequest.current?.abort(); weatherRequest.current += 1; clear(); setNotice('行程与个人安排已清空。'); setShowText(false); }}>清空行程</button><button type="button" className="experience-text-button" onClick={() => setShowText((shown) => !shown)}>{showText ? "收起行程文字" : "查看行程文字"}</button><button type="button" className="experience-button" onClick={copy}><Copy size={16} aria-hidden="true" />复制行程</button></div></div>
    <section className="plan-scenes" aria-labelledby="scene-title"><div><h2 id="scene-title">先从一次出行开始</h2><p>两份待验证的设计草案。替换当前地点，保留你已填的出行条件；开放、费用与交通仍须核对。</p></div><div><button type="button" onClick={() => { applyScene('culture'); setNotice('已载入无车文化游草案，请补充实际出行条件。'); }}>无车的一日文化游 <ArrowUpRight size={15} aria-hidden="true" /></button><button type="button" onClick={() => { applyScene('rain'); setNotice('已载入雨天调整草案；请确认周园展陈是否开放与沿途室外路段。'); }}>遇雨，保留文化体验 <CloudRain size={17} aria-hidden="true" /></button></div></section>
    <section className="plan-basics" aria-labelledby="basics-title"><div className="plan-section-heading"><h2 id="basics-title">01 · 这次怎么出发</h2><span>没有确定的条件可以留空</span></div>
      <div className="plan-fields"><Field id="plan-date" label="出行日期" type="date" value={plan.date} onChange={(date) => updatePlan({ date })} /><Field id="plan-departure" label="出发时间" type="time" value={plan.departureTime} onChange={(departureTime) => updatePlan({ departureTime })} /><Field id="plan-return" label="最晚返回" type="time" value={plan.returnTime} onChange={(returnTime) => updatePlan({ returnTime })} /><div className="plan-field"><label htmlFor="plan-mode">交通方式</label><select id="plan-mode" value={plan.mode} onChange={(event) => updatePlan({ mode: event.target.value })}><option value="">未确定</option><option value="transit">公共交通</option><option value="walking">步行</option><option value="driving">自驾</option></select></div><Field id="plan-adults" label="成人（人）" type="number" min="1" max="30" step="1" value={plan.adults} onChange={(adults) => updatePlan({ adults })} /><Field id="plan-children" label="儿童（人）" type="number" min="0" max="30" step="1" value={plan.children} onChange={(children) => updatePlan({ children })} /><Field id="plan-budget" label="全员总预算（元）" type="number" min="0" value={plan.budget} onChange={(budget) => updatePlan({ budget })} /><Field id="plan-other-cost" label="交通、餐饮等自估（元）" type="number" min="0" value={plan.otherCost} onChange={(otherCost) => updatePlan({ otherCost })} /></div>
      <div className="plan-endpoints"><ItineraryPlacePicker id="plan-origin" label="出发地" value={plan.origin} onChange={(origin) => updatePlan({ origin })} /><ItineraryPlacePicker id="plan-destination" label="返程终点" value={plan.destination} onChange={(destination) => updatePlan({ destination })} /></div>
      <Field id="plan-goal" label="这次最想体验什么" value={plan.goal} maxLength={200} placeholder="例如：和孩子听懂胭脂河开凿的故事" onChange={(goal) => updatePlan({ goal })} />
      <p className="plan-source-note">地点查询发送地点关键词到服务端与高德地图。人数、预算、备注保存在当前浏览器；这里不会提交订单或锁定房源。</p>
    </section>
    <div className="plan-workspace"><section className="plan-stops" aria-labelledby="stops-title"><div className="plan-section-heading"><h2 id="stops-title">02 · 一站一站，安排这一天</h2><Link to="/nodes">再选一处 <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      <div className="plan-route-toolbar"><button type="button" className="experience-button" onClick={calculateRoutes} disabled={!plan.stops.length || Boolean(routing)}><ArrowClockwise size={16} aria-hidden="true" />查询路线并重算时间</button>{routing && <button type="button" className="experience-text-button" onClick={() => { routeRequest.current?.abort(); setRouting(''); setNotice('路线查询已取消，已完成的查询保留。'); }}>取消查询</button>}<p role="status">{routing || '只根据确认的地点和地图估时推算；留空的时间不会自动补齐。'}</p></div>
      {!plan.stops.length ? <div className="experience-empty"><MapTrifold size={44} weight="light" aria-hidden="true" /><h3>旅程，就从一点好奇开始</h3><p>选用上方草案，或把喜欢的名片加入行程。</p><Link className="experience-button" to="/nodes">去探索栏目 <ArrowUpRight size={16} aria-hidden="true" /></Link></div> : <ol className="plan-timeline">{result.timeline.map((item, index) => {
        const stop = item.stop, node = getNode(stop.nodeId), persona = getPersona(node.expert);
        return <li key={node.id}><Leg leg={item.leg} plan={plan} /><article className="plan-stop"><div className="plan-stop-heading"><span className="plan-order">{String(index + 1).padStart(2, '0')}</span><div><Link to={`/nodes/${node.id}`}><h3>{node.name}</h3></Link><p>{formatTime(item.arrival)} — {formatTime(item.departure)} <small>{item.basis}</small></p></div><div className="plan-stop-controls"><button type="button" onClick={() => move(node.id, -1)} disabled={index === 0} aria-label={`上移${node.name}`}><ArrowUp size={17} aria-hidden="true" /></button><button type="button" onClick={() => move(node.id, 1)} disabled={index === plan.stops.length - 1} aria-label={`下移${node.name}`}><ArrowDown size={17} aria-hidden="true" /></button><button type="button" onClick={() => remove(node.id)} aria-label={`从行程移除${node.name}`}><X size={17} aria-hidden="true" /></button></div></div>
          <p className="plan-stop-summary">{node.summary}</p><div className="plan-stop-fields"><Field id={`arrival-${node.id}`} label="指定到达（可留空）" type="time" value={stop.arrival} onChange={(arrival) => updateStop(node.id, { arrival })} /><Field id={`stay-${node.id}`} label="计划停留（分钟）" type="number" min="1" max="1440" step="1" value={stop.stay} onChange={(stay) => updateStop(node.id, { stay })} /><Field id={`cost-${node.id}`} label="全员此站自估（元）" type="number" min="0" value={stop.cost} onChange={(cost) => updateStop(node.id, { cost })} /></div>
          <ItineraryPlacePicker id={`place-${node.id}`} label="实际入口 / 店铺 / 展馆" value={stop} onChange={(place) => updateStop(node.id, place)} placeholder="文化项目与食品请填写实际店铺或展馆" /><div className="plan-stop-notes"><Field id={`cost-note-${node.id}`} label="费用依据（选填）" value={stop.costNote} maxLength={200} onChange={(costNote) => updateStop(node.id, { costNote })} placeholder="例如：个人预算；行前核对报价" /><Field id={`note-${node.id}`} label="休息、预约与体验备注" value={stop.note} maxLength={200} onChange={(note) => updateStop(node.id, { note })} /></div>
          <div className="plan-stop-footer"><Link to={`/nodes/${node.id}#guide`}>向{persona?.name || '导游'}追问 <ArrowUpRight size={14} aria-hidden="true" /></Link><details><summary>内容依据</summary>{node.introductionSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}</details></div>
        </article></li>;
      })}</ol>}
      {plan.stops.length > 0 && <div className="plan-return-leg"><Leg leg={result.legs.at(-1)} plan={plan} /><p>预计返回：<strong>{formatTime(result.returnArrival)}</strong></p></div>}
    </section><aside className="plan-review" aria-label="行程核对"><section><p className="section-overline">03 · 出发前，再看一眼</p><h2>这份安排还缺什么</h2><div className="plan-cost-total"><strong>¥{result.subtotal}</strong><span>自填费用{result.completeCosts ? '合计' : '小计 · 尚未填全'}<small>包括各站与交通、餐饮等自估</small></span></div><p className="plan-source-note">个人费用估计与停留安排，不是经营方报价或推荐游览时长。路线图按顺序展示，不代表地理比例。</p><div className="plan-route-strip" aria-label="路线顺序示意"><span>{plan.origin.place?.name || '出发地待确认'}</span>{plan.stops.map((stop) => <span key={stop.nodeId}>{getNode(stop.nodeId).name}</span>)}<span>{plan.destination.place?.name || '返程待确认'}</span></div>
      {result.conflicts.length > 0 && <div className="plan-conflicts" role="status"><h3>{result.conflicts.length}项冲突需调整</h3><ul>{result.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul></div>}<details className="plan-pending" open><summary>{result.pending.length}项待确认</summary><ul>{result.pending.map((pending) => <li key={pending}>{pending}</li>)}</ul></details>
      <p className="plan-source-note">地图路线按查询时数据提供，不包含你出行日的班次、营业与预约确认。更改地点、交通或日期后需重新查询；超过24小时的地图估时不参与计算。</p>
    </section><section className="plan-weather"><h2>天气变了，也能调整</h2><button type="button" className="experience-text-button" onClick={checkWeather} disabled={weatherState === '正在核对出行日预报…'}>核对出行日天气 <ArrowClockwise size={15} aria-hidden="true" /></button><p role="status">{weatherState}</p>{weather && <p>{weather.date} · {weather.text} · {Math.round(weather.min)}—{Math.round(weather.max)}℃<small>{weather.provider} · {checkedTime(new Date(weather.fetchedAt).toISOString())} · 溧水城区预报</small></p>}<label className="plan-rain-choice"><input type="checkbox" checked={plan.weatherCondition === 'rain'} onChange={(event) => updatePlan({ weatherCondition: event.target.checked ? 'rain' : '' })} />按雨天情况准备备选</label>
      {rain && <div className="plan-rain-advice"><p>周园名片中有收藏展陈线索，可以作为保留文化体验的候选。先向园方确认开放、室内展陈与室外衔接路段，再查询交通；也可减少户外停留。</p><Link to="/nodes/n_zy">查看周园资料与专家 <ArrowUpRight size={13} aria-hidden="true" /></Link><button type="button" className="experience-text-button" onClick={() => { applyScene('rain'); setNotice('地点已换为雨天草案，原出行条件保留，请重新确认地点与路线。'); }}>换为雨天草案</button></div>}
      <p className="plan-source-note">手选雨天是你的计划条件；只有核对后的预报才作为天气依据。城区预报不能代替现场天气与预警。</p><Link to="/services?service=weather">查看天气服务与出处</Link>
    </section></aside></div>
    <p className="itinerary-notice" role="status">{notice}</p>{showText && <div className="manual-copy"><label htmlFor="itinerary-text">行程文字（全选后复制）</label><textarea id="itinerary-text" value={text} readOnly rows={12} onFocus={(event) => event.target.select()} /></div>}
    <p className={`itinerary-local-note${savedLocally ? '' : ' plan-field-error'}`}>{savedLocally ? '已保存在当前浏览器，刷新后可继续编辑。清空行程可删除出行条件与地点记录。' : '当前浏览器无法保存。请在离开前复制行程；刷新可能丢失本次编辑。'}</p><ServiceShortcuts compact />
  </div>;
}
