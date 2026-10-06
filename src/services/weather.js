// 和风经服务端代理；显式关闭后端时才使用公开模型预报。
import { apiRequest, backendEnabled, offlineDemo } from './api.js';
const BASE_URL = import.meta.env?.VITE_WEATHER_API_BASE_URL || 'https://api.open-meteo.com/v1/forecast';
export const weatherLocations = {
  lishui: { name: '溧水城区', latitude: 31.65, longitude: 119.02 },
  nanjing: { name: '南京城区', latitude: 32.06, longitude: 118.80 },
};
const cache = new Map();
const pending = new Map();
export const shanghaiDate = (value = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
export const weatherText = (code) => {
  if (typeof code === 'string') return code;
  if (code === 0) return '晴';
  if ([1, 2, 3].includes(code)) return '多云或阴';
  if ([45, 48].includes(code)) return '雾';
  if ([51, 53, 55, 56, 57].includes(code)) return '毛毛雨';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '有雨';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '有雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  return '天气状况暂缺';
};
export const weatherAdvice = (day) => {
  const advice = [];
  if (day.rain >= 50 || /雨|雪/.test(day.text || weatherText(day.code))) advice.push('带雨具与合适的鞋，户外行程留出调整余地。');
  if (day.max >= 30) advice.push('留意防晒和补水，避开长时间暴晒。');
  if (day.min <= 15 || day.max - day.min >= 8) advice.push('备一件外套，早晚与湖边注意体感变化。');
  if (/雷/.test(day.text || '') || [95, 96, 99].includes(day.code)) advice.push('雷雨时避免在湖岸、开阔地和山脊停留，按官方预警及现场指引调整。');
  return advice.join(' ') || '按体感增减衣物，山区与湖边行程同时留意现场天气。';
};
export async function getWeather(locationId = 'lishui', { refresh = false } = {}) {
  if (offlineDemo) throw new Error('离线演示不查询实时天气，当前天气未知。');
  const location = weatherLocations[locationId] || weatherLocations.lishui;
  const key = location.name;
  const cached = cache.get(key);
  if (!refresh && cached && Date.now() - cached.fetchedAt < 10 * 60 * 1000 && cached.days[0]?.date === shanghaiDate()) return cached;
  if (pending.has(key)) return pending.get(key);
  const request = (async () => {
    if (backendEnabled) {
      const data = await apiRequest('weather', { location: locationId }, { timeoutMs: 20000 });
      if (!Array.isArray(data.days) || data.days[0]?.date !== shanghaiDate()) throw new Error('WEATHER_STALE');
      cache.set(key, data);
      return data;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const url = new URL(BASE_URL);
      const params = { latitude: location.latitude, longitude: location.longitude, current: 'temperature_2m,weather_code', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max', timezone: 'Asia/Shanghai', forecast_days: 7 };
      Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, String(value)));
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('WEATHER_UNAVAILABLE');
      const raw = await response.json();
      const daily = raw.daily;
      if (!Array.isArray(daily?.time) || daily.time[0] !== shanghaiDate()) throw new Error('WEATHER_STALE');
      const days = daily.time.map((date, index) => ({ date, code: daily.weather_code?.[index], min: daily.temperature_2m_min?.[index], max: daily.temperature_2m_max?.[index], rain: daily.precipitation_probability_max?.[index] }));
      if (days.some((day) => !Number.isFinite(day.min) || !Number.isFinite(day.max) || !Number.isFinite(day.code))) throw new Error('WEATHER_INCOMPLETE');
      const data = { provider: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/', location: location.name, fetchedAt: Date.now(), modelTime: raw.current?.time, current: Number.isFinite(raw.current?.temperature_2m) ? raw.current.temperature_2m : null, days };
      cache.set(key, data);
      return data;
    } finally { window.clearTimeout(timeout); }
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}

export function selectWeatherDay(data, question) {
  let offset = /后天/.test(question) ? 2 : /明天/.test(question) ? 1 : 0;
  const iso = question.match(/(20\d{2})[-年/](\d{1,2})[-月/](\d{1,2})日?/);
  const short = question.match(/(\d{1,2})[月/](\d{1,2})[日号]?/);
  const dayOnly = question.match(/(?:^|[^\d月/])(\d{1,2})[日号]/);
  const daysLater = question.match(/(\d+)天后/);
  if (/昨天|前天|上周|明年|后年|月底|月末|[一二三四五六七八九十]+[月日号]/.test(question)) return null;
  const requestedDate = iso ? `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}` : short ? `${data.days[0].date.slice(0, 4)}-${short[1].padStart(2, '0')}-${short[2].padStart(2, '0')}` : dayOnly ? `${data.days[0].date.slice(0, 7)}-${dayOnly[1].padStart(2, '0')}` : null;
  if (requestedDate) return data.days.find((day) => day.date === requestedDate) || null;
  if (daysLater) return data.days[Number(daysLater[1])] || null;
  if (/下周|下个月|下月|一周后|七天后|下个周末|下星期/.test(question)) return null;
  const weekday = question.match(/(?:周|星期|礼拜)([一二三四五六日天末])/);
  if (weekday) {
    const target = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0, 末: 6 }[weekday[1]];
    offset = (target - new Date(`${data.days[0].date}T12:00:00+08:00`).getUTCDay() + 7) % 7;
  }
  if (!weekday && /\d+|[一二三四五六七八九十]+天后|以后|之后|下个|本月|下旬|中旬|上旬/.test(question)) return null;
  return data.days[offset] || null;
}
