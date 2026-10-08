# 淮源姐旅行 Agent 改进与走查

日期：2026-10-08。目标：修复“国庆溧水两天一夜三人旅游方案”只推荐重复商圈的问题，参考用户《模板.md》中的旅行 Agent 项目完善规划与多轮修改。

## 本次结果

默认交通偏好不再锁定城区模板。每天有不同的主要游览点，午餐就近衔接，跨日安排晚餐与住宿选择；国庆、人数、天数、夜数、主题、节奏、交通分别处理。用户没有提供具体日期时，国庆标签不会被补成今天或某一天的入住日期。

修订支持“第二天上午换成周园，第一天和其他安排不变”，读取上一份实际方案来定位时段。AI 推荐的地点仍只是提案，不能自动成为游客已选择的酒店片区。第三站按游览站计算，午餐不占一个游览站编号。

明确交通时查询景点间地图路线；明确日期且在预报范围内时查询天气；明确入住退房且需要过夜时查询住宿。查询结果单独进入实时工具证据与专家 trace。生成器继续只选择已审地点编号，校验之后才流式显示，不接受模型自创的价格、景点或证据编号。

## 模板参考与落地

| 参考 | 实际阅读位置 | 本项目落地 |
|---|---|---|
| TripStar | [结构化行程模型](https://github.com/1sdv/TripStar/blob/8c5dbdae420c34f5e04f6a2bab3cc1eddd0a0a0d/backend/app/models/schemas.py)、[行程上下文问答](https://github.com/1sdv/TripStar/blob/8c5dbdae420c34f5e04f6a2bab3cc1eddd0a0a0d/backend/app/services/chat_service.py) | 分开记录日程、餐饮、住宿、交通与实际方案上下文。 |
| Azure AI Travel Agents | [工作流编排](https://github.com/Azure-Samples/azure-ai-travel-agents/blob/67e16b9075cc1f9e279e4dfae1d7102b9bef6c8e/packages/api-maf-python/src/orchestrator/workflow.py)、[项目角色分工](https://github.com/Azure-Samples/azure-ai-travel-agents#overview) | 需求理解、候选推荐、编排、工具执行各有职责，共享条件和证据。 |
| ScholarChen20/travel_agent | [规划、查询、修改、闲聊分流与工具调用](https://github.com/ScholarChen20/travel_agent/blob/c3f341756b80bb24d09873b9afbc0c02cf7a6281/backend/app/agents/trip_planner_agent.py) | 规划与局部修改分别处理；天气、住宿和地图来自已有适配器。 |

以上用于架构参考；本次实现仍为 React + 原生 Node HTTP，新增依赖为零。维持真实供应商流式处理、淮源姐唯一对外角色、已审知识库以及当前页面设计。

## 改动文件清单

| 文件 | 说明 |
|---|---|
| `src/services/itineraryRecommendation.js` | 分开兴趣与节奏，去除默认公共交通造成的商圈限制，安排不同日主题、就近餐饮、晚间与三人住宿选择，并支持局部改线。 |
| `src/services/tripConditions.js` | 识别天数与晚/夜，防止“第2天”被当成新旅行时长，国庆只作为未指定具体日期的标签。 |
| `src/services/chatContext.js` | 两天一夜与明确日期衔接入住退房；总预算、每晚住宿预算分别处理。 |
| `src/services/conversationContext.js` | 规划批评继续重排，历史压缩保留节日锚点和上一份实际方案，问候不能取代方案上下文。 |
| `src/services/tripPlanningState.js`（新增） | 读取历史方案中的已知节点与时段，区分助手提案和游客选择，按天/时段/站点定位修改。 |
| `server/recommendation.mjs` | 模型选择继续经过证据校验，加强全程去重，接入真实工具并合并流式正文、来源和专家 trace。 |
| `server/recommendationTools.mjs`（新增） | 在条件满足时并行查询天气、住宿和地图；只采用明确的区内景区位置、合法数值及安全来源链接。 |
| `scripts/route-quality.test.mjs`（新增） | 22项路线质量、多轮修改、国庆日期边界、三人住宿、保存与 HTTP SSE 回归。 |
| `scripts/travel-agent-state.test.mjs`（新增） | 15项局部修改、实际方案记忆、地图歧义、工具协作、部分失败和取消回归。 |
| `README.md` | 添加旅行 Agent 验收入口，将旧160项测试结果标为历史批次记录。 |

## 验证输出

| 命令/走查 | 结果 |
|---|---|
| `npm run build`（含 prebuild） | 通过。 |
| `node --test scripts/*test.mjs` | 278/278通过，0失败、0跳过；本次新增37项。包含现有 agents/routing/itinerary/speech 与无私有语料目录的冷启动检查。 |
| `npm run demo:offline:build` | 通过，90个文件。 |
| 服务器Node20全量回归 | 278/278通过，0失败、0跳过。 |
| 源站12轮真实对话走查 | 全通过；中位数2332.5毫秒，最大5247毫秒。 |
| `git diff --check` | 通过。 |
| `python .web_review/route-quality-guards.py` | 6个原文件改变、4个新文件；0删除、0依赖、0密钥泄漏。core/chat、已审正文、账号与供应商校验、页面和源/构建 CSS 全部保持。 |
| 真实模型/工具12轮走查 | 全通过；当前 Qwen/Qwen3.5-35B-A3B。样本完成耗时中位数4056.5毫秒、最大6912毫秒；流式首段最大376毫秒。仅为本次样本。 |

证据文件：`route-quality-tests-2026-10-08.log`、`route-quality-build-2026-10-08.log`、`route-quality-live-2026-10-08.json`、`route-quality-guards-2026-10-08.json`。

## 对话走查

1. “国庆溧水两天一夜三人旅游方案”：两日不同主题、晚间安排和三人房型选择；无虚构节庆表演与采摘。
2. “第二天上午换成周园，第一天和其他安排不变”：仅替换对应时段，第一天真实顺序保留。
3. “改成亲子一日游”：变成一天、零过夜，仍保留三人和国庆。
4. “想轻松一点，少走路”：保留亲子兴趣，降低步行强度，无登顶承诺。
5. “改成两天自驾游”：恢复两天一夜，自驾由真实地图查询衔接。
6. “这个回答真是太差劲了，保留周园，不去无想山”：重新规划并遵守保留/排除条件。
7. “你好，今天怎么样”：普通对话独立处理。
8. “按刚才条件找住宿”：继续住宿流程；没有具体日期时只补日期，不假设酒店片区。
9. 提供明确入住退房和每晚600元：实际住宿查询保留正确日期与预算。
10. 新的两人自驾湖景问题：不沿用上一趟的三人、亲子或国庆条件。
11. 改为一天、只去天生桥与无想山：正确取消跨日住宿。
12. 明确2026年10月10日出发的三人两天一夜自驾：文化、规划、天气、住宿、路线五位专家完成；实查天气、住宿与一段可明确定位的地图路线。

## 安全、事实与体验边界

- `server/core.mjs`、`server/chat.mjs` 全文与本次基线一致，未改变注入防护、数字/引用/传说检查、限流、origin、域名、safeUrl与输入校验。
- `presetQA`、`foundationQA`、节点简介/来源、账号接口和数据库规则未改变；未增加未经审核的事实或旅游素材。
- 实时地图不会把东屏湖小区、大道、停车场或公交站当作景区；找不到明确区内景区本体时不写距离与耗时。当前默认路线的东屏湖岸线仍需在行程卡选择实际可达观景位置，不能宣称所有路段已完成精确导航。
- 已生成方案在当前会话中用于修订；刷新后仍按原设计结束完整对话、保留偏好与草稿。六条历史与请求大小上限维持不变。
- 具体酒店不是预订结果，三人的入住能力需通过详情页核对；不把搜索报价当作三人房价或库存承诺。
- 页面设计、字体、配色、布局、动效与构建 CSS 保持原样。

## 部署

目标仅 `lsguide.cn` 的静态文件与文旅 API。发布脚本保留旧静态资源与独立备份，可回滚。已发布版本 `20261008-route-quality-568db1fe95`，API PID `2372872`。服务器Node20回归278/278通过；源站12轮真实对话全通过，源站页面与形象资源HTTP200，API ready=true、127条语料与原向量哈希一致。校验88份静态文件、保留384份旧hash资源；cyberemotionlab.cn的532个文件、进程、端口与Nginx配置保持一致。公共HTTPS 525 按用户要求不处理。


源站证据：`route-quality-production-2026-10-08.json`、`route-quality-node20-tests-2026-10-08.log`、`route-quality-deployment-2026-10-08.json`。浏览器实图：`route-quality-origin-question-2026-10-08.png`、`route-quality-origin-stay-2026-10-08.png`。

浏览器源站验收：原问题的晚间与三人住宿建议可见；实际点击“保留天数，改成亲子游”后，仍为国庆、2天1夜、3人，并有孩子的游览引导。记录见 `route-quality-browser-2026-10-08.json`。
