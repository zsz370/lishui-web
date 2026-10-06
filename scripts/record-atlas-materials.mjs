import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { atlasEntries } from '../src/data/atlas.js';
import { withdrawnQA } from '../src/data/presetQA.js';
import { getPersona } from '../src/data/personas.js';

const project = process.cwd(), workspace = resolve(project, '..');
const sourceDir = resolve(workspace, '03_原始资料/图片素材');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceNames = {
  n_dp: '东屏湖.jpg', n_dls: '东庐山.jpg', n_zy: '周园1.jpg', n_gx: '郭兴庄园.jpg', n_djs: '大金山1.jpg',
  f_szc: '洪蓝手抓鸡.jpg', f_nr: '洪蓝牛肉.jpg', f_xc: '明觉香菜.jpg', f_ydg: '洪蓝玉带糕.jpg',
  f_ypg: '晶桥云片糕.jpg', f_wf: '乌饭.jpg', f_hm: '白马黑莓.jpg', c_tj: '明觉铁画.jpg',
  n_fjb: '傅家边梅花山.png', c_ldl: '骆山大龙.png', c_hl: '何林坊双龙.png', c_cs: '蒲塘桥祠山庙会.jpg',
  c_xsm: '西宋马灯.png', c_tdd: '跳当当.jpg', c_syg: '石臼渔歌表演.png', c_lh: '剪纸.jpg',
  c_qh: '秦淮源灯会.jpg', s_tj: '通济街.jpg', s_hl: '海乐城.jpg', s_wxsz: '无想水镇.jpg',
};
const unchangedCopies = ['n_fjb','c_ldl','c_hl','c_cs','c_xsm','c_tdd','c_syg','c_lh','c_qh','s_tj','s_hl','s_wxsz'];
const entries = [];
for (const entry of atlasEntries) {
  const imagePath = entry.photo ? resolve(project, `public${entry.photo}`) : null;
  const sourcePath = sourceNames[entry.id] ? resolve(sourceDir, sourceNames[entry.id]) : null;
  const imageData = imagePath ? await readFile(imagePath) : null;
  const sourceData = sourcePath ? await readFile(sourcePath) : null;
  if (unchangedCopies.includes(entry.id) && sha256(imageData) !== sha256(sourceData)) throw new Error(`原图副本不一致：${entry.id}`);
  entries.push({ id: entry.id, name: entry.name, category: entry.cat, expertId: entry.expert, summary: entry.summary,
    photo: entry.photo || null, imagePath, imageBytes: imageData?.length || 0, imageSha256: imageData ? sha256(imageData) : null,
    sourcePath, sourceSha256: sourceData ? sha256(sourceData) : null,
    relationship: unchangedCopies.includes(entry.id) ? '本轮原文件直接复制，字节一致' : sourcePath ? '既有接入的显示副本；本轮登记对应原图，未重做转换' : imagePath ? '既有接入图；拍摄原图路径尚未登记' : '无配图，使用文字页',
    photographer: null, captureDate: null, captureLocation: null, sourceType: '团队提供资料；不推定为自拍',
    introductionSources: entry.introductionSources, reviewNote: entry.introductionReviewNote || null });
}
const screenshots = [];
for (const name of ['屏幕截图 2026-10-05 124108.png','屏幕截图 2026-10-05 124124.png','屏幕截图 2026-10-05 124210.png']) {
  const path = resolve(workspace, name), bytes = await readFile(path);
  screenshots.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
}
const personas = JSON.parse(await readFile(resolve(project, 'docs/人物素材接入清单.json'), 'utf8'));
const personaFiles = [];
for (const item of personas) {
  const source = await readFile(item.source);
  const portrait = await readFile(resolve(project, `public${item.portrait}`));
  const avatar = await readFile(resolve(project, `public${item.avatar}`));
  personaFiles.push({ ...item, sourceSha256: sha256(source), portraitSha256: sha256(portrait), avatarSha256: sha256(avatar), sourceType: 'AI生成角色；团队提供，已有版本选用记录', initialPrompt: null, completeModelVersion: null });
}
const record = { version: '2026-10-05', recordedAt: new Date().toISOString(), team: [
  { name: '张潘赫', role: '队长', responsibilities: ['网页搭建','智能体搭建','部署上线职责'] },
  { name: '张晨钰', role: '队员', responsibilities: ['知识库搭建','图片资料','智能体形象制作','文案撰写'] }],
  originality: { reportedByUser: '成员亲自搭建，没有复用旧参赛成果', evidenceType: '2026-10-05用户说明；不等同逐文件独立鉴证' },
  ai: { toolReportedByUser: '阿里Qoder', modelReportedByUser: 'qwen3.8flash/max', modelVisibleInScreenshot: 'Qwen3.8-Fla…（被截断）', otherTool: 'Codex参与本轮工程开发与验收', toolVersion: null, fullOriginalPrompts: null, screenshots },
  counts: { entries: entries.length, illustrated: entries.filter((entry) => entry.photo).length, textOnly: entries.filter((entry) => !entry.photo).length, unchangedNewCopies: unchangedCopies.length },
  removedNodeIds: ['f_yt','f_le','f_pz','s_wd'], replacement: { from: 's_wd', to: 's_wxsz', migrateSavedPlace: false },
  withdrawnPendingQA: withdrawnQA.map((item) => ({ id: item.id, nodeId: item.nodeId, question: item.q, priorStatus: item.status })),
  entries, personas: personaFiles,
  mediaNotes: { voice: '现有迎宾使用浏览器speechSynthesis，实际音色取决于设备；没有据此声明独立声音作品或完成R10对话配音', fonts: 'CSS字体栈与系统回退；当前public目录没有独立字体文件', music: '当前public目录没有独立音乐/录音文件', guideMotion: '既有迎宾GIF/静态图，本轮未新增GIF制作，历史动作参考与接入记录保留' },
  limits: ['文件修改时间不是拍摄时间','素材作者、拍摄日期/地点未提供的记录为null','知乎页面本次无法读取；内部约50—60项估计不写成官方当前总数','版权按用户既有确认跳过','没有上传、更改或重启现有远程服务器','R07完整制作与来源证据仍保留未完成边界'] };
await writeFile(resolve(project, '.web_review/2026-10-05-图鉴素材与制作归档.json'), JSON.stringify(record, null, 2) + '\n');
await writeFile(resolve(project, 'docs/图鉴素材与制作台账_2026-10-05.json'), JSON.stringify(record, null, 2) + '\n');
let checklist = `# 溧水风物图鉴 · 当前内容与素材清单\n\n更新：2026-10-05，已按用户本次确认修订。当前32项：山水9、美食7、民俗13、街区3；28项配图、4项文字页。图鉴使用短介绍、分类目录、手动翻页与搜索，名片继续提供详情和导游入口。\n\n## 本次范围决定\n\n- 撤下东屏湖鱼头煲、溧水老鹅、螃蟹粽。原始资料与此前清单JSON保留作历史，不再补这三项的入口/图片或专题。\n- 无想水镇替换万达广场，属于街区，使用独立编号s_wxsz；不把旧行程中的万达地点迁移成无想水镇。原万达图片保留在原始目录。\n- 其余只作轻量介绍。没有图片也能翻阅文字页，不要求继续寻找获取不到的配图，不据图片补编队形、曲目或工艺。\n- 傅家边梅花图用作图鉴补充图，四主打节点原图继续用于详情/首页；傅家边不重复计数。\n\n`;
for (const cat of ['山水','美食','民俗','街区']) {
  const list = entries.filter((entry) => entry.category === cat);
  checklist += `## ${cat}（${list.length}项）\n\n| 编号 | 条目 | 配图/原始文件 | 导游 |\n| --- | --- | --- | --- |\n`;
  for (const entry of list) checklist += `| ${entry.id} | ${entry.name} | ${entry.sourcePath ? sourceNames[entry.id] : entry.photo ? '既有接入图' : '文字页，无配图'} | ${getPersona(entry.expertId).name} |\n`;
  checklist += '\n';
}
checklist += `## 资料与制作边界\n\n晶桥云片糕地方沿革、明觉铁画级别、虾子灯队形及石臼渔歌曲目仍有待补资料；图鉴沿用已有短介绍及出处，不补编深度内容。灯会、庙会、采摘与花期不据照片承诺当前开放/演出。\n\n资料照片由团队提供，未实见的拍摄人、日期和地点留空；不凭文件名和修改时间填成现场采录证据，版权按用户确认跳过。12份本轮新增显示文件与原始文件SHA256一致；旧接入副本及12位数字人的源文件/显示文件哈希已登记。\n\n成员与AI过程见[详情说明](../详情.md)；完整图片映射、版本哈希和制作边界见[素材台账JSON](../lishui-web/docs/图鉴素材与制作台账_2026-10-05.json)。\n\n本次前期35项盘点JSON保留在lishui-web/.web_review/2026-10-05-图鉴内容盘点.json，代表修订前状态。当前功能验收以[图鉴与制作归档验收](../lishui-web/docs/图鉴与制作归档验收_2026-10-05.md)为准；独立跟踪用户追加要求，不改变原18项统计分母。\n`;
await writeFile(resolve(workspace, '01_项目管理/图鉴内容与素材清单_2026-10-05.md'), checklist);
console.log(JSON.stringify({ status: 'recorded', ...record.counts, personas: personaFiles.length, screenshots: screenshots.length }));
