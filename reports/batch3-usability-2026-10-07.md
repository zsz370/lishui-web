# 批次 3：可用性、动态形象与内容移除验收

日期：2026-10-07。已发布版本：`20261007-usability-2665c3fd52`，目标域名为 **lsguide.cn**。本次同时更新前端与 `lishui-guide-api.service`；保留原有溧水色板，未增加依赖。

淮源姐的首屏、欢迎区、聊天页和小头像统一使用动态视频。平时站立，实际语音开始时切为讲话，语音自然结束、取消或失败后返回站立。移除了角色的手动动态开关。首页湖畔暮色、无想山、天生桥继续每 5 秒自动切换，并保留渐变。

用户提供的陆家大龙照片已接入；虾子灯、打社火、打五件已退出当前目录、问答和服务端索引，原问答只保留退役审计记录。当前为 **29 个节点、29 张节点配图、127 条已审问答（节点 94、服务 33）**，待核 10 条。没有新增地方事实。

## ① 改动文件清单

以下清单按批次开始时的本地备份比较，未把此前改版的其他未提交文件算成本批改动。除指定内容记录外，本批没有删除文件。

| 文件 | 本批改动说明 |
| --- | --- |
| `src/components/GuideMedia.jsx` | 始终播放动态资源，按统一语音状态切换视频，关闭视频控件、远程播放及画中画入口，并阻断视频鼠标命中。 |
| `src/components/GuidePortrait.jsx` | 移除人物动态开关，复用统一视频组件。 |
| `src/components/GuideAvatar.jsx` | 小头像也改用统一动态视频，避免入口仍展示静态角色。 |
| `src/services/guideSpeechActivity.js` | 集中记录实际播报状态，不同播报来源结束时互不误清。 |
| `src/services/answerSpeech.js` | 从真实语音 start/end/error/cancel 事件同步人物动作，准备声音时保持站立。 |
| `src/components/WelcomeGuide.jsx` | 欢迎语音同步人物状态，取消手动暂停人物按钮，并补充播报按钮 aria 标签。 |
| `src/components/HomeHero.jsx` | 移除首屏人物暂停按钮，继续使用原有 5 秒风景轮播与渐变。 |
| `src/pages/Home.jsx` | 移除欢迎人物的静态延迟展示参数。 |
| `src/pages/Home.css` | 删除首屏人物开关的旧样式。 |
| `src/styles/SingleGuide.css` | 删除人物开关的旧规则。 |
| `src/styles/Experience.css` | 为动态小头像保留圆形框及面部裁切。 |
| `public/nodes/c_ljd.jpg` | 接入用户提供的陆家大龙照片，原文件未改画面、未与骆山大龙混用。 |
| `src/data/nodeMedia.js` | 增加陆家大龙照片映射。 |
| `src/data/nodes.js` | 移除虾子灯、打社火、打五件三个节点。 |
| `src/data/nodeIntroductions.js` | 移除这三个节点的当前介绍。 |
| `src/data/collections.js` | 栏目不再包含这三个节点。 |
| `src/data/contentExpansionQA.js` | 当前已审及待核扩展问答只接受仍在目录中的节点。 |
| `src/data/homeDiscovery.js` | 首页打五件问题替换为已有已审溧水剪纸问题。 |
| `src/data/visitorAnswerCopy.js` | 清理退出节点对应的游客答复文案映射。 |
| `src/services/guideSuggestions.js` | 根据当前节点或主打节点提供已有已审问题，引导无答案时继续了解。 |
| `src/services/chat.js` | 为服务端无答案回复和离线兜底挂接主题卡片。 |
| `src/services/reviewedAnswer.js` | 固定问答附带所属节点，支持正确的主题上下文。 |
| `src/services/followUpChoices.js` | 复用日期、同行人数、住宿预算、总预算、起终点等追问选项，并支持另填日期或预算。 |
| `server/chat.mjs` | 仅调整既有 needs_input 文案、补充选项及合并答复中的选项字段，判定条件和安全校验保持。 |
| `src/services/travelAdvice.js` | 为既有本地 needs_input 答复补选项，避免总预算被住宿偏好解析成每晚房价。 |
| `src/services/chatContext.js` | 总预算与每晚住宿预算分别处理，保持已有请求字段及服务边界。 |
| `src/components/GuideChoices.jsx` | 展示选项化追问和自定义条件输入。 |
| `src/data/guideMemory.js` | 用白名单字段保存本地偏好与草稿，校验损坏数据，并生成独立的请求重试快照。 |
| `src/data/store.jsx` | 标识是否存在已保存行程，继续沿用现有行程持久化。 |
| `src/data/guideSession.jsx` | 保存条件和草稿、提供继续规划提示、保留聊天阅读位置，重试复用原请求快照。 |
| `src/pages/Guide.jsx` | 展示继续规划入口和已保存条件，点击后聚焦输入框。 |
| `src/services/chatViewport.js` | 判断手机可见视口收缩及消息是否靠近底部，缩放页面不误判为键盘。 |
| `src/components/ChatPanel.jsx` | 接入主题卡、追问、重试、语音 aria、键盘适配及滚动保持；答复正文不展示内部引用编号。 |
| `src/components/ChatUsability.css` | 聊天操作触控目标至少 44px，优化正文对比度及键盘收缩布局。 |
| `src/components/Layout.jsx` | 页面导航完成后聚焦正文标题，支持延迟加载内容和锚点。 |
| `index.html` | 增加软键盘视口调整声明 `interactive-widget=resizes-content`。 |
| `scripts/batch3-usability.test.mjs` | 增加 12 项语音、记忆、预算、重试快照、追问、兜底和视口测试。 |
| `scripts/atlas-content.test.mjs` | 更新移除后目录及配图断言，并验证旧行程不会恢复已退出节点。 |
| `scripts/content-expansion.test.mjs` | 更新已审覆盖数量并继续检查来源和审核状态。 |
| `scripts/export-reviewed-corpus.mjs` | 已退出内容归入退役审计，不继续进入当前语料。 |
| `scripts/retain-index-subset.mjs` | 对照批次前备份，仅在剩余文本完全一致时复用原向量；新增或修改文本会拒绝复用。 |
| `docs/corpus-audit/approved-corpus.json` | 已审索引语料从 135 条缩减为 127 条。 |
| `docs/corpus-audit/pending-review.json` | 待核区更新为当前有效节点和服务条目。 |
| `docs/corpus-audit/withdrawn-qa.json` | 归档退出节点的旧问答，累计退役记录 11 条。 |
| `docs/corpus-audit/qa-summary.json` | 更新节点、已审、待核和退役数量。 |
| `runtime.local/knowledge-index.json` | 同步 127 条当前语料及校验哈希，复用原 1024 维向量，无外部嵌入请求。 |
| `reports/batch3-photo-source-2026-10-07.json` | 记录照片的用户来源、本地路径与文件 SHA-256。 |
| `reports/batch3-security-2026-10-07.json` | 记录核心校验及生成安全防护未变化的检查结果。 |
| `reports/batch3-browser-checks-2026-10-07.json` | 保存浏览器验收结果与范围。 |
| `reports/batch3-deployment-2026-10-07.json` | 保存发布版本、服务器健康、源站 HTTP 和受保护站点核对结果。 |
| `reports/batch3-hero-motion-2026-10-07.png` | 记录鼠标移到人物处时无画中画浮层，以及自动切换到天生桥的首屏。 |
| `reports/batch3-guide-choices-2026-10-07.png` | 保存选项化追问界面。 |
| `reports/batch3-keyboard-review-2026-10-07.png` | 保存可见视口缩小时输入框完整显示的证据。 |
| `reports/batch3-lujia-photo-2026-10-07.png` | 保存陆家大龙照片及动态头像接入后的详情页。 |
| 本报告 | 汇总逐文件说明、测试、部署与未覆盖事项。 |

照片来源：用户在本轮明确提供 `E:\数媒\03_原始资料\图片素材\陆家大龙.jpg`，复制到 `public/nodes/c_ljd.jpg`，1260 × 828。沿用用户提供素材；没有另行推断摄影者或授权证书。

## ② 验证命令与输出摘要

| 命令或检查 | 输出摘要 |
| --- | --- |
| `npm run build` | 通过；含 prebuild；介绍覆盖 29/29，均有独立正文与出处；主 JS 430.58 kB / gzip 150.34 kB。 |
| `node --test scripts/*test.mjs` | 136 测试、136 通过、0 失败、0 跳过。包含内容、QA、foundation、routing、itinerary、语音和本批新增回归。 |
| `npm run test:routing` | 10/10 通过，包含 needs_input 不调用住宿供应商、SSE、取消和超时验证。 |
| `npm run test:itinerary` | 10/10 通过，包含刷新存储、日期、预算、路线失败与导出边界。 |
| `npm run test:content` | 5/5 通过，主打指南、游客版答复及传说边界保持。 |
| `npm run test:foundation` | 7/7 通过，基础来源、多轮住宿及服务分流保持。 |
| `npm run test:qa` | 6/6 通过，审核状态、原问题、待核隔离及意图分流保持。 |
| `npm run demo:offline:build` | 通过；86 文件、13,535,945 字节，离线演示仍使用本地固定问答和编辑工具。 |
| `node scripts/export-reviewed-corpus.mjs` | 当前已审 127、待核 10、退役 11。 |
| `node scripts/retain-index-subset.mjs` | 127 向量复用，1024 维；剩余问答文本与批次前完全一致，没有请求外部嵌入服务。需本次 `.web_review/batch3-before` 备份才能重跑这个一次性子集迁移工具。 |
| `git diff --check` | 通过；只提示本机 Git 的 LF/CRLF 转换，没有空白错误。 |
| `git diff --name-only --diff-filter=D` | 空，本批没有文件删除。 |
| 服务器 Node 20 全量测试 | 136/136 通过，发布前执行。 |
| 打包密钥扫描 | 7 项配置值仅用于本机匹配，发布包匹配数 0，配置密钥不进入前端或归档。 |

浏览器验收使用独立本机地址 `127.0.0.1:15180`：当前构建加真实 API 校验与 SSE，检索为空、外部供应商禁用，另有明确标识的单次 503 开关。因此没有利用假旅游事实证明功能，也没有修改正式服务的安全行为。验收页及夹具服务已关闭，用户的 `15174` 预览已刷新到最终版。

| 手工验收 | 结果 |
| --- | --- |
| 无想山未知问题 | 显示无可靠答案说明、无想山主题卡及三条已有已审问题。 |
| 全新行程 | 展示今天/明天/后天、1人/2人/3人以上、总预算以及出发地选择；住宿展示入住日期、人数、每晚预算选项。 |
| 条件与草稿刷新 | 刷新后显示“继续上次的行程规划？”，保留 2026-10-08、2人、500元总预算和未发送草稿。 |
| 继续规划 | 草稿未自动提交，焦点进入提问输入框。 |
| 单次查询失败 | 显示错误及重试按钮；移除当前地点、修改草稿后重试，请求体仍与失败请求逐字段相同。 |
| 聊天阅读位置 | 稳定位置跨页面返回前后均为 95.33px；返回页焦点进入 h1。 |
| 手机宽度 | 390px 视口，内容宽度与可用宽度一致，没有横向溢出。 |
| 模拟软键盘收缩 | 可见高度 420px 时聊天框 top 8 / bottom 412，输入框 bottom 401.33，完整位于可见区域；底部导航暂时隐藏。 |
| 聊天触控目标 | 实际 DOM 测量，没有高度小于 44px 的聊天操作按钮。 |
| 实际语音 | 点击朗读后先站立，实际播放进入 speaking.webm；自然结束后返回 idle.webm。语音停止按钮 aria 状态对应变化。 |
| 人物与画中画 | 首屏、欢迎区、聊天和入口头像均为动态；video 含 disablepictureinpicture，无 controls，pointer-events 为 none；鼠标移至首屏角色处无浮层。 |
| 首页轮播 | 初始湖畔暮色，未手动选风景时自动切至天生桥；保留原 5000ms 周期及渐变规则。 |
| 陆家大龙 | 搜索命中，详情页照片加载成功、naturalWidth 1260，两个入口小头像均在播放。 |

聊天正文的代表性色值对比度：`#52664f` 在 `#fffdf8` 上 **6.13:1**，在 `#edf0e6` 上 **5.40:1**；`#284736` 在 `#edf0e6` 上 **8.90:1**。这些是本批聊天区域的代表值，没有声称完成全站所有视觉状态的无障碍审计。

安全差异检查：`server/core.mjs` 原字节保持；`validateChat`、提示注入防护、数字与引用编号检查、传说边界检查保持；其余 `server/index.mjs`、providers、knowledge、modelStream 保持原文件。服务端 needs_input 的判定条件未变化。

部署情况：

- 静态根目录仍为 `/var/www/lsguide`；API 工作目录为 `/home/zhangpanhh/apps/lishui-web/releases/20261007-usability-2665c3fd52`。
- 通过现有 `10-single-guide.conf` 覆盖文件只更新 API 工作目录；保留现有 Node、密钥文件引用及其他服务配置。只重启 `lishui-guide-api.service`。
- `/ready` 为 ready=true，127 条、1024 维、所有 7 个集成配置已就绪；未在本批逐一调用收费或实时外部供应商验证。
- 源站回环 HTTP 检查：`/`、`/guide`、`/nodes`、`/nodes/c_ljd`、`/itinerary`、robots、陆家大龙照片及两个视频全部 200。按 lsguide.cn Origin 调用住宿缺条件问题，返回 needs_input 与三组选项。
- 84 个本版静态文件逐一验证 SHA-256；保留 111 个先前带内容哈希的 JS/CSS，减少已打开旧页面的懒加载失效。
- Nginx 配置、cyberemotionlab 532 个文件、其进程启动信息及 3000 端口均与发布前一致。
- 回滚备份位于 `/var/backups/lishui-guide/20261007-usability-2665c3fd52`，包含旧静态站和原 API 覆盖文件；旧 API 发布目录保留。
- 第一轮发布在发现基础 unit 与生效覆盖目录不一致时停止，发生在替换前；改用现有覆盖文件后发布成功。

## ③ 未覆盖问题与下一步建议

1. 本轮通过浏览器视口收缩模拟键盘，尚未在真实 iOS Safari、Android Chrome 上测试软键盘、候选词、地址栏变化与屏幕旋转，建议下一次设备验收优先覆盖这些场景。
2. 本机中文语音实际切换通过；其他设备声音、自动播放限制、后台标签页和视频加载失败需要设备覆盖。视频加载失败仍会使用已有海报兜底；隐藏文档仍暂停视频以减少无效播放。
3. 画中画属性及鼠标阻断在当前浏览器通过；浏览器或用户设置可能忽略禁用请求，不应宣称所有浏览器均绝对禁止。[MDN：disablePictureInPicture](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/disablePictureInPicture)。键盘适配依据可见视口与布局视口区别，[MDN：VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)。
4. 全站所有页面、弹层/导出展开状态及完整屏幕阅读器路径尚未逐项审计；本批重点完成聊天操作、正文对比度和路由焦点检查。
5. 剩余 10 条待核问答保持隔离；照片摄影者与授权凭证未额外核查。原始照片仍留在用户资料目录。
6. `docs/` 与索引仍属于 gitignored 的运行资料，本次发布包已携带当前副本；全新 clone 的资料分发问题仍需后续单独处理。未提交或推送现有工作区改动。
7. 按用户说明，没有调查或更改公网 525、备案、TLS 或 Cloudflare。部署验收指向现有 lsguide 源站及 API。

![首屏动态形象与保留的风景轮播](E:/数媒/lishui-web/reports/batch3-hero-motion-2026-10-07.png)

![陆家大龙用户照片与动态头像](E:/数媒/lishui-web/reports/batch3-lujia-photo-2026-10-07.png)
