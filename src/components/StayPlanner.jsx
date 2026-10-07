import { useState } from 'react';
import { stayDefaults } from '../data/travelServices.js';
import { apiRequest } from '../services/api.js';
import { shanghaiDate } from '../services/weather.js';
export default function StayPlanner({ onPreferences }) {
  const [pref, setPref] = useState({ ...stayDefaults, checkInDate: '', checkOutDate: '' });
  const [state, setState] = useState({ loading: false, data: null, error: '' });
  const update = (key, value) => setPref((current) => ({ ...current, [key]: value }));
  const fields = [
    { id: 'budget', name: '每晚预算', options: [['flexible', '预算灵活'], ['300', '300元以内'], ['600', '600元以内']] },
    { id: 'companions', name: '同行人群', options: [['general', '独行／朋友／情侣'], ['family', '带孩子'], ['seniors', '带长辈／行动不便']] },
    { id: 'transport', name: '出行方式', options: [['transit', '公共交通／没有车'], ['drive', '自驾']] },
  ];
  const submit = async (event) => {
    event.preventDefault(); if (state.loading) return;
    setState({ loading: true, data: null, error: '' }); onPreferences?.({ ...pref });
    try { const data = await apiRequest('stays', { destName: '南京市溧水区', checkInDate: pref.checkInDate, checkOutDate: pref.checkOutDate, ...(pref.budget !== 'flexible' ? { maxPrice: Number(pref.budget) } : {}) }); setState({ loading: false, data, error: '' }); }
    catch (error) { setState({ loading: false, data: null, error: error.message }); }
  };
  return <div className="stay-planner"><h3>按入住日期，查询住宿报价</h3><p>查询溧水酒店与民宿。平台报价会变化，房型库存和入住条件请打开详情确认。</p>
    <form onSubmit={submit}><div className="stay-fields">
      <label htmlFor="stay-check-in">入住日期<input id="stay-check-in" type="date" required min={shanghaiDate()} value={pref.checkInDate} onInput={(event) => update('checkInDate', event.target.value)} onChange={(event) => update('checkInDate', event.target.value)} className="rounded border p-2 w-full" /></label>
      <label htmlFor="stay-check-out">退房日期<input id="stay-check-out" type="date" required min={pref.checkInDate || shanghaiDate()} value={pref.checkOutDate} onInput={(event) => update('checkOutDate', event.target.value)} onChange={(event) => update('checkOutDate', event.target.value)} className="rounded border p-2 w-full" /></label>
      {fields.map((field) => <label key={field.id} htmlFor={`stay-${field.id}`}>{field.name}<select id={`stay-${field.id}`} value={pref[field.id]} onChange={(event) => update(field.id, event.target.value)}>{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
    </div><button className="experience-button" type="submit" disabled={state.loading}>{state.loading ? '正在查询报价…' : '查询酒店与民宿'}</button></form>
    <div aria-live="polite">{state.error ? <p role="status">{state.error}，请检查日期后重试。</p> : state.data ? <section className="stay-results"><h4>本次查询结果</h4><p>{state.data.query.checkInDate}入住，{state.data.query.checkOutDate}退房 · 查询时间：{new Date(state.data.checkedAt).toLocaleString('zh-CN')}</p>
      {state.data.hotels.length ? <ol>{state.data.hotels.map((hotel, index) => <li key={`${hotel.name}-${index}`}><span>{hotel.price || '平台未提供报价'}</span><h5>{hotel.name}</h5><p>{hotel.address}</p>{hotel.url && <a href={hotel.url} target="_blank" rel="noreferrer">查看住宿详情与入住条件</a>}<small>房型库存、早餐、设施和取消政策尚未确认。</small></li>)}</ol> : <p>本次没有匹配结果，请调整日期或预算。</p>}
      <p>{pref.companions === 'seniors' ? '带长辈时先向酒店确认电梯、入口台阶和浴室防滑。' : pref.companions === 'family' ? '带孩子时先确认床型、儿童入住政策和早餐。' : '请核对入住人数、床型和订单条款。'}{pref.transport === 'transit' ? '在咨询区告诉淮源姐出发地，可继续查交通路线。' : '请另向酒店确认停车条件。'}</p>
    </section> : <p className="stay-empty">选好日期后查询，也可以在咨询区告诉淮源姐你的住宿需求。</p>}</div>
    <p className="service-source-note">数据来源：飞猪 FlyAI。价格为查询时平台返回报价，网页未锁定房间。</p>
  </div>;
}
