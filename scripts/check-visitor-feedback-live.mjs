import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const records = [];
async function post(path, body) {
  const response = await fetch(`http://127.0.0.1:8787/api/${path}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const result = await response.json(); records.push({ path, input:body, status:response.status, result });
  assert.equal(response.status, 200); return result;
}
const shanghai = await post('places', {keywords:'上海虹桥站',city:''});
assert.ok(shanghai.places.some((place)=>place.citycode==='021'));
const nanjing = await post('places', {keywords:'南京南站',city:''});
assert.ok(nanjing.places.some((place)=>place.name==='南京南站'&&place.citycode==='025'));
const bridge = await post('places', {keywords:'天生桥',city:'320117'});
assert.ok(bridge.places.some((place)=>place.adcode==='320117'));
const lishui = await post('places', {keywords:'溧水站',city:'320117'});
assert.ok(lishui.places.length > 0);
const weather = await post('weather',{location:'lishui'});
assert.ok(weather.days.length>=7); assert.ok(weather.days.every((day)=>Number.isFinite(day.min)&&Number.isFinite(day.max)));
const route = await post('route',{origin:shanghai.places[0].location,destination:nanjing.places[0].location,mode:'transit',originCity:'021',destinationCity:'025'});
assert.ok(Array.isArray(route.paths)); // No available path remains a valid, explicit outcome.
const chat = await post('chat',{question:'2026-10-06天气怎样？',preferences:{weatherDate:'2026-10-06',origin:'上海虹桥站',destination:'无想山',mode:'driving'}});
assert.match(JSON.stringify(chat),/2026-10-06/);
await writeFile('.web_review/2026-10-05-访谈反馈-真实接口.json',JSON.stringify({scope:'本机真实服务，公开车站与景区，非游客测试或公网验收',records},null,2));
console.log(`访谈反馈真实接口检查通过：${records.length}次。`);
