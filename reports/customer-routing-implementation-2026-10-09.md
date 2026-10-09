# 客户实测问题1—5：修复与验收

本批按275个文件快照与基线299项测试开展，源码基线位于 `.web_review/customer-routing-before`；已有工作保留。

## 改动文件与行为影响

| 文件 | 改动与行为影响 |
| --- | --- |
| `src/services/itineraryRecommendation.js` | 加入“有没有推荐”和X日游；节点、服务完整已审问答排除在推荐生成之外，原有天数、候选白名单和证据校验不变。 |
| `src/services/placeRecommendation.js`（新增） | 以四个主打节点已审简介生成宽泛/月份/季节推荐，附相关推荐、追问和节点入口；复用全部节点名称与别名识别，排除具体事实、住宿品牌、美食和普通创作需求，简短求推荐保留正在进行的住宿任务。 |
| `src/services/travelAdvice.js` | 补规划、X日游、自然山水、预算与以内的识别；主题旅行预算不当作每晚房价，条件引导记下日期/预算/兴趣，并避免重复追问已给预算。 |
| `server/chat.mjs` | 完整已审问答先于模型分类和推荐返回现有游客版原文；行程之后接入景点推荐，去除重复planChat调用，合并动态待核提示及后续入口。 |
| `scripts/customer-routing.test.mjs`（新增） | 新增42项客户问题、全部已审问答优先级、季节边界、住宿上下文、三日游、真实HTTP/SSE及票价待核场景回归，模拟供应商、使用真实版本化语料。 |
| `scripts/recommendation.test.mjs` | 保留原测试问题，将其中完整已审服务问答改为断言preset原文与出处，符合本批禁止推荐劫持已审问答的要求。 |

源码整理限上述文件：删除重复路由调用，复用节点名/别名与主题引导，集中动态待核文案。未删除文件，未增加依赖/框架/构建步骤；README、UI、账号、天气交通供应商、上下文纠正模块及所有已审语料均未改动。

## 逐项与全量验证

| 阶段/命令 | 结果 |
| --- | --- |
| 基线 `node --test scripts/*test.mjs` | 299/299通过。 |
| 问题1专项、content、routing、qa | 30项通过，包含全部节点/服务已审问答在无节点和规划历史下返回原游客版。 |
| 问题2专项、content、routing、酒店、itinerary | 57项通过，2000以内作为旅行预算，明确住宿预算仍进住宿流程。 |
| 问题3专项、route-quality、itinerary、routing | 57项通过，三日游生成3天2夜；HTTP SSE全部增量与最终正文相同。 |
| 问题4专项、content、atlas、curation | 37项通过，季节景点推荐与明确行程保留各自优先级。 |
| 问题5专项、content、routing、qa | 最终62项通过，覆盖无证据、证据未选中、有相关网页但无票价证据三种状态。 |
| 全量 `node --test scripts/*test.mjs` | 341/341通过，0失败、0跳过；新增42项。 |
| `npm run build` | prebuild及生产构建通过。 |
| 指定11套件 | test:agents、routing、qa、itinerary、experience、atlas、content、curation、speech、foundation、guide全部通过。 |
| `python .web_review/customer-routing-guards.py` | 安全核心、chat原校验/工具分支、SSE、行程白名单/证据、语料与向量索引均保持；编译CSS一致，未检出服务密钥。 |
| `git diff --check` | 无输出，通过。 |

日志见 `customer-routing-baseline/step1/step2/step3/step4/step5/tests/build/suite-*-2026-10-09.log`。保护项见 `customer-routing-guards-2026-10-09.json`，真实本机与源站15问见 `customer-routing-live-2026-10-09.json`、`customer-routing-production-2026-10-09.json`；服务器Node20结果见 `customer-routing-node20-tests-2026-10-09.log`。

初次全量验证发现旧服务推荐优先级与本批红线冲突：服务已审问题“只有一天时间，推荐哪条线？”此前按生成行程断言。现推荐入口排除已审服务问答，在线/离线返回原游客版；原测试保留问题并检查原文和出处。真实接口随后发现傅家边有相关网页但无可确认票价，这种情况同样附上卡片和追问，未将网页价目视为已核票价。

## 客户15问

| 问题 | 验收行为 |
| --- | --- |
| 有没有推荐 | planning或guide，来自已审候选，不进入闲聊。 |
| 溧水，自然，2000以内，明天出发 | needs_input，记下预算、明确出发日期及山水兴趣，给出缺条件选项。 |
| 能帮我完成三日游溧水的规划吗 | planning，3天2夜、第1/2/3天完整分段。 |
| 溧水十月有什么值得去的 | guide，四处已审简介、主题卡片、引导和节点链接。 |
| 傅家边门票多少钱 | 票价待核专用提示、确认渠道、傅家边主题卡片和追问；不编造价格。 |
| 周园值得去吗？ | preset，现有游客版原文。 |
| 周邦彦和溧水有什么关系？ | preset，现有游客版原文。 |
| 天生桥是天然的还是人工的？ | preset，现有游客版原文。 |
| 胭脂河的水为什么是红的？ | preset，现有游客版原文。 |
| 无想山名字是怎么来的？ | preset，原文保留传说边界。 |
| 傅家边什么时候去最好？ | preset，不被季节推荐覆盖。 |
| 石臼湖名字怎么来的？ | preset，现有游客版原文。 |
| 石臼湖水上列车是什么？ | preset，不误入交通服务。 |
| 洪蓝手抓鸡怎么吃？ | preset，不误入其他主题推荐。 |
| 骆山大龙是几级非遗？ | preset，原文及审核来源保持。 |

所有15问均断言不出现“暂未找到足够相关的资料”“这次答复暂时未能完整核对”。动态票价无确认依据时仍保留待核，不将其伪装为查证结果；普通未知问题原话术继续保留。

## 发布与边界

本批发布目标仅为lsguide.cn；具体版本、回退目录、源站路由与cyberemotionlab.cn保护项见 `customer-routing-deployment-2026-10-09.json`。既有Nginx/Cloudflare/TLS配置不改动，不处理用户说明的525。源站验收不声称公网HTTPS已恢复。

季节推荐目前复用四个主打景点，没有基于当前花期、果品成熟或活动档期加权；出行前仍需经营方确认。新增景点推荐入口用于在线服务端，未改未点名的离线ask模块，离线仍沿用已有固定问答、行程和发现建议。没有进行真实手机或新一轮游客测试；15问为自动接口走查，不替代客户复测。
