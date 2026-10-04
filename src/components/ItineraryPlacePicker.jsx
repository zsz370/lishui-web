import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, MapPin } from '@phosphor-icons/react';
import { findPlaces } from '../services/itinerary.js';

export default function ItineraryPlacePicker({ id, label, value, onChange, placeholder = '输入南京市内的具体地点' }) {
  const [state, setState] = useState({ loading: false, places: [], error: '', searched: false });
  const request = useRef(null);
  useEffect(() => {
    request.current?.abort();
    setState({ loading: false, places: [], error: '', searched: false });
    return () => request.current?.abort();
  }, [value.query, value.place?.location]);
  const search = async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setState({ loading: true, places: [], error: '', searched: true });
    try {
      const places = await findPlaces(value.query.trim(), controller.signal);
      if (!controller.signal.aborted) setState({ loading: false, places, error: '', searched: true });
    } catch (error) {
      if (!controller.signal.aborted) setState({ loading: false, places: [], error: error.message || '地点查询失败，请重试。', searched: true });
    }
  };
  return <div className="plan-place-picker">
    <label htmlFor={id}>{label}</label>
    <div className="plan-place-search"><input id={id} value={value.query} maxLength={120} placeholder={placeholder} onChange={(event) => onChange({ query: event.target.value, place: null })} /><button type="button" onClick={search} disabled={!value.query.trim() || state.loading} aria-label={`查询${label}`}><MagnifyingGlass size={17} aria-hidden="true" />{state.loading ? '查询中' : '查地点'}</button></div>
    {value.place && <p className="plan-place-confirmed"><MapPin size={16} aria-hidden="true" /><span>已确认：{value.place.name}<small>{value.place.address} · 高德地图地点</small></span></p>}
    <div aria-live="polite">
      {state.loading && <p className="plan-query-loading" role="status">正在查询地图地点，请稍候…</p>}
      {state.error && <p className="plan-field-error">{state.error} 实际地址仍待确认。</p>}
      {!state.loading && !state.error && state.searched && state.places.length === 0 && <p className="plan-field-error">未找到匹配地点，请换用具体入口、店铺或展馆名称。</p>}
      {state.places.length > 0 && <ul className="plan-place-results" aria-label={`${label}候选地点`}>{state.places.map((place) => <li key={`${place.id}:${place.location}`}><div><strong>{place.name}</strong><small>{place.address || '地址未提供'}</small></div><button type="button" onClick={() => onChange({ query: place.name, place })}>选用此地点</button></li>)}</ul>}
    </div>
  </div>;
}
