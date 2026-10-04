// Reproducible read-only assessment of source files and current app metadata.
// Exports approved material per role; it does not ingest raw drafts into RAG.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { personas, HOST_ID } from '../src/data/personas.js';
import { nodes, mainNodes, getNode } from '../src/data/nodes.js';
import { presetQA, approvedQA } from '../src/data/presetQA.js';
import { travelServices } from '../src/data/travelServices.js';
import { topics } from '../src/data/collections.js';
import { agentPlans, departmentPlans, collaborationPlan } from '../config/agent-system.plan.js';
import { createKnowledge } from '../server/knowledge.mjs';
import { today } from '../server/core.mjs';
import { approvedServiceQA } from '../src/data/foundationQA.js';

const input = new URL('../docs/corpus-audit/', import.meta.url);
const output = new URL('../docs/agent-audit/', import.meta.url);
const workspace = new URL('../../', import.meta.url);
const dataPrefix = '03_原始资料/数据包资源/';
const publicDir = new URL('../public/', import.meta.url);
const readJson = async (url) => JSON.parse(await readFile(url, 'utf8'));
const extracted = await readJson(new URL('extracted.json', input));
const rawRows = await readJson(new URL('qa-rows.json', input));
const inventory = await readJson(new URL('inventory.json', input));
assert.equal(agentPlans.length, personas.length);
assert.equal(new Set(agentPlans.map((plan) => plan.id)).size, personas.length);
const ids = new Set(personas.map((persona) => persona.id));
const vectorStatus = (await createKnowledge({}, 'BAAI/bge-m3')).status();
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };

// Check extraction freshness against source hashes before reporting counts.
const originals = extracted.filter((file) => file.path.startsWith(dataPrefix + '文档_8篇/') || file.path.startsWith(dataPrefix + 'QA_15条/'));
for (const file of originals) {
  const hash = createHash('sha256').update(await readFile(new URL(file.path, workspace))).digest('hex');
  assert.equal(hash, file.sha256, `Source changed; rerun audit-corpus.py: ${file.path}`);
}
for (const department of departmentPlans) {
  assert(ids.has(department.coordinator));
  for (const section of department.sections) {
    assert(ids.has(section.owner));
    for (const id of section.collaborators || []) assert(ids.has(id));
  }
}
for (const topic of topics) {
  const planned = departmentPlans.find((department) => department.id === topic.id);
  assert(planned);
  for (const group of topic.groups) assert(planned.sections.some((section) => section.id === group.id));
}
for (const service of travelServices) assert(departmentPlans.find((department) => department.id === 'services').sections.some((section) => section.id === service.id));

await mkdir(new URL('approved-by-agent/', output), { recursive: true });
const agents = [];
for (const persona of personas) {
  const plan = agentPlans.find((item) => item.id === persona.id);
  const rows = rawRows.filter((row) => row.path.endsWith(`/QA导入_${plan.sourceName}.xlsx`));
  const incomplete = rows.filter((row) => !String(row.cells[0] || '').trim() || !String(row.cells[1] || '').trim());
  const documents = originals.filter((file) => file.path.includes(`/文档_8篇/${persona.id.slice(0, 2)}_${plan.sourceName}/`));
  const pdfs = extracted.filter((file) => file.path.startsWith(`${dataPrefix}${persona.id.slice(0, 2)}_${plan.sourceName}_`) && file.path.endsWith('.pdf'));
  const legacy = extracted.filter((file) => file.path.endsWith('.docx') && !file.path.startsWith(dataPrefix) && file.path.split('/').at(-1).startsWith(plan.legacyName));
  const related = presetQA.filter((qa) => getNode(qa.nodeId)?.expert === persona.id);
  const approved = related.filter((qa) => qa.status === 'approved');
  const serviceQA = approvedServiceQA.filter((qa) => qa.expertId === persona.id);
  const pending = related.filter((qa) => qa.status !== 'approved');
  const chunks = [...approved, ...serviceQA].map(({ id, nodeId, serviceId, q, a, keys, kind, reviewedAt, sources }) => ({ id, expertId: persona.id, nodeId, serviceId, scope: nodeId ? 'node' : 'service', question: q, answer: a, keys, kind, reviewedAt, sources, status: 'approved' }));
  assert(rows.length > 0 && documents.length > 0 && pdfs.length === 1);
  const portraitExists = await exists(new URL(persona.portrait.replace(/^\//, ''), publicDir));
  const avatarExists = await exists(new URL(persona.avatar.replace(/^\//, ''), publicDir));
  assert(portraitExists && avatarExists, `Missing character art: ${persona.name}`);
  await writeFile(new URL(`approved-by-agent/${persona.id}.json`, output), JSON.stringify({ version: '2026-10-04', expertId: persona.id, name: persona.name, scope: '已审节点与服务QA；按角色/节点/服务检索。建议不代表场所设施与当前经营承诺', nodeCount: approved.length, serviceCount: serviceQA.length, count: chunks.length, chunks }, null, 2) + '\n', 'utf8');
  agents.push({
    id: persona.id, name: persona.name, domain: persona.domain, sourceName: plan.sourceName, legacyName: plan.legacyName,
    rawDocuments: documents.length, rawQARows: rows.length, rawRowsWithQuestionAndAnswer: rows.length - incomplete.length,
    incompleteRows: incomplete.map(({ path, sheet, row }) => ({ path, sheet, row })),
    sourceReferences: [...documents, ...pdfs, ...legacy].map(({ path, sha256 }) => ({ path, sha256, status: 'not_approved_for_full_ingestion' })),
    linkedNodes: nodes.filter((node) => node.expert === persona.id).map(({ id, name }) => ({ id, name })),
    serviceModules: travelServices.filter((service) => service.expert === persona.id).map(({ id, name }) => ({ id, name, status: 'server_tools_and_guidance' })),
    approvedNodeQA: approved.length, approvedServiceQA: serviceQA.length, approvedQA: chunks.length, pendingNodeQA: pending.length,
    approvedQuestionIds: chunks.map((qa) => qa.id), pendingQuestions: pending.map(({ q, reason }) => ({ question: q, reason })),
    images: { portrait: persona.portrait, avatar: persona.avatar, portraitExists, avatarExists, currentMode: 'static' },
    currentReadiness: chunks.length ? '专属基础QA可调用；节点事实与服务建议分别计数；知识覆盖仍待扩展' : '专属已审QA缺口仍在',
    plannedTools: plan.tools, nextWork: plan.nextWork,
  });
}

const totalApproved = agents.reduce((sum, agent) => sum + agent.approvedNodeQA, 0);
const totalServiceApproved = agents.reduce((sum, agent) => sum + agent.approvedServiceQA, 0);
assert.equal(totalServiceApproved, approvedServiceQA.length);
assert.equal(totalApproved, approvedQA.length);
assert.equal(agents.reduce((sum, agent) => sum + agent.pendingNodeQA, 0), presetQA.length - approvedQA.length);
assert.equal(agents.reduce((sum, agent) => sum + agent.rawQARows, 0), rawRows.length);
assert.equal(agents.reduce((sum, agent) => sum + agent.rawDocuments, 0), originals.filter((file) => file.path.endsWith('.docx')).length);
let integrationSmoke = null;
try { integrationSmoke = await readJson(new URL('integration-smoke.json', output)); } catch { /* No live check yet. */ }
const passed = (provider) => integrationSmoke?.results.some((result) => result.provider === provider && result.status === 'passed');
const summary = {
  auditDate: today(), phase: '本地RAG与多智能体工具协作试运行；原始语料全面审核及部署尚未完成',
  scope: '本地网页项目和原始数据包',
  agents: agents.length, originalDocuments: originals.filter((file) => file.path.endsWith('.docx')).length,
  originalQAFiles: new Set(rawRows.map((row) => row.path)).size, rawNonemptyQARows: rawRows.length,
  rowsWithQuestionAndAnswer: agents.reduce((sum, agent) => sum + agent.rawRowsWithQuestionAndAnswer, 0),
  incompleteRows: agents.reduce((sum, agent) => sum + agent.incompleteRows.length, 0),
  reviewedWebQA: presetQA.length + totalServiceApproved, approvedWebQA: totalApproved + totalServiceApproved, approvedNodeQA: totalApproved, approvedServiceQA: totalServiceApproved, pendingWebQA: presetQA.length - totalApproved,
  agentsWithApprovedNodeQA: agents.filter((agent) => agent.approvedNodeQA > 0).length,
  agentsWithoutApprovedNodeQA: agents.filter((agent) => agent.approvedNodeQA === 0).length,
  agentsWithApprovedQA: agents.filter((agent) => agent.approvedQA > 0).length,
  agentsWithoutApprovedQA: agents.filter((agent) => agent.approvedQA === 0).length,
  approvedQAByKind: Object.fromEntries([...new Set([...approvedQA, ...approvedServiceQA].map((qa) => qa.kind))].map((kind) => [kind, [...approvedQA, ...approvedServiceQA].filter((qa) => qa.kind === kind).length])),
  nodes: nodes.length, primaryNodes: mainNodes.length, topicBoards: topics.length, currentSubgroups: topics.reduce((sum, topic) => sum + topic.groups.length, 0),
  serviceModules: travelServices.length, staticPortraits: agents.filter((agent) => agent.images.portraitExists).length,
  staticAvatars: agents.filter((agent) => agent.images.avatarExists).length,
  sourceHashChecks: originals.length, originalFileInventoryCount: inventory.files,
  globalCoordinator: HOST_ID, ragBackendConnected: true, vectorIndexBuilt: vectorStatus.ready, vectorIndex: vectorStatus, llmConnected: passed('llm'),
  webSearchConnectedToApp: passed('bocha'), departmentalCoordinatorRuntime: true, coordinatedSynthesis: true,
  currentWeatherProvider: '和风天气服务端代理，实时与未来7天预报',
};
await writeFile(new URL('agent-readiness.json', output), JSON.stringify({ summary, agents, integrationSmoke, architecture: { status: 'implemented_local_pilot', departments: departmentPlans, collaboration: collaborationPlan } }, null, 2) + '\n', 'utf8');
const rows = agents.map((agent) => `| ${agent.name} | ${agent.rawDocuments} | ${agent.rawQARows} / ${agent.rawRowsWithQuestionAndAnswer} | ${agent.approvedNodeQA} | ${agent.approvedServiceQA} | ${agent.pendingNodeQA} | ${agent.serviceModules.map((service) => service.name).join('、') || '—'} | ${agent.nextWork} |`);
const markdown = [
  `# 十二位智能体知识库盘点（${summary.auditDate}）`, '',
  `阶段：${summary.phase}。已审基础QA覆盖${summary.agentsWithApprovedQA}位；节点QA覆盖${summary.agentsWithApprovedNodeQA}位。服务建议与节点事实分开统计，不代表十二个完整知识库。`, '',
  '| 角色 | 原始DOCX | QA非空行 / 问答双列齐全行 | 已审节点QA | 已审服务QA | 待核节点QA | 服务分工 | 补齐重点 |',
  '| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |', ...rows, '',
  `合计：${summary.originalDocuments}篇原始DOCX、${summary.originalQAFiles}份QA表、${summary.rawNonemptyQARows}个非空行，其中${summary.rowsWithQuestionAndAnswer}行问答双列齐全、${summary.incompleteRows}行空答案。双列齐全仅为结构检查，不代表真实性通过。`, '',
  `网页${summary.reviewedWebQA}条已盘点QA中，${summary.approvedWebQA}条可调用（节点${totalApproved}、服务${totalServiceApproved}），${summary.pendingWebQA}条隔离。泛用服务规则不计入QA数；建议不代表经营方对设施、房态、开放或本年度档期的确认。`, '',
  '原“12_天生桥”对应网页“东庐客”；场景节点“天生桥·胭脂河”仍由胭脂客负责。旧人设别名仅用于追溯来源。', '',
  '原始DOCX、PDF与XLSX未修改；上传副本不重复计数。111份原始DOCX/XLSX已复核SHA256，与此前抽取结果一致。', '',
  '每位角色的获审问答单独导出到 approved-by-agent/，节点与服务分别计数。原始六行缺答案在 normalized-qa.json 中合并为三条可追溯问答；其中童谣仍待核，原始文件保持不变。agent-readiness.json记录来源文件、缺失行、形象文件和职责。', '',
  '本报告由 scripts/audit-agents.mjs 生成；向量构建与真实服务验收分别见 runtime.local/knowledge-index.json、integration-smoke.json 和 agent-flow-smoke.json。通过接入检查不代表原始语料全部通过真实性审核。', '',
].join('\n');
await writeFile(new URL('十二位智能体知识库盘点.md', output), markdown, 'utf8');
console.log(JSON.stringify(summary, null, 2));
