import { spawnSync } from 'node:child_process';
import { cp, mkdir, writeFile, readFile, readdir, appendFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const workspace = process.cwd(), destination = resolve(workspace, '.local_demo');
if (!destination.startsWith(resolve(workspace) + sep)) throw new Error('演示包目录超出项目。');
const result = spawnSync(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'build', '--mode', 'offline', '--outDir', '.local_demo/site'], { cwd: workspace, env: { ...process.env, VITE_OFFLINE_DEMO: 'true', VITE_AGENT_API_ENABLED: 'false' }, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
await mkdir(destination, { recursive: true });
await cp(resolve('scripts/start-offline-demo.mjs'), resolve(destination, 'start.mjs'));
await writeFile(resolve(destination, '启动说明.md'), `# 遇见美溧 · 离线演示包\n\n构建于${new Date().toISOString()}，使用Node ${process.version}。具体冷启动与浏览器验收另见交付记录；本包不包含Node安装程序。\n\n1. 把压缩包完整解压到一个目录，保留site、start.mjs和本文件的相对位置。\n2. 需要已安装的Node.js（此启动器只使用标准库，不需要npm安装依赖）。在解压目录打开终端，运行：\n\n\`\`\`text\nnode start.mjs\n\`\`\`\n\n3. 用浏览器打开 http://127.0.0.1:4493/ 。不需要账号，不要直接双击site/index.html。端口被占用时用node start.mjs --port=4494，不要停止已有网站或服务。Ctrl+C停止本次演示。\n\n可重复路径：首页轮播 → 天生桥名片 → 点击“天生桥是天然的还是人工的？”查看已审回答及出处 → 大龙文化任务（三题）→ 加入名片 → 行程编辑 → 生成随身行程卡。也可从首页选择两条设计草案。日期、费用和实际入口未知时保留待确认。\n\n本包没有实时API、服务凭据、聊天日志或个人行程。已审固定问答和资料为构建时静态副本；开放问答不运行向量检索。天气、地点、路线、住宿与联网核查不会自动查询；外部出处与导航需联网。没有缓存实时查询结果，也不承诺当前运营信息。\n\n保存范围：当前浏览器与这个端口/来源。行程页可清空行程；文化任务页可清除最近一次记录。存储禁用时用复制或下载保留结果。本包只在本机启动，与公网部署独立；公网是否可用以最新部署验收为准。\n\n文件校验见版本清单.json。\n`, 'utf8');
const files = [];
await appendFile(resolve(destination, '启动说明.md'), '\n## 访谈反馈修订版\n\n栏目、图鉴、行程页均可直接看到全身数字人与对话框；离线只能回答获审固定问题。行程支持出行与返程年月日、每站游览日期，默认生成精简随身卡；勾选详细版可保留完整地址、出处和导航。空项不重复展示，关键冲突与行前核对提醒仍保留。全国地点、路线和日期天气须在实时本地版本中查询，离线保持未知，不使用演示地点冒充已查结果。\n', 'utf8');
await appendFile(resolve(destination, '启动说明.md'), '\n## 图鉴、动态形象与答复朗读\n\n“景点·美食·民俗”页面底部的“探索更多”可直接打开风物图鉴。十二角色均有用户提供视频剪出的站立/讲话静音MP4；实际朗读开始时播放讲话动作，停止/结束时回到站立。暂停、减少动态偏好或视频失败使用同视频静态首帧。动作是通用口型，不是逐字唇同步。答复可主动朗读，使用设备已安装的本地中文声音，无新音频文件或云端TTS接口；不是十二种独立音色。停止、新问题或切页取消声音；声音缺失保留文字，不保证每台设备都有中文声音。\n', 'utf8');
async function walk(path) { for (const entry of await readdir(path, { withFileTypes: true })) { const file = resolve(path, entry.name); if (entry.isDirectory()) await walk(file); else if (entry.isFile() && entry.name !== '版本清单.json') { const data = await readFile(file); files.push({ path: relative(destination, file).replaceAll('\\', '/'), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }); } } }
await walk(destination);
await writeFile(resolve(destination, '版本清单.json'), JSON.stringify({ createdAt: new Date().toISOString(), scope: '只含静态站点与标准库启动器，不含配置/原始资料/日志', node: process.version, files }, null, 2));
console.log(`离线演示构建完成：${files.length}个文件，${files.reduce((sum, file) => sum + file.bytes, 0)}字节。目录：.local_demo`);
