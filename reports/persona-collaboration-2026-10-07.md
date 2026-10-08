# 批次4＋5：淮源姐人格与专家工具协作验收

对外唯一角色为淮源姐；后台为6位功能专家，共享已审语料与安全规则。源站部署目标仅为 lsguide.cn。本批未修改已审QA正文、索引、server/core.mjs、server/index.mjs或provider实现，未新增依赖或角色形象，未删除文件。

## 人格卡与模板

[人格卡全文](persona-card-2026-10-07.md)逐字段呈现唯一源 `src/data/agentPersona.js`，包含身份、口吻、边界、三段开场、点击示例、追问规则、具体条件提示、表达与拒绝话术。

生成prompt引用人格卡，原有注入防护与任务安全限制仍保留。知识生成只收到用户明确给定的出行日期，默认天气日期不会被当作出发条件。动态住宿、交通概况改用短句；未知问题提供公告、现场核对与已审介绍路径，不编造电话或公众号名称。

两天规划仍按原流程调用生成与原有校验；校验后的表达层补齐日程格式。住宿日期不全时输出条件草案，不把模型推断当作活动或房态结论。没有放行任何被原数字、引用或传说检查拒绝的文本。

## 改动文件清单

| 文件 | 本批说明 |
| --- | --- |
| src/data/agentPersona.js（新增） | 唯一人格定义与共享system前缀。 |
| config/agent-system.plan.js | 保留唯一公开导游，新增6位功能专家、active协作声明与任务映射。 |
| server/chat.mjs | 任务归属改为专家，公开speaker仍为淮源姐；引用人格卡并增加来源协作元数据。 |
| src/data/personas.js | 公开名字与介绍引用人格卡，形象与注册仍只有一位。 |
| src/data/chatRouting.js | 明确跨日地点旅行补齐天气、住宿、路线任务，纯翻译与原needs_input判定不变。 |
| src/services/personaExpression.js（新增） | 无资料话术、明确条件投影与校验后的两天草案排版。 |
| src/services/guideCollaboration.js（新增） | 专家进度展示与来源分组，只收集实际选中证据和已返回工具来源。 |
| src/services/reviewedAnswer.js | 增加已审来源元数据，不改已审q/a或访客正文。 |
| src/services/followUpChoices.js | 提示引用人格卡；中文人数不重问，已给一端住宿日期只补另一端。 |
| src/services/chatContext.js | 只缩短住宿与交通概况模板，条件抽取逻辑保留。 |
| src/services/guideSuggestions.js | 兜底引用人格卡，保留已有已审主题引导。 |
| src/components/ChatPanel.jsx | 三段开场和可点击示例、真实专家进度、完成后协作说明。 |
| src/components/GuideChoices.jsx | 退房日期自填使用日期输入框。 |
| src/components/GuideCollaboration.jsx（新增） | 轻量状态标签与按需展开的来源分节，来源不混入朗读正文。 |
| src/components/GuideCollaboration.css（新增） | 使用现有色板，新增链接/展开入口满足44px触控目标。 |
| src/pages/About.jsx | 增加6位幕后专家与共享规则/非独立人格/AI辅助生成说明。 |
| scripts/persona-collaboration.test.mjs（新增） | 9项针对人格、专家、排版、条件、来源和安全边界的回归。 |
| scripts/agents.test.mjs | 专家身份与依赖断言替代旧的全部归导游断言。 |
| scripts/single-guide.test.mjs | 公开角色仍唯一；6个专家ID均不能用作游客对话角色。 |
| scripts/foundation-qa.test.mjs | 纯翻译执行者更新为翻译官，发言人仍为淮源姐。 |
| scripts/review-feedback.test.mjs | 检查保留已知条件、只问缺项，替代对冗长模板的断言。 |
| scripts/check-final-review-live.mjs | 实链脚本读取operations.trace并检查住宿专家。 |
| scripts/check-foundation-live.mjs | 实链脚本读取operations.trace，不引用已过期结构。 |
| scripts/serve-resilience-fixture.mjs | 天气进度夹具采用天气助理ID。 |
| README.md | 更新现状、历史标记与可操作的协作演示步骤。 |

新增验收文档/JSON/截图见本目录 `persona-*`；本机临时工具位于gitignored的 `.web_review/`，不作为生产代码。

## 专家定义与改造前后

| id | 名称 | 职责 | tools |
| --- | --- | --- | --- |
| expert_route | 路线顾问 | 地点定位、步行/自驾/公交路线 | map_search, route_plan |
| expert_stay | 住宿顾问 | 按日期/预算查住宿报价 | stay_search |
| expert_weather | 天气助理 | 溧水/南京城区7天预报 | weather_forecast |
| expert_culture | 文化学者 | 已审检索与联网补充核对 | knowledge_retrieval, web_search |
| expert_translate | 翻译官 | 多语翻译 | translate |
| expert_planning | 行程规划师 | 汇总实际结果、编排日程 | synthesis |

之前task.agentId与speaker均为淮源姐，部门定义不存在；现在仅任务执行身份分工，speaker、persona注册、节点与语料归属仍为淮源姐。support/shopping/accessibility和非翻译礼仪提示仍直接由导游提供咨询，未虚构第7位专家或工具执行。

并行、取消、超时、maxInflight、限流及依赖流程未改：天气/住宿/文化并行，路线在原住宿依赖后执行，规划汇总后再按需翻译。没有把路线改成与住宿同步查询，也不在界面声称四项全都并行。

## 对话走查

本机真实provider和127条真实已审索引运行，非模拟景区资料。记录见 [实链结果](persona-live-walkthrough-2026-10-07.json) 与 [浏览器记录](persona-browser-checks-2026-10-07.json)。

| 操作 | 观察结果 |
| --- | --- |
| 首次进入Guide | 欢迎、能力说明、示例问题三段自然呈现，示例点击直接发送。 |
| “周末两天、两个人、想看骆山大龙” | 看到天气助理、住宿顾问、文化学者、路线顾问，最后行程规划师；公开发言人仅淮源姐。 |
| 日期与报价边界 | 周末不擅自确定日期；缺入住/退房日期时住宿任务待补，不调用供应商；不重复问“两个人”。 |
| 天气与路线 | 当前默认当天预报明确标注，不能当作周末预报；地图仅定位候选“骆山”，缺出发地时不声称已有完整路线。候选仍须核对正式入口，不保证就是活动场地。 |
| 两天汇总 | 第一天围绕想了解的地方、第二天休息与返程，并标注活动待核、不保证演出；不是已落实行程。 |
| 来源展开 | 实际返回的天气/地图来源与已审文化来源分节；联网未被实际选用时不虚构联网来源栏。 |
| “2026-10-10入住，两个人，每晚300元，从南京南站出发，想找住宿” | 只追问退房日期，给住1晚/住2晚和自填日期，不重复入住、人数、预算或出发地。 |
| 未找到资料 | 单元走查得到“暂未找到…待核”，提供已有介绍、最新公告或现场工作人员路径，无编造联系方式。 |
| 手机390px | 无横向溢出；新增来源链接、选项、展开入口高度均≥44px。 |
| 关于页 | 显示6个职责，不提供角色切换，明确共享语料/安全规则、非独立人格与AI辅助整理。 |

首次实链发现模型未写两天草案、并有生成未通过原核验；随后加强模板与明确条件投影，日期不全使用条件草案。未通过核验的答复仍标未完成，不降低校验要求。

截图：[开场](persona-opening-2026-10-07.png)、[进行中](persona-experts-progress-2026-10-07.png)、[桌面协作](persona-experts-desktop-2026-10-07.png)、[手机协作](persona-experts-mobile-2026-10-07.png)、[只补退房](persona-followups-2026-10-07.png)、[关于团队](persona-about-experts-2026-10-07.png)。

## 验证输出

- `npm run build`：prebuild简介29/29通过，Vite生产构建通过；主JS约434.89KB，gzip152.01KB。
- `node --test (Get-ChildItem scripts -Filter '*test.mjs').FullName`：145通过、0失败，包含agents/routing/single-guide/speech/itinerary及新增人格协作回归。
- `npm run demo:offline:build`：通过，89文件；离线不宣称已运行实时专家查询。
- `python .web_review/batch45-guards.py`：validateChat、core、原数字/引用/传说校验、注入防护语句、needs_input判定、已审QA与索引及依赖均未改变，见 [保护项比对](persona-collaboration-guards-2026-10-07.json)。

首次发布（历史）：服务器Node20为144通过、0失败；版本 `20261007-persona-experts-bcb32c165b`，87个静态文件通过哈希核对。日期选项边界回归后追加一次修订发布；最终版本与回退目录以 [本批部署记录](persona-collaboration-deployment-2026-10-07.json)及本报告追加记录为准。

部署后[源站走查](persona-origin-walkthrough-2026-10-07.json)：同一演示问题依次记录天气、住宿、文化、路线、规划5位功能专家；住宿如实待补日期，其他本次任务完成。最终只有淮源姐发言，包含两天草案与待核边界，不重复人数；来源为真实天气/地图及已审文化资料。请求 `expert_route` 作为公开角色被原validateChat拒绝（400）。Nginx配置、cyberemotionlab.cn受检532个文件/进程/3000端口均未变化；密钥扫描0命中。不访问或排查备案阶段的525。

## 合规文案自查与遗留事项

唯一对外表述是“1 位主导游 + 专家工具协作”。专家为功能角色、非独立人格；前端persona注册仍只有淮源姐。不使用旧12个独立角色宣传，不复活旧素材，不增加外部依赖或事实联系方式。

本次未取得当期骆山大龙演出公告，具体活动与观看条件待核；没有补齐演示出行日期和出发地，故不能验收实际住宿报价/完整路线或称为已落实两天一晚。联网待核来源分组通过受控单元测试；本次真实演示实际采用已审文化证据，没有假称联网已查证。手机走查为浏览器尺寸模拟，未覆盖真实设备键盘与屏幕阅读器。保持现有动态形象与5秒首页轮播。本批不处理备案阶段525。

补充回归：住宿日期为“待定”或非法日期且另一端缺失时，日期选项不做无效相对日期计算，保持needs_input，不调用供应商。复用现有validDate只决定可展示选项，不修改server/core或chat的日期校验。

最终发布：`20261007-persona-experts-bce5871834`，前端与API均切换完成。目标Node20为145通过、0失败；API PID2338075，127条索引就绪且hash未变。87个静态文件校验通过，保留176个旧哈希资源；回退目录 `/var/backups/lishui-guide/20261007-persona-experts-bce5871834`。源站再次验证了专家角色请求400、日期“待定”仍needs_input以及完整演示的唯一发言人、5位功能专家、两天草案与来源分节。Nginx及cyberemotionlab.cn的532个受检文件/进程/3000端口仍未变化。Node20原始测试输出见 `persona-node20-tests-2026-10-07.log`，本机完整测试/构建输出位于 `.web_review/batch45-tests.log`、`batch45-build.log`。
