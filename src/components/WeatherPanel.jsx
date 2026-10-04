import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, CloudSun } from '@phosphor-icons/react';
import { getWeather, weatherAdvice, weatherText } from '../services/weather.js';

export default function WeatherPanel() {
  const [location, setLocation] = useState('lishui');
  const [state, setState] = useState({ loading: true, data: null, error: false });
  const [allDays, setAllDays] = useState(false);
  const sequence = useRef(0);
  const load = async (refresh = false) => {
    const token = ++sequence.current;
    setState({ loading: true, data: null, error: false });
    try {
      const data = await getWeather(location, { refresh });
      if (sequence.current === token) setState({ loading: false, data, error: false });
    } catch { if (sequence.current === token) setState({ loading: false, data: null, error: true }); }
  };
  useEffect(() => { load(); return () => { sequence.current += 1; }; }, [location]);
  const data = state.data;
  return <div className="weather-panel">
    <div className="service-panel-toolbar"><label htmlFor="weather-place">预报地点<select id="weather-place" value={location} onChange={(event) => setLocation(event.target.value)}><option value="lishui">溧水城区</option><option value="nanjing">南京城区</option></select></label><button type="button" onClick={() => load(true)} disabled={state.loading}><ArrowClockwise size={16} aria-hidden="true" />刷新预报</button></div>
    <div aria-live="polite">
      {state.loading ? <div className="weather-loading" role="status"><CloudSun size={28} weight="light" aria-hidden="true" /><p>正在获取最新预报…</p></div> : state.error ? <div className="weather-error" role="status"><h3>暂时无法取得最新天气</h3><p>请稍后重试，或查看中国天气网及南京气象。这里不会显示旧天气作为当前预报。</p><button className="experience-text-button" type="button" onClick={() => load(true)}>重新获取</button><a href="https://www.weather.com.cn/" target="_blank" rel="noreferrer">查看中国天气网</a></div> : data && <>
        <div className="weather-current"><CloudSun size={32} weight="light" aria-hidden="true" /><div><span>{data.location} · 当前天气</span><strong>{data.current === null ? '温度暂缺' : `${Math.round(data.current)}℃`}</strong></div><p>{new Date(data.fetchedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}<small>查询时间 · 北京时间</small></p></div>
        <div className="weather-days">{data.days.slice(0, allDays ? 7 : 3).map((day, index) => <div key={day.date}><span>{index === 0 ? '今天' : index === 1 ? '明天' : index === 2 ? '后天' : day.date.slice(5)}</span><small>{day.date.slice(5)}</small><strong>{day.text || weatherText(day.code)}</strong><p>{Math.round(day.min)}—{Math.round(day.max)}℃</p><small>{Number.isFinite(day.rain) ? `降水概率 ${day.rain}%` : '降水概率暂缺'}</small></div>)}</div>
        <button className="experience-text-button" type="button" onClick={() => setAllDays((value) => !value)}>{allDays ? '收起后四天' : '查看未来7天'}</button>
        <p className="weather-advice">{weatherAdvice(data.days[0])}</p>
      </>}
    </div>
    <p className="service-source-note">天气数据：<a href={data?.sourceUrl || 'https://developer.qweather.com/attribution.html'} target="_blank" rel="noreferrer">{data?.provider || '和风天气'}</a>，城区网格预报不能代替山区、湖畔现场天气或官方预警。</p>
  </div>;
}
