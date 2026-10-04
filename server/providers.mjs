import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AppError, requireValue, upstream, safeUrl, textField, dates, today } from './core.mjs';

export function normalizeHotels(raw, query) {
  if (raw?.status !== 0 || !Array.isArray(raw.data?.itemList)) throw new AppError('UPSTREAM_FAILED', '飞猪未返回有效的住宿查询结果', 502);
  return { provider: '飞猪 FlyAI', checkedAt: new Date().toISOString(), query,
    scope: '按日期查询酒店/民宿及平台返回报价；未返回的房型库存、设施和取消政策须在预订页面确认',
    hotels: raw.data.itemList.slice(0, 5).map((hotel) => ({
      name: String(hotel.name || '未命名住宿').slice(0, 120), address: String(hotel.address || '').slice(0, 250),
      price: hotel.price === undefined || hotel.price === null || hotel.price === '' ? null : String(hotel.price).slice(0, 40),
      score: typeof hotel.score === 'number' || typeof hotel.score === 'string' ? hotel.score : null,
      latitude: Number.isFinite(Number(hotel.latitude)) && hotel.latitude !== null ? Number(hotel.latitude) : null,
      longitude: Number.isFinite(Number(hotel.longitude)) && hotel.longitude !== null ? Number(hotel.longitude) : null,
      url: safeUrl(hotel.detailUrl || hotel.jumpUrl),
      // A search hit is not an inventory guarantee; absent fields remain unknown.
      roomInventory: null,
    })),
  };
}

export function createProviders(config, fetcher = fetch, runFile = execFile) {
  const json = (value) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  const silicon = async (service, path, body, timeoutMs = 45000) => {
    const options = json(body); options.headers.Authorization = `Bearer ${requireValue(service.key, '硅基流动')}`; options.signal = AbortSignal.timeout(timeoutMs);
    return upstream('硅基流动', `${service.base}/${path}`, options, fetcher);
  };
  return {
    async generate(messages, { structured = false, timeoutMs = 12000 } = {}) {
      const body = await silicon(config.llm, 'chat/completions', { model: config.llm.model, messages, temperature: 0, max_tokens: structured ? 220 : 650, enable_thinking: false, ...(structured ? { response_format: { type: 'json_object' } } : {}) }, timeoutMs);
      const choice = body.choices?.[0];
      if (!choice?.message?.content || choice.finish_reason === 'length') throw new AppError('UPSTREAM_FAILED', '模型未返回完整答复', 502);
      return choice.message.content;
    },
    async embed(texts) {
      const body = await silicon(config.embedding, 'embeddings', { model: config.embedding.model, input: texts, encoding_format: 'float' });
      const data = body.data?.slice().sort((a,b) => a.index-b.index);
      if (data?.length !== texts.length || data.some((item) => !Array.isArray(item.embedding) || !item.embedding.length || item.embedding.some((n) => !Number.isFinite(n)))) throw new AppError('UPSTREAM_FAILED', '向量服务未返回有效向量', 502);
      return data.map((item) => item.embedding);
    },
    async search(query) {
      textField(query, '搜索内容');
      const options = json({ query, freshness: 'noLimit', summary: true, count: 5 });
      options.headers.Authorization = `Bearer ${requireValue(config.bocha.key, '联网搜索')}`;
      const body = await upstream('博查', `${config.bocha.base}/v1/web-search`, options, fetcher);
      if (String(body.code) !== '200' || !Array.isArray(body.data?.webPages?.value)) throw new AppError('UPSTREAM_FAILED', '联网搜索未返回有效结果', 502);
      return body.data.webPages.value.filter((page) => safeUrl(page.url)).map((page) => ({ label: String(page.name || '联网来源').slice(0,150), url: safeUrl(page.url), excerpt: String(page.summary || page.snippet || '').slice(0, 1600), publishedAt: page.datePublished, kind: 'web', reviewed: false, checkedAt: new Date().toISOString() }));
    },
    async weather(location = 'lishui') {
      const places = { lishui: {name:'溧水城区',lat:31.65,lon:119.02}, nanjing: {name:'南京城区',lat:32.06,lon:118.80} };
      const place = places[location];
      if (!place) throw new AppError('INVALID_INPUT','天气地点请选择溧水城区或南京城区');
      requireValue(config.weather.host, '和风天气'); requireValue(config.weather.key, '和风天气');
      const base = `https://${config.weather.host}/weather/v1`;
      const options = { headers: { 'X-QW-Api-Key': config.weather.key } };
      const daily = await upstream('和风天气', `${base}/daily/${place.lat}/${place.lon}?days=7&localTime=true&lang=zh`, options, fetcher);
      const days = daily.days?.map((day) => ({ date: day.forecastStartTime?.slice(0,10), code: Number(day.daytime?.condition?.code), text: day.daytime?.condition?.text, min: day.temperatureMin?.value, max: day.temperatureMax?.value, rain: Math.round(Math.max(day.daytime?.precipitation?.probability || 0, day.nighttime?.precipitation?.probability || 0)*100) }));
      if (!days?.length || days[0].date !== today() || days.some((day) => !Number.isFinite(day.min) || !Number.isFinite(day.max) || !day.text)) throw new AppError('UPSTREAM_FAILED', '天气预报不完整或已过期', 502);
      let current = null, modelTime = null;
      try { const now = await upstream('和风天气', `${base}/current/${place.lat}/${place.lon}?localTime=true&lang=zh`, options, fetcher); current = Number.isFinite(now.temperature?.value) ? now.temperature.value : null; modelTime = now.obsTime || now.validTime || modelTime; } catch { /* Daily forecast remains usable when current conditions fail. */ }
      return { provider: '和风天气', sourceUrl:'https://developer.qweather.com/attribution.html', location: place.name, fetchedAt: Date.now(), modelTime, current, days };
    },
    async places(keywords, city = '320117') {
      textField(keywords,'地点关键词',120);
      if (!/^\d{6}$/.test(city)) throw new AppError('INVALID_INPUT','城市编码格式不正确');
      const url = new URL('https://restapi.amap.com/v3/place/text');
      url.search = new URLSearchParams({ key: requireValue(config.amapKey,'高德地图'), keywords, city, citylimit:'true', offset:'5',page:'1',extensions:'base' });
      const body = await upstream('高德地图',url,{},fetcher);
      if (body.status !== '1' || !Array.isArray(body.pois)) throw new AppError('UPSTREAM_FAILED','高德地点查询未返回有效结果',502);
      return { provider:'高德地图', checkedAt:new Date().toISOString(), places:body.pois.map((poi) => ({id:poi.id,name:poi.name,address:typeof poi.address === 'string' ? poi.address : '',location:poi.location,url:`https://uri.amap.com/marker?${new URLSearchParams({position:poi.location,name:poi.name})}`})) };
    },
    async route(origin, destination, mode = 'walking') {
      const validPoint = (value) => /^\d{1,3}(?:\.\d{1,6})?,\d{1,2}(?:\.\d{1,6})?$/.test(value || '') && Number(value.split(',')[0]) <= 180 && Number(value.split(',')[1]) <= 90;
      if (!validPoint(origin) || !validPoint(destination) || !['walking','driving','transit'].includes(mode)) throw new AppError('INVALID_INPUT','请提供有效坐标和出行方式');
      const url = new URL(`https://restapi.amap.com/v3/direction/${mode === 'transit' ? 'transit/integrated' : mode}`);
      url.search = new URLSearchParams({ key:requireValue(config.amapKey,'高德路线'),origin,destination,city:'南京',cityd:'南京',extensions:'base',strategy:'0' });
      const body = await upstream('高德路线',url,{},fetcher);
      if (body.status !== '1') throw new AppError('UPSTREAM_FAILED','高德路线查询未返回有效结果',502);
      const paths = body.route?.paths || body.route?.transits || [];
      return {provider:'高德地图',mode,checkedAt:new Date().toISOString(),paths:paths.slice(0,2).map((path) => ({ distance:path.distance,duration:path.duration,steps:(path.steps || []).map((step) => step.instruction),segments:(path.segments || []).map((segment) => ({walking:segment.walking?.distance,buses:segment.bus?.buslines?.map((line) => line.name)})) }))};
    },
    async translate(q, to = 'en', from = 'auto') {
      textField(q,'待翻译文本',4000);
      const languages = ['auto','zh','en','jp','kor','fra','de','spa','ru','th','ara','pt','it'];
      if (!languages.includes(from) || !languages.includes(to) || to === 'auto') throw new AppError('INVALID_INPUT','暂不支持该语言代码');
      const appid = requireValue(config.baidu.appId,'百度翻译'), secret = requireValue(config.baidu.secret,'百度翻译'), salt = randomBytes(12).toString('hex');
      const sign = createHash('md5').update(appid+q+salt+secret).digest('hex');
      const body = await upstream('百度翻译','https://fanyi-api.baidu.com/api/trans/vip/translate',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({q,from,to,appid,salt,sign})},fetcher);
      if (body.error_code || !body.trans_result?.length) throw new AppError('UPSTREAM_FAILED','百度翻译暂未返回有效译文',502);
      return {provider:'百度翻译',from:body.from,to:body.to,content:body.trans_result.map((item) => item.dst).join('\n')};
    },
    async stays(query) {
      const key = requireValue(config.stay.key,'飞猪住宿');
      const destName = textField(query.destName || '南京市溧水区','住宿目的地',80);
      const dateRange = dates(query.checkInDate,query.checkOutDate);
      if (query.maxPrice !== undefined && (!Number.isFinite(query.maxPrice) || query.maxPrice < 1 || query.maxPrice > 100000)) throw new AppError('INVALID_INPUT','住宿预算格式不正确');
      const args = ['search-hotels','--dest-name',destName,'--check-in-date',dateRange.checkInDate,'--check-out-date',dateRange.checkOutDate,'--sort','price_asc'];
      if (query.maxPrice !== undefined) args.push('--max-price',String(query.maxPrice));
      if (query.poiName) args.push('--poi-name',textField(query.poiName,'附近景点',80));
      if (query.hotelTypes) { if (!['酒店','民宿','客栈'].includes(query.hotelTypes)) throw new AppError('INVALID_INPUT','住宿类型不正确'); args.push('--hotel-types',query.hotelTypes); }
      const cli = fileURLToPath(new URL('./flyai-runner.cjs',import.meta.url));
      // Official CLI supplies FlyAI's required client signature. Fixed executable,
      // separate argument array, no shell; credentials are never process arguments.
      const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'].filter((name) => process.env[name]).map((name) => [name,process.env[name]]));
      Object.assign(env,{FLYAI_API_KEY:key,DEBUG_FLYAI_MCP_URL:config.stay.base,FLYAI_JSON:'1'});
      const raw = await new Promise((resolve,reject) => runFile(process.execPath,[cli,...args],{env,timeout:55000,maxBuffer:2*1024*1024,windowsHide:true},(error,stdout) => {
        if (error) return reject(new AppError('UPSTREAM_FAILED','飞猪住宿暂时无法查询，请稍后重试',502));
        try { resolve(JSON.parse(stdout)); } catch { reject(new AppError('UPSTREAM_FAILED','飞猪住宿响应格式异常',502)); }
      }));
      return normalizeHotels(raw,{destName,...dateRange,...(query.maxPrice ? {maxPrice:query.maxPrice} : {})});
    },
  };
}
