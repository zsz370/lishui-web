import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { accountRequest } from '../services/account.js';
const Context=createContext(null);
export function AccountProvider({children}) {
  const [user,setUser]=useState(null),[status,setStatus]=useState('loading'),[configured,setConfigured]=useState(false),[error,setError]=useState('');
  const generation=useRef(0);
  const changed=()=>Object.assign(new Error('登录账号已变化，请重新操作。'),{code:'ACCOUNT_CHANGED'});
  const refresh=async()=>{const version=generation.current;setError('');try{const data=await accountRequest('session');if(version!==generation.current)throw changed();setUser(data.user);setConfigured(data.configured);setStatus('ready');return data;}catch(error){if(version===generation.current){setError(error.message);setStatus('error');}throw error;}};
  useEffect(()=>{let disposed=false;const controller=new AbortController(),version=generation.current;accountRequest('session',{signal:controller.signal}).then(data=>{if(!disposed&&version===generation.current){setUser(data.user);setConfigured(data.configured);setStatus('ready');}}).catch(error=>{if(!disposed&&version===generation.current){setStatus('error');setError(error.message);}});return()=>{disposed=true;controller.abort();};},[]);
  const authenticate=async(mode,username,password)=>{const version=++generation.current;const data=await accountRequest(mode,{body:{username,password}});if(version!==generation.current)throw changed();if(data.user)setUser(data.user);return data;};
  const logout=async()=>{++generation.current;const data=await accountRequest('logout',{body:{}});setUser(null);return data;};
  const request=async(path,options)=>{const version=generation.current;try{const data=await accountRequest(path,options);if(version!==generation.current)throw changed();return data;}catch(error){if(error.status===401&&version===generation.current){generation.current++;setUser(null);}throw error;}};
  return <Context.Provider value={{user,status,configured,error,refresh,authenticate,logout,request}}>{children}</Context.Provider>;
}
export const useAccount=()=>{const value=useContext(Context);if(!value)throw Error('AccountProvider is required');return value;};
