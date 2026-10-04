import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getConfig, AppError, textField } from './core.mjs';
import { createProviders } from './providers.mjs';
import { createKnowledge } from './knowledge.mjs';
import { createChat, validateChat } from './chat.mjs';
import { agentPlans, departmentPlans } from '../config/agent-system.plan.js';
import { personas } from '../src/data/personas.js';

export function createApi({config,providers,knowledge,log=console.log}) {
  const chat=createChat(providers,knowledge), limits=new Map(); let inflight=0;
  const readiness=()=>({ready:knowledge.status().ready&&!!config.llm.key,index:knowledge.status(),llm:{provider:'SiliconFlow',model:config.llm.model,configured:!!config.llm.key},tools:{webSearch:!!config.bocha.key,weather:!!config.weather.key&&!!config.weather.host,map:!!config.amapKey,translation:!!config.baidu.appId&&!!config.baidu.secret,stays:!!config.stay.key}});
  return createServer(async(req,res)=>{
    const requestId=randomUUID(),started=Date.now();res.setHeader('X-Request-Id',requestId);res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    let counted=false;
    const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
    try {
      const origin=req.headers.origin;
      if(origin&&!config.origins.includes(origin)) throw new AppError('ORIGIN_DENIED','该网页来源未获允许',403);
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
      const url=new URL(req.url,'http://127.0.0.1');
      if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return send(204,{});}
      if(req.method==='GET'&&url.pathname==='/health') return send(200,{status:'ok'});
      if(req.method==='GET'&&url.pathname==='/ready'){const status=readiness();return send(status.ready?200:503,status);}
      if(req.method==='GET'&&url.pathname==='/api/agents') return send(200,{agents:agentPlans.map((agent)=>({...agent,...personas.find((persona)=>persona.id===agent.id),tools:['knowledge_retrieval',...agent.tools],approvedQA:knowledge.chunks.filter((chunk)=>chunk.expertId===agent.id).length})),departments:departmentPlans,status:readiness()});
      const allowed=['/api/chat','/api/weather','/api/stays','/api/translate','/api/places','/api/route'];
      if(!allowed.includes(url.pathname)) throw new AppError('NOT_FOUND','接口不存在',404);
      if(req.method!=='POST') throw new AppError('METHOD_NOT_ALLOWED','请使用POST请求',405);
      if(!String(req.headers['content-type']||'').startsWith('application/json')) throw new AppError('INVALID_INPUT','请发送JSON',415);
      const ip=req.socket.remoteAddress,now=Date.now();
      for(const[key,value]of limits) if(now-value.start>60000) limits.delete(key);
      const limit=limits.get(ip)||{start:now,count:0};limit.count++;limits.set(ip,limit);
      if(limit.count>20||inflight>=4) throw new AppError('RATE_LIMITED','查询较频繁，请稍后重试',429);
      let bytes=0;const bodyChunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>24000) throw new AppError('BODY_TOO_LARGE','请求过长',413);bodyChunks.push(chunk);}
      const body=Buffer.concat(bodyChunks).toString('utf8');
      let input;try{input=JSON.parse(body);}catch{throw new AppError('INVALID_INPUT','JSON格式不正确');}
      if(!input||typeof input!=='object'||Array.isArray(input)) throw new AppError('INVALID_INPUT','请求格式不正确');
      inflight++;counted=true;
      let result;
      if(url.pathname==='/api/chat') result=await chat(validateChat(input));
      else if(url.pathname==='/api/weather') result=await providers.weather(textField(input.location||'lishui','地点',20));
      else if(url.pathname==='/api/stays') result=await providers.stays(input);
      else if(url.pathname==='/api/translate') result=await providers.translate(input.q,input.to,input.from);
      else if(url.pathname==='/api/places') result=await providers.places(input.keywords,input.city);
      else result=await providers.route(input.origin,input.destination,input.mode);
      send(200,result);
    } catch(error) { send(error instanceof AppError?error.status:500,{error:{code:error instanceof AppError?error.code:'INTERNAL_ERROR',message:error instanceof AppError?error.message:'服务暂时无法完成查询',requestId}}); }
    finally {if(counted)inflight--;log(JSON.stringify({requestId,method:req.method,path:(req.url||'').split('?')[0],status:res.statusCode,durationMs:Date.now()-started}));}
  });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const config=getConfig(),providers=createProviders(config),knowledge=await createKnowledge(providers,config.embedding.model);
  const server=createApi({config,providers,knowledge});
  server.requestTimeout=10000;server.headersTimeout=10000;
  server.listen(config.port,config.host,()=>console.log(`文旅 API 已启动：http://${config.host}:${config.port}；索引${knowledge.status().ready?'可用':'未就绪'}`));
  for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),6000).unref();});
}
