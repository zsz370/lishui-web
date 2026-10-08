const encoder = new TextEncoder();
export const chatBodyBytes = body => encoder.encode(JSON.stringify(body)).length;
function prefixWithinBytes(text, limit) {
  let result = '', length = 0;
  for (const char of text) { length += encoder.encode(char).length; if (length > limit) break; result += char; }
  return result;
}
export function boundedChatRequest(body, limit = 23500) {
  const result = {...body,history:(body.history||[]).map(item=>({...item}))};
  // Shorten earlier assistant answers first, preserving verbatim user conditions and the latest turn.
  for (const item of result.history.filter(item=>item.role!=='user')) {
    const overflow = chatBodyBytes(result)-limit;
    if (overflow<=0) break;
    item.content = prefixWithinBytes(item.content,Math.max(0,encoder.encode(item.content).length-overflow-80));
  }
  result.history=result.history.filter(item=>item.content);
  while(chatBodyBytes(result)>limit && result.history.length)result.history.shift();
  return result;
}
