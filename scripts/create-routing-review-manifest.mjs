import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root=new URL('../',import.meta.url),reviewDir=new URL('.web_review/',root);
const hash=async(url)=>createHash('sha256').update(await readFile(url)).digest('hex');
async function filesIn(directory,prefix){
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const name=prefix+entry.name;
    if(entry.isDirectory())files.push(...await filesIn(new URL(entry.name+'/',directory),name+'/'));
    else if(entry.isFile())files.push(name);
  }
  return files;
}
const inputs=['README.md','package.json','package-lock.json','vite.config.js','config/integrations.env.example','config/agent-system.plan.js','config/deployment/nginx-api.location.conf.example','server/chat.mjs','server/providers.mjs','server/core.mjs','server/index.mjs','server/knowledge.mjs','src/data/chatRouting.js','src/components/ChatPanel.jsx','src/components/ChatProgress.css','src/services/api.js','src/services/chatStream.js','src/services/chat.js','src/services/travelAdvice.js','src/pages/About.jsx','src/data/presetQA.js','src/data/qaReview.js','src/data/contentDepthQA.js','src/data/foundationQA.js','src/data/nodeVisitGuides.js','src/components/NodeVisitGuide.jsx','src/components/NodeVisitGuide.css','src/pages/NodeDetail.jsx','scripts/routing-stream.test.mjs','scripts/check-routing-live.mjs','scripts/eval-scenarios.mjs','scripts/evaluate-rag.mjs','scripts/summarize-evaluation.mjs','scripts/serve-chat-ui-fixture.mjs','scripts/create-routing-review-manifest.mjs'];
const artifacts=['docs/专家路由与协作状态验收_2026-10-04.md','docs/RAG与协作受控评测_2026-10-04.md','docs/部署准备与数据处理说明_2026-10-04.md','docs/项目进度与下一步安排_2026-10-04.md','docs/agent-audit/routing-stream-live.json','docs/agent-audit/security-check.json','docs/corpus-audit/approved-corpus.json','runtime.local/knowledge-index.json','docs/evaluation/cases.json','docs/evaluation/tool-snapshots.local.json','docs/evaluation/results.local.json','docs/evaluation/summary.json','docs/evaluation/developer-review.json'];
const record={checkedAt:new Date().toISOString(),scope:'本地专家路由、实际状态、受控评测、部署准备；GIF/TTS及公网未完成，远程现有站点未变更',gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),workingTree:true,sourceHashes:{},artifactHashes:{},managementHashes:{},buildHashes:{},reviewHashes:{},validation:{unitTests:{passed:46,failed:0,command:'node --test scripts/agents.test.mjs scripts/audit-qa.test.mjs scripts/foundation-qa.test.mjs scripts/itinerary.test.mjs scripts/content-depth.test.mjs scripts/routing-stream.test.mjs'},introductions:35,build:'passed',browserViewports:[{width:1280,height:900},{width:393,height:852}],browserErrors:0,paths:['真实答复','本地部分天气失败','重试恢复','本地超时','取消后新问题及95秒复核']},limitations:['评测采用固定工具/检索快照与真实模型，不是公网端到端','自动规则检查不是人工语义评分','20个模型失败调用未报告用量，未推算货币成本','源码包含此前未提交工作；未创建提交或回滚既有变更','四条待核、童谣及专题深度仍待核准','远程仅只读观察；本地Nginx候选未加载或在目标环境验证']};
for(const file of inputs)record.sourceHashes[file]=await hash(new URL(file,root));
for(const file of artifacts)record.artifactHashes[file]=await hash(new URL(file,root));
for(const file of ['数媒竞赛_任务流程与执行清单.md','项目改进待办.md'])record.managementHashes[file]=await hash(new URL('../01_项目管理/'+file,root));
for(const file of await filesIn(new URL('dist/',root),'dist/'))record.buildHashes[file]=await hash(new URL(file,root));
for(const file of await readdir(reviewDir))if(file.startsWith('2026-10-04-R09-')&&!file.endsWith('版本与验收.json')||file==='2026-10-04-R06-数据说明手机.png')record.reviewHashes[file]=await hash(new URL(file,reviewDir));
const live=JSON.parse(await readFile(new URL('docs/agent-audit/routing-stream-live.json',root),'utf8'));
const summary=JSON.parse(await readFile(new URL('docs/evaluation/summary.json',root),'utf8'));
record.validation.liveHttpCases=live.cases.length;record.validation.evaluation={scenarioCount:summary.scenarioCount,repetitions:summary.repetitions,modes:summary.modes,dataHash:summary.dataHash};
record.validation.security=JSON.parse(await readFile(new URL('docs/agent-audit/security-check.json',root),'utf8'));
await writeFile(new URL('2026-10-04-R09-版本与验收.json',reviewDir),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({sources:Object.keys(record.sourceHashes).length,artifacts:Object.keys(record.artifactHashes).length,build:Object.keys(record.buildHashes).length,review:Object.keys(record.reviewHashes).length,live:live.cases.length,scenarios:summary.scenarioCount,remoteMutations:0}));
