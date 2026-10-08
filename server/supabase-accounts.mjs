import { AppError } from './core.mjs';
export function createSupabaseAccounts(config,fetcher=fetch) {
  async function request(path,{token,body,method='GET',prefer}={}) {
    if(!config.configured)throw new AppError('ACCOUNT_NOT_CONFIGURED','账号服务尚未完成配置，请稍后再试。',503);
    let response;
    try{response=await fetcher(config.url+path,{method,redirect:'error',signal:AbortSignal.timeout(12000),headers:{apikey:config.key,...token?{Authorization:`Bearer ${token}`}:{},...body?{'Content-Type':'application/json'}:{},...prefer?{Prefer:prefer}:{}},...body?{body:JSON.stringify(body)}:{}});}
    catch{throw new AppError('ACCOUNT_UPSTREAM','账号服务暂时无法连接，请稍后重试。',503);}
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      if(response.status===429)throw new AppError('ACCOUNT_RATE_LIMIT','操作较频繁，请稍后重试。',429);
      if(data?.error_code==='user_already_exists'||data?.code==='user_already_exists')throw new AppError('ACCOUNT_EXISTS','这个邮箱已经注册，请直接登录。',400);
      if(data?.code==='23514'&&/account card limit reached/.test(data?.message||''))throw new AppError('CARD_LIMIT','账号最多保留50张行程卡，可以载入已有卡片继续编辑和更新。',400);
      if(data?.error_code==='email_not_confirmed'||data?.code==='email_not_confirmed')throw new AppError('EMAIL_UNCONFIRMED','请先到邮箱完成注册确认，再登录。',403);
      if(response.status===401||response.status===403||data?.error_code==='invalid_credentials'||data?.code==='invalid_credentials')throw new AppError('ACCOUNT_UNAUTHORIZED','邮箱或密码不正确，或登录已过期。',401);
      if(response.status===400||response.status===422)throw new AppError('ACCOUNT_INVALID',path.startsWith('/rest/')?'行程未能保存，请检查卡片名称和行程内容。':'暂时无法完成操作，请检查邮箱和密码。',400);
      throw new AppError('ACCOUNT_UPSTREAM','账号或行程保存服务暂时未准备好，请稍后重试。',503);
    }
    return data;
  }
  const cardQuery=(userId,id,extra='')=>`/rest/v1/itinerary_cards?user_id=eq.${userId}${id?'&id=eq.'+id:''}${extra}`;
  return {
    configured:config.configured,secure:config.secure,
    signup:(email,password,redirect)=>request('/auth/v1/signup?redirect_to='+encodeURIComponent(redirect),{method:'POST',body:{email,password}}),
    login:(email,password)=>request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}),
    user:token=>request('/auth/v1/user',{token}),
    logout:token=>request('/auth/v1/logout?scope=local',{token,method:'POST'}),
    list:(token,userId,trash)=>request(cardQuery(userId,null,`&deleted_at=${trash?'not.is.null':'is.null'}&select=id,title,created_at,updated_at,deleted_at&order=updated_at.desc&limit=50`),{token}),
    get:(token,userId,id)=>request(cardQuery(userId,id,'&select=id,title,plan,created_at,updated_at,deleted_at'),{token}),
    create:(token,card)=>request('/rest/v1/itinerary_cards',{method:'POST',token,body:card,prefer:'return=representation'}),
    update:(token,userId,id,revision,patch)=>request(cardQuery(userId,id,'&updated_at=eq.'+encodeURIComponent(revision)),{method:'PATCH',token,body:patch,prefer:'return=representation'}),
  };
}
