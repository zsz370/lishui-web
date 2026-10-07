import { mkdir, writeFile } from 'node:fs/promises';
import { expansionNodeQA, expansionServiceQA, expansionPendingNodeQA, expansionPendingServiceQA } from '../src/data/contentExpansionQA.js';
import { approvedQA } from '../src/data/presetQA.js';
import { approvedServiceQA } from '../src/data/foundationQA.js';
import { nodes, getNode } from '../src/data/nodes.js';
import { getTravelService } from '../src/data/travelServices.js';
import { nodePhotos } from '../src/data/nodeMedia.js';
import { themeRoutes } from '../src/data/themeRoutes.js';

const output = new URL('../reports/', import.meta.url);
const added = [...expansionNodeQA, ...expansionServiceQA];
const pending = [...expansionPendingNodeQA, ...expansionPendingServiceQA];
const categories = { parking: '停车', toilet: '卫生间', nursing: '母婴室', accessibility: '无障碍', luggage: '寄存', pets: '宠物' };
const target = item => item.nodeId ? `${getNode(item.nodeId).name}（${item.nodeId}）` : `${categories[item.facilityTopic]} · ${getTravelService(item.serviceId).name}`;
const refs = sources => sources.map(source => `[${source.label}](${source.url})`).join('；');
const summary = {
  reviewedAt: '2026-10-07', approvedNodeQA: approvedQA.length, approvedServiceQA: approvedServiceQA.length,
  approvedTotal: approvedQA.length + approvedServiceQA.length,
  addedNodeQA: expansionNodeQA.length, addedServiceQA: expansionServiceQA.length,
  addedNodeFacts: expansionNodeQA.filter(qa => qa.kind === 'fact').length,
  addedNodeGuidance: expansionNodeQA.filter(qa => qa.kind === 'guidance').length,
  addedPending: pending.length, themeRoutes: themeRoutes.length, existingPhotos: Object.keys(nodePhotos).length,
  awaitingPhoto: nodes.filter(node => !nodePhotos[node.id]).map(node => ({ id: node.id, name: node.name })),
};
const lines = [
  '# 内容补强新增清单（2026-10-07）', '',
  `已审QA由69条增至${summary.approvedTotal}条：节点${summary.approvedNodeQA}条、服务${summary.approvedServiceQA}条。新增节点${summary.addedNodeQA}条（背景事实${summary.addedNodeFacts}条、游览建议${summary.addedNodeGuidance}条），新增服务${summary.addedServiceQA}条均为行前核对建议。`, '',
  '“已查证”表示本条正文的来源与边界已经核对。节点正文复用仓库已审简介，保留对应官方来源；没有声称本轮重新逐一联网核验所有历史网页。服务正文为官方指引支持的编辑核对清单，不能证明任何具体场所已有设施、当前开放或实际收费。', '',
  '游客答复仅展示正文；下表与数据保留来源、审核状态及待核原因。既有传说的“尚无史料确证”声明继续保留，本批没有新增传说。', '',
  '## 新增已审问答', '',
  '| 节点/服务 | 条目 | 类型 | 来源 | 状态 |',
  '| --- | --- | --- | --- | --- |',
  ...added.map(item => `| ${target(item)} | ${item.q} | ${item.kind === 'fact' ? '背景事实' : '行前/游览建议'} | ${refs(item.sources)} | 已查证（${item.nodeId ? '复用已审简介' : '建议'}） |`), '',
  '## 新增待核条目', '',
  '| 节点/服务 | 条目 | 来源 | 状态与缺口 |',
  '| --- | --- | --- | --- |',
  ...pending.map(item => `| ${target(item)} | ${item.q} | 尚缺可定位来源 | 待核：${item.reason} |`), '',
  '待核条目的答案为空，不进入approved-corpus.json，不进入固定问答或游客详情问答；pending-review.json单独记录节点与服务待核项。既有童谣待核条目仍保留。', '',
  '## 主题线路', '',
  '| 线路 | 节点与内容 | 来源 | 状态 |',
  '| --- | --- | --- | --- |',
  ...themeRoutes.map(route => `| ${route.name} | ${route.nodeIds.map(id => getNode(id).name).join(' → ')}；${route.description} | ${refs(route.sources)} | 已查证背景；编辑草案，出行条件待确认 |`), '',
  '草案保留用户日期、人数、交通与预算，停留、实际地点和费用不预填；每站备注保留设施、开放和适龄等核对事项。', '',
  '## 配图', '',
  `沿用${summary.existingPhotos}个节点的已有配图，本批新增图片0张。当前未接入配图：${summary.awaitingPhoto.map(node => `${node.name}（${node.id}）`).join('、')}。继续显示现有无图提示，等待用户实拍或授权素材。`, '',
];
await mkdir(output, { recursive: true });
await writeFile(new URL('content-expansion-2026-10-07.md', output), lines.join('\n') + '\n', 'utf8');
await writeFile(new URL('content-expansion-2026-10-07.json', output), JSON.stringify({ summary, approved: added, pending, themeRoutes }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summary, null, 2));
