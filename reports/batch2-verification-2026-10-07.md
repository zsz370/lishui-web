# 批次2验证与部署记录（2026-10-07）

部署目标为 lsguide.cn，源站版本为 `20261007-content-40921c0c1a`。静态目录为 `/var/www/lsguide`，API 单元为 `lishui-guide-api.service`。本批同时发布此前批次1的已验证清理；旧版备份位于 `/var/backups/lishui-guide/20261007-content-40921c0c1a`。

| 验证命令或检查 | 输出摘要 |
| --- | --- |
| npm run test:content | 5通过，0失败 |
| npm run test:foundation | 7通过，0失败 |
| npm run test:qa | 6通过，0失败 |
| node --test scripts/content-expansion.test.mjs | 4通过，0失败 |
| node --test 所有 scripts/*test.mjs | 本地116通过，0失败；目标Node20同样116通过 |
| npm run build | prebuild通过，32/32简介覆盖；生产构建通过 |
| node scripts/export-reviewed-corpus.mjs | 已审135（节点102、服务33）；待核11（节点5、服务6） |
| npm run rag:index | 135条、1024维，索引就绪 |
| node scripts/audit-guide.mjs | 单导游；32节点、8服务；135条索引就绪 |
| git diff --check 本批文件 | 通过；原有guideSession.jsx末尾空行未处理 |
| 服务器回环Nginx访问 | 首页、行程、东庐山节点页均200 |
| 服务器实际HTTP问答 | 5组新增问答kind=preset，正文匹配 |
| 发布文件核对 | 225个发布文件与当前本地一致；73个静态文件与源站一致 |
| 保护核对 | 本地server与public共46个文件哈希未变；Nginx配置及cyberemotionlab.cn的532个受检文件、进程、3000端口未变 |
| 旧资源核对 | 源站已无批次1指定的旧PNG/GIF；huaiyuan-poster.png保留 |
| 公网HTTPS | lsguide.cn与www.lsguide.cn均返回Cloudflare 525 |

浏览器验证：两条主题均正确载入对应地点；切换主题会更新自动生成的目标，用户自填目标与出行条件保留。东庐山详情新增问答可展开，答案正文未显示出处或审核元数据；390像素视口检查无水平溢出。此检查不是实机测试。

Cloudflare 525说明Cloudflare与源站之间的SSL握手未成功，具体原因尚未定位。参见[Cloudflare官方说明](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-525/)。本批未改SSL、Nginx或Cloudflare配置，公网访问恢复需要另行排查。

新增内容逐条来源与状态见[内容清单](content-expansion-2026-10-07.md)，完整数据见[JSON](content-expansion-2026-10-07.json)，部署核对结果见[部署JSON](deployment-2026-10-07.json)。

待核10条新增问题和原有童谣均隔离。没有新增图片；陆家大龙、虾子灯、打社火、打五件继续等待实拍或授权配图。`docs/`依赖被Git忽略的问题仍存在。

