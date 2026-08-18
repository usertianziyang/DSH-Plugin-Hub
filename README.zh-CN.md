<div align="center">

# DSH Plugin Hub

**一个可搜索的、纯客户端的公开 GitHub 仓库索引，标签为 `dsh-plugin`，按 Stars 数量排序。**

[English](./README.md) · [简体中文](./README.zh-CN.md) · [GitHub Topic](https://github.com/topics/dsh-plugin)

</div>

---

> ⚠️ **免责声明 — 本项目并非官方注册表、商店或市场。**
> 任何仓库维护者都可以为仓库添加 `dsh-plugin` 标签，因此本索引的收录**不构成任何形式的背书**，也**不保证**收录的仓库安全、仍在维护或可安装。
> **数据范围：** 在一次成功、完整通过完整性校验的同步过程中，GitHub REST Search API 能够返回的、带有确切 `dsh-plugin` 标签的全部公开仓库。私有的或不带此确切标签的仓库不在收录范围内；GitHub 搜索索引可能比真实情况延迟几分钟。

## ✨ 核心功能

- 🌍 **双语界面** — 支持英文与简体中文，自动检测语言并记住用户选择。
- ⚡ **完全静态** — `dist/` 即纯静态 SPA，无服务器、浏览器不发任何 API 请求、无任何追踪。
- 🔍 **客户端搜索与分页** — NFKC 归一化、不区分大小写、AND 语义，跨名称、Owner、描述、语言、许可证、标签进行搜索。
- 🏷️ **精选分类** — MCP、Web UI、命令行、桌面、视觉、记忆、智能体、安全、开发工具、编辑器集成、精选列表，并提供统一的 **全部 / 未分类** 视图。
- 🛡️ **静态校验的数据** — 每个同步分片都经过端到端的完整性检查；绝不发布截断或不完整的数据。
- ⏰ **自动刷新** — GitHub Actions 每 6 小时执行一次 cron 同步；Vercel 会在每次数据提交后自动重新部署。
- ♿ **响应式 & 无障碍** — 顶部、搜索、底部固定；尊重 `prefers-color-scheme` 与 `prefers-reduced-motion`。

## 📸 项目截图

<p align="center">
  <img src="docs/images/hero.png" alt="DSH Plugin Hub 首页（Hero）截图" width="1080">
</p>

<p align="center">
  <em>Hero 首页：顶部固定栏包含站点品牌与中英文语言切换；Hero 区展示眉头标语 <b>「社区排名 · Stars Top 10」</b>、双语主标题、指向 GitHub Topic 的数据来源链接以及最近同步时间；其下是 <b>Stars 排名前 10 的 <code>dsh-plugin</code> 仓库</b>，以信息卡片形式呈现（Owner 头像与昵称、描述、语言、Star 数、Forks、Issues、许可证、Topic 标签）。首屏以下的所有内容——探索视图、分类筛选、全文搜索与分页——均由同一份静态 <code>plugins.json</code> 在浏览器中加载并完成，<b>浏览器永远不会调用 GitHub API</b>。</em>
</p>

## 📑 目录

- [🏗️ 架构](#-架构)
- [🚀 快速开始](#-快速开始)
- [🔄 同步数据](#-同步数据)
- [🧩 前端模块](#-前端模块)
- [🚢 部署](#-部署)
- [🤝 持续集成](#-持续集成)

## 🏗️ 架构

```
GitHub REST Search API
        │  (递归日期分片 + 完整性校验)
        ▼
public/plugins.json   ← 原子写入、校验过的静态快照
        │
        ▼
React + TypeScript (Vite) — 搜索与分页全部在浏览器中完成
```

1. `scripts/sync-github.ts` 通过官方 `GET /search/repositories` 接口（`q=topic:dsh-plugin`，按 Stars 排序）抓取所有匹配仓库。
2. 结果经过清洗、去重、全局排序、校验后，**原子地**写入 `public/plugins.json`。
3. 浏览器加载 `plugins.json`，所有搜索与分页都在本地完成。浏览器**绝不**调用 GitHub API。

### 为什么需要递归日期分片

GitHub Search 每页最多返回 100 条结果，且任意查询最多只能返回前 1,000 条结果——单纯翻页无法突破这个上限。为了收录**全部**仓库，同步脚本会按仓库创建时间对查询进行递归分片：

```
topic:dsh-plugin created:2008-01-01..<当天 UTC>
```

任何 `total_count` 超过 1,000 的分片，会按日期区间中点拆分为两个相邻、不重叠、无间隔的闭区间。当一个区间已经缩小到单日但仍超过 1,000 条结果（实际中很常见——单日可能包含数千个仓库）时，同步会回退到第二个正交维度，按 Stars 数二分（`stars:min..max`）。若单一 Stars 值仍需多页（此时 `sort=stars` 已无序可言——所有仓库并列），同步会回退到第三个正交维度，按当天内的创建时间戳二分（精确到秒），把每个分片压成单页，彻底消除 offset 分页漂移。若单秒仍超出页大小，同步直接中止。**绝不发布截断的数据。** 所有分片最终按 GitHub 仓库 `id` 合并去重，再全局重排。

### 完整性保证

一次同步只在**所有**检查通过时才被视为"成功"：

- ✅ 每个 API 响应必须 HTTP 成功且 `incomplete_results === false`。
- ✅ 每个分片 `total_count <= 1000`，恰好抓取 `Math.ceil(total_count / 100)` 页，去重后的数量等于首页 `total_count`。
- ✅ 合并后的快照 `id` 不重复；每条记录都带有确切的 `dsh-plugin` 标签；计数类字段为非负整数；条目按 Stars 降序、`full_name` 升序排列。
- ✅ 发布时的 `meta.total_count` 等于本次运行实际收集并通过校验的仓库数（即"收集时快照"）。脚本仍会在收集前后各测一次根 `total_count` 并记入日志，但**不**把它当作发布门槛：线上 Topic 持续增长，严格的"前后相等"要求永远无法满足；每个分片仍然严格校验，因此任何截断的分片都绝不会发布。
- ✅ 快照先序列化到同目录下的临时文件，重新读取、再次校验，**只有**在校验通过后才原子重命名为 `public/plugins.json`。任何失败都会清理临时文件，并保留上次可用的快照。

## 🚀 快速开始

### 环境要求

- Node.js **20.19+**（推荐 22.12+ 或 24.x）

### 安装

```bash
npm ci
```

### 本地开发

```bash
npm run dev        # 启动 Vite 开发服务器
npm run test       # 运行离线测试套件（node:test + tsx）
npm run typecheck  # tsc --noEmit
npm run build      # 产出 dist/
npm run preview    # 预览生产构建
```

## 🔄 同步数据

同步脚本**只**从 `process.env.GITHUB_TOKEN` 读取 Token。可以创建本地的、被 Git 忽略的 `.env`（参考 `.env.example`），或直接在命令行导出：

```bash
GITHUB_TOKEN=ghp_xxx npm run sync
```

Token **仅**用于同步脚本，绝不会出现在前端代码、`public/plugins.json`、`dist/`、日志或错误信息中。

在没有 Token（或首次同步前）时，仓库自带一份合法的占位 `public/plugins.json`（`items: []`、`total_count: 0`、`complete: false`），本地构建仍然可以工作。

### 快照结构

`public/plugins.json` 包含 `meta`（schema 版本、Topic、Topic 链接、查询语句、`fetched_at`、`total_count`、`complete`）与 `items` 数组，每个元素对应一个 GitHub 仓库，字段包括：`id`、`name`、`full_name`、`owner`、`owner_avatar_url`、`url`、`homepage`、`description`、`stars`、`forks`、`open_issues`、`language`、`license`（SPDX id 或 `null`）、`topics`、`fork`、`archived` 以及三个时间戳。详见 `src/types.ts`。

## 🧩 前端模块

| 文件 | 作用 |
| --- | --- |
| `src/App.tsx` | 页面外壳、异步状态机（`idle` / `loading` / `success` / `error`）、搜索框、分类导航、URL 状态（`?q`、`?cat`、`?view`）以及数据来源区域。 |
| `src/i18n.ts` | 英文 / 简体中文文案、语言检测与持久化。 |
| `src/categories.ts` | 人工策划的代表性分类，按仓库标签映射（如 `web-ui` → Web UI，`mcp` → MCP）。 |
| `src/search.ts` | 纯函数式的 NFKC 归一化、不区分大小写、AND 语义搜索。 |
| `src/main.tsx` | React 入口。 |
| `src/styles.css` | 设计令牌、响应式布局、`prefers-color-scheme`、`prefers-reduced-motion`，以及顶部 / 搜索 / 底部固定布局。 |

页面滚动时，顶部、搜索框（含分类筛选）和底部保持固定。语言切换在英文与中文之间切换并记忆选择。分类由每个仓库的 Topic 派生（排除 `dsh-plugin` 自身）；插件按分类分组，组内按 Stars 降序排列。

快照通过 Vite 的 base URL 加载，因此应用既可部署在域根，也可部署在任意子路径：

```ts
const dataUrl = `${import.meta.env.BASE_URL}plugins.json`;
```

**不要**在源码中硬编码托管子路径。子路径部署请在构建时设置 Vite base（无需修改源码）：

```bash
VITE_BASE=/my-app/ npm run build
```

## 🚢 部署

`dist/` 是纯静态站点，可由任何静态主机托管（Vercel、Netlify、Cloudflare Pages、S3 / CDN、nginx……）。选定主机后，请配置：

- **构建命令：** `npm run build`
- **输出目录：** `dist`

本项目**不**使用 GitHub Pages，且未预配置任何特定托管服务商。只有在选定目标后，才需要添加对应提供商的部署配置（见下方 Vercel 指南）。

### 部署到 Vercel

本项目以 **Vercel** 为目标托管平台。站点是纯静态构建（无 Serverless Function），由 `vercel.json` 配置（SPA 路由重写、缓存头以及 `npm run build` / `dist` 的构建设置）。

#### 为什么同步任务保留在 GitHub Actions（而不是 Vercel）

主题同步脚本（`scripts/sync-github.ts`）会按 2.1 秒节流对 GitHub Search API 进行递归分片与完整性校验，短时间内会发起大量请求，整体耗时以分钟计。Vercel 的 Serverless Function 运行时长太短，无法承载这种任务；同时 Vercel 构建产物的文件系统是只读的，无法在运行时回写 `public/plugins.json`。因此同步必须在 Vercel 之外执行，方案如下：

1. **GitHub Actions** 使用 `15 */6 * * *` 的 cron（每 6 小时）以及手动触发来运行同步，使用 `github.token`（无需存储任何个人 Token）。
2. 同步成功后，工作流会把刷新的 `public/plugins.json` **提交回 `main` 分支**，并 **ping Vercel Deploy Hook**，从而立即触发一次新的生产部署。
3. Vercel 只负责托管静态站点，从不调用 GitHub API。

#### 一次性配置

1. **在 Vercel 导入仓库。** 选择 "Vite" 框架预设，或直接使用 `vercel.json` 中的值（`npm run build`，输出 `dist`）。Vercel 会在每次 `main` 分支有推送时重新构建，因此同步产生的数据提交也会触发重新部署——下面的 Deploy Hook 是一个额外的、立即触发的快捷通道。
2. **创建 Deploy Hook。** 在 Vercel 中：*Project → Settings → Git → Deploy Hooks → "Create Hook"*，复制生成的 URL。
3. **存为 GitHub Secret。** 在仓库中：*Settings → Secrets and variables → Actions → "New repository secret"*：
   - **Name：** `VERCEL_DEPLOY_HOOK_URL`
   - **Value：** 上一步复制的 Deploy Hook URL。

完成以上三步即可。在下一次定时（或手动触发的）同步中，工作流会自动刷新数据、提交并重新部署 Vercel。

#### 说明

- `VERCEL_DEPLOY_HOOK_URL` 是**可选的**：如果未设置，同步仍会提交数据，Vercel 也会因 `main` 分支的推送触发重新部署（比走 Hook 略慢）。设置 Hook 可以让重新部署立即生效。
- 同步使用的 `GITHUB_TOKEN` 是 GitHub 自带的每次运行 Token，**无需**存储任何长期 Token。它对 API 只需要 `contents: read`，对数据提交只需要 `contents: write`（在定时 / 手动运行中由工作流自动授予）。

## 🤝 持续集成

`.github/workflows/ci.yml` 在每次 PR 与 push 时运行离线测试、类型检查与构建，并额外在每 6 小时的定时任务与手动触发时执行一次完整数据同步（仅这些运行会用到 `github.token`）。构建成功后会以 `dsh-plugin-hub-dist` 为名将标准 `dist/` 目录作为构件上传。
