import { useEffect, useRef, useState } from 'react';

// 输入法组合阶段只更新本地文本，确认后再更新地址和结果，避免打断候选字。
export function useSearchDraft(query, commit) {
 const [value,setValue]=useState(query),[composing,setComposing]=useState(false);
 const callback=useRef(commit);callback.current=commit;
 useEffect(()=>setValue(query),[query]);
 useEffect(()=>{
  if(composing||value===query)return;
  const timer=setTimeout(()=>callback.current(value),180);return()=>clearTimeout(timer);
 },[value,query,composing]);
 return {value,onChange:event=>setValue(event.target.value),onCompositionStart:()=>setComposing(true),onCompositionEnd:event=>{setComposing(false);setValue(event.currentTarget.value);},clear:()=>{setValue('');callback.current('');}};
}
