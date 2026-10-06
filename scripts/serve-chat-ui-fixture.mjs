// Local UI fault-injection fixture; never used by dev:api or production.
// No private credentials, external services or remote-server changes.
import { setTimeout as delay } from 'node:timers/promises';
import { createApi } from '../server/index.mjs';
import { getConfig, today } from '../server/core.mjs';

const mode=process.argv.find((arg)=>arg.startsWith('--mode='))?.split('=')[1];
if(!['success','failure','slow','timeout'].includes(mode)) throw new Error('Choose --mode=success|failure|slow|timeout');
const config={...getConfig({}),port:8787,chatTimeoutMs:mode==='timeout'?1000:90000};
const providers={withRuntime:({signal})=>({
  weather:async()=>{
    await delay(mode==='slow'?20000:mode==='timeout'?3000:mode==='failure'?2500:100,undefined,{signal});
    if(mode==='failure') throw new Error('Controlled weather failure');
    return {provider:'本地故障验收（模拟天气）',sourceUrl:'https://example.org/test-weather',location:'溧水城区',fetchedAt:Date.now(),days:[{date:today(),text:'晴',min:18,max:26,rain:0}]};
  },
  generate:async()=>{await delay(200,undefined,{signal});return '已保留求助指引；未完成的天气查询请稍后重试。';},
})};
const knowledge={chunks:[],status:()=>({ready:true,chunks:0}),retrieve:async()=>[]};
const server=createApi({config,providers,knowledge});
server.listen(config.port,config.host,()=>console.log(`Local UI fixture: ${mode}; ${config.host}:${config.port}`));
for(const event of ['SIGTERM','SIGINT'])process.on(event,()=>{server.closeAllConnections();server.close();});
