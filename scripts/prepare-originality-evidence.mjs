import{readFile,writeFile,mkdir,cp,readdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{resolve,relative}from'node:path';
import{atlasEntries}from'../src/data/atlas.js';
import{personas}from'../src/data/personas.js';
import{dragonQuestions}from'../src/data/dragonExperience.js';
const repo=resolve(import.meta.dirname,'..'),workspace=resolve(repo,'..');
const folder=resolve(repo,'docs/originality-2026-10-06');await mkdir(folder,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(await readFile(resolve(repo,'docs/图鉴素材与制作台账_2026-10-05.json'),'utf8'));
async function file(path){const b=await readFile(path);return{path,bytes:b.length,sha256:sha(b)};}
const entries=[];
for(const e of atlasEntries){
  const previous=old.entries.find(x=>x.id===e.id);
  const current=e.photo?await file(resolve(repo,'public'+e.photo)):null;
  if(current&&previous.imagePath===current.path&&previous.imageSha256!==current.sha256)throw Error('Unexpected image change: '+e.id);
  entries.push({id:e.id,name:e.name,category:e.cat,sourceType:e.photo?'团队提供资料，非团队现场采录证明':'文字页，无配图',display:current,source:previous.sourcePath?await file(previous.sourcePath):null,photographer:previous.photographer,captureDate:previous.captureDate,captureLocation:previous.captureLocation,sources:e.sources||previous.introductionSources});
}
const roles=[];
for(const p of personas){const previous=old.personas.find(x=>x.id===p.id);roles.push({id:p.id,name:p.name,sourceType:'AI生成创作角色',selection:previous.selected,source:await file(previous.source),portrait:await file(resolve(repo,'public'+p.portrait)),avatar:await file(resolve(repo,'public'+p.avatar)),initialExecutedPrompt:null,completeGenerationModel:null});}
const prompts=[];
for(const name of ['03_原始资料/数字人素材/矩阵人物立绘/剩余七位_角色图生成提示词.md','03_原始资料/数字人素材/矩阵人物立绘/02_濑渚生/02_濑渚生_站立呼吸_提示词.txt'])prompts.push({...await file(resolve(workspace,name)),status:'本地提示词稿；不证明已实际提交某模型或本轮完成GIF'});
const shots=await Promise.all(old.ai.screenshots.map(x=>file(x.path)));
const packageLock=JSON.parse(await readFile(resolve(repo,'package-lock.json'),'utf8'));
const dependencies=['react','react-dom','react-router-dom','vite','@phosphor-icons/react','@fly-ai/flyai-cli'].map(name=>({name,version:packageLock.packages['node_modules/'+name]?.version||null,classification:'第三方依赖，非团队原创'}));
const code=[];
async function walk(dir){for(const entry of await readdir(resolve(repo,dir),{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())await walk(p);else if(/\.(js|jsx|mjs|css|json)$/.test(p))code.push(await file(resolve(repo,p)));}}
for(const dir of ['src','server'])await walk(dir);
for(const p of ['index.html','package.json','package-lock.json','config/agent-system.plan.js','docs/corpus-audit/approved-corpus.json','docs/corpus-audit/inventory.json','runtime.local/knowledge-index.json','dist/index.html','dist/assets/index-CZCL6WfS.js','dist/assets/index-BxRbV1mB.css'])code.push(await file(resolve(repo,p)));
const ledger={date:'2026-10-06',name:'遇见美溧',scope:'真实现有证据说明，不补缺失记录',team:old.team,originality:old.originality,entries,roles,prompts,screenshots:shots,dependencies,code,unknowns:['原摄影者/拍摄时间/地点缺失项','Qoder完整历史软件/模型版本','全体形象初始提示词及逐次执行日志'],userUpdates:{fieldCollectionUnavailable:true,photosCopyrightAccepted:true,r11:'用户报告截至10/6手机、电脑问题已完成修复；不补逐题数值指标',publicAccess:'当前525/ICP备案提示，开发验证历史不等于持续可用'}};
await writeFile(resolve(folder,'素材与文件台账.json'),JSON.stringify(ledger,null,2));
const csv=['类别,编号,名称,来源性质,原文件,显示文件,显示SHA256,拍摄人,拍摄时间,拍摄地点',...entries.map(e=>[e.category,e.id,e.name,e.sourceType,e.source?.path||'',e.display?.path||'',e.display?.sha256||'','未知','未知','未知'].map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')),...roles.map(p=>['AI角色',p.id,p.name,p.sourceType,p.source.path,p.portrait.path,p.portrait.sha256,'不适用','不适用','不适用'].map(x=>'"'+String(x).replaceAll('"','""')+'"').join(','))].join('\n');
await writeFile(resolve(folder,'素材台账.csv'),'\uFEFF'+csv);
let md='# R07证据索引\n\n2026-10-06。作品：遇见美溧。整理说明见[原创与AI说明](../R07原创贡献与AI使用说明_2026-10-06.md)。机器台账记录32风物、12角色、3截图、2份提示词稿、第三方依赖及当前源码/构建校验。未知项保留，不声明现场摄影。\n\n## 风物配图\n\n| 编号 | 名称 | 配图 | 来源 |\n| --- | --- | --- | --- |\n';
for(const e of entries)md+=`| ${e.id} | ${e.name} | ${e.display?'有，hash已登记':'文字页'} | ${e.sourceType} |\n`;
md+='\n## 数字人选用\n\n| 角色 | 版本 | 来源性质 |\n| --- | --- | --- |\n';for(const r of roles)md+=`| ${r.name} | ${r.selection} | AI生成角色；初始实际执行记录未知 |\n`;
md+='\n## 使用范围\n\n图片版权按用户确认处理；图片不是团队现场采录证明。提示词是本地实有稿，不能证明已执行。网页数字人AI标识、语音/资料说明与实际源码对应。原始目录及历史评测不更改。完整来源和SHA256见JSON，便于查看的同内容表见CSV。\n';
await writeFile(resolve(folder,'README.md'),md);

// Package only whitelisted evidence. Actual private configuration never copied.
const stage=resolve(repo,'.web_review/R07-evidence-stage-20261006');await mkdir(stage,{recursive:true});
const selected=[...code.filter(x=>x.path.includes(repo+ '\\src\\')||x.path.includes(repo+'\\server\\')||['index.html','package.json','package-lock.json','config/agent-system.plan.js'].includes(relative(repo,x.path).replaceAll('\\','/'))).map(x=>x.path),resolve(workspace,'详情.md'),resolve(repo,'docs/R07原创贡献与AI使用说明_2026-10-06.md'),resolve(folder,'README.md'),resolve(folder,'素材与文件台账.json'),resolve(folder,'素材台账.csv'),...prompts.map(x=>x.path),...shots.map(x=>x.path),...entries.flatMap(e=>[e.display?.path,e.source?.path].filter(Boolean)),...roles.flatMap(p=>[p.source.path,p.portrait.path,p.avatar.path])];
for(const name of ['秦淮源头的一天_设计依据与原创草图_2026-10-04.md','秦淮源头的一天_原创草图.svg','图鉴与制作归档验收_2026-10-05.md','R04与R05正式验收_2026-10-05.md','服务器部署与Cloudflare接入验收_2026-10-06.md','525与备案访问阻断排查_2026-10-06.md','corpus-audit/approved-corpus.json','corpus-audit/inventory.json'])selected.push(resolve(repo,'docs',name));
const config=await readFile(resolve(repo,'config/integrations.env.local'),'utf8');const secrets=config.split(/\r?\n/).map(x=>x.match(/^([A-Z_0-9]+)\s*=\s*(.+)$/)).filter(Boolean).filter(x=>/KEY|SECRET|PASSWORD/.test(x[1])).map(x=>x[2].trim().replace(/^["']|["']$/g,'')).filter(x=>x.length>=8);
const manifest=[];
for(const p of [...new Set(selected)]){const data=await readFile(p);if(/\.(md|txt|js|jsx|mjs|json|css|svg|html|csv)$/.test(p)&&secrets.some(v=>data.includes(Buffer.from(v))))throw Error('Configured secret in evidence: '+p);const out=p.startsWith(repo)?'lishui-web/'+relative(repo,p).replaceAll('\\','/'):relative(workspace,p).replaceAll('\\','/');const dest=resolve(stage,out);await mkdir(resolve(dest,'..'),{recursive:true});await cp(p,dest);manifest.push({path:out,bytes:data.length,sha256:sha(data)});}
await writeFile(resolve(stage,'文件校验.json'),JSON.stringify({date:'2026-10-06',files:manifest,secretMatches:0},null,2));
await writeFile(resolve(stage,'README.md'),'# 遇见美溧R07证据包\n\n请先阅读[原创与AI说明](lishui-web/docs/R07原创贡献与AI使用说明_2026-10-06.md)，再看[台账](lishui-web/docs/originality-2026-10-06/README.md)。原始材料仅包含成员说明、三张已提供截图与两份本地提示词稿；代码仅含src/server等白名单文件，无私有配置。包含当前显示图和已对应源文件，以目录/hash追溯；不据此声称现场采录。文件校验.json可核对解压内容。\n');

const topic=resolve(repo,'docs/topic-luoshan-2026-10-06');await mkdir(topic,{recursive:true});
const qa=JSON.parse(await readFile(resolve(repo,'docs/corpus-audit/approved-corpus.json'),'utf8')).chunks.filter(x=>x.nodeId==='c_ldl');if(qa.length!==6)throw Error('Unexpected topic QA count');
await writeFile(resolve(topic,'已审问答与三题关联.json'),JSON.stringify({date:'2026-10-06',type:'公开资料整理，非原创采录',qa,questions:dragonQuestions.map(x=>({id:x.id,question:x.question,referenceId:x.referenceId,sources:x.sources})),newKnowledgeAdded:false},null,2));
const photo=entries.find(x=>x.id==='c_ldl');await cp(photo.source.path,resolve(topic,'骆山大龙_团队提供资料.png'));
await writeFile(resolve(topic,'配图来源卡.json'),JSON.stringify(photo,null,2));
await writeFile(resolve(topic,'README.md'),'# 骆山大龙公开资料专题目录\n\n阅读[专题说明](../R08骆山大龙公开资料专题_2026-10-06.md)。资料含：M01名录核对卡（专题正文官方链接）、M02规模与传说阅读卡（专题正文）、M03提供配图及来源卡，另有6条已审问答与现有三题的对应JSON，其中5条骆山主题、1条全区数量边界。非三份独立调查证据，非团队现场采录。用户10/6已批准公开资料专题替代范围，R08按此验收。\n');
console.log(JSON.stringify({windObjects:entries.length,illustrated:entries.filter(x=>x.display).length,personas:roles.length,screenshots:shots.length,promptDrafts:prompts.length,codeHashes:code.length,packagedFiles:manifest.length,secretMatches:0,topicQA:qa.length}));
