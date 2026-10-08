import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AppError, requireValue, upstream, safeUrl, textField, dates, today } from './core.mjs';
import { readModelStream } from './modelStream.mjs';
import { normalizeStaySearch, stayProviderSort, stayQueryKeyword, selectStayHotels } from './staySearch.mjs';

export function normalizeHotels(raw, query) {
  if (raw?.status !== 0 || !Array.isArray(raw.data?.itemList)) throw new AppError('UPSTREAM_FAILED', '飞猪未返回有效的住宿查询结果', 502);
  const selected=selectStayHotels(raw.data.itemList.slice(0,100),query);
  return { provider: '飞猪 FlyAI', checkedAt: new Date().toISOString(), query,
    scope: '按日期查询酒店/民宿及平台返回报价；未返回的房型库存、设施和取消政策须在预订页面确认',
    candidateCount:selected.candidateCount,ratingUnavailable:selected.ratingUnavailable,
    hotels: selected.hotels.map((hotel) => ({
      name: String(hotel.name || '未命名住宿').slice(0, 120), address: String(hotel.address || '').slice(0, 250),
      price: hotel.price === undefined || hotel.price === null || hotel.price === '' ? null : String(hotel.price).slice(0, 40),
      score:hotel.score,hotelType:hotel.hotelType,brandName:hotel.brandName,
      latitude: Number.isFinite(Number(hotel.latitude)) && hotel.latitude !== null ? Number(hotel.latitude) : null,
      longitude: Number.isFinite(Number(hotel.longitude)) && hotel.longitude !== null ? Number(hotel.longitude) : null,
      url: safeUrl(hotel.detailUrl || hotel.jumpUrl),
      // A search hit is not an inventory guarantee; absent fields remain unknown.
      roomInventory: null,
    })),
  };
}

export function createProviders(config, fetcher = fetch, runFile = execFile, { signal, onMetric = () => {} } = {}) {
  const request = (url, options = {}) => {
    signal?.throwIfAborted();
    return fetcher(url, { ...options, ...(signal ? { signal: options.signal ? AbortSignal.any([signal, options.signal]) : signal } : {}) });
  };
  const metrics = (operation, started, status, usage) => onMetric({ operation, durationMs: Date.now()-started, status, ...(usage ? { usage: { promptTokens: usage.prompt_tokens ?? null, completionTokens: usage.completion_tokens ?? null, totalTokens: usage.total_tokens ?? null } } : {}) });
  const json = (value) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  const silicon = async (service, path, body, timeoutMs = 45000) => {
    const options = json(body); options.headers.Authorization = `Bearer ${requireValue(service.key, '硅基流动')}`; options.signal = AbortSignal.timeout(timeoutMs);
    return upstream('硅基流动', `${service.base}/${path}`, options, request);
  };
  const providers = {
    async generateStream(messages, { onDelta = () => {}, timeoutMs = 30000, maxTokens = 650, temperature = 0 } = {}) {
      const started = Date.now(); let usage;
      try {
        const options = json({ model: config.llm.model, messages, temperature, max_tokens: maxTokens, enable_thinking: false, stream: true, stream_options: { include_usage: true } });
        options.headers.Authorization = `Bearer ${requireValue(config.llm.key, '硅基流动')}`;
        options.signal = AbortSignal.timeout(timeoutMs);
        const response = await request(`${config.llm.base}/chat/completions`, options);
        if (!response.ok) throw new AppError('UPSTREAM_FAILED', '问答服务暂时不可用', 502);
        const result = await readModelStream(response, onDelta); usage = result.usage;
        metrics('generate_stream', started, 'completed', usage); return result.content;
      } catch (error) { metrics('generate_stream', started, signal?.aborted ? 'cancelled' : 'failed', usage); throw error; }
    },
    async generate(messages, { structured = false, timeoutMs = 12000 } = {}) {
      const started=Date.now();let usage;
      try {
      const body = await silicon(config.llm, 'chat/completions', { model: config.llm.model, messages, temperature: 0, max_tokens: structured ? 220 : 650, enable_thinking: false, ...(structured ? { response_format: { type: 'json_object' } } : {}) }, timeoutMs);
      usage=body.usage;
      const choice = body.choices?.[0];
      if (!choice?.message?.content || choice.finish_reason === 'length') throw new AppError('UPSTREAM_FAILED', '模型未返回完整答复', 502);
      metrics('generate',started,'completed',usage);return choice.message.content;
      } catch(error) { metrics('generate',started,signal?.aborted?'cancelled':'failed',usage);throw error; }
    },
    async embed(texts, { signal: embeddingSignal } = {}) {
      if(embeddingSignal && embeddingSignal!==signal) return createProviders(config,fetcher,runFile,{signal:signal?AbortSignal.any([signal,embeddingSignal]):embeddingSignal,onMetric}).embed(texts);
      const started=Date.now();let usage;
      try {
      const body = await silicon(config.embedding, 'embeddings', { model: config.embedding.model, input: texts, encoding_format: 'float' });
      usage=body.usage;
      const data = body.data?.slice().sort((a,b) => a.index-b.index);
      if (data?.length !== texts.length || data.some((item) => !Array.isArray(item.embedding) || !item.embedding.length || item.embedding.some((n) => !Number.isFinite(n)))) throw new AppError('UPSTREAM_FAILED', '向量服务未返回有效向量', 502);
      metrics('embed',started,'completed',usage);return data.map((item) => item.embedding);
      } catch(error) { metrics('embed',started,signal?.aborted?'cancelled':'failed',usage);throw error; }
    },
    async search(query) {
      textField(query, '搜索内容');
      const options = json({ query, freshness: 'noLimit', summary: true, count: 5 });
      options.headers.Authorization = `Bearer ${requireValue(config.bocha.key, '联网搜索')}`;
      const body = await upstream('博查', `${config.bocha.base}/v1/web-search`, options, request);
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
      const daily = await upstream('和风天气', `${base}/daily/${place.lat}/${place.lon}?days=7&localTime=true&lang=zh`, options, request);
      const days = daily.days?.map((day) => ({ date: day.forecastStartTime?.slice(0,10), code: Number(day.daytime?.condition?.code), text: day.daytime?.condition?.text, min: day.temperatureMin?.value, max: day.temperatureMax?.value, rain: Math.round(Math.max(day.daytime?.precipitation?.probability || 0, day.nighttime?.precipitation?.probability || 0)*100) }));
      if (!days?.length || days[0].date !== today() || days.some((day) => !Number.isFinite(day.min) || !Number.isFinite(day.max) || !day.text)) throw new AppError('UPSTREAM_FAILED', '天气预报不完整或已过期', 502);
      let current = null, modelTime = null;
      try { const now = await upstream('和风天气', `${base}/current/${place.lat}/${place.lon}?localTime=true&lang=zh`, options, request); current = Number.isFinite(now.temperature?.value) ? now.temperature.value : null; modelTime = now.obsTime || now.validTime || modelTime; } catch { signal?.throwIfAborted(); /* Daily forecast remains usable when current conditions fail. */ }
      return { provider: '和风天气', sourceUrl:'https://developer.qweather.com/attribution.html', location: place.name, fetchedAt: Date.now(), modelTime, current, days };
    },
    async places(keywords, city = '320117') {
      textField(keywords,'地点关键词',120);
      if (typeof city !== 'string' || city.length > 40 || city && !/^[\p{Script=Han}\d\s]+$/u.test(city)) throw new AppError('INVALID_INPUT','查询范围请填写城市、区县或编码，也可留空搜索全国');
      const url = new URL('https://restapi.amap.com/v3/place/text');
      // City/ad codes are returned only with all; transit needs the actual cities.
      url.search = new URLSearchParams({ key: requireValue(config.amapKey,'高德地图'), keywords, ...(city ? { city, citylimit:'true' } : { citylimit:'false' }), offset:'5',page:'1',extensions:'all' });
      const body = await upstream('高德地图',url,{},request);
      if (body.status !== '1' || !Array.isArray(body.pois)) throw new AppError('UPSTREAM_FAILED','高德地点查询未返回有效结果',502);
      return { provider:'高德地图', checkedAt:new Date().toISOString(), places:body.pois.map((poi) => ({id:poi.id,name:poi.name,address:typeof poi.address === 'string' ? poi.address : '',location:poi.location,citycode:typeof poi.citycode === 'string' ? poi.citycode : '',adcode:poi.adcode,region:[poi.pname,poi.cityname,poi.adname].filter((name) => typeof name === 'string' && name).join(' · '),url:`https://uri.amap.com/marker?${new URLSearchParams({position:poi.location,name:poi.name})}`})) };
    },
    async route(origin, destination, mode = 'walking', cities = {}) {
      const validPoint = (value) => /^\d{1,3}(?:\.\d{1,6})?,\d{1,2}(?:\.\d{1,6})?$/.test(value || '') && Number(value.split(',')[0]) <= 180 && Number(value.split(',')[1]) <= 90;
      if (!validPoint(origin) || !validPoint(destination) || !['walking','driving','transit'].includes(mode)) throw new AppError('INVALID_INPUT','请提供有效坐标和出行方式');
      const url = new URL(`https://restapi.amap.com/v3/direction/${mode === 'transit' ? 'transit/integrated' : mode}`);
      const key = requireValue(config.amapKey,'高德路线'), parameters = { key, origin, destination, extensions:'base',strategy:'0' };
      if (mode === 'transit') {
        const cityOf = async (location, supplied) => {
          if (typeof supplied === 'string' && /^\d{3,4}$/.test(supplied)) return supplied;
          const lookup = new URL('https://restapi.amap.com/v3/geocode/regeo');
          lookup.search = new URLSearchParams({ key, location, extensions:'base' });
          const raw = await upstream('高德城市查询',lookup,{},request), code = raw.regeocode?.addressComponent?.citycode;
          if (raw.status !== '1' || typeof code !== 'string' || !/^\d{3,4}$/.test(code)) throw new AppError('UPSTREAM_FAILED','地点所属城市尚未确认，请重新查地点后查询公交路线',502);
          return code;
        };
        const [city, cityd] = await Promise.all([cityOf(origin,cities.originCity),cityOf(destination,cities.destinationCity)]);
        Object.assign(parameters,{city,cityd});
      }
      url.search = new URLSearchParams(parameters);
      const body = await upstream('高德路线',url,{},request);
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
      const body = await upstream('百度翻译','https://fanyi-api.baidu.com/api/trans/vip/translate',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({q,from,to,appid,salt,sign})},request);
      if (body.error_code || !body.trans_result?.length) throw new AppError('UPSTREAM_FAILED','百度翻译暂未返回有效译文',502);
      return {provider:'百度翻译',from:body.from,to:body.to,content:body.trans_result.map((item) => item.dst).join('\n')};
    },
    async stays(query) {
      const key = requireValue(config.stay.key,'飞猪住宿');
      const destName = textField(query.destName || '南京市溧水区','住宿目的地',80);
      const dateRange = dates(query.checkInDate,query.checkOutDate);
      if (query.maxPrice !== undefined && (!Number.isFinite(query.maxPrice) || query.maxPrice < 1 || query.maxPrice > 100000)) throw new AppError('INVALID_INPUT','住宿预算格式不正确');
      const hotelPreference=normalizeStaySearch(query),keywords=stayQueryKeyword(destName,hotelPreference);
      const args = ['search-hotels','--dest-name',destName,'--check-in-date',dateRange.checkInDate,'--check-out-date',dateRange.checkOutDate,'--sort',stayProviderSort(hotelPreference)];
      if(keywords)args.push('--key-words',keywords);
      if (query.maxPrice !== undefined) args.push('--max-price',String(query.maxPrice));
      if (query.poiName) args.push('--poi-name',textField(query.poiName,'附近景点',80));
      if (query.hotelTypes) { if (!['酒店','民宿','客栈'].includes(query.hotelTypes)) throw new AppError('INVALID_INPUT','住宿类型不正确'); args.push('--hotel-types',query.hotelTypes); }
      const cli = fileURLToPath(new URL('./flyai-runner.cjs',import.meta.url));
      // Official CLI supplies FlyAI's required client signature. Fixed executable,
      // separate argument array, no shell; credentials are never process arguments.
      const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'].filter((name) => process.env[name]).map((name) => [name,process.env[name]]));
      Object.assign(env,{FLYAI_API_KEY:key,DEBUG_FLYAI_MCP_URL:config.stay.base,FLYAI_JSON:'1'});
      signal?.throwIfAborted();
      const raw = await new Promise((resolve,reject) => runFile(process.execPath,[cli,...args],{env,timeout:55000,maxBuffer:2*1024*1024,windowsHide:true,signal},(error,stdout) => {
        if (error) return reject(new AppError('UPSTREAM_FAILED','飞猪住宿暂时无法查询，请稍后重试',502));
        try { resolve(JSON.parse(stdout)); } catch { reject(new AppError('UPSTREAM_FAILED','飞猪住宿响应格式异常',502)); }
      }));
      return normalizeHotels(raw,{destName,...dateRange,hotelPreference,...(query.maxPrice ? {maxPrice:query.maxPrice} : {})});
    },
  };
  for(const operation of ['search','weather','places','route','translate','stays']) {
    const work=providers[operation];
    providers[operation]=async(...args)=>{const started=Date.now();try{signal?.throwIfAborted();const result=await work(...args);signal?.throwIfAborted();metrics(operation,started,'completed');return result;}catch(error){metrics(operation,started,signal?.aborted?'cancelled':'failed');throw error;}};
  }
  providers.withRuntime=(runtime)=>createProviders(config,fetcher,runFile,runtime);
  return providers;
}
