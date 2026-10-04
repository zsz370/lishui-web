// Read-only probes; credentials, upstream error bodies and query URLs stay private.
import { mkdir, writeFile } from 'node:fs/promises';
import { getConfig, today, addDays } from '../server/core.mjs';
import { createProviders } from '../server/providers.mjs';
const config=getConfig(),providers=createProviders(config),live=process.argv.includes('--live'),results=[];
async function check(provider,configured,call,inspect) {
  if(!configured) return results.push({provider,status:'missing_configuration'});
  if(!live) return results.push({provider,status:'configured_not_tested'});
  const start=Date.now();
  try { const data=await call();results.push({provider,status:'passed',durationMs:Date.now()-start,...inspect(data)}); }
  catch(error){results.push({provider,status:'failed',durationMs:Date.now()-start,category:error.code||'network_or_response'});}
}
await check('bocha',config.bocha.key,()=>providers.search('溧水 天生桥 官方介绍'),(data)=>({resultCount:data.length}));
await check('amap_poi',config.amapKey,()=>providers.places('天生桥'),(data)=>({resultCount:data.places.length}));
await check('amap_route',config.amapKey,()=>providers.route('119.020000,31.650000','119.025000,31.655000','walking'),(data)=>({routeCount:data.paths.length}));
await check('baidu_translation',config.baidu.appId&&config.baidu.secret,()=>providers.translate('欢迎来到溧水','en','zh'),(data)=>({translated:!!data.content}));
await check('qweather',config.weather.key&&config.weather.host,()=>providers.weather(),(data)=>({forecastDays:data.days.length,currentConditionsAvailable:data.current!==null}));
await check('llm',config.llm.key,()=>providers.generate([{role:'user',content:'仅回复：接口正常。'}]),(data)=>({model:config.llm.model,nonempty:!!data}));
await check('embedding',config.embedding.key,()=>providers.embed(['溧水文旅知识检索']),(data)=>({model:config.embedding.model,dimensions:data[0].length}));
await check('stay_query',config.stay.key,()=>providers.stays({destName:'南京市溧水区',checkInDate:addDays(today(),1),checkOutDate:addDays(today(),2),maxPrice:300}),(data)=>({resultCount:data.hotels.length,withQuote:data.hotels.filter((hotel)=>hotel.price).length,roomInventoryReturned:false,scope:data.scope}));
const report={checkedAt:new Date().toISOString(),live,scope:'通过真实服务端适配器验证只读查询；搜索报价不保证客房库存',results};
const dir=new URL('../docs/agent-audit/',import.meta.url);await mkdir(dir,{recursive:true});
await writeFile(new URL(live?'integration-smoke.json':'integration-config-check.json',dir),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(live&&results.some((result)=>result.status!=='passed')) process.exitCode=1;
