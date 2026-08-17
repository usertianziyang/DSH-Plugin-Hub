# DSH Plugin Hub：编码 AI 执行提示词

你是一名资深全栈工程师。请在当前仓库中直接完成一个可部署、可维护、经过验证的生产级 React 网站 **DSH Plugin Hub**。不要只给方案、伪代码或文件片段；需要实际创建或修改文件、运行检查，并在结束时报告验证结果。

## 1. 工作方式

1. 先检查仓库结构、已有代码、`AGENTS.md`、包管理器、脚本和未提交修改。
2. 如果仓库已经有前端或工具链，优先沿用已有技术栈和公共能力，不要重复脚手架或覆盖用户修改。
3. 如果仓库为空，采用下面的默认技术方案：
   - Node.js 20+
   - TypeScript
   - React + React DOM
   - Vite 的 React TypeScript 模板
   - React Hooks、浏览器原生 `fetch`、`URLSearchParams` 和 History API
   - Node 内置 `node:test` 与 `assert`
   - GitHub Actions 持续检查与通用 `dist/` 构建产物
4. React 是明确要求，不得退回 Vanilla DOM 页面，也不要改用 Next.js、Vue 或其他前端框架。保持实现简单、直接，不要引入数据库、服务端 API、Algolia、Elasticsearch、全局状态管理库、UI 组件库、React Router 或模糊搜索依赖；当前数据规模和单页面 URL 状态不需要这些能力。
5. 不要为了“以后可能需要”创建接口、工厂、适配层、配置中心或空目录。非必要不要拆分过多文件。
6. 不要因为缺少 `GITHUB_TOKEN` 而停止开发。所有离线测试和构建仍应完成；只有真实全量同步可以标记为“未执行：缺少凭证”。
7. 遇到能够从仓库或官方文档确认的问题自行确认并继续，不要把常规技术选择反问给用户。
8. 涉及 GitHub REST API、GitHub Actions 或 Vite 的当前语法时，先查其最新官方文档，再实现；不要依赖可能过时的记忆。

## 2. 产品定义

产品名称：

```text
DSH Plugin Hub
```

页面标题：

```text
DSH Plugin Hub — Discover the DSH Plugin Ecosystem
```

主标语：

```text
Explore open-source plugins and tools for DeepSeek Harness.
```

必须在页面显著位置准确说明数据范围：

```text
A searchable index of public GitHub repositories tagged with dsh-plugin, ranked by stars.
```

这个网站是公开 GitHub Topic 仓库的可搜索索引，不是官方插件商店、官方注册表或认证目录。任何仓库维护者都能添加 Topic，因此不要使用 `Official Plugins`、`Marketplace`、`Store` 或“全部均已验证可安装”等误导性表述。

“全部仓库”的准确边界是：

> GitHub Search 索引中，所有公开、带有精确 `dsh-plugin` Topic、在本次成功同步时能够由 GitHub REST Search API 返回的仓库。

GitHub 搜索索引可能存在短暂延迟。私有仓库和没有精确 `dsh-plugin` Topic 的仓库不属于本项目的公开数据范围。

## 3. 必须交付的能力

完成以下三部分，缺一不可：

1. 可靠的 GitHub 数据同步器
2. 可搜索、可分页、响应式且无障碍的 React 前端
3. 自动测试、持续集成和平台无关的生产构建产物

不做以下超出范围的能力：

- 不抓取 `https://github.com/topics/dsh-plugin` 的 HTML。
- 不做用户登录、收藏、评论或管理后台。
- 不做插件 Manifest 验证或“已认证插件”评分。
- 不排除 Fork 或 Archived 仓库；保留并在界面上明确标记。
- 不提供多种排序模式；默认且始终按 Stars 降序。
- 不建立数据库或搜索服务。

## 4. 核心数据源

使用 GitHub 官方 REST API：

```http
GET https://api.github.com/search/repositories
```

基础查询条件：

```text
q=topic:dsh-plugin
sort=stars
order=desc
per_page=100
```

请求头至少包含：

```http
Accept: application/vnd.github+json
Authorization: Bearer $GITHUB_TOKEN
X-GitHub-Api-Version: 2022-11-28
User-Agent: dsh-plugin-index
```

如果官方文档已经给出更新的推荐 API 版本，请使用当前推荐值，并在 README 中记录。

必须用 `URL` 和 `URLSearchParams` 构造请求，不能手工拼接未编码的查询字符串。Token 只允许由同步脚本读取：

```text
process.env.GITHUB_TOKEN
```

Token 绝不能出现在前端代码、静态数据、构建产物、错误消息或日志中。

不要把历史讨论中的仓库总数 `5,825` 写入业务逻辑、测试断言或页面静态文案。总数会变化，必须来自每次同步响应的 `total_count`。

## 5. 必须正确解决 GitHub Search 的 1,000 条限制

GitHub Search API 每页最多返回 100 条，并且一个搜索查询只能访问前 1,000 条结果。因此绝不能通过对根查询简单循环几十页来声称拿到了全部仓库。

实现按仓库创建日期递归分片的完整采集：

```text
topic:dsh-plugin created:2008-01-01..同步开始时的 UTC 日期
```

算法要求：

1. 记录本次同步开始时的 UTC 日期，整个同步期间使用同一个结束日期。
2. 对一个闭区间日期范围先请求第一页并读取 `total_count`。
3. 如果 `total_count <= 1000`，分页获取该范围的全部结果；第一页响应应复用，不能重复请求。
4. 如果 `total_count > 1000`，按日期中点拆成两个连续、互不重叠、没有空隙的闭区间，再递归处理。
5. 示例：左区间结束于 `2026-06-30` 时，右区间必须从 `2026-07-01` 开始。
6. 日期计算必须使用 UTC，避免本地时区导致边界重复或遗漏。
7. 如果范围已经缩小到单日但 `total_count` 仍大于 1,000，立即让同步失败，不得截断或发布残缺数据。
8. 单日超过 1,000 条时，可以在错误信息中说明未来可增加 Stars 范围作为第二维分片，但本次不要提前实现这套复杂逻辑。
9. 合并全部分片后，使用 GitHub 数字仓库 `id` 去重。
10. 合并后重新做全局排序，不能依赖各分片内部的顺序。

最终排序规则固定为：

```ts
items.sort(
  (a, b) =>
    b.stars - a.stars ||
    a.full_name.localeCompare(b.full_name, "en"),
);
```

Stars 相同时按 `owner/repository` 升序，保证输出稳定。

## 6. 完整性与一致性保护

数据同步的成功条件不是“HTTP 没报错”，而是全部校验通过。

每个 API 响应都必须满足：

- HTTP 状态成功。
- `incomplete_results === false`。
- 响应结构符合预期。

每个可分页分片都必须满足：

- `total_count <= 1000`。
- 获取页数为 `Math.ceil(total_count / 100)`，零结果不额外翻页。
- 本分片按仓库 `id` 去重后的实际数量严格等于该分片首次响应的 `total_count`。

合并后的快照必须满足：

- 不存在重复 `repository.id`。
- 每项 `topics` 都包含精确字符串 `dsh-plugin`。
- 每项都有有效的 GitHub 仓库 URL。
- `stars`、`forks`、`open_issues` 是非负整数。
- 结果严格符合全局排序规则。
- 唯一仓库数量严格等于同步结束时根查询的 `total_count`。
- `meta.topic_url` 严格等于 `https://github.com/topics/dsh-plugin`。
- `meta.total_count === items.length`。
- `meta.complete === true` 只在全部检查通过后设置。

在完整同步前后各执行一次根查询 `topic:dsh-plugin` 并记录 `total_count`：

- 如果前后数量一致且其他校验均通过，允许发布。
- 如果数量不一致，自动从头重试一次完整同步。
- 第二次仍不一致则任务失败，不覆盖旧快照，不部署本次结果。

所有同步输出必须先写入与目标文件同目录的临时文件，完成 JSON 序列化、重新读取和最终校验后，再用原子重命名替换 `public/plugins.json`。任何异常都必须清理临时文件并保留上一次成功文件。

## 7. 限流、超时与重试

GitHub Search 端点有独立限流。实现稳健但不过度复杂的顺序请求策略：

- 禁止高并发请求；按顺序调用 Search API。
- 认证搜索当前通常限制为每分钟 30 次，默认在搜索请求之间保留约 2.1 秒间隔；如果最新官方文档有变化，以官方值为准。
- 每个请求设置合理超时，例如 30 秒，使用 `AbortController`。
- `429` 或限流 `403`：优先遵循 `Retry-After`，否则等待到 `x-ratelimit-reset`；等待时间增加少量安全余量。
- 二级限流响应也必须遵循 `Retry-After`，不得立即密集重试。
- 网络错误和 `500`、`502`、`503`、`504`：最多重试 3 次，使用简短指数退避，例如 2 秒、5 秒、10 秒。
- 认证失败、权限错误、结构错误、持续的 `incomplete_results` 或校验失败：给出不含敏感信息的明确错误并终止。
- `incomplete_results: true` 不能被当作成功结果；可以进行有限重试，仍不完整则失败。

同步日志只输出可运维信息：当前日期分片、进度、请求次数、限流等待、最终仓库数、耗时和输出路径。不要记录 Authorization 请求头或 Token。

## 8. 静态快照结构

输出文件固定为：

```text
public/plugins.json
```

使用下面的精简结构，不要保存 GitHub 原始响应中的大量模板 URL：

```json
{
  "meta": {
    "schema_version": 1,
    "topic": "dsh-plugin",
    "source": "github-rest-search",
    "topic_url": "https://github.com/topics/dsh-plugin",
    "query": "topic:dsh-plugin",
    "fetched_at": "2026-08-17T03:40:03.000Z",
    "total_count": 1,
    "complete": true
  },
  "items": [
    {
      "id": 123456789,
      "name": "example-plugin",
      "full_name": "owner/example-plugin",
      "owner": "owner",
      "owner_avatar_url": "https://avatars.githubusercontent.com/u/123?v=4",
      "url": "https://github.com/owner/example-plugin",
      "homepage": null,
      "description": "Example DSH plugin.",
      "stars": 100,
      "forks": 10,
      "open_issues": 2,
      "language": "TypeScript",
      "license": "MIT",
      "topics": ["dsh-plugin"],
      "fork": false,
      "archived": false,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-08-17T00:00:00Z",
      "pushed_at": "2026-08-16T00:00:00Z"
    }
  ]
}
```

映射规则：

- `id` ← `repository.id`
- `name` ← `repository.name`
- `full_name` ← `repository.full_name`
- `owner` ← `repository.owner.login`
- `owner_avatar_url` ← `repository.owner.avatar_url`
- `url` ← `repository.html_url`
- `homepage` ← 有内容的 `repository.homepage`，否则 `null`
- `description` ← `repository.description`，允许 `null`
- `stars` ← `repository.stargazers_count`
- `forks` ← `repository.forks_count`
- `open_issues` ← `repository.open_issues_count`
- `language` ← `repository.language`，允许 `null`
- `license` ← 优先 `repository.license.spdx_id`；缺失时为 `null`，不要伪造许可证
- `topics` ← `repository.topics`
- `fork`、`archived` 和三个时间字段保留原值

在没有 Token、尚未完成首次同步时，可以提交一个符合 Schema、`items: []`、`total_count: 0`、`complete: false` 的占位快照供本地构建使用。不得把伪造仓库当作生产数据发布。

## 9. 网站功能与交互

使用 React + TypeScript 实现前端。网站加载构建产物中的 `plugins.json`，所有搜索和分页均在浏览器本地完成。不得从浏览器直接请求 GitHub API。

通过 Vite 基础路径构造数据地址，确保应用部署在域名根路径或任意子路径时都能加载数据：

```ts
const dataUrl = `${import.meta.env.BASE_URL}plugins.json`;
```

不要把 `/plugins.json`、仓库名称或某个托管平台的子路径写死到组件中。

### React 实现约束

- 使用函数组件和 Hooks，不使用 class component。
- 用 TypeScript 判别联合表示 `idle`、`loading`、`success`、`error` 异步状态，避免多个布尔值组合出不可能状态。
- 在 Effect 中获取快照，并用 `AbortController` 或等价 cleanup 防止组件卸载后的过期响应更新状态。
- 仓库原始数据和请求状态可以保存在组件状态中；过滤结果、总页数、当前页切片等派生值应直接计算，必要时用 `useMemo`，不要复制成第二份 state。
- 搜索输入使用受控组件。
- 列表项使用稳定的 GitHub 仓库 `id` 作为 React `key`，不得使用数组下标。
- 组件按有意义的界面职责拆分，例如 `App`、数据来源信息、搜索区、仓库列表/卡片和分页；不要为一行 JSX 创建组件，也不要把整个页面堆进一个超大组件。
- 不使用 `dangerouslySetInnerHTML`。
- 约 6,000 条本地记录不需要 Suspense 数据框架、虚拟列表或 `useDeferredValue`；只有实测输入卡顿时再增加对应优化。

### 页面内容

至少包含：

- 产品名称 `DSH Plugin Hub`、主标语和数据范围说明。
- 一个始终可见的数据来源区域，显示 `Source: GitHub Topic dsh-plugin`，并链接到下方指定的精确来源地址。
- 一个有可见标签或无障碍名称的搜索输入框。
- 收录仓库总数、当前搜索结果数。
- 最近一次成功同步时间，显示用户本地时间，并保留机器可读的 `<time datetime="...">`。
- 默认按 Stars 降序的仓库卡片列表。
- 每页 60 条，上一页、下一页和当前页信息。
- 仓库名称、Owner、Description、Stars、Forks、Language、License、Topics。
- Fork 和 Archived 的清晰标记。
- 加载状态、加载失败状态、空数据状态和无搜索结果状态。
- 页脚免责声明：数据来自公开 GitHub Topic，不代表官方认证或可安装性保证。

快照中的 `meta.topic_url` 和页面展示的数据来源链接固定为：

```text
https://github.com/topics/dsh-plugin
```

来源链接必须满足：

- 在首屏产品信息区可见，不能只藏在 README、页脚或页面源码中。
- 文案明确指出该链接是本页仓库数据的 Topic 来源。
- React 页面从已校验的 `snapshot.meta.topic_url` 读取链接，不在多个组件中重复维护同一 URL 常量。
- 使用真正的 `<a>` 元素，允许键盘访问。
- 新窗口打开时使用 `target="_blank" rel="noopener noreferrer"`。
- 不要把 GitHub Search API 地址展示成用户数据来源链接；面向用户展示的是上述 Topic 页面，采集实现仍使用官方 REST API。

### 搜索规则

可搜索字段：

- `name`
- `full_name`
- `owner`
- `description`
- `language`
- `license`
- `topics`

标准化规则：

```ts
const normalize = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase();
```

把查询去除首尾空白，再按一个或多个空白符拆成关键词。所有关键词都必须在该仓库合并后的搜索文本中命中。搜索为空时返回全部结果。搜索不能改变原有 Stars 排序。

### URL 状态

- 使用 `?q=...` 保存搜索词，使结果可分享和刷新恢复。
- 可使用 `page` 参数保存页码。
- 输入变化时使用 `history.replaceState` 更新 URL，不要触发整页刷新。
- 搜索词变化时回到第 1 页。
- 页码超出当前结果范围时自动收敛到有效页码。

### 渲染和性能

- 数据可以一次加载，但只渲染当前页的 60 条记录。
- 不要一次创建几千个仓库卡片 DOM 节点。
- 不需要虚拟列表、Web Worker、索引数据库或模糊搜索库。
- 对搜索文本可以在加载数据时预计算一次，避免每次输入重复拼接字段。
- React 默认文本插值会转义内容；保持默认安全渲染，不要把仓库字段拼进 HTML 字符串。

### 视觉与响应式要求

设计应专业、克制、偏开发者工具风格，而不是默认脚手架页面：

- 清晰的字号层级、舒适的内容宽度和间距。
- 桌面、平板和手机均可用。
- 卡片信息密度合理，长仓库名、Description 和 Topic 不破坏布局。
- Stars 是最醒目的仓库指标。
- 使用 CSS 自定义属性统一颜色、间距和圆角。
- 支持 `prefers-color-scheme` 或提供同等质量的默认主题；不要为主题功能引入额外 JavaScript 状态。
- 尊重 `prefers-reduced-motion`。
- 保证键盘焦点可见、颜色对比度合理、按钮禁用状态明确。
- 外部仓库链接使用安全属性，例如 `target="_blank" rel="noopener noreferrer"`，并给屏幕阅读器足够上下文。

添加基本 SEO 元数据，包括准确的 `<title>`、description、viewport 和适合的 Open Graph 文本。不要声称是官方产品。

## 10. 项目结构与脚本

优先保持在类似下面的紧凑结构内；如果仓库已有结构则合理适配，不要机械重建：

```text
.
├── .github/workflows/ci.yml
├── public/plugins.json
├── scripts/sync-github.ts
├── src/App.tsx
├── src/main.tsx
├── src/search.ts
├── src/styles.css
├── tests/sync-github.test.ts
├── tests/search.test.ts
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
└── README.md
```

如果测试能够直接导入 `scripts/sync-github.ts` 中导出的纯函数，就不要额外创建只有一处使用的抽象层。脚本入口必须有 guard，导入测试时不能自动执行真实同步。

`package.json` 至少提供：

```text
npm run dev
npm run sync
npm run test
npm run typecheck
npm run build
npm run preview
```

运行时依赖只需要 React 和 React DOM。开发依赖使用 Vite、官方 React 插件、TypeScript、React 类型包，以及一个轻量 TypeScript 执行器（如项目确实需要 `tsx`）。不要额外添加状态管理、路由、组件库或 CSS 框架。使用当前稳定且相互兼容的版本，遵守它们的 Node.js engine 要求。提交 lockfile，CI 使用 `npm ci`。

`.env.example` 只包含变量名和说明，不包含真实 Token：

```dotenv
GITHUB_TOKEN=
```

`.gitignore` 必须排除 `.env`、临时同步文件、构建产物和常见本地缓存。

## 11. 自动化测试

非平凡采集逻辑必须留下可运行测试。优先使用 Node 内置 `node:test`，通过注入或替换 `fetch` 返回确定性响应；测试不得访问真实 GitHub API。

至少覆盖：

1. 日期分片连续、无重叠、无遗漏。
2. `total_count > 1000` 时递归切分。
3. `total_count <= 1000` 时正确计算并获取所有分页，且复用第一页。
4. 零结果分片不会产生多余分页请求。
5. 单日仍超过 1,000 条时失败。
6. `incomplete_results: true` 按策略重试，持续不完整时失败。
7. 分片实际唯一数量与 `total_count` 不一致时失败。
8. 跨分片重复仓库按 `id` 去重；去重后数量不满足完整性要求时不能发布。
9. 最终按 Stars 降序，同 Stars 按 `full_name` 稳定排序。
10. 非法字段、缺失精确 Topic 或负数计数会使校验失败。
11. 同步失败时旧的 `plugins.json` 不被覆盖。
12. 搜索大小写不敏感并执行 NFKC 标准化。
13. 多关键词采用 AND 语义。
14. 空搜索返回全部结果，结果顺序不变。
15. `429`、限流 `403` 和可重试的 `5xx` 会按响应头/退避策略重试；测试通过注入的 sleep 立即完成，不真实等待。
16. React 数据加载能区分 loading、error、空快照和 success 状态；至少通过可运行的组件测试或浏览器检查验证。
17. 首屏渲染包含指向 `https://github.com/topics/dsh-plugin` 的可访问来源链接，链接文案说明它是数据来源。

测试重点是最容易导致“残缺数据被当成完整数据发布”的路径。不要为纯展示样式编写脆弱的快照测试。

## 12. 持续集成与平台无关部署

本项目明确不使用 GitHub Pages。不要添加 Pages workflow、`configure-pages`、`upload-pages-artifact`、`deploy-pages`、Pages 权限或 Pages 专用路径配置。

使用一个紧凑的 `.github/workflows/ci.yml` 完成持续检查和可下载的生产构建产物：

- `pull_request`：执行 `npm ci`、测试、类型检查和构建；不访问真实 GitHub API。
- 默认分支 `push`：执行同样的离线质量检查和构建。
- `schedule`：每 6 小时执行一次完整数据同步、测试、类型检查和构建，例如 `15 */6 * * *`。
- `workflow_dispatch`：支持手动完整同步和构建。
- 只有 `schedule` 和 `workflow_dispatch` 的同步步骤使用 `${{ github.token }}` 作为 `GITHUB_TOKEN`；默认分支普通 push 不应为了构建消耗 Search API 配额。
- 同步任务设置 concurrency，避免多个全量采集互相干扰。
- 同步、测试、类型检查或构建任一步失败，都不得生成可发布产物。
- 成功后用官方通用 artifact action 上传完整 `dist/`，artifact 名称清楚包含 `dsh-plugin-hub`；这只是标准构建产物，不是 GitHub Pages 部署。
- workflow 使用最小权限；当前只读取仓库并上传 Actions artifact 时通常只需 `contents: read`。不要申请 `pages: write` 或 `id-token: write`。

Vite 的 `npm run build` 必须生成标准 `dist/`，它应能被任意支持静态文件的服务托管，例如 Vercel、Netlify、Cloudflare Pages、自有 Nginx 或对象存储/CDN。当前没有指定最终托管平台，因此：

- 不要擅自添加某一家平台的账号、项目 ID、部署 Token 或专用配置。
- 不要把“上传 CI artifact”描述为已经上线部署。
- README 应说明：选择托管平台后，将 build command 配置为 `npm run build`、output directory 配置为 `dist`。
- 根路径部署默认使用 Vite 的 `/` base；如果实际平台使用子路径，通过构建配置或环境变量设置 Vite `base`，不要改组件源码。
- 如果目标平台由用户后续指定，再增加该平台最小必要的部署配置。
- 不添加 Docker、Nginx 配置或服务端进程，除非仓库现状或用户后续明确要求相应部署方式。
- 前端构建产物和浏览器网络请求中不得出现 Token。

## 13. README

README 应简洁但足够让下一位维护者独立运行项目，至少说明：

- 产品用途与“非官方索引”边界。
- 架构：GitHub Search API → 完整性校验后的静态 JSON → 浏览器搜索。
- 为什么必须进行日期递归分片，而不能普通翻页超过 1,000 条。
- Node.js 版本和安装命令。
- 如何创建本地 `.env`、如何运行全量同步。
- `npm run dev`、`test`、`typecheck`、`build` 的用法。
- 数据字段和同步失败时保留旧快照的行为。
- React 前端结构、Vite `BASE_URL` 数据路径和 `dist/` 生产产物。
- CI 定时同步与 artifact 的使用方式，以及如何把 `dist/` 配置到任意静态托管平台。
- 明确说明本项目不使用 GitHub Pages，当前仓库也不预设其他特定托管商。
- GitHub Token 永远不能进入前端或提交到仓库。

## 14. 实施顺序

按以下顺序完成，不要先花大量时间装饰页面再处理核心数据：

1. 检查并确定仓库现状与可复用能力。
2. 建立最小必要的 React + TypeScript + Vite 工具链。
3. 定义数据类型、清洗映射和快照校验。
4. 实现 GitHub 请求、限流等待、重试、日期分片和分页。
5. 实现去重、全局排序、同步前后计数校验和原子写入。
6. 为采集核心路径编写确定性离线测试并运行。
7. 实现搜索纯函数及测试。
8. 完成 React 前端、可见 Topic 来源链接、URL 状态、分页、异常状态、响应式和无障碍细节。
9. 添加 CI/artifact 工作流和 README，不添加 GitHub Pages 配置。
10. 运行全部验证；修复失败，直到离线检查全部通过。
11. 如果环境提供 `GITHUB_TOKEN`，执行一次真实同步并验证生成快照；如果没有，明确记录未执行原因，但不要阻塞其他交付。

## 15. 完成标准

只有满足以下条件才算完成：

- 仓库中存在实际可运行实现，而不是方案文档或伪代码。
- `npm ci` 成功。
- `npm run test` 成功。
- `npm run typecheck` 成功。
- `npm run build` 成功。
- 项目确实使用 React + TypeScript 渲染界面，不是 Vanilla DOM 实现。
- `dist/` 是可独立托管的标准生产产物，并能通过 Vite `BASE_URL` 正确加载 `plugins.json`。
- 搜索、URL 恢复、分页、空状态和错误状态可用。
- 采集器无法静默发布超过 Search API 1,000 条限制而被截断的数据。
- 任意 `incomplete_results`、数量不一致或单日超限都会使同步失败。
- 同步失败不会覆盖上一份成功快照。
- 已成功同步的 `meta.total_count` 与唯一仓库数量一致。
- 所有仓库全局按 Stars 降序，同 Stars 顺序稳定。
- Token 不存在于 Git 跟踪文件、前端源码、静态 JSON、构建产物或日志中。
- 页面首屏清楚显示数据来源、更新时间和非官方性质。
- 页面有一个可见、可访问、指向 `https://github.com/topics/dsh-plugin` 的数据来源链接。
- 仓库不存在任何 GitHub Pages workflow、Pages action 或 Pages 专用权限。
- 移动端、键盘导航、焦点状态和基本可访问性经过检查。

有 Token 时再执行：

```bash
GITHUB_TOKEN=*** npm run sync
npm run build
```

不要在终端命令或最终报告中回显真实 Token。

## 16. 最终回复格式

实现完成后，用中文给出简洁、可核验的交付报告：

1. 已完成的核心能力。
2. 关键文件路径。
3. 实际运行的命令及成功/失败结果。
4. 是否执行了真实 GitHub 全量同步；若未执行，只说明缺少 Token。
5. 仍存在的真实限制，例如 GitHub 搜索索引延迟或尚未指定最终静态托管平台。

不要在最终回复中粘贴全部源码，不要声称未运行的检查已经通过，也不要把可选的未来功能描述成已完成。
