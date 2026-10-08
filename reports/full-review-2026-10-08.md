# 遇见美溧完整复评与修复 · 2026-10-08

本轮以开始前194文件快照为基准，保留已有未提交改动。当前设计、照片、动态角色、已审问答正文、账号后台及安全校验保持原样；没有删除原文件或新增依赖。审查覆盖前端路由/内容/互动/导览/行程/账号、服务端编排与流式、外部工具、语料和发布流程，重点修复对话连续性。

## 发现与修复

| 级别 | 复现与用户影响 | 修复 |
| --- | --- | --- |
| P1 | 私有docs被忽略，运行时却读取它；新工作目录无法加载知识，归档测试与审计失败。 | 已审数据作为唯一运行导出；冷启动全部其他测试、审计和导出通过，缺向量明确提示建索引。 |
| P1 | 多轮问候挤掉旅行条件；知识问答误记为“已选择目的地”，酒店答复串用无想山。 | 保留真实用户任务/条件锚点；助手推荐与纯知识询问不建立用户目的地。 |
| P1 | “不要旅游例子”误建旅行话题，普通改写走知识检索；问候覆盖待修改作品。 | 否定话题统一处理；连续改写保留真实作品与原始要求，移除中间礼貌轮次；真实模型重现后验证修复。 |
| P1 | 未经数字/引用/传说核查的模型文字先通过SSE发送，再被最终答复否定。 | SSE发送层与前端同时阻止未校验事实delta；普通聊天仍真实token流，推荐仍校验后逐时段显示。 |
| P1 | 导游偏好与未发送草稿未按账号隔离，登录过期/换账号可串用条件。 | 身份确认后读取v2所属缓存；访客、A、B隔离，旧归属不明缓存不自动展示。 |
| P2 | 新人数/交通/兴趣、否定地点与替换无法正确覆盖；总预算被当作每晚房价。 | 更新最新实际条件，替换旧地点，分开预算用途；否定酒店/天气不触发无关服务；不同天避免重复同一景点。 |
| P2 | 单独回复“明天”、中文日期不保留，出发/返程与入住/退房混用，周末默认今天。 | 真实日历解析、命名日期绑定与偏好保存；不完整日期按原needs_input继续询问。 |
| P2 | “无想山呢”丢失上一轮门票维度；“第一站/这两处”串题；翻译上一段取不到文字。 | 保留知识维度及实际上一轮地点顺序；歧义提供选择；翻译最近完整答案，明确引文优先。 |
| P2 | 六条中文长回答超过24KB，被接口拒绝后表现为“记忆丢失”。 | 保持原输入上限，序列化前优先缩短旧助手长文并去空；真实用户条件保留。 |
| P2 | 修改住宿条件后旧结果晚到覆盖；账号筛选旧列表覆盖回收站，加载中显示假空列表。 | 取消/请求代次防止旧结果回填，加载/操作状态准确显示；有意延迟的浏览器夹具验证。 |
| P2 | 懒加载失败整页空白，未知路由静默打开首页，路由焦点可能落到旧标题。 | 明确恢复/404入口、同步错误状态、只聚焦可见新标题。 |
| P2 | 站内离开导览时DOM滚动位置重置为零，返回时丢失阅读位置。 | 布局提交后同步恢复，忽略隐藏滚动事件，卸载不读无效DOM位置；432.67像素往返验证一致。 |

## 改动文件

相对本轮快照28个已有文件修改、10个新增文件；下面每个文件分别说明。此前的server/chat.mjs未在本轮修改。

| 文件 | 类型 | 一句话说明 |
| --- | --- | --- |
| [README.md](E:/数媒/lishui-web/README.md) | 修改 | 补充复评记录、可移植语料流程、集中对话测试命令与实际流式展示策略。 |
| [package.json](E:/数媒/lishui-web/package.json) | 修改 | 知识导出不依赖私有归档；新增历史归档、对话与复评测试命令，依赖不变。 |
| [scripts/answer-feedback.test.mjs](E:/数媒/lishui-web/scripts/answer-feedback.test.mjs) | 修改 | 真实提前token测试针对普通聊天；事实流提前释放由新增反例测试禁止。 |
| [scripts/audit-guide.mjs](E:/数媒/lishui-web/scripts/audit-guide.mjs) | 修改 | 无本地向量时继续执行材料审计，并明确提示建索引，不能误报API就绪。 |
| [scripts/content-expansion.test.mjs](E:/数媒/lishui-web/scripts/content-expansion.test.mjs) | 修改 | 当前已审/待核断言改用版本化数据，新克隆无需私有导出文件。 |
| [scripts/export-reviewed-corpus.mjs](E:/数媒/lishui-web/scripts/export-reviewed-corpus.mjs) | 修改 | 与服务端共用同一已审语料导出，私有历史标准化成为单独命令。 |
| [scripts/fixtures/normalization-review.json](E:/数媒/lishui-web/scripts/fixtures/normalization-review.json) | 新增 | 新增3项历史修订的最小审计夹具，不含未审答案、个人路径或密钥。 |
| [scripts/foundation-qa.test.mjs](E:/数媒/lishui-web/scripts/foundation-qa.test.mjs) | 修改 | 历史修订使用脱敏归档夹具，当前语料断言不依赖docs。 |
| [scripts/review-dialogue.test.mjs](E:/数媒/lishui-web/scripts/review-dialogue.test.mjs) | 新增 | 新增53项对话回归，覆盖长历史、否定修订、日期、预算、指代、话题切换和实际HTTP SSE。 |
| [scripts/review-integrity.test.mjs](E:/数媒/lishui-web/scripts/review-integrity.test.mjs) | 新增 | 新增6项完整性回归，覆盖原语料哈希、晚响应、账号缓存与无私有文件冷启动。 |
| [scripts/single-guide.test.mjs](E:/数媒/lishui-web/scripts/single-guide.test.mjs) | 修改 | 校验当前统一语料；已有向量严格校验，无向量的静态/测试工作目录可验证角色。 |
| [server/conversation.mjs](E:/数媒/lishui-web/server/conversation.mjs) | 修改 | 普通聊天保留实际待改写作品；纯问候不携带旧旅行任务，下一轮仍能接回条件。 |
| [server/dialogueRouting.mjs](E:/数媒/lishui-web/server/dialogueRouting.mjs) | 修改 | 多地点指代用选项澄清，单地点事实追问复用对应已审答案，避免猜地点或串题。 |
| [server/index.mjs](E:/数媒/lishui-web/server/index.mjs) | 修改 | 仅在SSE发送层过滤未经校验的事实delta；输入/来源/限流/超时逻辑保持原样。 |
| [server/knowledge.mjs](E:/数媒/lishui-web/server/knowledge.mjs) | 修改 | 运行语料从版本化已审数据加载，移除对gitignored私有docs的运行依赖。 |
| [server/recommendation.mjs](E:/数媒/lishui-web/server/recommendation.mjs) | 修改 | 已校验推荐标记verified、逐时段显示；跨日景点去重，街区可继续停留。 |
| [src/App.jsx](E:/数媒/lishui-web/src/App.jsx) | 修改 | 为所有业务页面接入加载错误恢复与明确的未知路由页面。 |
| [src/components/ChatPanel.jsx](E:/数媒/lishui-web/src/components/ChatPanel.jsx) | 修改 | 同步恢复最后有效滚动位置，避免隐藏/卸载零值覆盖；恢复账号前禁止发送，缓存提示如实显示。 |
| [src/components/Layout.jsx](E:/数媒/lishui-web/src/components/Layout.jsx) | 修改 | 异步路由完成后聚焦可见标题，避免选择仍隐藏的旧标题。 |
| [src/components/PageRecovery.jsx](E:/数媒/lishui-web/src/components/PageRecovery.jsx) | 新增 | 新增错误边界、重新加载/返回入口及恢复页焦点，同步清除旧路由错误。 |
| [src/components/StayPlanner.jsx](E:/数媒/lishui-web/src/components/StayPlanner.jsx) | 修改 | 条件变化或卸载时取消请求，忽略旧响应，立即同步偏好并提供真实加载提示。 |
| [src/data/chatRouting.js](E:/数媒/lishui-web/src/data/chatRouting.js) | 修改 | 追问继承知识维度；引用/完整文本翻译单独执行，避免误检索与旧酒店意图抢答。 |
| [src/data/guideMemory.js](E:/数媒/lishui-web/src/data/guideMemory.js) | 修改 | 仅实际出行选择写入条件；保存日历日期、交通纠正和返程日；导游缓存按账号隔离。 |
| [src/data/guideSession.jsx](E:/数媒/lishui-web/src/data/guideSession.jsx) | 修改 | 账号确认后恢复对应缓存，切换时结束旧对话；错误状态不宣称已经保存。 |
| [src/data/reviewedCorpus.js](E:/数媒/lishui-web/src/data/reviewedCorpus.js) | 新增 | 新增统一版本化语料导出，复用原已审数据，127条原顺序与内容哈希一致。 |
| [src/pages/Account.jsx](E:/数媒/lishui-web/src/pages/Account.jsx) | 修改 | 列表加载、筛选和账号变化忽略过期响应；加载中不显示假空列表或开放旧卡操作。 |
| [src/pages/Guide.jsx](E:/数媒/lishui-web/src/pages/Guide.jsx) | 修改 | 等待账号所属缓存恢复再消费深链接问题，避免恢复过程取消首次提问。 |
| [src/services/api.js](E:/数媒/lishui-web/src/services/api.js) | 修改 | 限制序列化UTF-8请求体大小，原JSON回退同样处理，只展示校验可见事件。 |
| [src/services/casualConversation.js](E:/数媒/lishui-web/src/services/casualConversation.js) | 修改 | 否定旅游例子不被当成旅行请求，闲聊与旅行追问共用话题处理。 |
| [src/services/chatContext.js](E:/数媒/lishui-web/src/services/chatContext.js) | 修改 | 区分入住/退房与出发/返回、总预算与房价；未知周末日期不默认今天；翻译取上一条完整答案。 |
| [src/services/chatDisplay.js](E:/数媒/lishui-web/src/services/chatDisplay.js) | 新增 | 新增统一事件展示策略：普通聊天及已校验推荐delta、任务完成事件可显示。 |
| [src/services/chatPayload.js](E:/数媒/lishui-web/src/services/chatPayload.js) | 新增 | 新增24KB以内请求整理，优先缩短旧助手长文，保留真实用户条件与最新答案。 |
| [src/services/conversationContext.js](E:/数媒/lishui-web/src/services/conversationContext.js) | 修改 | 真实用户任务锚点、否定地点/替换、顺序指代及事实维度继承；普通改写不被问候覆盖。 |
| [src/services/itineraryRecommendation.js](E:/数媒/lishui-web/src/services/itineraryRecommendation.js) | 修改 | 串联刚介绍地点、替换旧选择，最新交通/兴趣覆盖旧条件，正文明确衔接新日期人数预算。 |
| [src/services/latestRequest.js](E:/数媒/lishui-web/src/services/latestRequest.js) | 新增 | 新增请求代次与取消器，让忽略abort的晚到响应也不能覆盖新视图。 |
| [src/services/translationContext.js](E:/数媒/lishui-web/src/services/translationContext.js) | 新增 | 新增纯翻译取文：明确引文优先，引用只取最近完整答案，无文本时保持空。 |
| [src/services/travelAdvice.js](E:/数媒/lishui-web/src/services/travelAdvice.js) | 修改 | 否定的酒店/天气需求不触发对应服务，保持原有工具与事实内容。 |
| [src/services/tripConditions.js](E:/数媒/lishui-web/src/services/tripConditions.js) | 新增 | 集中否定服务/话题、人数、同行条件、交通模式和真实日历日期的处理。 |

另有本机及服务器gitignored的config/integrations.env.local仅修改LLM_MODEL，凭据和其他配置保持原样，未进入前端或发布归档。

验收报告/日志位于reports；.web_review中的本机延迟、失败夹具及部署辅助脚本不进入生产应用或公共目录。

## 验证命令与证据

| 验证 | 输出摘要 |
| --- | --- |
| npm run build（含prebuild） | 通过，节点介绍校验通过；主包gzip约149.8KB。 |
| node --test scripts/*test.mjs | 241/241通过，0失败、0跳过；开始时182项，新增59项。 |
| npm run test:dialogue | 62/62通过，其中本轮新增53项对话测试，保留原9项。 |
| 冷启动测试 | 无docs、无密钥、无runtime.local副本中运行其余全部235项测试、导游审计和语料导出通过。 |
| npm run audit:guide | 唯一导游、资料归属和向量一致；127条、1024维、BAAI/bge-m3，原哈希一致。 |
| npm audit --omit=dev --json | 生产依赖0已知漏洞；未变更依赖/锁文件。 |
| npm run demo:offline:build | 通过，90个文件；离线不假装有实时工具或自由聊天模型。 |
| 真实模型/工具走查 | 18次成功，Qwen/Qwen3.5-35B-A3B；普通改写、问候、换题、长旅行历史、门票指代和真实百度翻译通过。 |
| 浏览器 | 账号/访客草稿隔离、慢响应、重试、恢复/404、图鉴、390像素布局、模拟键盘、阅读位置通过。 |
| 源站真实对话 | 新模型9个场景通过：普通连续改写、住宿条件、门票/指代、兴趣纠正、翻译、真实RAG与天气；普通SSE有真实delta，未经校验RAG无delta。 |
| 服务器真实适配器检查 | 博查、高德地点/路线、百度翻译、和风天气、LLM、向量、住宿查询共8项全部通过；住宿返回5条报价，不宣称有客房库存。 |
| 原有红线比对 | core及chat.mjs整体相同；index校验块相同；已审正文/原向量、账号后台/RLS、依赖和CSS源文件未改。 |
| 静态资源/密钥扫描 | 60项样式/媒体比对；主CSS只有Tailwind因class语法自动生成一项未使用的.static工具类，应用样式无变化；0密钥命中、0意外删除。 |

原始证据：[全部测试](E:/数媒/lishui-web/reports/review-tests-2026-10-08.log)、[构建](E:/数媒/lishui-web/reports/review-build-2026-10-08.log)、[对话测试](E:/数媒/lishui-web/reports/review-dialogue-regression-2026-10-08.log)、[真实走查](E:/数媒/lishui-web/reports/review-live-check-2026-10-08.json)、[浏览器记录](E:/数媒/lishui-web/reports/review-browser-2026-10-08.json)、[保护比对](E:/数媒/lishui-web/reports/review-guards-2026-10-08.json)。

## 部署目标与核验

已发布版本20261008-review-4be2037264。前端88项文件校验、关键入口200、API及账号配置可用，服务器Node20完整241项测试通过；保留361个旧哈希资源。cyberemotionlab.cn共532个文件、相关进程/监听和Nginx配置均未变更。后端模型从4B切为35B-A3B，其余环境字节一致并备份可回退。源站真实对话9项与外部适配器8项通过，截图见review-origin-conversation-2026-10-08.png与review-origin-first-question-2026-10-08.png。

发布仅针对lsguide.cn的独立静态目录与lishui-guide-api.service，使用新版本目录、备份和失败回退；保留旧哈希资源以兼容仍打开旧版的浏览器。服务器Node20再次运行完整测试，校验127条语料和原哈希、账号配置、关键页面及真实对话。生产结果以[部署记录](E:/数媒/lishui-web/reports/review-deployment-2026-10-08.json)与[源站验收](E:/数媒/lishui-web/reports/review-production-check-2026-10-08.json)为准。

cyberemotionlab.cn文件/进程/3000监听与Nginx配置必须前后完全相同。按用户要求不处理Cloudflare/备案525，不把源站验证描述为公网HTTPS恢复。

新模型本机18次走查中位数603.5ms、最长4663ms；源站实际知识检索/生成的一次答复约14秒，仍需进一步观察向量/上游延迟，不能把短对话速度当成所有查询速度。

## 模型选择与计费

生产模型改为Qwen/Qwen3.5-35B-A3B；仅后端私有环境中的LLM_MODEL发生变化，保留原配置备份与回退。模型可用性来自[供应商模型中心](https://www.siliconflow.cn/models)，计费以[供应商价格页](https://siliconflow.cn/pricing)为准；按模型与token用量结算，未声明固定每次费用。它不能代替对话路由、用户条件和知识证据规则。

## 尚存限制与后续建议

- 供应商一次请求失败，另外有20–28秒的响应；旧4B成功走查中位数1137ms、最长28170ms。异常原记录在review-live-transient-2026-10-08.json，浏览器重试已验证。旧4B源站又发生断流后，对当前同一代码比较4B、9B、35B-A3B四个场景；35B-A3B为4/4，其他为3/4。选择35B-A3B，仅改服务端LLM_MODEL，向量模型、供应商、凭据与安全逻辑不变。四场景0.708/0.729/3.262/2.424秒；小样本不保证以后不出现网络或供应商故障。见review-model-comparison-2026-10-08.json。
- 请求仍保持原有6条/24KB安全上限，已优化选取真实任务锚点；非常长、频繁切换话题的对话仍可能遗漏早期细节。刷新/新对话结束历史；出行偏好和草稿继续保存，聊天未写入云端。
- 无法判定归属的v1导游偏好缓存保留原值但不自动加载；升级首次需重填导游偏好。已有行程卡、本机行程草稿与云端卡片不受影响。
- 桌面IAB验证了390像素与可视区域缩小；尚未在真实iOS/Android软键盘及系统中文音色上复测。已有语音start/end/取消回归通过。
- 具体设施、演出、房态及当期票价没有新证据时仍走现有核对规则；此次未新增事实或把未审内容变为已审。Supabase认证/归属/RLS逻辑未改，既有账号测试通过。
- 已授权的无邮箱确认、无验证码、会话到期重新登录保持现状；本轮不新增邮件、验证码或密码找回。
