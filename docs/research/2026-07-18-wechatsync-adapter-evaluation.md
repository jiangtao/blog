# Wechatsync 等工具承担知乎与掘金适配器的可行性评估

> 调研日期：2026-07-18
>
> 决策票：[GitHub Issue #71](https://github.com/jiangtao/blog/issues/71)
>
> 范围：评估现成工具能否安全、可复现地成为 Wayfinder 的知乎/掘金草稿适配器或实现基础
>
> 安全边界：未登录平台、未读取浏览器 Cookie、未使用真实凭据、未创建或更新真实草稿

## 结论

**Wechatsync 比“从零摸索私有接口”更有参考价值，但不比有界浏览器 UI 方案更适合作为 Wayfinder 的生产适配器。当前原样依赖为 `NO-GO`。**

核心原因不是单一功能缺失，而是四类问题叠加：

1. **写入能力不完整。** 知乎和掘金都只会新建草稿；没有按来源更新、查回验证或幂等。掘金明确把摘要、分类、标签、封面和原文链接置空；知乎也只提交标题和正文。
2. **Astro 内容链路不可靠。** CLI 只从 frontmatter 提取标题，不能映射描述、标签、分类、封面或 canonical URL；仓库的 `/images/...` 根路径会被当成文件系统根路径。实测图片失败后仍继续同步，平台失败时 CLI 仍退出 0。
3. **发布物与源码不一致。** npm 声明 `@wechatsync/cli@1.1.0`，实装后 `--version` 输出 `1.0.0`；registry 的 `gitHead` 是 `34d41ce…`，不是本报告固定审计的 `a98e428…`。仓库根许可证是 GPL-3.0，但 CLI/MCP 子包声明 MIT，不能在未澄清边界时直接抽取或再分发。
4. **固定源码存在阻断级安全问题。** Chrome 扩展向所有网页注入未做 origin/nonce 校验的调用入口；WS、内部 HTTP 和 SSE 默认没有可靠的 loopback 与鉴权边界；token、CMS 密码和全文草稿会进入 `chrome.storage.local`；远程桥接通过明文 `ws://` 传 token 和文章。

### 三种采用方式

| 采用方式 | 决策 | 适用边界 |
| --- | --- | --- |
| 原样依赖 npm CLI + 官方扩展 | **NO-GO** | 版本、许可、错误语义、幂等和安全边界均不满足；禁止进入 Wayfinder、CI、定时任务或日常浏览器 profile |
| 外围 wrapper | **CONDITIONAL GO** | 仅可复用为离线预检/转换研究样本；若仍调用原扩展写平台，则仍是 NO-GO，wrapper 无法补掉扩展 P0 和适配器缺失字段 |
| fork / 抽取适配器 | **CONDITIONAL GO（实验性）** | 仅在许可边界书面澄清、完成安全重构、使用专用 canary profile、人工单次确认后，作为默认关闭的私有 API fallback；生产默认通道仍是 NO-GO |

**推荐决策：**

- 知乎：继续采用“本地发布包 + 人工导入官方编辑器”；不部署私有 API 或自动页面写入。
- 掘金：主路线采用有头、可见、停在草稿态的浏览器 UI 适配器，借鉴 SyncCaster 的 DOM 流程，但自行补齐保存回读、元数据和幂等。
- Wechatsync：只借鉴数据结构、图片上传研究和草稿 URL 构造；不把当前 npm CLI、扩展或桥接协议纳入生产依赖。

## 调研口径与固定快照

### Wechatsync

本报告固定到 [`wechatsync/Wechatsync@a98e42865387285afcc027c61836488748f3b30f`](https://github.com/wechatsync/Wechatsync/commit/a98e42865387285afcc027c61836488748f3b30f)：

- 默认分支 `v2`；固定提交时间 2026-05-27；仓库未归档，约 6,010 stars、1,001 forks。
- 根项目版本 `2.0.0`，扩展版本 `2.0.9`，CLI/MCP 版本 `1.1.0`；各版本来自[固定 package manifests](https://github.com/wechatsync/Wechatsync/tree/a98e42865387285afcc027c61836488748f3b30f/packages)。
- GitHub Releases 仍停留在 2021 年的 `1.0.10`；v2 没有对应 GitHub release/tag，当前固定点是 commit，而不是可验证的发布 tag。
- 仓库根 [`LICENSE`](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/LICENSE#L1-L20) 是 GPL-3.0；[`packages/cli/package.json`](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/package.json#L1-L42) 和 [`packages/mcp-server/package.json`](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/mcp-server/package.json#L1-L42) 声明 MIT，core manifest 未声明 license。这里记录的是冲突，不给出法律结论；分发 fork/抽取代码前必须由维护者或法律审查确认。
- `@wechatsync/core` 没有可用的 npm 包，源码 export 直接指向 `.ts`；平台适配器不是稳定的独立库接口。[core manifest](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/package.json#L1-L35)
- 仓库还声明了不可公开访问的 `wechatsync-private-adapters` submodule；本报告所需的知乎和掘金适配器仍在固定 commit 的公开源码中。该 submodule 未初始化不影响本次四个 workspace 构建，但说明“全部平台源码可审计”并不成立。[`.gitmodules`](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/.gitmodules)

### npm 发布物

registry 一手元数据显示 [`@wechatsync/cli@1.1.0`](https://registry.npmjs.org/%40wechatsync%2Fcli/1.1.0)：

- 发布时间 2026-03-15，`gitHead=34d41ce7b592a263731511a556ebe1ef0be37398`；
- integrity 为 `sha512-KgzMcrcyXDV8Eu2rymV+TNpoCF3iC7dsBWbvhmfRjlwJMGIREaTu2T5ie2wpTAtBIP7ad1yu9V59muuucdsXjA==`；
- package manifest 声明 MIT；
- 精确安装后 package version 是 `1.1.0`，但二进制 `wechatsync --version` 实际输出 `1.0.0`。

因此不能用“npm 版本号相同”推断 npm bundle 与当前 v2 源码等价。若任何 PoC 使用 npm 包，必须同时锁定 tarball integrity、Node 版本和完整 lockfile；本报告不把它当作可从当前 HEAD 重现的 artifact。

### 命令与平台声明

固定源码 CLI 提供：

```text
wechatsync sync <file> [-p zhihu,juejin] [-t title] [--cover path-or-url] [--dry-run]
wechatsync platforms|ls [-a]
wechatsync auth [platform] [--refresh]
wechatsync extract [-o file]
```

CLI 文档宣称支持知乎、掘金等 20+ 平台，通过 WebSocket 把请求交给 Chrome 扩展；CLI 本身不实现知乎/掘金认证或网络调用。[CLI README](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/README.md#L1-L98)

CLI 没有 `--cookie`、`--header` 或 `--headers` 参数。平台 Cookie 不会被显式序列化给 CLI；CLI 只从 `WECHATSYNC_TOKEN`/`MCP_TOKEN` 读取桥接 token。[bridge token](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/mcp-server/src/ws-bridge.ts#L28-L41)

## 无副作用 hands-on

### 环境与测试计划

测试在 `mktemp` 目录完成，源码与 npm 安装互相隔离。环境是 macOS arm64、Node `v26.3.1`、npm `11.16.0`、pnpm `10.33.3`。Issue #71 的验收项和下列用例在执行前已确定：

1. 固定源码 frozen-lock 安装和四 workspace 构建；
2. npm 精确安装、version/help 与发布物元数据比对；
3. 用仓库 Astro Markdown 跑 `--dry-run`；
4. 用本地假 WebSocket 扩展跑完整 CLI 桥接，但只返回 fixture 响应；
5. 验证根路径图片、SVG 封面、失败退出码；
6. 运行仓库已有 typecheck/tests。

没有启动或操作真实 Chrome 扩展，没有请求知乎/掘金域名。

### 可复现命令

```bash
git clone --filter=blob:none https://github.com/wechatsync/Wechatsync.git source
git -C source checkout --detach a98e42865387285afcc027c61836488748f3b30f
cd source
pnpm install --lockfile=true --frozen-lockfile
pnpm --filter @wechatsync/core build
pnpm --filter @wechatsync/mcp-server build
pnpm --filter @wechatsync/cli build
pnpm --filter @wechatsync/extension build
pnpm --filter @wechatsync/core exec vitest run
pnpm --filter @wechatsync/extension typecheck
pnpm --filter @wechatsync/extension exec vitest run
```

npm 发布物另在空目录执行：

```bash
npm init -y
npm install --ignore-scripts --package-lock=true @wechatsync/cli@1.1.0
./node_modules/.bin/wechatsync --version
./node_modules/.bin/wechatsync --help
```

### 结果

| 用例 | 结果 | 判读 |
| --- | --- | --- |
| frozen-lock 安装 | 成功，673 packages | 普通 `--frozen-lockfile` 受本机全局 `package-lock=false` 影响误报无锁文件；显式 `--lockfile=true` 后使用仓库 lockfile 成功 |
| core/MCP/CLI/extension build | 全部成功 | core CJS 构建警告 `import.meta` 在 CJS 中为空；extension 有重复 icon 输出和 >500 kB chunk 警告，均未阻断 |
| npm version/help | package `1.1.0`，binary 输出 `1.0.0` | 发布物版本自证不一致 |
| 固定源码 version/help | 输出 `1.1.0`，help 与源码一致 | 进一步证明 npm bundle 不是固定 HEAD 的等价构建 |
| Astro Markdown dry-run | 标题与正文可读，frontmatter 被移除，退出 0 | 只显示前 300 字符；不解析/报告图片，不展示元数据映射，也不验证平台 |
| Astro `/images/...svg` 正文 | CLI 报“文件不存在或格式不支持”，仍把原路径发给 fixture 并报告同步成功 | 根路径被解析为操作系统根；图片失败不是阻断错误 |
| 本地 SVG 封面 | 被编码成 `data:image/png;base64,...` | cover MIME 表没有 SVG，默认错误标成 PNG；掘金适配器最终又把 `cover_image` 置空 |
| fixture 返回平台失败 | CLI 显示 `0 成功, 1 失败`，进程仍退出 `0` | 自动化无法依赖退出码判定交付成功 |
| core tests | 2 files / 28 tests 全部通过 | 只覆盖 Markdown 图片解析和 turndown；没有知乎/掘金适配器契约测试 |
| extension typecheck | 通过 | 静态类型可通过 |
| extension tests | `No test files found`，退出 1 | vitest 配置要求 `__tests__/**/*.test.ts`，固定源码没有匹配测试 |

fixture 只连接随机本地端口，使用假 token 和 `fixture.invalid` 回执；它没有模拟或触达平台认证。

## 源码能力矩阵

### 共同输入链路

CLI 的 Markdown parser 用正则删除 frontmatter，只提取 `title`；`description`、`tags`、`category`、`cover`、`canonical URL` 和 `issue` 都不会进入 article payload。[Markdown parser](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L299-L359)、[sync payload](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L627-L755)

CLI 本地图片扫描使用正则，支持简单 Markdown/HTML 图片和 `.svg` MIME，但 `/images/...` 会传给 `path.resolve(basePath, imgPath)` 并变成文件系统根路径。dry-run 在图片处理前直接退出；真实路径中图片失败只累计计数，仍继续同步。[图片扫描与读取](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L96-L229)、[dry-run 与失败继续](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L696-L742)

| 能力 | 知乎固定适配器 | 掘金固定适配器 | 结论 |
| --- | --- | --- | --- |
| create | `POST /api/articles/drafts` 创建空草稿，再 PATCH 新 ID | `POST content_api/v1/article_draft/create` | 都是未公开 Web 私有接口 |
| update 既有草稿 | 没有；PATCH 只用于刚创建的 ID | 没有 | `PlatformAdapter.update?` 虽存在，两个适配器均未实现 |
| 标题 | 提交 | 提交 | 满足基本字段 |
| 正文 | 使用 HTML，经图片和知乎转换 | 使用原 Markdown | 基本可用，仍需真实编辑器验收 |
| fenced code | CLI/扩展存在两套转换；实际 MCP 路径用 `marked` 再经 DOM 预处理，理论上保留 language class | 原 Markdown 直接传，语言围栏可保留 | 掘金较可靠；知乎没有端到端 golden test，条件满足 |
| frontmatter | 只有标题 | 只有标题 | 不满足 Astro schema |
| 相对图片 | 简单语法可读取并上传 | 简单语法可读取并上传 | 解析不是完整 Markdown AST；失败继续 |
| `/images` 根路径 | 不支持仓库 `home/public` 映射 | 同左 | 实测失败且仍继续 |
| SVG | 二进制上传代码未限制，但平台接受度未验证；封面 MIME 错标 | ImageX 接受度未验证；封面 MIME 错标且被丢弃 | 不满足；应预先栅格化 PNG |
| 摘要 | 不提交 | 固定 `brief_content: ''` | 不满足 |
| 分类 | 不提交 | 有 `getCategories()`，create 固定 `category_id: '0'` | 不满足 |
| 标签 | capability 声称支持，但不提交 | capability 声称支持，create 固定 `tag_ids: []` | 不满足，能力声明误导 |
| 封面 | CLI 传入但适配器不使用 | create 固定 `cover_image: ''` | 不满足 |
| 原文链接 | 不提交 `article.source` | 固定 `link_url: ''` | 不满足 |
| draft ID/URL | 返回 `postId` 与 `/p/{id}/edit` | 返回 `postId` 与 `/editor/drafts/{id}` | 有回执，但不查回、不验证持久化 |
| 幂等 | 每次 create | 每次 create | 不满足；超时/重试会重复 |
| 重试 | 图片 ready 最多轮询 10 次；草稿 create/PATCH 不重试 | create/image API 没有有界业务重试 | 适配器基类的 retry helper 未被二者使用 |
| 图片失败 | 基类记录错误并继续 | 下载/上传失败可返回原 URL并继续 | 会产生“成功但坏图” |
| 最终状态 | 返回 adapter result | 返回 adapter result | CLI 不因 result failure 设置非零退出码 |

知乎创建、更新与回执证据见[固定适配器 L94-L188](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/zhihu.ts#L94-L188)，图片与日志见[L277-L480](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/zhihu.ts#L277-L480)。掘金字段、create 与回执见[固定适配器 L201-L285](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/juejin.ts#L201-L285)，ImageX 流程见[L288-L559](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/juejin.ts#L288-L559)。图片基类明确吞掉单图异常后继续处理。[CodeAdapter L218-L317](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/code-adapter.ts#L218-L317)

### 失败恢复与幂等风险

知乎流程先创建空草稿，再上传图片和 PATCH 正文。如果图片、PATCH、网络或 CLI 在 create 后失败，本地拿不到成功回执，却可能已经遗留空草稿。掘金虽然是单次 create，但图片上传发生在 create 之前；create 请求超时后无法区分“平台没收到”与“已创建但回执丢失”。

桥接 secondary 模式会对 `/request` 做最多三次转发重试；它不知道 `syncArticle` 是否已经在扩展端执行，因此对非幂等写操作可能重复创建。[secondary retry](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/mcp-server/src/ws-bridge.ts#L347-L398)

任何 wrapper 若不能把 `source_key + content_sha256 + draft_id` 传入平台更新路径，就只能在重复创建外围记账，不能提供真正的 exactly-once 或 at-most-once 语义。

## 凭据、传输、落盘与日志审计

### 扩展本地会话与 CLI Cookie 参数

- **CLI 无 Cookie 参数。** 没有 `--cookie`/`--header`；未发现知乎/掘金 Cookie 被序列化进 WS/HTTP。
- **Cookie 使用留在浏览器扩展。** 扩展 manifest 拥有 `cookies`、所有 HTTP/HTTPS host、tabs、scripting 和 DNR 权限；知乎/掘金用 `credentials: include` 调私有接口。[manifest](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/manifest.json#L15-L40)、[runtime](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/src/runtime/extension.ts#L18-L87)
- **“Cookie 未离开浏览器”不等于低风险。** bridge token 代表调用已登录扩展的能力；拿到该能力可以检查账号、上传图片、创建草稿和提取当前页面。
- runtime 在展开调用者 options 后强制覆盖为 `credentials: 'include'`，连显式请求 `omit` 也会被改写；外部图片 URL 存在带浏览器凭据下载后再上传到平台的 authenticated-fetch/SSRF 风险。

### P0：任意网页调用扩展能力

扩展在所有 HTTP/HTTPS 页面和所有 frame 注入 content script。页面消息入口没有校验 `evt.origin`、`evt.source`、nonce 或用户手势，`getAccounts`、`addTask`、`magicCall` 被注释为“任何页面可调用”；结果又通过 `window.postMessage(..., '*')` 返回。[page API](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/src/content/api.ts#L48-L73)、[未设边界的调用](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/src/content/api.ts#L148-L265)

`MAGIC_CALL` 最终按页面提供的 `methodName` 动态调用适配器方法。[background dispatch](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/src/background/index.ts#L964-L987)

这意味着恶意网站不需要 Cookie 或 MCP token，也可能借用户已有会话读取账号元数据或触发草稿/上传操作。仅给 CLI bridge 加 token不能修复这个面。

### P0：Bridge、HTTP、SSE 边界

- WebSocket server 只指定端口，未绑定 loopback、未验证握手 token/Origin，任意新连接会覆盖当前 client。[WS bridge](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/mcp-server/src/ws-bridge.ts#L66-L101)
- 内部 HTTP API 设置 `Access-Control-Allow-Origin: *`，`POST /request` 没有鉴权，listen 也未指定 host；Primary 会用自己的环境变量 token 把攻击者给出的 method/params 转给扩展。[HTTP bridge](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/mcp-server/src/ws-bridge.ts#L115-L167)、[token forwarding](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/mcp-server/src/ws-bridge.ts#L420-L493)
- SSE 路由也没有应用鉴权；`upload_image_file` 接受绝对路径并直接 `readFileSync`，没有 workspace containment、realpath/symlink 或文件 magic 校验。[SSE listen](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/mcp-server/src/index.ts#L272-L323)、[file tool](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/mcp-server/src/index.ts#L118-L133)
- 文档明确远程模式默认监听 `0.0.0.0:9527`，示例使用 `ws://`，token 明文传输。[remote bridge warning](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/README.md#L101-L142)

### 落盘

- MCP token 和远程 server URL 明文进入 `chrome.storage.local`；禁用 MCP 时 token 仍保留，设置页会完整显示。[token storage](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/src/background/index.ts#L612-L672)
- CMS 密码也直接写入 `chrome.storage.local`，没有源码注释所称的加密。[CMS storage](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/src/popup/stores/cms.ts#L45-L84)
- `activeSyncState` 保存标题、正文、HTML、Markdown 和封面；完成后再次持久化，未立即清空正文。[sync state](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/src/background/sync-service.ts#L261-L280)
- CLI 的 `extract -o` 按用户路径写文件，没有显式 `0600`；它是明确用户动作，但不适合默认处理敏感页面。[extract](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L916-L956)

### 日志与第三方传输

- 掘金 debug 日志打印 ImageX token 原始响应前 500 字符，可能包含 `AccessKeyId`、`SecretAccessKey`、`SessionToken`。[Juejin token log](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/juejin.ts#L342-L378)
- 知乎 debug 日志打印待签名串和 OSS Authorization；上传失败还在 error 级别打印响应体。[Zhihu OSS log](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/zhihu.ts#L416-L480)
- 平台错误体可进入 `Error.message`，再进入扩展状态、WS 返回和 CLI/CI 输出。固定源码没有统一凭据脱敏层。
- 若构建注入 GA 配置，分析默认开启，持久化 client ID并发送平台、登录和内容轮廓统计；未发现发送正文/Cookie/token，但这仍是第三方传输，必须显式 opt-in。[analytics](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/src/lib/analytics.ts#L53-L95)

无登录审计不能确认官网/商店实际扩展包是否对应固定 commit、是否注入 GA key、平台真实错误体内容、操作系统防火墙或 Chrome SameSite/PNA 的实际拦截。以上不确定性不能作为放宽安全门槛的理由。

## 同尺度候选比较

| 工具 | 固定版本/许可 | 知乎写入 | 掘金写入 | 回执/幂等 | 凭据与风险 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| Wechatsync | `a98e428…`；根 GPL-3.0、子包 MIT 冲突 | 私有 API create + PATCH 新草稿 | 私有 API create | 有 ID/URL；无 readback/update/幂等 | 扩展 P0、bridge P0、宽权限、明文状态 | 原样 **NO-GO** |
| [SyncCaster v2.0.7](https://github.com/RyanYipeng/SyncCaster/releases/tag/v2.0.7) | `ddad3c2…`；MIT | 无成熟适配器证据 | 有头 DOM，标题/Markdown/图片，发布留人工 | 只返回当前 URL，不证明草稿持久化，无幂等 | 复用浏览器 UI，会话不导出；仍有协议/选择器风险 | 掘金 UI 参考，不能原样上线 |
| [doocs/cose v1.3.6](https://github.com/doocs/cose/commit/e70fa9e92a71cd2f10e0c883981f324a332162d4) | `e70fa9e…`；Apache-2.0 | 打开 `/write`，派发 paste、确认解析 | 本票未发现可替代的完整掘金契约 | 只回 tabId；异常路径仍可能 success | UI 自动化，不导出 Cookie；DOM 漂移和协议风险 | 知乎 UI 研究参考，不作为通道 |
| [OpenCLI](https://github.com/jackwener/OpenCLI/blob/b0f84c99c93037add29e1c1b361f5f7094f52f74/docs/adapters/browser/juejin.md#L1-L55) | `b0f84c9…`；Apache-2.0 | 无写入命令 | 只有 `recommend`/`hot` 读取 | 无草稿回执 | 浏览器/CDP 基础设施活跃，但本平台能力不匹配 | 排除 |
| [multi-publisher 1.1.3](https://github.com/xwh5/multi-publisher/releases/tag/v1.1.3) | `bc1acb4…`；项目较新 | 本票不作为更优知乎基线 | 私有 API create | 有 ID/URL；无完整元数据/幂等 | Cookie 落盘、日志输出片段、修改 webdriver 特征 | 排除 |

SyncCaster 的掘金实现与人工确认边界见[固定 DOM 适配器](https://github.com/RyanYipeng/SyncCaster/blob/ddad3c27e3f6a18537a72bc81a7b7bf9075e6efe/packages/adapters/src/juejin.ts#L16-L207)。COSE 的知乎填充与返回逻辑见[固定实现](https://github.com/doocs/cose/blob/e70fa9e92a71cd2f10e0c883981f324a332162d4/packages/core/src/platforms/zhihu.js#L57-L260)。multi-publisher 的 Cookie 行为见[固定登录实现](https://github.com/xwh5/multi-publisher/blob/bc1acb4f641c2fab7b4c2a097ff4ac84eb913b80/src/cli/login.ts#L24-L52)和[浏览器日志](https://github.com/xwh5/multi-publisher/blob/bc1acb4f641c2fab7b4c2a097ff4ac84eb913b80/src/runtime/browser-runtime.ts#L125-L147)。

没有候选同时满足公开官方接口、完整元数据、可靠草稿回执、幂等和低账号风险。区别只在于“更适合借鉴哪一层”：

- Wechatsync：私有 API payload、图片链路和草稿 URL 的研究样本；
- SyncCaster：掘金可见 UI 填充和人工接管；
- COSE：知乎 Markdown paste/import 的 UI 行为样本；
- OpenCLI：通用浏览器基础设施，不是写入适配器；
- multi-publisher：凭据和反自动化实践不符合基线。

## 最小安全采用方案

如果业务负责人仍要求保留 Wechatsync 实验 fallback，最小方案必须是**安全重构后的固定 fork**，不是 wrapper 原样调用：

1. **隔离身份。** 只用专用 canary 账号和全新浏览器 profile；不得安装到日常 profile；不得把 profile、Cookie 或 storage state 复制到 CI/远程机。
2. **删除页面通用 API。** 移除全站 content script，或只允许固定可信 origin；校验 frame/source、随机 nonce 和用户手势；禁止页面传入动态 adapter method。
3. **重做 bridge。** 默认只绑定 `127.0.0.1`/`::1`；随机临时端口；WS 升级阶段鉴权；删除 CORS `*` 和无鉴权 `/request`；SSE、远程模式、文件读取工具默认禁用。
4. **最小权限。** host permission 限定到目标平台；外部图片下载强制 `credentials: omit`，阻断 loopback、私网、link-local、非 HTTPS 和跨 origin redirect。
5. **短期凭据。** token 仅内存、短 TTL、一次任务一枚；禁用即撤销；不在 UI 完整显示。不得提供 CLI Cookie 参数。
6. **关闭外传。** 遥测和 remote config 默认关闭；日志只允许状态码、平台错误码、request ID；对 Cookie、Authorization、签名、token 和响应体统一脱敏。
7. **离线预处理先行。** 用 Markdown AST 读取 Astro frontmatter；把 `/images/...` 映射到 `home/public`；对 realpath 做 workspace containment；SVG 先渲染为 PNG；输出资产 SHA-256 清单。
8. **approval-first。** 展示目标平台、标题、摘要、分类、标签、封面、canonical URL 和图片清单；用户逐次确认后才允许写草稿；永不自动发布。
9. **幂等台账。** `source_key = repository + article_path`，`content_sha256` 覆盖规范化正文、元数据和图片；同哈希 no-op，变更只能更新已知 draft，找不到原草稿时停止询问，禁止静默新建。
10. **不确定失败即停。** 403/429/验证码/超时/连接断开不自动重试写请求；先查询或人工打开已知 URL 核验。图片失败、残留本地路径或字段回读不一致都必须返回非零。

由于固定适配器没有“更新已知知乎/掘金草稿”的方法，第 9 项在补实现前无法满足。因此即使完成前八项，生产状态仍是 `NO-GO`。

## 必须补的测试

### P0：进入任何账号实验前

- [ ] 页面 API 安全测试：不可信 origin、iframe、跨 window、无 nonce、过期 nonce、无用户手势全部拒绝；不存在动态 method dispatch。
- [ ] bridge 网络测试：只监听 loopback；LAN 地址不可达；WS/HTTP/SSE 无 token、错 token、重放、伪 Origin 全部拒绝。
- [ ] 文件工具测试：SSE 默认关闭；允许目录以外、symlink escape、`..`、绝对路径、超限文件、magic 不匹配全部拒绝。
- [ ] 凭据测试：日志、错误、Chrome storage、history、terminal snapshot 中不得出现 Cookie、token、Authorization、临时 AK/SK、完整正文。
- [ ] SSRF 测试：私网、loopback、link-local、重定向到私网、带浏览器 Cookie 的外部图片全部拒绝。

### 内容契约

- [ ] frontmatter：单双引号标题、冒号、多行 description、数组/行内 tags、category、cover、canonical URL、draft flag。
- [ ] 图片：相对路径、`/images`、空格、括号、title、HTML `<img>`、重复图、坏图、超限图、SVG→PNG、上传失败。
- [ ] 代码：JS/TS/JSON/YAML/Bash fenced code、反引号内容、HTML 转义、超长行；知乎与掘金分别做 golden fixture。
- [ ] 元数据：摘要、分类、标签、封面、原文链接在请求前映射完整，保存后逐项回读。
- [ ] 输出：任何单图失败、字段缺失、平台 result failure 都返回非零；dry-run 展示完整计划和资产错误，且零网络请求。

### 幂等与恢复

- [ ] 首次 create 只产生一个草稿并记录 ID/URL。
- [ ] 相同 hash 重跑为 no-op，不发平台请求。
- [ ] 内容变化只 update 原 draft，不 create。
- [ ] create 已成功但回执丢失、PATCH 超时、WS 断线、CLI 中断时，不自动重试 create。
- [ ] draft 不存在/无权访问时停止并请求人工决策。
- [ ] 回执写入原子化，包含 source commit、content/image hashes、adapter commit、draft ID/URL 和 verified fields。

### 发布物与维护

- [ ] 从固定 commit 可重复构建并与分发 artifact 校验 hash；CLI `--version` 必须与 package version、git SHA 一致。
- [ ] 明确 GPL/MIT 许可边界并保存结论；依赖 SBOM、license 和漏洞扫描通过。
- [ ] 每次平台编辑器/API 或工具升级后重跑 contract suite；未通过自动降级到人工发布包。
- [ ] 获得用户单独授权后，才用 canary 账号执行“创建一次、同源更新一次、重新打开验证”三项破坏性测试；本报告没有执行。

## TODO

- [ ] Wayfinder 先实现平台无关的 Astro parser、资产解析、PNG fallback、内容 hash 和发布包。
- [ ] 知乎接入人工导入回执；不接 Wechatsync 私有 API。
- [ ] 掘金实现有头 UI PoC，补齐草稿持久化、回读和元数据后再做 canary 决策。
- [ ] 只有业务负责人书面接受私有 API、账号和 GPL/许可风险后，才创建安全 fork 的独立实验票。
- [ ] 每季度复查知乎/掘金是否提供正式 OAuth/OpenAPI；一旦出现，优先替换所有私有实现。

## English Summary

Wechatsync is a valuable implementation reference, but it is not a safe or complete production adapter for Wayfinder. The pinned source can create Zhihu and Juejin drafts and return draft IDs/URLs, but it cannot update an existing draft, verify persistence, or provide idempotency. Juejin explicitly clears the summary, category, tags, cover, and source link; Zhihu submits only the title and body. The CLI only extracts a frontmatter title and does not understand Astro `/images` paths.

The side-effect-free hands-on test reproduced several hard failures. The npm package identifies itself as `1.1.0`, while its binary reports `1.0.0`; its registry `gitHead` also differs from the audited repository commit. A real repository article with a root-relative SVG image was allowed to continue after the image failed, an SVG cover was mislabeled as `image/png`, and a mocked platform failure still produced process exit code zero. Core had 28 passing conversion tests, but the extension had no matching test files and neither platform adapter had contract tests.

Security is the decisive blocker. At the pinned commit, the extension injects an insufficiently authenticated page API into all websites, while the WebSocket, internal HTTP, and SSE bridges lack a safe loopback-only, authenticated boundary. The extension persists bridge tokens, CMS passwords, and full draft content in Chrome local storage; remote mode transmits tokens and article content over plaintext WebSocket. Debug/error paths can expose temporary credentials and response bodies.

Decision: direct dependency is **NO-GO**. A wrapper is **CONDITIONAL GO only for offline preprocessing**, not for platform writes. A fixed fork or extracted adapter is **CONDITIONAL GO only as a disabled, manually approved experimental fallback** after license clarification, security re-architecture, complete metadata mapping, idempotent update semantics, secret-redaction tests, and canary validation. The recommended production direction remains local packaging plus manual Zhihu import, and an approval-first headed-browser UI adapter for Juejin.
