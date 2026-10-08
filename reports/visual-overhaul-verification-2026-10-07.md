# 遇见美溧视觉改版交付

已发布到 **lsguide.cn 源站**，版本 `20261007-visual-6b98fabe2c`。按用户提供的旧首页参考恢复完整风景首屏，并重新编排首页、目录、搜索、图鉴和详情页的视觉层级。保留现有内容、功能与信息架构。

## ① 改动文件与说明

本清单以本批开始时的备份为基准，未把此前批次的未提交改动算入本批。

| 文件 | 改动说明 |
| --- | --- |
| [src/components/HomeHero.jsx](E:/数媒/lishui-web/src/components/HomeHero.jsx) | 首屏改为完整风景背景中的标题、提问入口和欢迎导游；保留原 5 秒轮播、渐变、失败处理及无障碍反馈。 |
| [src/components/WelcomeGuide.jsx](E:/数媒/lishui-web/src/components/WelcomeGuide.jsx) | 同步欢迎语音按钮的可见文字与 aria 名称，播报和人物切换逻辑保持。 |
| [src/pages/Home.jsx](E:/数媒/lishui-web/src/pages/Home.jsx) | 重编排照片、路线站点、两种龙舞和带对应图片的问答；保留已审答案、准备事项与收藏操作。 |
| [src/pages/Home.css](E:/数媒/lishui-web/src/pages/Home.css) | 重写首页布局，扩大照片与人物，采用暖棕路线区、湖绿收藏区及简洁主题导航，补全手机布局和 44px 触控目标。 |
| [src/pages/Nodes.jsx](E:/数媒/lishui-web/src/pages/Nodes.jsx) | 搜索结果增加对应节点照片，筛选、分页、链接与节点内容保持。 |
| [src/pages/Atlas.jsx](E:/数媒/lishui-web/src/pages/Atlas.jsx) | 29 项目录改为照片目录，保留选页、翻页、方向键、出处及选中后焦点行为。 |
| [src/styles/Expedition.css](E:/数媒/lishui-web/src/styles/Expedition.css) | 统一全站字体、颜色层次、控件、照片比例与间距；重构目录与详情主次，压缩重复装饰导航，保留表单和聊天功能。 |
| [src/main.jsx](E:/数媒/lishui-web/src/main.jsx) | 接入统一视觉样式。 |
| [src/data/responsiveMedia.js](E:/数媒/lishui-web/src/data/responsiveMedia.js) | 首屏增加项目原有大尺寸照片候选，尺寸来自文件实测，不修改图像内容。 |
| [index.html](E:/数媒/lishui-web/index.html) | 图片预加载候选与全幅首屏尺寸同步，避免沿用旧半屏加载设置；标题、description、viewport 保持。 |
| [visual-overhaul-audit-2026-10-07.md](E:/数媒/lishui-web/reports/visual-overhaul-audit-2026-10-07.md) | 记录改版前问题、品牌、方向、设计参数及适用的技能规则。 |
| [visual-overhaul-guards-2026-10-07.json](E:/数媒/lishui-web/reports/visual-overhaul-guards-2026-10-07.json) | 记录源文件差异检查，证明服务端、安全、服务逻辑、知识内容及依赖未变。 |
| [visual-overhaul-performance-2026-10-07.json](E:/数媒/lishui-web/reports/visual-overhaul-performance-2026-10-07.json) | 保存最终 Lighthouse 数值与测试条件。 |
| [visual-overhaul-deployment-2026-10-07.json](E:/数媒/lishui-web/reports/visual-overhaul-deployment-2026-10-07.json) | 保存源站响应、发布版本、API 健康及其他站点保护检查。 |
| [桌面截图](E:/数媒/lishui-web/reports/visual-overhaul-desktop-2026-10-07.png) | 记录完整首屏。 |
| [手机截图](E:/数媒/lishui-web/reports/visual-overhaul-mobile-2026-10-07.png) | 记录 390px 首屏。 |
| [路线截图](E:/数媒/lishui-web/reports/visual-overhaul-routes-2026-10-07.png) | 记录暖棕路线区和实际站点顺序。 |
| [详情截图](E:/数媒/lishui-web/reports/visual-overhaul-detail-2026-10-07.png) | 记录大图详情与次要导游入口。 |
| 本报告 | 汇总逐文件说明、验证与遗留事项。 |

没有新增旅游事实、照片或外部字体；没有新增依赖或删除文件。所有照片使用项目已有素材，陆家大龙继续使用用户提供文件，名称与骆山大龙分别呈现。路线只展示现有草案的顺序，明确不代表实际距离。

## ② 验证命令与输出

| 命令 | 输出摘要 |
| --- | --- |
| `npm run build` | 通过；含 prebuild，介绍覆盖 29/29；主 JS 431.61 kB / gzip 150.56 kB。 |
| `node --test scripts/*test.mjs` | 本机 136/136 通过，0 失败、0 跳过；包含路由、行程、内容、QA、图鉴、语音和可用性回归。 |
| `npm run demo:offline:build` | 通过；86 个文件，13,555,070 字节。 |
| `git diff --check` | 通过；只有本机 LF/CRLF 提示，没有空白错误。 |
| `git diff --name-only --diff-filter=D` | 空，本批没有文件删除。 |
| 发布包 Node20 全量回归 | 服务器 136/136 通过，发布前执行。 |
| 发布包密钥检查 | 0 匹配；真实配置文件未入发布包或前端。 |

Lighthouse 13.5.0 最终首页测量：性能 **83**、无障碍 **100**、最佳实践 **100**、SEO **100**；LCP **4,440.775ms**、CLS **0**、TBT **2ms**。欢迎按钮的可见名称与无障碍名称检查通过。

该结果是本机首页的移动端模拟：150ms RTT、1638.4Kbps 吞吐配置、4 倍 CPU 降速，不是公网或真实用户数据。没有声称全站无障碍审核完成，也没有声称 LCP 已达到 2.5 秒目标。

浏览器手工验证：

- 1280px：完整首屏、大图路线、两种龙舞、图片问答和详情页正常；详情导游侧栏为 280px。
- 1024px：六项主导航在同一行，目录四张主图正常，没有横向溢出。
- 390px / 320px：标题为两行，提问按钮在首屏内，没有横向溢出；390px 首页所有可见链接、按钮、summary 的高度均至少 44px。
- 乡味主题切换正确显示手抓鸡、玉带糕与黑莓；两条主题线路切换保留原站点和文案。
- 首页周园问答正常展开，对应四张节点照片均加载；无障碍准备事项选择正确显示三条已有已审问题。
- 首屏进入无想山提问后正确返回现有已审传说答复，保留“尚无史料确证”声明；导航焦点进入 h1。
- 320px / 420px 视口收缩模拟中，输入框下边缘为 401.33px，底部导航隐藏，无横向溢出；测试草稿已清空。
- 图鉴目录有 29 个按钮和 29 张对应照片；选择陆家大龙后图片与标题匹配，焦点进入标题；下一页正确翻到跳当当。
- 陆家大龙搜索命中，结果带真实对应照片，详情照片正常加载；行程页原有 10 个基础表单控件保持，没有溢出。
- 首屏欢迎语音实际开始时进入 speaking.webm，自然结束后回到 idle.webm；人物持续动态且没有人物暂停按钮。
- 三张首屏风景继续使用 5000ms 自动切换和 1600ms 渐变，保留隐藏页面暂停及 reduced-motion 的原轮播处理。

差异保护：所有 `server/` 文件、所有 `src/services/` 文件及知识/行程数据与批次前相同；`src/data/` 仅有图片显示候选变化。依赖、主导航文字、路由、主要锚点、表单字段与顺序保持。

部署：

- 版本 `20261007-visual-6b98fabe2c`；静态根仍为 `/var/www/lsguide`。
- 84 个本版静态文件逐一 SHA-256 核对；保留 133 个旧版带内容哈希资源，减少已打开页面的懒加载失效。
- 源站回环 HTTP：首页、目录、节点详情、导览、图鉴、行程、robots、陆家大龙照片、首屏照片及人物海报全部 200。
- API 保持原工作目录和进程，ready=true，127 条索引、1024 维；本轮没有重启 API。
- Nginx 配置及 cyberemotionlab 的 532 个文件、进程与 3000 端口均与发布前一致。
- 回滚副本位于 `/var/backups/lishui-guide/20261007-visual-6b98fabe2c`；源代码发布副本位于 `/home/zhangpanhh/apps/lishui-web/releases/20261007-visual-6b98fabe2c`。
- 本地预览保留在 `http://127.0.0.1:15174/`，临时测试视口已重置。

## ③ 遗留问题与建议

1. 模拟移动端 LCP 仍约 4.44 秒，建议下一步针对首屏加载单独优化；本轮保持了布局稳定和现有实时交互。
2. 真正的 iOS/Android 软键盘、Safari/Firefox、屏幕旋转与完整屏幕阅读器路径仍需实机覆盖，本轮不把浏览器尺寸模拟当作真机测试。
3. 固定浅色、原色板与数字人动态遵循用户既有要求和参考图；未增加主题开关或花哨动效。旧样式仍保留，通过新的统一视觉层覆盖，后续可继续逐步整合。
4. 按用户说明，未调查或修改公网 525、备案、TLS、Cloudflare；部署验收针对 lsguide 源站。未提交或推送当前工作区。

![新版完整首屏](E:/数媒/lishui-web/reports/visual-overhaul-desktop-2026-10-07.png)

![大图路线与暖棕层次](E:/数媒/lishui-web/reports/visual-overhaul-routes-2026-10-07.png)
