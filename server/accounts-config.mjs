import { readFileSync } from 'node:fs';
export function accountConfig(env=process.env) {
  const values={};
  try { for(const line of readFileSync(new URL('../config/accounts.env.local',import.meta.url),'utf8').split(/\r?\n/)) {
    const match=line.match(/^\s*(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|ACCOUNT_COOKIE_SECURE)\s*=\s*(.*?)\s*$/);
    if(match)values[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');
  }} catch(error) {if(error.code!=='ENOENT')throw error;}
  for(const key of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','ACCOUNT_COOKIE_SECURE'])if(env[key]!==undefined)values[key]=env[key];
  const url=values.SUPABASE_URL||'',key=values.SUPABASE_PUBLISHABLE_KEY||'';
  if(Boolean(url)!==Boolean(key))throw Error('Supabase账号配置不完整');
  if(url){const parsed=new URL(url);if(parsed.protocol!=='https:'||!/^[a-z0-9]{10,64}\.supabase\.co$/.test(parsed.hostname)||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw Error('Supabase项目地址格式不正确');}
  if(key){
    let legacyRole;try{legacyRole=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role;}catch{}
    if(!/^sb_publishable_[A-Za-z0-9_-]{20,200}$/.test(key)&&legacyRole!=='anon')throw Error('账号接口只接受publishable/anon key，不使用service_role');
  }
  if(values.ACCOUNT_COOKIE_SECURE&&!['true','false'].includes(values.ACCOUNT_COOKIE_SECURE))throw Error('ACCOUNT_COOKIE_SECURE格式不正确');
  return {configured:Boolean(url&&key),url:url.replace(/\/$/,''),key,secure:values.ACCOUNT_COOKIE_SECURE!=='false'};
}
