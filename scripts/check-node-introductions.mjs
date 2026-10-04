import { nodes } from '../src/data/nodes.js';
import { nodeIntroductions } from '../src/data/nodeIntroductions.js';
import { topics } from '../src/data/collections.js';

// 内容发布检查：新名片必须显式编写正文和出处，不能靠列表短句蒙混通过。
const errors = [];
const seen = new Set();
for (const node of nodes) {
  if (seen.has(node.id)) errors.push(`重复节点：${node.id}`);
  seen.add(node.id);
  const paragraphs = node.introduction;
  if (!Array.isArray(paragraphs) || paragraphs.length < 2 || paragraphs.some((p) => typeof p !== 'string' || p.trim().length < 25)) {
    errors.push(`${node.name}：至少需要两段独立编写的简介，每段不少于25字`);
  } else {
    if (paragraphs.join('').length < 80) errors.push(`${node.name}：正文不足80字`);
    if (paragraphs.includes(node.summary)) errors.push(`${node.name}：简介仍直接使用列表摘要`);
  }
  if (!Array.isArray(node.introductionSources) || !node.introductionSources.length) {
    errors.push(`${node.name}：缺少简介参考出处`);
  } else for (const source of node.introductionSources) {
    try {
      if (!source.label?.trim() || new URL(source.url).protocol !== 'https:') throw new Error('invalid');
    } catch {
      errors.push(`${node.name}：出处缺少标题或有效HTTPS地址`);
    }
  }
}
for (const id of Object.keys(nodeIntroductions)) if (!seen.has(id)) errors.push(`简介对应未知节点：${id}`);
for (const topic of topics) for (const group of topic.groups) for (const id of group.nodeIds) {
  if (!seen.has(id)) errors.push(`${topic.name}/${group.name}引用未知节点：${id}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const counts = Object.fromEntries([...new Set(nodes.map((n) => n.cat))].map((cat) => [cat, nodes.filter((n) => n.cat === cat).length]));
  console.log(`简介覆盖检查通过：${nodes.length}/${nodes.length}，均有独立正文与出处。分类：${JSON.stringify(counts)}。`);
  console.log(`含待补充资料说明：${nodes.filter((n) => n.introductionReviewNote).map((n) => n.name).join('、')}。此检查不等同于事实全量审核。`);
}
