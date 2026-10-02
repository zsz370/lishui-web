# 溧水数字人导览 · Web 骨架 (lishui-web)

> 2026 数媒竞赛参赛作品 · MVP 骨架。队友 clone / 拉取后按下面 3 步就能本地跑起来。

## 1. 启动

```bash
cd E:\数媒\lishui-web
npm install
npm run dev
```

浏览器打开 http://localhost:5173 即可看到首页会客厅。

## 2. 目录结构

```
lishui-web/
├─ index.html
├─ vite.config.js       # Vite + 允许 dev 时读 E:\数媒\数字人素材
├─ tailwind.config.js   # 溧水色板：ink / lake / mountain / fire / rice / mist
├─ src/
│  ├─ main.jsx          # 挂载 BrowserRouter + ItineraryProvider
│  ├─ App.jsx           # 路由表
│  ├─ index.css         # Tailwind 基座 + .card/.btn/.tag 通用类
│  ├─ pages/            # Home / Nodes / NodeDetail / Itinerary / About
│  ├─ components/       # Layout / NodeCard / ChatPanel
│  ├─ data/             # personas.js (12) / nodes.js (景点·美食·民俗) / presetQA.js / store.jsx
│  └─ services/chat.js  # 目前是预置问答命中，10/8 起换成 RAG 后端调用
└─ public/
   ├─ personas/         # 放 12 张立绘，命名 01_huaiyuanjie.png …
   └─ nodes/            # 放景点图，命名 n_tsq.jpg / n_wx.jpg …
```

## 3. 素材怎么接进来（3 分钟）

`数字人素材\矩阵人物立绘\01_淮源姐\` 里的静态 PNG → 复制/重命名为
`public\personas\01_huaiyuanjie.png`（其他 11 张同理）。

`数据包资源` 或 `数字人素材` 里的景点图 → 复制到 `public\nodes\` 下，
文件名用 `nodes.js` 里的 id（如 `n_tsq.jpg`）。

找不到文件时前端会自动降级为色块 + 文字首字母，不影响功能。

## 4. 关键设计（对齐规划文档）

- **主控导游 = 淮源姐**（`personas.js` 里的 `HOST_ID`），负责首页出镜、路由分发与行程收尾。
- **4 个主打节点**：天生桥·胭脂河、无想山、傅家边、石臼湖（`nodes.js` 里 `main: true`）。
- **对外口径**：溧水非遗 "约 50–60 项"，具体级别与年代以官方名录为准；页面已按此写。
- **合规红线**：AI 生成/合成内容按规范标识；图片来源逐项登记于 `素材授权台账.xlsx`。

## 5. 下一步（按《数媒竞赛_任务流程与执行清单》）

- 10/5–10/7：接入实拍图 + 事实核对；节点补齐到 4 个完整 + 其余列表化。
- 10/5–10/8：语料清洗、QA 版本化；`services/chat.js` 的 `ask()` 换成后端 RAG。
- 10/8–10/10：后端 FastAPI + LangGraph + 千问平台接口 + Chroma 本地向量。
- 10/10–10/12：部署出可访问 URL（Vercel / 阿里云 / 学校服务器均可）。
- 10/13–10/15：主控意图识别 → 专家子链；GIF 状态机；TTS 降级路径。
- 10/16–10/17：行程卡片分享、二维码、试用反馈。
- 10/18–10/21：内容冻结、演示视频、说明文档、提交预演。

## 6. 备注

- `vite.config.js` 已允许 dev 时读取 `../数字人素材/` 目录，避免拷贝大文件；
  打包后想真正加载需把资源拷进 `public/`。
- 本仓库不含密钥；RAG/LLM 调用走 `.env.local`，`npm run dev` 会自动读；
  示例：`VITE_QIANWEN_KEY=sk-...`（10/8 后端上线后改用服务端持有，前端不再暴露 key）。
