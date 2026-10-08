import { offlineDemo } from './api.js';
export async function accountRequest(path,{body,signal}={}) {
  if(offlineDemo){if(path==='session')return{configured:false,user:null};throw Error('离线演示不能登录或保存到账号，可继续在本机编辑并导出。');}
  let response;
  try{response=await fetch('/api/account/'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},...body?{body:JSON.stringify(body)}:{},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});}
  catch(error){if(signal?.aborted)throw error;throw Error('暂时连接不上账号服务，请稍后重试。本机行程仍然保留。');}
  const data=await response.json().catch(()=>null);
  if(!response.ok){const error=Error(data?.error?.message||'账号操作没有完成，请稍后重试。');error.status=response.status;throw error;}
  if(!data||typeof data!=='object')throw Error('账号服务未返回有效结果，请稍后重试。');
  return data;
}
