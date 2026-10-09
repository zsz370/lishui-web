已部署到 lsguide.cn，版本 20261009-usability-network-2c5d60f76b。这批包含31个代码/测试文件与1项服务端私有配置。首页风格、单前台淮源姐、已审QA原文和安全校验保留。

① 改动文件清单

| 文件 | 改动及行为影响 |
|---|---|
| [src/App.jsx](E:/数媒/lishui-web/src/App.jsx) | 路由使用共享模块加载器，保留全部既有路由。 |
| [src/components/ChatPanel.jsx](E:/数媒/lishui-web/src/components/ChatPanel.jsx) | 移除空白提示文字和存储技术说明，保留换行，防止输入法确认回车误发送。 |
| [src/components/GuideMedia.jsx](E:/数媒/lishui-web/src/components/GuideMedia.jsx) | 不可见时暂停解码、可见时自动恢复；播放被暂停打断不再误回退为静态图。 |
| [src/components/HomeHero.jsx](E:/数媒/lishui-web/src/components/HomeHero.jsx) | 首页提问框移除空白提示文字；原5秒渐变轮播保持。 |
| [src/components/Layout.jsx](E:/数媒/lishui-web/src/components/Layout.jsx) | 六个导航模块在空闲、悬停和焦点时预加载，去掉重复滚动及多余导航属性；备案链接保留。 |
| [src/components/Photo.jsx](E:/数媒/lishui-web/src/components/Photo.jsx) | 图片使用异步解码，减少切换时阻塞绘制。 |
| [src/data/account.jsx](E:/数媒/lishui-web/src/data/account.jsx) | 向账号接口提交用户名，账号归属仍按原用户ID隔离。 |
| [src/data/agentPersona.js](E:/数媒/lishui-web/src/data/agentPersona.js) | 普通无法回答提示删去“具体结论待核”，不展示知识库内部状态。 |
| [src/data/atlas.js](E:/数媒/lishui-web/src/data/atlas.js) | 图鉴复用统一搜索，并优先匹配风物名称。 |
| [src/data/nodeIntroductions.js](E:/数媒/lishui-web/src/data/nodeIntroductions.js) | 29项风物扩成三段，以现有事实和具体阅读提示替换重复运营提醒。 |
| [src/pages/Account.jsx](E:/数媒/lishui-web/src/pages/Account.jsx) | 用户名注册登录、8–15位混合密码，移除注册登录简介与Supabase技术说明；保留旧账号登录兼容。 |
| [src/pages/Atlas.jsx](E:/数媒/lishui-web/src/pages/Atlas.jsx) | 输入法确认后再搜索、全目录检索、名称优先、显示完整简介。 |
| [src/pages/NodeDetail.jsx](E:/数媒/lishui-web/src/pages/NodeDetail.jsx) | 补充已审故事阅读段落，出处合并折叠，资料边界单独说明。 |
| [src/pages/Nodes.jsx](E:/数媒/lishui-web/src/pages/Nodes.jsx) | 搜索不再被当前栏目限制，支持统一名称匹配与输入法安全输入。 |
| [src/services/accountCredentials.js](E:/数媒/lishui-web/src/services/accountCredentials.js) | 前后端共享用户名规范化与密码强度规则。 |
| [src/services/nodeReading.js](E:/数媒/lishui-web/src/services/nodeReading.js) | 从已审事实和传说正文提取阅读段落，保留原内容和来源。 |
| [src/services/nodeSearch.js](E:/数媒/lishui-web/src/services/nodeSearch.js) | 支持空格、换行、标点、全角、拼音、关键词与名称优先排序。 |
| [src/services/pageModules.js](E:/数媒/lishui-web/src/services/pageModules.js) | 复用路由模块加载Promise，避免首次切换临时加载和重复请求。 |
| [src/services/personaExpression.js](E:/数媒/lishui-web/src/services/personaExpression.js) | 联网失败提供重试路径，普通未知提示不含内部技术说明。 |
| [src/services/useSearchDraft.js](E:/数媒/lishui-web/src/services/useSearchDraft.js) | 组合输入阶段不写地址，确认后180毫秒防抖提交。 |
| [src/styles/WholeSiteDesign.css](E:/数媒/lishui-web/src/styles/WholeSiteDesign.css) | 输入与搜索框只保留整体聚焦加粗，移除双重描边及重复清除图标；阅读正文样式保持原色板。 |
| [server/account-api.mjs](E:/数媒/lishui-web/server/account-api.mjs) | 用户名映射到稳定认证身份、服务端强密码校验，访问Cookie和行程权限保持。 |
| [server/chat.mjs](E:/数媒/lishui-web/server/chat.mjs) | 无相关证据或本地生成承认答不上来时自动转向博查，保留证据编号、数字、注入及传说校验。 |
| [server/supabase-accounts.mjs](E:/数媒/lishui-web/server/supabase-accounts.mjs) | 注册保存用户名元数据，供应商错误转成用户名提示。 |
| [scripts/accounts.test.mjs](E:/数媒/lishui-web/scripts/accounts.test.mjs) | 更新用户名注册验收，保留Cookie、限流、账号隔离和行程测试。 |
| [scripts/customer-routing.test.mjs](E:/数媒/lishui-web/scripts/customer-routing.test.mjs) | 更新普通未知提示断言，动态事实边界继续验收。 |
| [scripts/node-search.test.mjs](E:/数媒/lishui-web/scripts/node-search.test.mjs) | 新增11项真实搜索、名称优先与阅读来源回归。 |
| [scripts/persona-collaboration.test.mjs](E:/数媒/lishui-web/scripts/persona-collaboration.test.mjs) | 更新未知话术断言，专家协作和安全边界不变。 |
| [scripts/review-integrity.test.mjs](E:/数媒/lishui-web/scripts/review-integrity.test.mjs) | 冷克隆子测试串行运行，消除Windows并行测试进程不稳定。 |
| [scripts/username-account.test.mjs](E:/数媒/lishui-web/scripts/username-account.test.mjs) | 新增4项用户名唯一性、强密码、输入验证与供应商元数据测试。 |
| [scripts/web-fallback.test.mjs](E:/数媒/lishui-web/scripts/web-fallback.test.mjs) | 新增7项搜索回退、模型承认缺答案、问候分流、引用数字安全和博查鉴权测试。 |
| config/integrations.env.local（gitignored，服务端私有） | 更新用户提供的博查密钥；只在鉴权请求头使用，前端和URL无密钥。线上仅更新此项，其他外部服务配置不变。 |

博查沿用已有接口，按[博查官方说明](https://github.com/BochaAI/bocha-search-mcp)提供网页结果。问候继续直接对话；文旅问题无可用本地证据时自动联网，不展示“知识库内没有”。已审完整问题仍优先原文返回。联网内容保留来源和未审标记，票价、档期、班次与传说的边界保留。

用户名是本站实现的登录入口。[Supabase密码注册接口](https://supabase.com/docs/reference/javascript/auth-signup)继续使用其原认证机制；后台将规范用户名确定性映射到认证身份，并保存用户名元数据，避免增加admin密钥、密码表或改变RLS。大小写及全角同名不会重复注册；旧邮箱账号可继续登录，用户ID与已保存卡片不迁移。新注册用户名3–24位，密码8–15位且含大小写字母和数字，不接受空白。

② 验证命令与输出

| 验证 | 结果 |
|---|---|
| 基线 node --test --test-concurrency=1 scripts/*.test.mjs | 341/341通过。默认高并发出现单个进程异常，单独及串行均通过，冷克隆子测试已改为串行。 |
| 最终 npm run build | prebuild覆盖29/29简介，构建通过；主包gzip约155.87KB。 |
| 本机全量Node测试 | 363/363通过，新增22项。 |
| 服务器Node20全量测试 | 最终发布包363/363通过。 |
| 动态形象与语音相关测试 | 20/20通过；浏览器验证屏幕外暂停、滚回后恢复，未回退静态图。 |
| git diff --check | 无错误。 |
| 保护与密钥扫描 | 16个受保护文件未变，输入校验及8段保护提示/校验未变，泄漏0处；已审语料127条索引哈希不变。 |
| 博查真实调用 | 返回5个有效网页结果。 |
| 源站真实SSE | 你好→casual；周园值得去吗→preset；三日游→planning含第3天；农业展览→rag含5个网络候选与来源。 |
| Supabase真实账号流程 | 本机与源站均完成用户名注册、登录、退出、跨会话载入卡片；测试卡片已移到可恢复回收站。 |
| 浏览器搜索 | 中文、拼音、空格匹配，陆家大龙优先打开正确条目；输入框无占位文字，无双层描边。 |
| 浏览器导航 | 六个主导航连续两轮正常；本机点击到UI观察耗时190–336毫秒，包含自动化观察开销，不作为线上网络性能指标。 |
| 手机宽度检查 | 390像素视口，无横向溢出；输入完整保留Shift+Enter换行与空格，发送按钮44px。 |
| 部署 | 源站13条页面/素材HTTP200，API ready；Nginx、cyberemotionlab.cn的532个文件、进程和3000端口未变。 |

服务器清理：30个未被运行进程、服务及保留版本引用的旧发布目录，在完整文件/符号链接校验后归档并移出发布目录。压缩前约466.9MiB、归档约374.7MiB。归档位于服务器 apps/lishui-web/archived-releases（私有）；当前版本、前一版本及原node_modules依赖仍保留。现有游客已打开页面使用的旧哈希资源保留，不删除运行依赖。未动其他网站。

③ 遗留问题

- 晶桥云片糕地方沿革、明觉铁画后续省级正式认定、石臼渔歌具体曲目仍缺充分材料；保留资料说明，没有补写事实或歌词。
- 浏览器390px与键盘事件已验证；真实iOS/Android软键盘和弱网仍适合后续真机走查。
- 两个随机验收账号保留在Lishui项目，测试卡片在各自回收站；没有操作其他Supabase项目或真实游客账号。

风物简介与来源清单（不改已审问答）

| 风物 | 简介 | 已审阅读补充 | 原有来源 |
|---|---|---|---|
| 天生桥·胭脂河 | 3段 / 254字 | 3项 | [南京大学转载新华日报：胭脂河与天生桥](https://www.nju.edu.cn/info/3191/218951.htm) |
| 无想山 | 3段 / 240字 | 3项 | [溧水区政府：区情简介](https://www.njls.gov.cn/zjls/qqjj/) |
| 傅家边 | 3段 / 250字 | 1项 | [溧水区政府：2026溧水赏梅季](https://www.njls.gov.cn/jrs/zjdt/202602/t20260224_5795570.html) |
| 石臼湖 | 3段 / 228字 | 2项 | [南京市政府：石臼湖与水上列车](https://www.nanjing.gov.cn/zzb/ywdt/njxx/202608/t20260817_5894512.html) |
| 大金山国防园 | 3段 / 240字 | 3项 | [南京市体育局：大金山庄国防园（2023介绍）](https://sports.nanjing.gov.cn/ztzl/njtyxfxcj/hwyd/202307/t20230725_3970450.html) |
| 周园 | 3段 / 248字 | 1项 | [溧水区政府：区情简介](https://www.njls.gov.cn/zjls/qqjj/) |
| 东庐山观音寺 | 3段 / 240字 | 1项 | [溧水区政府：永阳街道概况](https://www.njls.gov.cn/zjls/jdgk/yyjd/)、[溧水区政府：秦淮源头相关提案答复](https://www.njls.gov.cn/zwgk/qzxta/zxsyjschy/202411/t20241107_5003091.html) |
| 郭兴庄园 | 3段 / 237字 | 0项 | [溧水区政府：郭兴庄园旅游特色](https://www.njls.gov.cn/zwgk/qzxta/dsyjwyhdychy/202211/t20221128_3767323.html) |
| 东屏湖 | 3段 / 222字 | 1项 | [溧水区政府：自然资源](https://www.njls.gov.cn/zjls/zrzy/)、[南京市体育局：大金山与东屏湖](https://sports.nanjing.gov.cn/ztzl/njtyxfxcj/hwyd/202307/t20230725_3970450.html) |
| 洪蓝玉带糕 | 3段 / 242字 | 2项 | [江苏省政府：2023年省级非遗及扩展项目名录](https://www.jiangsu.gov.cn/attach/0/9b994b75d7bf46d89e72fbc8834f76c8.pdf)、[溧水区文旅局：地方特色菜与非遗美食](https://www.njls.gov.cn/zwgk/qzxta/dsyjwyhdychy/202211/t20221129_3767985.html) |
| 洪蓝手抓鸡 | 3段 / 245字 | 1项 | [南京市政府：2023年第五批非遗名录](https://www.nanjing.gov.cn/xxgkn/zfgb/202302/t20230227_3837570.html)、[溧水区文旅局：地方特色菜与非遗美食](https://www.njls.gov.cn/zwgk/qzxta/dsyjwyhdychy/202211/t20221129_3767985.html) |
| 洪蓝牛肉 | 3段 / 238字 | 1项 | [南京市政府：2023年第五批非遗名录](https://www.nanjing.gov.cn/xxgkn/zfgb/202302/t20230227_3837570.html)、[溧水区文旅局：地方特色菜与非遗美食](https://www.njls.gov.cn/zwgk/qzxta/dsyjwyhdychy/202211/t20221129_3767985.html) |
| 明觉香菜 | 3段 / 239字 | 1项 | [南京市政府：2023年第五批非遗名录](https://www.nanjing.gov.cn/xxgkn/zfgb/202302/t20230227_3837570.html)、[溧水旅游：地方美食介绍（2020）](https://www.thepaper.cn/newsDetail_forward_10238932) |
| 晶桥云片糕 | 3段 / 236字 | 1项 | [深圳市政府：云片糕类糕点介绍（仅供品类参考）](https://www.sz.gov.cn/cn/zjsz/szfy/intangible_items/gdsj/content/mpost_8055650.html) |
| 乌饭 | 3段 / 230字 | 1项 | [溧水区政府：和凤乌饭会（2025报道）](https://www.njls.gov.cn/jrs/syw/202505/t20250507_5141483.html) |
| 白马黑莓 | 3段 / 225字 | 1项 | [国家知识产权局：白马黑莓地理标志产品保护公告](https://www.cnipa.gov.cn/attach/0/20250826010509.pdf) |
| 骆山大龙 | 3段 / 234字 | 3项 | [中国非遗网：龙舞（骆山大龙）](https://www.ihchina.cn/project_details/12838)、[溧水区政府：民俗风情](https://www.njls.gov.cn/zjls/yzls/msfq/) |
| 明觉铁画锻制技艺 | 3段 / 221字 | 1项 | [央广网：明觉铁画技艺介绍（级别表述另待正式文件）](https://country.cnr.cn/xtxq/201406/t20140608_515636533.shtml)、[南京市政府：2008年第一批非遗正式名录](https://www.nanjing.gov.cn/zdgk/200805/t20080528_1054979.html) |
| 蒲塘桥祠山庙会 | 3段 / 228字 | 1项 | [溧水区政府：民俗风情](https://www.njls.gov.cn/zjls/yzls/msfq/)、[南京市文旅局：非遗项目名录](https://wlj.nanjing.gov.cn/zwfw/bszlxz/202101/P020210105390071400964.pdf) |
| 西宋马灯 | 3段 / 220字 | 2项 | [江苏省政府：2023年省级非遗及扩展项目名录](https://www.jiangsu.gov.cn/attach/0/9b994b75d7bf46d89e72fbc8834f76c8.pdf)、[溧水区政府：民俗风情](https://www.njls.gov.cn/zjls/yzls/msfq/) |
| 何林坊双龙 | 3段 / 228字 | 1项 | [南京市政府：2023年第五批非遗名录](https://www.nanjing.gov.cn/xxgkn/zfgb/202302/t20230227_3837570.html)、[南京市农业农村局：洪蓝春节民俗活动（2026报道）](https://nyncj.nanjing.gov.cn/nygzdt/202602/t20260209_5789604.html) |
| 陆家大龙 | 3段 / 228字 | 2项 | [南京市政府：2023年第五批非遗名录](https://www.nanjing.gov.cn/xxgkn/zfgb/202302/t20230227_3837570.html)、[中国江苏网：2026春节陆家大龙现场报道](https://tour.jschina.com.cn/lyzx/202602/t20260223_s699bffa7e4b0263ab066b8f8.shtml) |
| 跳当当 | 3段 / 222字 | 1项 | [南京市文旅局：非遗项目名录](https://wlj.nanjing.gov.cn/zwfw/bszlxz/202101/P020210105390071400964.pdf)、[江苏广电我苏网：2018南京非遗游乐会现场报道](https://www.ourjiangsu.com/a/20180610/152862066358.shtml) |
| 石臼渔歌 | 3段 / 228字 | 2项 | [南京市政府：2023年第五批非遗名录](https://www.nanjing.gov.cn/xxgkn/zfgb/202302/t20230227_3837570.html) |
| 溧水剪纸 | 3段 / 230字 | 1项 | [江苏省政府：2023年省级非遗及扩展项目名录](https://www.jiangsu.gov.cn/attach/0/9b994b75d7bf46d89e72fbc8834f76c8.pdf)、[南京市教育局：溧水非遗剪纸教育活动（2024报道）](https://edu.nanjing.gov.cn/xwdt/gqdt/202410/t20241008_4779852.html) |
| 秦淮源头灯会 | 3段 / 247字 | 1项 | [南京市政府：2023年第六届秦淮源头灯会](https://www.nanjing.gov.cn/hdjl/xwfbh/xwfbhbzqzghcjxlfbhqwhdjqgl/mtbd/202301/t20230129_3812226.html) |
| 通济街 | 3段 / 227字 | 1项 | [溧水区政府：城区商圈与街区布局](https://www.njls.gov.cn/zwgk/qrddbjy/rddechy/202311/t20231124_4106676.html) |
| 海乐城 | 3段 / 233字 | 0项 | [溧水区政府：城区商圈与街区布局](https://www.njls.gov.cn/zwgk/qrddbjy/rddechy/202311/t20231124_4106676.html) |
| 无想水镇 | 3段 / 214字 | 1项 | [溧水区政府：无想水镇与唐风文化街区](https://www.njls.gov.cn/zwgk/qrddbjy/dsqjrddychy/202211/t20221124_3764333.html)、[溧水区政府：城南街区与夜间文旅活动（2024）](https://www.njls.gov.cn/zwgk/qrddbjy/rdschy/202411/t20241125_5017713.html) |

验收截图

![最终源站图鉴](E:/数媒/lishui-web/reports/usability-network-origin-atlas-2026-10-09.jpg)
![输入框聚焦及换行](E:/数媒/lishui-web/reports/usability-network-composer-2026-10-09.jpg)
![用户名注册](E:/数媒/lishui-web/reports/usability-network-signup-2026-10-09.jpg)
![真实联网答复](E:/数媒/lishui-web/reports/usability-network-web-answer-2026-10-09.jpg)
