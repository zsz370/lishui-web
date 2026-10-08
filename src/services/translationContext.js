// Translate explicit text first; references bind only to the most recent complete answer.
export function translationText(input) {
  const question=String(input.question||''),quoted=question.match(/[“「"](.+?)[”」"]/s)?.[1];
  if(quoted)return quoted;
  const reference=/上(?:面|一(?:条|段|个|轮))|刚才|前面|这(?:段|条|个)(?:回答|答案|内容|文字)?/.test(question);
  const remainder=question.replace(/^.*?(?:翻译成(?:英文|英语|日语|韩语|法语)|翻译|translate)[:：\s]*/i,'').replace(/^(?:一下|成(?:英文|英语|日语|韩语|法语))[:：\s]*/,'').trim();
  if(reference||!remainder)return(input.history||[]).filter(item=>['expert','assistant'].includes(item.role)&&!item.incomplete).at(-1)?.content||'';
  return remainder;
}
