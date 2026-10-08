# 遇见美溧改版与部署验收（2026-10-07）

首页按“可边看边安排的溧水旅行手册”改版，淮源姐已放到“来溧水，问淮源姐。”标题旁。新版静态站点已发布到 lsguide.cn 对应源站。此次没有编辑 server/，没有更换检索索引或新增事实语料。

## ① 改动文件清单

| 文件 | 每文件说明 |
|---|---|
| [index.html](E:/数媒/lishui-web/index.html) | 增加淮源姐头像 favicon 与响应式首屏照片预加载。 |
| [public/assets/display/culture-dragon-640.webp](E:/数媒/lishui-web/public/assets/display/culture-dragon-640.webp) | 提供 culture-dragon-640 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/culture-dragon-960.webp](E:/数媒/lishui-web/public/assets/display/culture-dragon-960.webp) | 提供 culture-dragon-960 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/hero-lakeside-640.webp](E:/数媒/lishui-web/public/assets/display/hero-lakeside-640.webp) | 提供 hero-lakeside-640 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/hero-lakeside-960.webp](E:/数媒/lishui-web/public/assets/display/hero-lakeside-960.webp) | 提供 hero-lakeside-960 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/hero-tianshengqiao-640.webp](E:/数媒/lishui-web/public/assets/display/hero-tianshengqiao-640.webp) | 提供 hero-tianshengqiao-640 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/hero-tianshengqiao-960.webp](E:/数媒/lishui-web/public/assets/display/hero-tianshengqiao-960.webp) | 提供 hero-tianshengqiao-960 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/hero-wuxiang-640.webp](E:/数媒/lishui-web/public/assets/display/hero-wuxiang-640.webp) | 提供 hero-wuxiang-640 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/hero-wuxiang-960.webp](E:/数媒/lishui-web/public/assets/display/hero-wuxiang-960.webp) | 提供 hero-wuxiang-960 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/node-tianshengqiao-640.webp](E:/数媒/lishui-web/public/assets/display/node-tianshengqiao-640.webp) | 提供 node-tianshengqiao-640 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/node-tianshengqiao-960.webp](E:/数媒/lishui-web/public/assets/display/node-tianshengqiao-960.webp) | 提供 node-tianshengqiao-960 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/node-wuxiang-640.webp](E:/数媒/lishui-web/public/assets/display/node-wuxiang-640.webp) | 提供 node-wuxiang-640 显示副本；只缩放转码，原图保留。 |
| [public/assets/display/node-wuxiang-960.webp](E:/数媒/lishui-web/public/assets/display/node-wuxiang-960.webp) | 提供 node-wuxiang-960 显示副本；只缩放转码，原图保留。 |
| [public/robots.txt](E:/数媒/lishui-web/public/robots.txt) | 提供正常的搜索引擎抓取规则。 |
| [reports/display-images-2026-10-07.json](E:/数媒/lishui-web/reports/display-images-2026-10-07.json) | 记录显示副本的来源、原图哈希、尺寸与文件体积。 |
| [reports/redesign-deployment-2026-10-07.json](E:/数媒/lishui-web/reports/redesign-deployment-2026-10-07.json) | 保存发布版本、静态文件核验、源站 HTTP 与受保护站点一致性结果。 |
| [reports/redesign-performance-2026-10-07.json](E:/数媒/lishui-web/reports/redesign-performance-2026-10-07.json) | 保存最后一次移动端 Lighthouse 测量结果。 |
| [reports/redesign-screenshots/desktop-home.jpg](E:/数媒/lishui-web/reports/redesign-screenshots/desktop-home.jpg) | 保存桌面首屏效果，包含标题旁的淮源姐形象。 |
| [reports/redesign-screenshots/mobile-home.jpg](E:/数媒/lishui-web/reports/redesign-screenshots/mobile-home.jpg) | 保存 390 像素移动端首屏效果。 |
| [reports/redesign-screenshots/server-mobile-home.png](E:/数媒/lishui-web/reports/redesign-screenshots/server-mobile-home.png) | 保存通过 SSH 转发访问源站的 320 像素首屏效果。 |
| [reports/redesign-verification-2026-10-07.md](E:/数媒/lishui-web/reports/redesign-verification-2026-10-07.md) | 汇总逐文件改动、技能检查、回归与发布结果。 |
| [scripts/build-display-images.py](E:/数媒/lishui-web/scripts/build-display-images.py) | 从六张已有照片生成十二张 WebP 显示副本，保留原始素材。 |
| [scripts/home-discovery.test.mjs](E:/数媒/lishui-web/scripts/home-discovery.test.mjs) | 增加三项内容编排回归，验证真实计数、已审问答、来源及线路边界。 |
| [src/App.jsx](E:/数媒/lishui-web/src/App.jsx) | 首页改为同步载入，减少首次打开时的布局跳动；其他页面保留懒加载。 |
| [src/components/HomeHero.jsx](E:/数媒/lishui-web/src/components/HomeHero.jsx) | 首屏加入现有淮源姐透明形象、输入提问和手动风景选择。 |
| [src/components/Layout.jsx](E:/数媒/lishui-web/src/components/Layout.jsx) | 补键盘跳到正文入口和实用页脚链接，保留原导航名称与路由。 |
| [src/components/Photo.jsx](E:/数媒/lishui-web/src/components/Photo.jsx) | 使用响应式照片副本，并在副本失败时回退原图。 |
| [src/components/WelcomeGuide.jsx](E:/数媒/lishui-web/src/components/WelcomeGuide.jsx) | 首页数字人动效进入视口后再加载，保留暂停、朗读与静态回退。 |
| [src/data/homeDiscovery.js](E:/数媒/lishui-web/src/data/homeDiscovery.js) | 从现有节点与已审语料派生首页展示数据，不新增地点事实。 |
| [src/data/responsiveMedia.js](E:/数媒/lishui-web/src/data/responsiveMedia.js) | 集中映射首屏及常用照片的 640/960 像素显示副本。 |
| [src/main.jsx](E:/数媒/lishui-web/src/main.jsx) | 最后加载全站旅行视觉样式，保证生产环境的样式优先级一致。 |
| [src/pages/Home.css](E:/数媒/lishui-web/src/pages/Home.css) | 重做首页分区、图文比例、按钮与手机布局，并支持减少动态偏好。 |
| [src/pages/Home.jsx](E:/数媒/lishui-web/src/pages/Home.jsx) | 编排七个内容分区，提供主题探索、线路预览、文化体验、问答、出行准备和行程收藏。 |
| [src/pages/NodeDetail.jsx](E:/数媒/lishui-web/src/pages/NodeDetail.jsx) | 把地点照片放到正文前，增加同主题地点入口。 |
| [src/pages/Nodes.jsx](E:/数媒/lishui-web/src/pages/Nodes.jsx) | 增加真实地点目录、分批展开和加入行程按钮，沿用已有栏目筛选。 |
| [src/styles/TravelDesign.css](E:/数媒/lishui-web/src/styles/TravelDesign.css) | 统一品牌色、中文字体、焦点、页头页脚、图鉴目录与详情页视觉。 |
| [vite.config.js](E:/数媒/lishui-web/vite.config.js) | 构建时生成 nodes/index.html，解决静态照片目录与 /nodes 页面入口冲突。 |

## 视觉方向与技能检查

依次使用用户指定的 frontend-design 和 design-taste-frontend。前者确定旅行手册方向、色板与中文字体；后者细化区块节奏、互动、手机布局、焦点与减少动态偏好。

- DESIGN_VARIANCE=5：桌面有大图与小图的不对称组合，手机恢复纵向阅读；不是均分卡片拼贴。
- MOTION_INTENSITY=2：手动选择风景、轻量状态反馈，欢迎数字人保留暂停；没有新增滚动劫持、跑马灯或炫技动效。
- VISUAL_DENSITY=5：用现有资料增加可探索内容，四类切换、两条线路、文化三题体验、四条节点问答和六类服务各三问。
- 沿用 ink #284736、lake #627b51、fire #a6784b、rice #f6f3ec、mist #edf0e6；主按钮统一 ink。标题与正文使用 Microsoft YaHei / PingFang SC / Noto Sans SC / 系统中文无衬线字体，不增加网络字体请求。
- 形状规则：内容容器 12px，输入与按钮 8px，线路序号使用圆形表达顺序。
- 保留用户指定的朴素浅色品牌，不引入深色模式；不用 AI 生成景点图或网络图。淮源姐是现有项目数字人，保留 AI 生成标识。

Taste 检查矩阵按适用项核对：

| 检查组 | 结果与说明 |
|---|---|
| Brief / dials / 系统 / redesign audit | 已声明方向与三项参数；复用项目品牌，先查看原桌面和手机布局。 |
| 主题 / 配色 / 圆角 / 图标 | 全页固定浅色，按钮颜色一致，圆角按规则；只用已有 Phosphor 图标。 |
| 标题 / 首屏 / 导航 | 标题两行，提问按钮在首屏可见；桌面导航一行；没有标题飘浮、版本标签或装饰说明条。 |
| Eyebrow / split header / zigzag / 空格子 | 仅首屏小引导语；分区标题和说明纵排；主题大图、线路列表、文化照片、问答、服务选择各有合适布局。 |
| CTA / 按钮 / 输入对比度 | 桌面按钮不换行，主要行为有明确语义；表单、导航对比度修复后 Lighthouse 无障碍得分 100。地点列表重复收藏按钮对应不同地点。 |
| 文案 / 照片 / 数字边界 | 首页没有新增票价、时间、级别或传说事实；问答来自已审语料；线路保留顺序示意与待确认条件。图片采用已有素材，没有装饰性署名和伪造截图。 |
| 移动 / 布局稳定 / 空态与错误 | 1440、390、320 宽度检查；没有横向溢出；收藏空态、图片失败、素材缺失和保存受限文案保留；CLS=0。 |
| 动效 / effect 清理 / 键盘 | 欢迎导览的观察器和媒体偏好监听有清理；形象可以暂停；减少动态偏好可用；类别按钮 Enter 与跳到正文焦点通过。 |
| 不适用项 | 不添加 logo 墙、引用、斜体、GSAP、无限跑马灯、SaaS 参数表、评分轨道或其他与文旅无关的模块。项目为 Vite React，没有 Server Component 指令要求。 |
| Core Web Vitals | 最后一次模拟手机弱网 LCP=3.63s，超过 2.5s 目标；CLS=0，TBT=21.5ms。没有把性能目标写成全部达标，也没有把 TBT 当作 INP。真实访问 INP 尚未采集。 |

## ② 验证命令与输出摘要

```powershell
npm run build
node --test (Get-ChildItem scripts -Filter '*test.mjs').FullName
git diff --check
Get-FileHash dist/index.html,dist/nodes/index.html
```

- prebuild：简介覆盖 32/32，均有独立正文与出处；生产构建成功（Vite 6.4.3）。
- 本机全部回归：119 tests、119 pass、0 fail、0 skipped，包含原有内容、foundation、QA、行程、检索路由与新增首页三项检查。
- 同一待发布版本在服务器 Node 20.20.2 运行：119 tests、119 pass、0 fail、0 skipped。
- git diff --check 通过；删除清单为空；server/ 全部文件 SHA256 与改版前基线一致。
- dist/index.html 与 dist/nodes/index.html SHA256 相同，直接访问 /nodes 时的静态目录入口已可返回页面。

性能检查使用官方 npm 注册表的 Lighthouse CLI：

```powershell
$env:CHROME_PATH='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npx --yes lighthouse http://127.0.0.1:15174 --chrome-flags='--headless --disable-gpu --no-first-run' --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path=.web_review/redesign-lighthouse-accepted --quiet
```

最后一次手机模拟：性能 89、无障碍 100、最佳实践 100、SEO 100。测量详情保存在 redesign-performance-2026-10-07.json；完整原始报告在 .web_review/redesign-lighthouse-accepted.report.json / .html。测速为本地生产预览，不等同于公网访问速度。构建补入口页后代码、首屏资源与首页布局没有变化。

浏览器检查：

| 操作 | 观察结果 |
|---|---|
| 1440 桌面与 390/320 手机首屏 | 淮源姐在标题旁，照片、输入框、主按钮可见，无横向溢出。 |
| 首页四类主题、手动风景选择 | 正文与照片随选择改变；计数来自实际栏目数据。 |
| 两条主题线路与确认项 | 可以切换预览和展开未确认条件；没有承诺地理距离或当前设施。 |
| 四条已审节点问答 / 六类准备事项 | 可展开正文；游客看到所需答案，保留数据内的来源、状态字段。 |
| 首屏输入固定问题并提交 | 进入淮源姐对话，回答“天生桥是天然的还是人工的？”；测试对话已清理。 |
| 收藏至行程 | 加入地点后显示已保存，行程可见；本轮临时测试地点已移除，原开发端行程保留。 |
| 地点目录展开 / 详情 / 无图节点 | 目录从 6 项展开到 12 项；详情照片优先；虾子灯等缺图节点保留提示。 |
| 键盘 | Enter 选择主题，跳到正文把焦点带到 main。 |

部署验收：

- 版本：20261007-design-1135edbb88。
- 代码归档：/home/zhangpanhh/apps/lishui-web/releases/20261007-design-1135edbb88，发布到 /var/www/lsguide。
- 旧站可回退备份：/var/backups/lishui-guide/20261007-design-1135edbb88/web。
- 发布包 240 个清单文件，扫描没有服务密钥；80 个静态文件逐个 SHA256 验证一致。
- 首页、/nodes、/nodes/n_dls、/itinerary、robots、首屏照片、淮源姐形象：源站 HTTP 200。
- /ready：ready=true，135 个语料块，1024 维；知识索引哈希保持原值。
- 保留 27 个旧版带哈希的 JS/CSS 文件，照顾已经打开的旧页面。
- Nginx 所有既有配置哈希不变；API 单元状态、进程和工作目录不变；cyberemotionlab.cn 的 532 个文件、应用进程与 3000 端口监听均未改变。
- 两次前置发布检查发现 /nodes 目录冲突时自动回退，增加构建入口后第三次发布通过；没有修改 Nginx 或其他站点。

## ③ 遗留问题与下一步建议

1. 模拟弱网 LCP 仍约 3.6 秒，建议后续专门拆分首屏不需要的对话与资料代码，进一步减少资源体积；不把当前性能描述为全面达标。
2. 原有四个节点仍缺配图，保持无图提示，待用户提供实拍或授权素材；本次未增加伪造照片。
3. 公网 525 按用户说明的备案状态处理，本轮不排查、不修改 Cloudflare、证书或 Nginx；此次只确认已发布源站正常。
4. 本次未创建 Git 提交或推送；所有改动与逐文件说明均保存在工作区。
