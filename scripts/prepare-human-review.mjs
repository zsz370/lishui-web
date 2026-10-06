import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scoreFields, validateScore, validateReviewExport } from './review-score.mjs';

const source = new URL('../docs/evaluation/', import.meta.url);
const destination = new URL('../docs/evaluation-review-2026-10-05/', import.meta.url);
await mkdir(destination, { recursive: true });
const hash = (value) => createHash('sha256').update(value).digest('hex');
const files = ['cases.json', 'results.local.json', 'tool-snapshots.local.json', 'summary.json'];
const buffers = await Promise.all(files.map((name) => readFile(new URL(name, source))));
const sourceHashes = Object.fromEntries(files.map((name, i) => [name, hash(buffers[i])]));
const [caseData, resultData, snapshots, summary] = buffers.map((buffer) => JSON.parse(buffer));
if (resultData.running || resultData.results.length !== 216 || caseData.cases.length !== 30) throw new Error('历史基线不是完整30题216次');
const packId = hash(JSON.stringify(sourceHashes));
// 以历史输出哈希排序，稳定打散题目、分支及重复序号；分组映射另存。
const ordered = resultData.results.map((row, sourceIndex) => ({ row, sourceIndex, order: hash(packId + ':' + sourceIndex) })).sort((a, b) => a.order.localeCompare(b.order));
const mappings = [];
const cards = ordered.map(({ row, sourceIndex }, i) => {
  const reviewId = `H${String(i + 1).padStart(3, '0')}`;
  mappings.push({ reviewId, sourceIndex, scenarioId: row.id, mode: row.mode, repeat: row.repeat });
  const scenario = caseData.cases.find((item) => item.id === row.id);
  if (!scenario) throw new Error('输出没有对应题目');
  const snapshot = snapshots.find((item) => item.id === row.id);
  const replies = (row.output?.replies || [row.output]).filter(Boolean).map((reply) => ({
    content: reply.content || '', sources: reply.sources || [], source: reply.source, sourceUrl: reply.sourceUrl,
  }));
  // 完整原始输出随卡片保留供核对，默认视图不展示调度标签或自动通过结论。
  return { reviewId, category: scenario.category, input: scenario.input, references: scenario.references || [],
    replies, error: row.error || null, toolEvidence: snapshot?.tools || [], retrievalEvidence: snapshot?.knowledge || [],
    originalOutput: row.output || null };
});
const pack = { packId, createdAt: new Date().toISOString(), sourceHashes, sourceCheckedAt: summary.checkedAt,
  scope: '2026-10-04历史30题216次，按当时资料与工具快照评审；新知识和新功能未混入',
  limitations: ['隐藏分组标签并打散顺序；输出中的角色文字和展开的原始输出仍可能暴露分组，不构成严格盲评。',
    '天气/住宿/路线按采集时证据核对，不能拿今天的结果判断历史查询。', '评分为人工填写，未填写不计零分；默认没有人工正确率或优势结论。'], cards };
await writeFile(new URL('review-pack.json', destination), JSON.stringify(pack, null, 2) + '\n');
await writeFile(new URL('分组映射_评审后使用.json', destination), JSON.stringify({ packId, sourceHashes, mappings }, null, 2) + '\n');
const embedded = JSON.stringify(pack).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>溧水 RAG 人工评审</title>
<style>
:root{font-family:system-ui,"Microsoft YaHei",sans-serif;color:#243a35;background:#f5f3eb;line-height:1.7}*{box-sizing:border-box}body{margin:0}header,main{max-width:1160px;margin:auto;padding:24px}h1{font-family:serif;font-size:30px;line-height:1.25;margin:8px 0}h2{font-size:20px;margin:8px 0}p{margin:8px 0}.muted{color:#59675f;font-size:14px}.toolbar,.navigation{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.toolbar{margin:16px 0}button,input,select,textarea{font:inherit;border:1px solid #a6b4aa;border-radius:8px;padding:9px;background:#fff;color:inherit}button{cursor:pointer;min-height:44px}button.primary{background:#245b4e;color:white;border-color:#245b4e}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:3px solid #a56934;outline-offset:2px}input,select,textarea{width:100%;min-width:0}.layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:20px}article,aside,.intro{background:#fffdf8;border:1px solid #d5ddd1;border-radius:16px;padding:20px;min-width:0}.reply{white-space:pre-wrap;border-left:3px solid #8ca99b;padding:12px;margin:12px 0;overflow-wrap:anywhere}pre{white-space:pre-wrap;font:13px/1.7 ui-monospace,monospace;overflow-wrap:anywhere;max-height:420px;overflow:auto}a{color:#245b4e;overflow-wrap:anywhere}details{margin:16px 0}summary{cursor:pointer}.score-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{font-size:14px;display:block}label>input,label>select,label>textarea{margin-top:5px}textarea{min-height:120px;resize:vertical}#message{color:#874d20;white-space:pre-line}#progress{font-weight:650}.check{display:flex;align-items:center;gap:8px;margin:12px 0}.check input{width:auto}#choose{max-width:100%;width:100%}.navigation{margin:16px 0}.navigation button{flex:1}.block{margin-top:16px}.small{font-size:13px}.badge{color:#245b4e;letter-spacing:.15em;font-size:12px;font-weight:700}@media(max-width:760px){header,main{padding:16px}.layout{grid-template-columns:1fr}h1{font-size:25px}.score-grid{grid-template-columns:1fr 1fr}.toolbar>*{flex:1;min-width:150px}}
</style>
<header><span class="badge">溧水 · 项目评测</span><h1>逐条核对回答与证据</h1><p>历史30题 · 216条输出。请依据当时的参考材料、上下文与工具快照填写。</p>
<details class="intro"><summary>评分口径与使用说明</summary><p>任务完成度：0＝未完成或明显误导；1＝部分完成；2＝满足题目要求。逐个可验证断言统计事实总数；明确有证据支持、仍无法核准的分别计数，其余自动视为不支持。引用按“引用与所支持的断言”配对计数；同一个链接支撑两项断言可算两对。无事实或无引用时总数、支持数、待核数均明确填0。</p><p>遗漏条件按日期、地点、预算、同行需求、多轮修订、译文范围、失败处理等实际条件逐项记录。争议须写出原句和证据。未填字段保留空白，点击“确认本条评分”后才计为已评审。</p><p>这里只隐藏分组标签，输出本身可能透露角色身份，不能作为严格盲评。评分保存在当前浏览器；存储受限时本次仍可填写和导出。请定期下载备份；刷新或更换设备前先导出。页面没有联网请求，外部资料链接由你主动打开。</p><p>先评3条校准口径，再继续。不要打开分组映射文件，直至评分完成。人工评分不能证明公网性能或真实游客学习效果。</p></details>
<div class="toolbar"><label>评审代号<input id="reviewer" autocomplete="off" placeholder="如评审A（无需公开姓名）"></label><button id="export">导出评分与草稿</button><label>恢复评分文件<input id="import" type="file" accept="application/json,.json"></label></div><section id="export-panel" class="intro" hidden><a id="save-file">保存JSON文件</a><p class="muted">若浏览器未下载，可复制下方全文保存为UTF-8的.json文件。继续修改评分后请重新导出。</p><label>评分JSON全文<textarea id="export-text" readonly></textarea></label></section><p id="progress" aria-live="polite"></p><p id="storage" class="muted"></p></header>
<main><label>选取评审条目<select id="choose"></select></label><div class="navigation"><button id="previous">上一条</button><button id="next">下一条</button><button id="pending">下一条未完成</button></div>
<div class="layout"><article><span id="category" class="badge"></span><h2 id="question" tabindex="-1"></h2><details open><summary>题目条件与上下文</summary><pre id="input"></pre></details><div id="answers"></div><details><summary>参考答案与其来源（历史版本）</summary><div id="references"></div></details><details><summary>同题真实工具与检索快照</summary><p class="muted">同题共享快照不等于每个分支均调用了这些工具；必要时核对完整原始输出。</p><pre id="evidence"></pre></details><details><summary>完整原始输出</summary><pre id="original"></pre></details></article>
<aside><h2>人工评分</h2><p class="muted">空白尚未评分，0是明确的评分值。</p><div class="score-grid">
<label>任务完成度<select data-field="taskCompletion"><option value="">尚未评分</option><option value="0">0 · 未完成或误导</option><option value="1">1 · 部分完成</option><option value="2">2 · 完成要求</option></select></label>
<label>遗漏条件数<input type="number" min="0" step="1" data-field="missedConstraints"></label>
<label>事实断言总数<input type="number" min="0" step="1" data-field="factTotal"></label><label>有支持的事实数<input type="number" min="0" step="1" data-field="factSupported"></label>
<label>仍待核的事实数<input type="number" min="0" step="1" data-field="factUnknown"></label>
<label>引用与断言配对总数<input type="number" min="0" step="1" data-field="citationTotal"></label><label>确实支持的引用数<input type="number" min="0" step="1" data-field="citationSupported"></label><label>仍待核的引用数<input type="number" min="0" step="1" data-field="citationUnknown"></label></div>
<label class="check"><input id="dispute" type="checkbox">这条存在争议，需第二人复核</label><label>原句、证据与遗漏说明<textarea id="notes" placeholder="记录事实不支持、遗漏条件或争议的具体位置"></textarea></label><div class="toolbar"><button class="primary" id="confirm">确认本条评分</button></div><p id="message" role="status"></p><p class="muted small">修改已确认评分会回到草稿状态，请重新确认。导出文件同时保留评分与未完成草稿，不改写原始评测输出。</p></aside></div></main>
<script id="data" type="application/json">${embedded}</script><script>
const pack=JSON.parse(document.querySelector('#data').textContent),fields=${JSON.stringify(scoreFields)};
const validateScore=${validateScore.toString()};const validateReviewExport=${validateReviewExport.toString()};
const $=id=>document.getElementById(id),key='lishui-review:'+pack.packId;let current=0,state={reviewer:'',entries:{}};
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&saved.packId===pack.packId){state={reviewer:saved.reviewer||'',entries:saved.entries||{}};}}catch{$('storage').textContent='本地存储不可用，本次仍可评分；请下载备份。';}
const ids=pack.cards.map(c=>c.reviewId);function cleanScore(value){const score={reviewer:state.reviewer,notes:value?.notes||'',dispute:Boolean(value?.dispute)};for(const field of fields)score[field]=Number.isSafeInteger(value?.[field])?value[field]:null;return score;}
function confirmed(entry){return Boolean(entry?.reviewedAt)&&validateScore(entry).length===0;}
function persist(){try{localStorage.setItem(key,JSON.stringify({packId:pack.packId,...state}));$('storage').textContent='草稿已保存在当前浏览器；建议每批评分后下载备份。';}catch{$('storage').textContent='本地存储不可用，本次仍可评分；请下载备份。';}}
function progress(){const count=Object.values(state.entries).filter(confirmed).length;$('progress').textContent='已确认 '+count+' / '+pack.cards.length+' 条 · 尚余 '+(pack.cards.length-count)+' 条';[...$('choose').options].forEach((option,i)=>option.textContent=pack.cards[i].reviewId+' · '+pack.cards[i].category+(confirmed(state.entries[pack.cards[i].reviewId])?' · 已确认':''));}
function sourceLink(source,parent){if(!source?.url)return;try{const url=new URL(source.url);if(!['https:','http:'].includes(url.protocol))return;const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.label||source.url;parent.append(a,document.createElement('br'));}catch{}}
function block(text,parent){const p=document.createElement('p');p.className='reply';p.textContent=text||'本条没有返回文字';parent.append(p);}
function render(focus=false){const card=pack.cards[current],score=state.entries[card.reviewId]||cleanScore({});$('choose').value=String(current);$('category').textContent=card.reviewId+' · '+card.category;$('question').textContent=card.input.question;$('input').textContent=JSON.stringify(card.input,null,2);$('answers').replaceChildren();if(card.error)block('调用失败：'+card.error,$('answers'));for(const reply of card.replies){block(reply.content,$('answers'));for(const s of reply.sources)sourceLink(s,$('answers'));if(reply.sourceUrl)sourceLink({url:reply.sourceUrl,label:reply.source},$('answers'));}
$('references').replaceChildren();if(!card.references.length)block('本题没有独立的固定参考答案，请核对题目条件、工具快照及资料边界。',$('references'));for(const ref of card.references){block(ref.a,$('references'));for(const s of ref.sources||[])sourceLink(s,$('references'));}$('evidence').textContent=JSON.stringify({tools:card.toolEvidence,retrieval:card.retrievalEvidence},null,2);$('original').textContent=JSON.stringify(card.originalOutput,null,2);for(const f of fields)document.querySelector('[data-field="'+f+'"]').value=score[f]??'';$('notes').value=score.notes||'';$('dispute').checked=Boolean(score.dispute);$('message').textContent=confirmed(score)?'本条已确认；再次修改后须重新确认。':'';$('previous').disabled=current===0;$('next').disabled=current===pack.cards.length-1;progress();if(focus)$('question').focus();}
function draft(){const score={reviewer:state.reviewer,notes:$('notes').value,dispute:$('dispute').checked};for(const field of fields){const value=document.querySelector('[data-field="'+field+'"]').value;score[field]=value===''?null:Number(value);}state.entries[pack.cards[current].reviewId]=score;persist();progress();$('message').textContent='当前为草稿，请确认本条评分。';}
for(const c of pack.cards){const option=document.createElement('option');option.value=String($('choose').options.length);$('choose').append(option);}$('reviewer').value=state.reviewer;$('reviewer').oninput=()=>{state.reviewer=$('reviewer').value;persist();};document.querySelectorAll('[data-field],#notes,#dispute').forEach(el=>el.addEventListener('input',draft));$('choose').onchange=()=>{current=Number($('choose').value);render(true);};$('previous').onclick=()=>{current--;render(true);};$('next').onclick=()=>{current++;render(true);};$('pending').onclick=()=>{for(let step=1;step<=pack.cards.length;step++){const i=(current+step)%pack.cards.length;if(!confirmed(state.entries[pack.cards[i].reviewId])){current=i;render(true);return;}}$('message').textContent='这批条目均已确认，请导出并安排争议复核。';};
$('confirm').onclick=()=>{draft();const score=state.entries[pack.cards[current].reviewId],errors=validateScore(score);if(errors.length){$('message').textContent=errors.join('\\n');return;}score.reviewedAt=new Date().toISOString();persist();progress();$('message').textContent='本条评分已确认。';};
let exportUrl; $('export').onclick=()=>{const records=Object.entries(state.entries).filter(([,entry])=>confirmed(entry)).map(([reviewId,entry])=>({reviewId,...entry}));const value={packId:pack.packId,sourceHashes:pack.sourceHashes,exportedAt:new Date().toISOString(),records,drafts:Object.fromEntries(Object.entries(state.entries).filter(([,entry])=>!confirmed(entry)))};const text=JSON.stringify(value,null,2)+'\\n';if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=URL.createObjectURL(new Blob([text],{type:'application/json'}));$('save-file').href=exportUrl;$('save-file').download='溧水RAG人工评分_'+new Date().toISOString().slice(0,10)+'.json';$('export-text').value=text;$('export-panel').hidden=false;$('export-text').focus();};
$('import').onchange=async()=>{const file=$('import').files[0];if(!file)return;try{const value=JSON.parse(await file.text());const records=validateReviewExport(value,pack.packId,ids);const next={};for(const [id,entry]of Object.entries(value.drafts||{})){if(!ids.includes(id))throw new Error('草稿编号未知');next[id]=cleanScore(entry);next[id].reviewer=entry.reviewer||state.reviewer;}for(const record of records)next[record.reviewId]=record;state.entries={...state.entries,...next};persist();render();$('message').textContent='已恢复 '+records.length+' 条确认评分及草稿；其他现有条目保留。';}catch(error){$('message').textContent='未导入：'+error.message;}finally{$('import').value='';}};render();
</script></html>`;
await writeFile(new URL('index.html', destination), html);
await writeFile(new URL('准备记录.json', destination), JSON.stringify({ packId, sourceHashes, cards: cards.length,
  modes: Object.fromEntries(['single', 'multi', 'withoutRag'].map((mode) => [mode, mappings.filter((row) => row.mode === mode).length])),
  humanScoresWritten: 0, htmlSha256: hash(html), limitations: pack.limitations }, null, 2) + '\n');
console.log(JSON.stringify({ directory: 'docs/evaluation-review-2026-10-05', cards: cards.length, humanScoresWritten: 0, packId }));
