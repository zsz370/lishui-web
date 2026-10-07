# 遇见美溧 · 淮源姐单导游版

2026-10-07：用户决定将山水、美食、民俗和出行内容全部整合给淮源姐。当前只有一个角色与一段对话，其他11位已从界面、角色注册和发布资源移除。旧原始素材/阶段材料保留历史。

[本轮验收与发布](docs/单导游改版验收_2026-10-07.md) · [当前行动](../01_项目管理/现在要做什么_2026-10-07.md) · [新版运行包](../05_交付与申报/02_运行包与启动/淮源姐单导游_2026-10-07/README.md)

首页可直接提问，`/guide`为统一对话；`/nodes`发现32项风物、`/atlas`翻阅图鉴、`/culture/dragon`完成文化三题、`/services`查询旅途工具、`/itinerary`编辑多日行程和生成随身卡。首页保留三个风景每5秒渐变及淮源姐透明动态。浏览器标签仅“遇见美溧”。

## 本地启动

需要Node20或更高版本。

```powershell
npm ci
npm run build
npm run dev
```

`npm run dev`同时启动Vite127.0.0.1:5173及API127.0.0.1:8787；需根据`config/integrations.env.example`配置本机`config/integrations.env.local`。只看页面用`npm run dev:web`，离线完整流程用下述离线包。真实密钥只放服务端环境文件，不能用VITE_变量或放public。

```powershell
npm run demo:offline:build
npm run demo:offline:serve
```

离线资料页默认127.0.0.1:4493，可阅读资料、已审固定问答、文化小任务和行程编辑/导出；开放RAG、实时地图/天气/住宿/翻译未连接，外部出处及导航仍需联网。已验证的新ZIP见运行包入口，完整解压后`node start.mjs`。

## 知识与接口

135条已审QA全部归淮源姐，32风物与8类服务保留；新增内容为48条节点问答及18条设施行前核对建议，待核/撤下资料继续隔离。更新语料后需运行`node scripts/export-reviewed-corpus.mjs`与`npm run rag:index`，再重启API。访客答复展示简洁正文，来源和审核依据保留在数据及验收清单中。

`/api/guide`注册一个向导，`/api/chat`返回当前答复，`/api/chat/stream`发出真实任务进度及正文delta；停止会取消请求。常见已审问题直接回答，开放检索只用相关证据，未找到时明确未知。服务调用按需求进行，旧“部门转交/单多角色比较”不再是现行架构。

对话只存在当前页面内存，站内导航连续，刷新/新对话结束；后端不建聊天数据库。个人行程仍保存当前浏览器，可在行程页清空。设备本地中文声音用于主动朗读，自然音色接入仍待实施。

## 验证

```powershell
node --test (Get-ChildItem scripts -Filter '*test.mjs').FullName
npm run audit:guide
```

本地及目标Node20的本批回归均116项通过，生产构建通过。[内容补强清单](reports/content-expansion-2026-10-07.md)逐项保留来源与审核状态；既有源码独立安装和离线解压记录见历史验收。开发检查与浏览器验证不能等同新游客测试或真实手机验收。

## 发布

lsguide.cn源站版本20261007-content-40921c0c1a，前端与API已更新，135条索引就绪；cyberemotionlab.cn配置、受检文件与进程未变。2026-10-07公网根域/www复验仍返回Cloudflare 525，HTTPS访问尚未恢复，需另行排查握手问题。[部署核对记录](reports/deployment-2026-10-07.json)保留版本与回退目录。

历史说明：旧代码与人物备份在`.web_review/2026-10-07-单导游改版前`，10/6及更早文档仅记录当时的角色与协作架构，不代表当前产品。[技术文档索引](docs/README.md)保留已有审核和制作证据。每轮实际完成后同步根目录两份管理清单。
