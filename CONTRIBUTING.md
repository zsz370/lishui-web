## Git 团队协作指南 · 溧水数字人 Web 项目

> 针对 1–2 人小队、3 周冲刺（10/2–10/23）设计。只讲你们真正用得上的操作，不写教科书。

---

### 一、一次性设置（每人做一次）

```bash
# 全局身份（首次）
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

# 换行符（Windows 必设，否则队友收到全是 ^M）
git config --global core.autocrlf true

# 中文文件名不乱码
git config --global core.quotepath false
```

---

### 二、远程仓库（推荐 GitHub / Gitee）

队长在 `E:\数媒\lishui-web` 已经 `git init` 并做了首次 commit。接下来推到远程：

```bash
# 在 lishui-web 目录下
cd E:\数媒\lishui-web

# 添加远程（GitHub 示例，Gitee 同理换 URL）
git remote add origin https://github.com/你的用户名/lishui-web.git

# 首次推送
git push -u origin main
```

队友 clone：

```bash
git clone https://github.com/你的用户名/lishui-web.git E:\数媒\lishui-web
```

以后每天开工第一件事：

```bash
git pull origin main      # 拿到队友最新的代码
```

---

### 三、日常工作流（核心循环）

整个项目 3 周，建议你们用最简单的 **"main 分支 + 功能短分支"**：

```
main ───●───────●───────────●──────●──→ (始终可演示)
         \     /             \     /
          feat/chat          feat/itinerary
```

#### 3.1 开新功能

```bash
git checkout main
git pull origin main
git checkout -b feat/chat-panel      # 分支名：feat/模块名
```

#### 3.2 写代码 → 提交

```bash
git status                            # 看改了哪些文件
git add src/components/ChatPanel.jsx  # 暂存（按文件名，别用 git add .）
git commit -m "feat(chat): 接入预置问答命中 + fallback 不编造"
```

#### 3.3 频繁推远程（防丢 + 让队友看）

```bash
git push -u origin feat/chat-panel    # 首次推该分支
git push                              # 之后再推只需这一句
```

#### 3.4 合并回 main

两种方式，你们按团队人数选：

- **1 人开发**：直接本地合并 + 推。

```bash
git checkout main
git merge feat/chat-panel
git push origin main
git branch -d feat/chat-panel
```

- **2 人并行**：GitHub 上开 Pull Request（PR），自己 review 后点 Merge；或者当面说"我这边好了你拉一下"，对方 `git pull origin feat/chat-panel` 确认无冲突后 `git checkout main && git merge feat/chat-panel && git push`。

---

### 四、Commit 信息规范

格式：`<类型>(<范围>): <描述>`

| 类型 | 什么时候用 | 示例 |
|---|---|---|
| `feat` | 新功能 / 新页面 / 新组件 | `feat(nodes): 接入天生桥实拍图 + 事实核对` |
| `fix` | 修 bug | `fix(chat): 修复空输入发发送导致 undefined` |
| `style` | UI 调样式、不改逻辑 | `style(home): 专家矩阵改 6×2 网格` |
| `data` | 改知识库/预设 QA/节点信息 | `data(qa): 骆山大龙补充 2025 苏超信息` |
| `docs` | 文档/README/说明 | `docs(readme): 补素材拷贝说明` |
| `chore` | 配置/构建/杂务 | `chore: 升级 vite 5.4` |

描述用中文即可，动词开头，≤ 50 字。

---

### 五、冲突解决（你们大概率只遇到 1–2 次）

场景：你和队友同时改了 `Home.jsx`，合并时 Git 报冲突。

```bash
# 1. 先拉最新
git pull origin main
# 提示 CONFLICT (content): Merge conflict in src/pages/Home.jsx

# 2. 打开冲突文件，找 <<<<<<< ======= >>>>>>> 标记
#    手动选择保留哪边 / 合并两边，删掉标记行

# 3. 解决后
git add src/pages/Home.jsx
git commit -m "merge: 解决 Home.jsx 冲突"
```

**预防**：开工前 `git pull`、改完就 `git push`、功能分支活不过 2 天。

---

### 六、实用快捷操作

```bash
# 撤销工作区修改（没 git add 之前）
git checkout -- src/pages/Home.jsx

# 撤销暂存（git add 了但没 commit）
git reset HEAD src/pages/Home.jsx

# 修改上一次 commit（已 commit 但写错信息 / 漏文件）
git add 漏掉的文件
git commit --amend --no-edit

# 查看简洁历史
git log --oneline -10

# 查看某文件改了什么
git diff src/data/nodes.js

# 暂存当前工作去切分支（改了一半不想 commit）
git stash
git checkout main
# ... 做完事回来
git checkout feat/chat-panel
git stash pop
```

---

### 七、.gitignore 维护

仓库里已经有 `.gitignore`（node_modules / dist / .env 等）。如果遇到不想追踪的文件：

```bash
# 追加到 .gitignore
echo "src/assets/tmp/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore 临时素材目录"

# 已经追踪了但想删掉追踪（不删本地文件）
git rm -r --cached src/assets/tmp/
git commit -m "chore: 移除误提交的临时文件"
```

**切记不要提交的**：`node_modules/`、`.env`（含 API 密钥）、大视频/模型原始文件。

---

### 八、Tag 与版本标记（交付节点）

在关键里程碑打 tag，方便回滚和答辩演示：

```bash
# v1 部署日
git tag -a v1-deploy -m "10/12 可访问 Web v1 上线"
git push origin v1-deploy

# 功能冻结日
git tag -a v2-frozen -m "10/21 功能冻结，只修 bug"
git push origin v2-frozen

# 定稿提交日
git tag -a v3-submit -m "10/23 参赛定稿"
git push origin v3-submit

# 回退到某个 tag
git checkout v1-deploy
```

---

### 九、项目时间线 × Git 动作对应

| 日期 | 该做的 git 动作 |
|---|---|
| 10/2（今天） | 远程仓库建好 + push；队友 clone 成功即 OK |
| 10/3–10/4 | `feat/skeleton` 分支完成 → 合入 main → tag `skeleton-done` |
| 10/5–10/7 | `feat/nodes`、`feat/chat`、`feat/itinerary` 各开各的短分支 |
| 10/8–10/10 | 后端 `feat/rag` 分支与前端 `main` 并行；联调时合入 |
| 10/10–10/12 | 合一切 feat 进 main；`v1-deploy` tag |
| 10/13–10/17 | 小功能直接在 main 上 commit（不再开长分支）；修 bug 用 `fix/xxx` |
| 10/18–10/21 | `v2-frozen` tag；此后只允许 `fix` commit |
| 10/22 | `v3-submit` tag；用该 tag 导出材料包 |

---

### 十、队友协作约定（建议贴群/README）

1. **开工先 pull，收工前 push**——每天至少一拉一推，不把活压在本地。
2. **分支命名 `feat/xxx` / `fix/xxx`**，合并后删分支，不留垃圾。
3. **commit 粒度适中**：一个功能点一个 commit，不要"写 50 个文件一锅炖"，也不要"改一个字一次 commit"。
4. **冲突当场解决**，不要攒着。解决不了的喊人，不要硬猜。
5. **`.env` 不进仓库**，密钥通过私密渠道（微信/飞书）传给队友。
6. **大素材放网盘 / 单独仓库**，Git 只跟代码和文本（图片走 `public/` 且压缩后入 Git，视频/GIF 原始文件不入 Git）。
7. **合并前至少跑一遍 `npm run dev`**，确认不破版。

---

### 附：你们项目常用命令速查

```bash
git pull origin main                     # 拉最新
git checkout -b feat/xxx                 # 开分支
git add <文件>                           # 暂存
git commit -m "feat(xxx): 描述"          # 提交
git push -u origin feat/xxx             # 推分支
git checkout main && git merge feat/xxx  # 合入
git tag -a v1-deploy -m "说明"          # 打 tag
git log --oneline --graph --all          # 看全景
git status                               # 看当前状态
git stash / git stash pop               # 暂存 / 恢复
```

---

> 这份文档本身也进 Git——commit 到 `docs/` 或 `CONTRIBUTING.md`，队友 clone 后自动看到。
> 有问题随时问我，也可以 `git help <命令>` 或搜"廖雪峰 git 教程"。
