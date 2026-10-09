import { randomUUID, createHash } from 'node:crypto';
import { AppError, clientAddress, textField, safeUrl } from './core.mjs';
import { normalizePlan } from '../src/data/itinerary.js';
import { normalizeUsername, validUsername, passwordPattern, passwordHint } from '../src/services/accountCredentials.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const tokenPattern=/^[A-Za-z0-9._-]{10,4000}$/;
const cookieNames=secure=>secure?['__Host-lishui_access','__Host-lishui_refresh']:['lishui_access','lishui_refresh'];
function cookies(req,names){const values=new Map(String(req.headers.cookie||'').split(';').map(part=>{const i=part.indexOf('=');return[part.slice(0,i).trim(),part.slice(i+1)];}));return names.map(name=>{const value=values.get(name);return tokenPattern.test(value||'')?value:undefined;});}
export function createAccountApi(provider,config,{now=Date.now}={}) {
  const names=cookieNames(provider.secure),limits=new Map();let active=0;
  function setCookies(res,session){
    const base=`; Path=/; HttpOnly; SameSite=Lax${provider.secure?'; Secure':''}`;
    if(!session){res.setHeader('Set-Cookie',names.map(name=>`${name}=; Max-Age=0${base}`));return;}
    if(!tokenPattern.test(session.access_token||''))throw new AppError('ACCOUNT_UPSTREAM','登录服务未返回有效会话。',503);
    res.setHeader('Set-Cookie',[`${names[0]}=${session.access_token}; Max-Age=${Math.max(1,Math.min(3600,Number(session.expires_in)||3600))}${base}`,`${names[1]}=; Max-Age=0${base}`]);
  }
  const publicUser=user=>{if(!uuid.test(user?.id||'')||typeof user.email!=='string')throw new AppError('ACCOUNT_UNAUTHORIZED','登录状态失效，请重新登录。',401);const username=user.user_metadata?.username;return validUsername(username)?{id:user.id,username:normalizeUsername(username)}:{id:user.id,email:user.email,username:user.email};};
  async function session(req,res){
    const [access]=cookies(req,names);
    if(access){try{return{token:access,user:publicUser(await provider.user(access))};}catch(error){if(error.status!==401&&error.status!==403)throw error;}}
    setCookies(res,null);return null;
  }
  async function body(req){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>24000)throw new AppError('BODY_TOO_LARGE','请求过长',413);parts.push(part);}let value;try{value=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw new AppError('INVALID_INPUT','请发送有效JSON');}if(!value||typeof value!=='object'||Array.isArray(value))throw new AppError('INVALID_INPUT','请求格式不正确');return value;}
  return async function account(req,res,url){
    if(!url.pathname.startsWith('/api/account/'))return false;
    const send=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value));return true;};
    if(req.headers.origin)res.setHeader('Access-Control-Allow-Credentials','true');
    if(!['GET','POST'].includes(req.method))throw new AppError('METHOD_NOT_ALLOWED','该操作方法不受支持',405);
    if(req.method==='POST'&&(!req.headers.origin||!config.origins.includes(req.headers.origin)))throw new AppError('ORIGIN_DENIED','请从本站页面执行账号操作',403);
    const ip=clientAddress(req,config.trustLoopbackProxy),time=now(),isAuth=/\/(?:signup|login)$/.test(url.pathname),windowMs=isAuth?900000:60000;
    for(const [key,limit]of limits)if(time-limit.start>900000)limits.delete(key);
    const key=(isAuth?'auth:':'account:')+ip,limit=limits.get(key);
    const count=limit&&time-limit.start<windowMs?{...limit,count:limit.count+1}:{start:time,count:1};limits.set(key,count);
    if(count.count>(isAuth?12:90)||active>=4)throw new AppError('RATE_LIMITED','操作较频繁，请稍后重试',429);
    if(req.method==='GET'&&url.pathname==='/api/account/session'&&!provider.configured)return send(200,{configured:false,user:null});
    if(!provider.configured)throw new AppError('ACCOUNT_NOT_CONFIGURED','账号服务尚未完成配置，请稍后再试。',503);
    active++;
    try{
      if(req.method==='POST'&&!String(req.headers['content-type']||'').startsWith('application/json'))throw new AppError('INVALID_INPUT','请发送JSON',415);
      const input=req.method==='POST'?await body(req):{};
      if(req.method==='POST'&&['/api/account/signup','/api/account/login'].includes(url.pathname)){
        const signup=url.pathname.endsWith('/signup');
        const identifier=textField(input.username??input.email,'用户名',254);
        // 旧邮箱账号只保留登录兼容，归属ID不变；新账号以规范用户名的唯一映射认证。
        const legacy=!signup&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        if(!legacy&&!validUsername(identifier))throw new AppError('INVALID_INPUT','用户名请使用3–24位中文、字母、数字、下划线或短横线。');
        const username=legacy?null:normalizeUsername(identifier);
        const email=legacy?identifier.toLowerCase():createHash('sha256').update(username).digest('hex')+'@users.lsguide.cn';
        if(typeof input.password!=='string'||(legacy?(input.password.length<8||input.password.length>128):!passwordPattern.test(input.password)))throw new AppError('INVALID_INPUT',legacy?'密码不正确，请重新输入。':passwordHint);
        const result=signup?await provider.signup(email,input.password,req.headers.origin+'/login',username):await provider.login(email,input.password);
        if(!result?.access_token)throw new AppError('ACCOUNT_CONFIG_MISMATCH','注册暂未完成，请联系管理员检查账号配置。',503);
        const user=publicUser(await provider.user(result.access_token));setCookies(res,result);return send(200,{user,confirmationRequired:false});
      }
      if(req.method==='POST'&&url.pathname==='/api/account/logout'){
        let revoked=true;
        try{const auth=await session(req,res);if(auth)await provider.logout(auth.token);}catch{revoked=false;}finally{setCookies(res,null);}
        return send(200,{user:null,revoked});
      }
      const auth=await session(req,res);
      if(req.method==='GET'&&url.pathname==='/api/account/session')return send(200,{configured:true,user:auth?.user||null});
      if(!auth)throw new AppError('ACCOUNT_UNAUTHORIZED','请先登录，再保存或读取账号行程。',401);
      if(req.method==='GET'&&url.pathname==='/api/account/cards')return send(200,{cards:await provider.list(auth.token,auth.user.id,url.searchParams.get('trash')==='true')});
      const match=url.pathname.match(/^\/api\/account\/cards\/([^/]+)(?:\/(trash|restore))?$/);
      if(match&&!uuid.test(match[1]))throw new AppError('INVALID_INPUT','行程卡编号格式不正确');
      const existing=match?(await provider.get(auth.token,auth.user.id,match[1]))?.[0]:null;
      if(match&&!existing)throw new AppError('NOT_FOUND','未找到这张账号行程卡。',404);
      if(match&&req.method==='GET'&&!match[2])return send(200,{card:existing});
      if(req.method==='POST'&&(url.pathname==='/api/account/cards'||match)){
        let patch;
        if(match?.[2])patch={deleted_at:match[2]==='trash'?new Date(time).toISOString():null};
        else{
          if(!input.plan||input.plan.version!==2)throw new AppError('INVALID_INPUT','行程格式不正确');
          const raw={...input.plan,routes:input.plan.routes?Object.fromEntries(Object.entries(input.plan.routes).filter(([key])=>!['__proto__','constructor','prototype'].includes(key))):{}};
          const plan=normalizePlan(raw);
          if(plan.weather)plan.weather.sourceUrl=safeUrl(plan.weather.sourceUrl)||'';
          if(Buffer.byteLength(JSON.stringify(plan))>22000)throw new AppError('BODY_TOO_LARGE','行程较长，请减少备注后再保存。',413);
          const title=textField(input.title,'行程名称',80);patch={title,plan};
        }
        let rows;
        if(match){const revision=textField(input.revision,'行程版本',40);if(!Number.isFinite(Date.parse(revision)))throw new AppError('INVALID_INPUT','行程版本格式不正确');rows=await provider.update(auth.token,auth.user.id,match[1],revision,patch);if(!rows?.length)throw new AppError('CARD_CONFLICT','这张卡已在其他页面更新，请重新载入后再保存。',409);}
        else rows=await provider.create(auth.token,{id:randomUUID(),user_id:auth.user.id,...patch});
        if(!rows?.[0])throw new AppError('ACCOUNT_UPSTREAM','保存未得到确认，请重新查看账号中的行程。',503);
        return send(match?200:201,{card:rows[0]});
      }
      throw new AppError('NOT_FOUND','账号操作不存在',404);
    }finally{active--;}
  };
}
