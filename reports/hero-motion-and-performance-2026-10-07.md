# 首屏动效恢复与问答按需加载（2026-10-07）

本轮先恢复用户要求的首屏动态淮源姐与三张风景的 5 秒自动渐变切换，验收、发布后继续完成首屏代码加载优化。最终源站版本为 `20261007-performance-ded6081458`，目标域名为 lsguide.cn。

## ① 改动文件清单

| 文件 | 改动与原因 |
|---|---|
| [src/components/HomeHero.jsx](E:/数媒/lishui-web/src/components/HomeHero.jsx) | 复用现有淮源姐透明 WebM，恢复三景每 5000ms 自动切换，保留暂停、手动选择、页面隐藏暂停、减少动态偏好和失败跳过。 |
| [src/pages/Home.css](E:/数媒/lishui-web/src/pages/Home.css) | 三张实景照片改为叠放并进行 1.6 秒透明度过渡，增加暂停控件；320px 下微调控件位置以免遮住人物脚部。 |
| [src/data/guideSession.jsx](E:/数媒/lishui-web/src/data/guideSession.jsx) | 只将问答入口 import 改为按需加载，原上下文、消息记录、取消、重试与工具轨迹处理保持原样。 |
| [src/services/deferredChat.js](E:/数媒/lishui-web/src/services/deferredChat.js) | 第一次提问才加载现有 chat.js，之后复用；加载前后检查取消信号，下载失败给出中文恢复提示并允许新请求重试。 |
| [scripts/deferred-chat.test.mjs](E:/数媒/lishui-web/scripts/deferred-chat.test.mjs) | 新增五项回归，覆盖首次加载、复用、上下文/回调传递、加载期间取消、失败恢复及原问答错误传递。 |
| [reports/hero-motion-deployment-2026-10-07.json](E:/数媒/lishui-web/reports/hero-motion-deployment-2026-10-07.json) | 保存第一步动效恢复的发布与保护状态核验。 |
| [reports/hero-performance-deployment-2026-10-07.json](E:/数媒/lishui-web/reports/hero-performance-deployment-2026-10-07.json) | 保存最终发布、源站页面及 WebM 返回结果。 |
| [reports/hero-performance-2026-10-07.json](E:/数媒/lishui-web/reports/hero-performance-2026-10-07.json) | 保存相同动效条件下两次手机模拟测速与主脚本体积对比。 |
| [reports/hero-motion-mobile-2026-10-07.png](E:/数媒/lishui-web/reports/hero-motion-mobile-2026-10-07.png) | 保存 390px 首屏效果；截图为播放期间的一帧。 |
| [reports/hero-motion-desktop-2026-10-07.png](E:/数媒/lishui-web/reports/hero-motion-desktop-2026-10-07.png) | 保存 1440px 首屏效果；截图为播放期间的一帧。 |
| [reports/hero-motion-and-performance-2026-10-07.md](E:/数媒/lishui-web/reports/hero-motion-and-performance-2026-10-07.md) | 汇总本轮逐文件说明、验证和剩余问题。 |

本轮没有添加、删除或重做角色素材，没有编辑 server/、已审问答和节点事实，没有改路由和 Nginx 配置。动态形象仍来自 `/assets/personas/transparent/01_huaiyuanjie-idle.webm`。

## ② 验证命令与输出摘要

```powershell
npm run build
node --test (Get-ChildItem scripts -Filter '*test.mjs').FullName
npm run demo:offline:build
git diff --check
git diff --name-only --diff-filter=D
```

- 动效恢复阶段：prebuild 和生产构建通过；本机与服务器共用版本均为 119 tests、119 pass、0 fail。
- 最终版本：prebuild 32/32 简介检查通过，Vite 构建成功；本机与服务器 Node 20.20.2 均为 124 tests、124 pass、0 fail、0 skipped。
- 最终离线包构建成功：85 个文件；浏览器验证离线版本首次提问“天生桥是天然的还是人工的？”可按需载入并显示现有已审答案，未依赖实时 API。
- git diff --check 通过，删除清单为空；server/ 六个文件 SHA256 与此前保存的基线一致。

浏览器检查：

| 检查 | 结果 |
|---|---|
| 标题旁淮源姐 | 视频 readyState=4、paused=false，播放时间持续变化；有独立暂停控件。 |
| 暂停与恢复形象 | 暂停后视频卸载并显示项目原静态首帧，恢复后重新播放。 |
| 三张风景 | 已观察到湖畔暮色、无想山、天生桥轮换；过渡帧中两张图同时具有不同透明度，计算样式为 opacity 1.6s。 |
| 风景暂停与手选 | 暂停后跨过切换周期仍保持选择；可直接点选指定风景，再继续自动轮播。手选会重新开始完整的 5 秒计时。 |
| 手机与桌面 | 320、390、1440px 均检查，scrollWidth 不大于视口宽度；首屏提问入口可见，窄屏暂停按钮不再遮住人物脚部。 |
| 首次提问 | 生产预览正常进入淮源姐对话并显示现有已审答案；测试对话已清理。 |
| 取消与失败 | 新增单元测试验证已取消请求不加载/不执行问答，下载失败不暴露技术错误，后续可以重新载入，原问答失败仍由原会话处理。 |

沿用已确定的旅行手册布局、溧水品牌色与中文字体，继续应用 frontend-design / design-taste-frontend 的移动端、焦点、视觉层级和动效检查。用户明确要求恢复的 5 秒自动轮播已保留；减少动态偏好下轮播与人物回到静态，监听器和计时器均有清理。没有为测速关闭用户要求的动效。

使用 Lighthouse CLI 对生产预览执行相同的手机模拟，官方工具文档见 [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse)。

```powershell
$env:CHROME_PATH='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npx --yes lighthouse http://127.0.0.1:15174 --chrome-flags='--headless --disable-gpu --no-first-run' --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path=.web_review/hero-performance-lighthouse --quiet
```

| 指标 | 动效恢复后、优化前 | 问答按需加载后 |
|---|---:|---:|
| 主脚本 gzip | 164.23KB | 148.60KB，减少约 9.5% |
| Lighthouse 性能 | 77 | 80 |
| 无障碍 / 最佳实践 / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| FCP | 1.81s | 1.67s |
| LCP | 6.09s | 5.27s |
| CLS | 0 | 0 |
| TBT | 19ms | 6ms |

具体原始结果保存在 `.web_review/hero-motion-lighthouse.report.json` 和 `.web_review/hero-performance-lighthouse.report.json`。最终仅另外调整了 320px 暂停按钮位置，Lighthouse 模拟宽度下布局不变。测速是本地生产预览的一次模拟对比，不能视作公网速度承诺；主脚本体积取最终构建输出。初次首页网络记录没有下载 chat/presetQA 按需分块。

发布顺序与核验：

1. 动效恢复发布：`20261007-motion-24b41b6d58`。
2. 按需加载及窄屏修订后的最终发布：`20261007-performance-ded6081458`，发布根目录 `/var/www/lsguide`，代码归档在 `/home/zhangpanhh/apps/lishui-web/releases/20261007-performance-ded6081458`。
3. 最终包 245 个清单文件，服务密钥扫描命中 0；83 个静态文件逐个哈希核验；上一版本已备份到 `/var/backups/lishui-guide/20261007-performance-ded6081458/web`。
4. 首页、图鉴、节点详情、行程与首屏素材均为源站 HTTP 200；淮源姐 WebM 为 HTTP 200、video/webm、172645 字节。
5. API ready=true，135 个语料块、1024 维，原索引哈希不变。API 服务进程与工作目录没有改变。
6. Nginx 配置、cyberemotionlab.cn 的 532 个文件、应用进程和 3000 端口监听均与发布前相同。保留旧版哈希脚本，照顾尚未刷新的页面。

## ③ 遗留问题与下一步建议

- 保留全部动效时，模拟弱网 LCP 仍约 5.3s，未达到 2.5s 目标；不能与上一轮关闭轮播/静态形象时的分数直接比较。后续可继续减少首屏非必要资源及资料代码，不再删除用户要求的动效。
- 淮源姐动作沿用既有站立循环，播放受浏览器和设备能力影响；视频失败或减少动态偏好开启时继续提供静态首帧。
- 原有缺图节点仍等待实拍或授权素材，本轮未添加事实和伪造图片。
- 公网 525 按用户说明不处理，本轮只核验源站发布；不调整 Cloudflare 或证书。
- 工作区尚未提交或推送；本地生产预览保留在 http://127.0.0.1:15174/ 。
