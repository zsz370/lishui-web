import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getConfig, AppError, textField, clientAddress } from './core.mjs';
import { createProviders } from './providers.mjs';
import { createKnowledge } from './knowledge.mjs';
import { createChat, validateChat } from './chat.mjs';
import { agentPlans } from '../config/agent-system.plan.js';
import { personas } from '../src/data/personas.js';
import { accountConfig } from './accounts-config.mjs';
import { createSupabaseAccounts } from './supabase-accounts.mjs';
import { createAccountApi } from './account-api.mjs';

export function createApi({config,providers,knowledge,accounts,log=console.log}) {
  const limits=new Map(); let inflight=0;
  const handleAccount=createAccountApi(accounts||{configured:false,secure:true},config);
  const readiness=()=>({ready:knowledge.status().ready&&!!config.llm.key,index:knowledge.status(),llm:{provider:'SiliconFlow',model:config.llm.model,configured:!!config.llm.key},tools:{webSearch:!!config.bocha.key,weather:!!config.weather.key&&!!config.weather.host,map:!!config.amapKey,translation:!!config.baidu.appId&&!!config.baidu.secret,stays:!!config.stay.key}});
  return createServer(async(req,res)=>{
    const requestId=randomUUID(),started=Date.now();res.setHeader('X-Request-Id',requestId);res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    let counted=false, streaming=false, deadline, heartbeat;
    const controller=new AbortController();
    req.on('aborted',()=>controller.abort());
    res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
    const event=(type,data)=>{if(!res.destroyed&&!res.writableEnded)res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);};
    try {
      const origin=req.headers.origin;
      if(origin&&!config.origins.includes(origin)) throw new AppError('ORIGIN_DENIED','该网页来源未获允许',403);
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
      const url=new URL(req.url,'http://127.0.0.1');
      if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return send(204,{});}
      if(await handleAccount(req,res,url))return;
      if(req.method==='GET'&&url.pathname==='/health') return send(200,{status:'ok'});
      if(req.method==='GET'&&url.pathname==='/ready'){const status=readiness();return send(status.ready?200:503,status);}
      if(req.method==='GET'&&['/api/guide','/api/agents'].includes(url.pathname)) return send(200,{agents:agentPlans.map((agent)=>({...agent,...personas.find((persona)=>persona.id===agent.id),tools:['knowledge_retrieval',...agent.tools],approvedQA:knowledge.chunks.filter((chunk)=>chunk.expertId===agent.id).length})),architecture:'single-guide',status:readiness()});
      const allowed=['/api/chat','/api/chat/stream','/api/weather','/api/stays','/api/translate','/api/places','/api/route'];
      if(!allowed.includes(url.pathname)) throw new AppError('NOT_FOUND','接口不存在',404);
      if(req.method!=='POST') throw new AppError('METHOD_NOT_ALLOWED','请使用POST请求',405);
      if(!String(req.headers['content-type']||'').startsWith('application/json')) throw new AppError('INVALID_INPUT','请发送JSON',415);
      const ip=clientAddress(req,config.trustLoopbackProxy),now=Date.now();
      for(const[key,value]of limits) if(now-value.start>60000) limits.delete(key);
      const limit=limits.get(ip)||{start:now,count:0};limit.count++;limits.set(ip,limit);
      if(limit.count>(config.rateLimit||20)||inflight>=(config.maxInflight||4)) throw new AppError('RATE_LIMITED','查询较频繁，请稍后重试',429);
      let bytes=0;const bodyChunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>24000) throw new AppError('BODY_TOO_LARGE','请求过长',413);bodyChunks.push(chunk);}
      const body=Buffer.concat(bodyChunks).toString('utf8');
      let input;try{input=JSON.parse(body);}catch{throw new AppError('INVALID_INPUT','JSON格式不正确');}
      if(!input||typeof input!=='object'||Array.isArray(input)) throw new AppError('INVALID_INPUT','请求格式不正确');
      inflight++;counted=true;
      const metrics=[];
      const runtime={signal:controller.signal,onMetric:(metric)=>metrics.push(metric)};
      const activeProviders=providers.withRuntime?.(runtime)||providers;
      const chat=createChat(activeProviders,knowledge);
      deadline=setTimeout(()=>controller.abort(new DOMException('查询超时','TimeoutError')),config.chatTimeoutMs||90000);deadline.unref();
      let result;
      if(url.pathname==='/api/chat/stream') {
        const valid=validateChat(input);
        streaming=true;res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('X-Accel-Buffering','no');res.flushHeaders();
        event('ready',{requestId,startedAt:new Date().toISOString()});
        heartbeat=setInterval(()=>{if(!res.destroyed&&!res.writableEnded)res.write(': keepalive\n\n');},10000);heartbeat.unref();
        result=await chat(valid,{...runtime,onProgress:(entry)=>event('progress',entry),onAnswer:(entry)=>event('answer',entry)});
      }
      else if(url.pathname==='/api/chat') result=await chat(validateChat(input),runtime);
      else if(url.pathname==='/api/weather') result=await activeProviders.weather(textField(input.location||'lishui','地点',20));
      else if(url.pathname==='/api/stays') result=await activeProviders.stays(input);
      else if(url.pathname==='/api/translate') result=await activeProviders.translate(input.q,input.to,input.from);
      else if(url.pathname==='/api/places') result=await activeProviders.places(input.keywords,input.city);
      else result=await activeProviders.route(input.origin,input.destination,input.mode,{originCity:input.originCity,destinationCity:input.destinationCity});
      controller.signal.throwIfAborted();
      const payload={...result,diagnostics:{requestId,durationMs:Date.now()-started,operations:metrics}};
      if(streaming){event('result',payload);res.end();}else send(200,payload);
    } catch(error) {
      if(res.destroyed) return;
      const timeout=controller.signal.reason?.name==='TimeoutError';
      const payload={error:{code:timeout?'TIMEOUT':error instanceof AppError?error.code:'INTERNAL_ERROR',message:timeout?'查询超时，请稍后重试。':error instanceof AppError?error.message:'服务暂时无法完成查询',requestId}};
      if(streaming){event('error',payload);res.end();}else send(timeout?504:error instanceof AppError?error.status:500,payload);
    }
    finally {clearTimeout(deadline);clearInterval(heartbeat);if(counted)inflight--;log(JSON.stringify({requestId,method:req.method,path:(req.url||'').split('?')[0],status:res.statusCode,durationMs:Date.now()-started,cancelled:controller.signal.aborted}));}
  });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const config=getConfig(),providers=createProviders(config),knowledge=await createKnowledge(providers,config.embedding.model);
  const accounts=createSupabaseAccounts(accountConfig());
  const server=createApi({config,providers,knowledge,accounts});
  server.requestTimeout=10000;server.headersTimeout=10000;
  server.listen(config.port,config.host,()=>console.log(`文旅 API 已启动：http://${config.host}:${config.port}；索引${knowledge.status().ready?'可用':'未就绪'}`));
  for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),6000).unref();});
}
