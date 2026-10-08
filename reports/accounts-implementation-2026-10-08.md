# 账号、个人行程卡与日常交流验收

本批保留用户已修改的整站设计，替换“关于作品”为账号入口。仅使用 Supabase `zsz370's Lishui`（fxqkollpvywpnxtjnfqh），未访问或配置 cyber 项目。发布目标仅为 lsguide.cn。

## 文件清单

| 文件 | 改动原因与结果 |
| --- | --- |
| src/App.jsx | 增加登录页，将旧 about/account 路径转到登录入口。 |
| src/components/Layout.jsx | 桌面、手机和页脚导航改为用户登录/我的账号，保留现有结构与样式。 |
| src/components/DesignReviewBar.jsx | 本地设计对比工具同步账号路由。 |
| src/main.jsx | 在原提供器外接入账号状态，样式加载顺序不变。 |
| src/data/account.jsx | 管理公开用户状态，账号切换时丢弃旧请求结果，不在页面存令牌。 |
| src/services/account.js | 提供同源账号请求、超时与可读错误处理。 |
| src/pages/Account.jsx | 登录、注册、卡片列表、载入、回收、恢复和退出；邮箱仅为登录名。 |
| src/components/Account.css | 新增仅作用于账号控件的样式，复用现有颜色、排版和按钮。 |
| src/components/AccountPlanSave.jsx | 行程页主动保存/更新账号卡片，避免编辑时自动上传。 |
| src/pages/Itinerary.jsx | 添加保存入口，说明本机草稿与云端卡片的区别。 |
| src/data/accountDraft.js | 按访客与用户编号隔离本机行程存储。 |
| src/data/store.jsx | 切换账号恢复对应草稿，加载和标记云端卡片。 |
| src/data/guideSession.jsx | 登录身份改变或过期时清理当前对话与未完成请求。 |
| config/accounts.env.example | 记录服务端 Supabase 公共项目配置项，不含真实密钥。 |
| server/accounts-config.mjs | 只接受受限 Supabase 项目地址和 publishable/anon key。 |
| server/supabase-accounts.mjs | 原生 fetch 调用 Supabase Auth 和带用户 JWT 的数据库请求，无新增依赖。 |
| server/account-api.mjs | 账号接口独立校验、限流、HttpOnly 会话 Cookie、归属过滤及版本冲突；不刷新会话。 |
| server/index.mjs | 在现有来源检查后接入账号控制器，原聊天限流及校验不变。 |
| supabase/migrations/202610070001_itinerary_cards.sql | 个人行程表、强制 RLS、归属策略、写入触发器与50卡上限；已存在，核验而未重复执行。 |
| supabase/tests/itinerary_cards_rls.sql | 真实数据库事务测试，所有临时数据自动回滚。 |
| src/data/agentPersona.js | 增加问候、感谢、近况和日常失败话术，不改旅游事实。 |
| src/services/casualConversation.js | 前后端共享日常意图识别，旅游事实和上下文追问仍走原路径。 |
| server/conversation.mjs | 基础概念/写作/闲聊调用统一人格；失败如实说明，来源标为日常交流 AI 生成。 |
| server/chat.mjs | 仅新增日常交流分支和导入，原注入防护、证据、数字与传说校验逐字不变。 |
| src/services/chat.js | 常用招呼可即时回应，离线交流有明确能力边界。 |
| scripts/accounts.test.mjs | 11项账号 HTTP、Cookie、归属、过期、版本、回收恢复及本机隔离测试。 |
| scripts/conversation.test.mjs | 4项日常交流、审核分流、生成边界及失败恢复测试。 |
| README.md | 说明账号配置、免邮件注册、有效期、主动保存及既有协作说明的变化。 |

私有 `config/accounts.env.local` 不入库、不打入前端或发布归档；仅部署到服务器 shared/config，权限0600。没有删除原 About.jsx 或其他未授权文件。

## Supabase 与真实链路

- 已核查表启用 RLS 和 FORCE RLS，匿名无表权限，authenticated 仅 SELECT/INSERT/UPDATE；各策略均限定 auth.uid()=user_id。无 DELETE 权限。
- 已在 Lishui 配置 Site URL 和唯一 Redirect URL：`https://lsguide.cn/login`。
- 用户明确要求并确认关闭 Confirm email；真实公开 Auth settings 返回 mailer_autoconfirm=true、disable_signup=false。没有新增验证码，没有配置 SMTP。
- 账号访问令牌只在 HttpOnly / SameSite=Lax Cookie，生产额外 Secure，最长1小时；不发刷新令牌，清理旧刷新 Cookie，过期需要重新登录。
- 数据库事务测试：个人读写/回收/恢复成功，跨账号读/改/插入拒绝，匿名读取拒绝，永久删除拒绝，测试用户/卡片全部回滚。
- 原生 HTTP + 真实 Supabase：注册后直接登录、退出重新登录、跨会话载入日期/预算/天生桥站点、更新、旧版本409、回收恢复通过。账号 B 请求账号 A 卡片得到404。见 accounts-live-check-2026-10-08.json。
- 网络排查发现本机 Node 默认未使用已有代理；仅本机验收进程使用 Node24 的 --use-env-proxy。服务器直连 Supabase 正常；不修改生产 TLS、网络隔离或服务校验。

## 验证

| 命令/检查 | 结果 |
| --- | --- |
| npm run build | prebuild节点介绍29/29、Vite生产构建通过。 |
| node --test scripts/*test.mjs（PowerShell枚举） | 160项通过，0失败，含新增15项。 |
| npm run demo:offline:build | 87文件，离线资料/行程继续可用；离线账号如实显示不可连接。 |
| 真实 Supabase事务测试 | 全部断言通过且回滚，截图 accounts-supabase-rls-tests-2026-10-08.png。 |
| 本机真实账号链路 | 注册、登录、跨会话保存、归属隔离、冲突与回收恢复通过。 |
| 文件保护检查 | 原CSS、首页、媒体、已审QA、server/core.mjs、原chat校验不变；前端/源码密钥匹配0。 |

浏览器走查与部署结果另见 accounts-browser-checks-2026-10-08.json、accounts-deployment-2026-10-08.json。发布版本 `20261008-accounts-bb05445c7a`；85个静态文件核对通过，保留226个旧哈希资源支持已有页面。Node20回归160/160，生产账号验收全通过；3张QA卡片已移到可恢复回收站。

现有Nginx配置哈希、cyber项目532个受保护文件、进程启动时间及3000端口均未变化。API处于active、127条索引哈希不变。后台账号配置0600，仅供本站API读取；真实密钥匹配0。

回退目录 `/var/backups/lishui-guide/20261008-accounts-bb05445c7a` 保存此前静态站点和API服务drop-in；之前API目录 `/home/zhangpanhh/apps/lishui-web/releases/20261007-persona-experts-bce5871834`。仅切换本站静态根和本站API，不改动其他服务。

发布后补充的README部署编号、验收报告和截图为本机交付记录；业务源码、构建产物与发布清单一致。源站截图通过只读SSH端口转发获得，不绕过浏览器证书警告。

## 实际限制

- 按用户要求不验证邮箱归属、无验证码，也没有密码找回流程。
- 行程保存由用户主动触发；卡片内天气和路线是保存时的带时间参考，不能替代行前重查。
- 当前最多50卡（含回收站）；可更新旧卡，未提供永久删除入口。
- 两个 qa-*@example.invalid 账号和验收卡仅用于真实认证测试，不发送邮件；验收后卡片移入回收站，凭据留在 gitignored 的本机验收目录，不发布。
- 浏览器手机宽度检查不等同真实手机系统键盘测试；跨会话 HTTP 验证不等同两台实体设备测试。
- 不处理用户已说明的公网525/备案问题，不修改Cloudflare/TLS或cyberemotionlab.cn。
