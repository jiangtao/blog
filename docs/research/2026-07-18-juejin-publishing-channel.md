# 掘金可持续命令行草稿同步通道调研

- 日期：2026-07-18
- 决策票：[Issue #66](https://github.com/jiangtao/blog/issues/66)
- 范围：把本仓库 Astro Markdown 文章送入可人工审核的掘金草稿，不自动发布
- 调研限制：未登录掘金、未读取或输出凭据、未创建或更新任何掘金草稿

## 结论

**结论是“有条件采用浏览器 UI 自动化，不采用私有 API 作为长期主通道”。**

1. 截至 2026-07-18，未找到掘金面向普通创作者公开、带文档和开发者凭证的文章草稿/发布 OpenAPI。掘金提供官方 Web 编辑器和 Markdown 主题能力，但没有可归类为公开发布 API 的证据；官方 `vscode-juejin` 也只有浏览文章能力，没有写作或草稿命令。[当前编辑器](https://juejin.cn/editor/drafts/new?v=2)、[官方 Markdown 主题仓库](https://github.com/xitu/juejin-markdown-themes)、[`vscode-juejin` 命令清单](https://github.com/xitu/vscode-juejin/blob/1f4a337f3ac8ca85ac00a3d088e1f5588a8f4bcc/package.json#L18-L59)、[`vscode-juejin` 只读文章请求](https://github.com/xitu/vscode-juejin/blob/1f4a337f3ac8ca85ac00a3d088e1f5588a8f4bcc/src/post.ts#L49-L53)
2. 现成工具中，`@wechatsync/cli` 最接近功能要求：能读取 Markdown、本地图片，创建草稿并返回 `draftId` 和草稿 URL；但它直接调用 Web 编辑器的登录态私有接口，不是官方 OpenAPI，而且当前掘金适配器把摘要、分类、标签、封面和原文链接全部置空，每次执行都会新建草稿。[CLI 用法与草稿定位](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/README.md#L91-L112)、[草稿创建请求与回执](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/juejin.ts#L201-L285)
3. `SyncCaster` 的掘金适配器走 DOM 自动化，直接填标题、Markdown 和图片，并要求用户手工完成后续发布，路线更符合“人工审核优先”；但当前实现没有证明草稿已持久化，也没有填摘要、分类、标签、封面或原文链接，只返回当前编辑器 URL，不能作为可靠回执。[掘金 DOM 适配器](https://github.com/RyanYipeng/SyncCaster/blob/ddad3c27e3f6a18537a72bc81a7b7bf9075e6efe/packages/adapters/src/juejin.ts#L3-L58)、[停止在人工发布前并仅返回当前 URL](https://github.com/RyanYipeng/SyncCaster/blob/ddad3c27e3f6a18537a72bc81a7b7bf9075e6efe/packages/adapters/src/juejin.ts#L177-L207)
4. 因此目前没有一个现成工具同时满足“官方支持、完整元数据、可靠草稿回执、幂等、低账号风险”。建议 Wayfinder 实现一个**有界、可见、人工确认的浏览器 UI 适配器**，只操作官方编辑器页面，不自行复刻 `content_api`/`imagex` 请求；在完成持久化与幂等验收前保持 `NO-GO`。`Wechatsync` 只能作为人工触发、可随时关闭的实验性 fallback，不能进入定时任务或 CI。

## “官方 API”边界

### 公开官方 API：未发现

本次检查了掘金官方编辑器、官方 GitHub 组织中与掘金编辑器相关的项目，以及官方用户协议。能确认的是：

- 官方当前仍提供 Markdown Web 编辑器；编辑器页面加载 `juejin-markdown-themes`，而该主题包只定义 Markdown 主题和代码高亮，不提供文章传输或认证协议。[编辑器](https://juejin.cn/editor/drafts/new?v=2)、[主题包说明](https://github.com/xitu/juejin-markdown-themes#%E4%BD%BF%E7%94%A8%E6%96%B9%E6%B3%95)
- 官方 `xitu/vscode-juejin` 的描述是“在 VSCode 中刷掘金”，贡献的视图和命令只有文章/沸点浏览、刷新和外链打开；其最后一次源码提交停留在 2021 年，不能承担发布通道。[仓库](https://github.com/xitu/vscode-juejin)、[提交历史](https://github.com/xitu/vscode-juejin/commits/main/)、[扩展清单](https://github.com/xitu/vscode-juejin/blob/1f4a337f3ac8ca85ac00a3d088e1f5588a8f4bcc/package.json)
- 没有找到开发者控制台、OAuth scope、API key 申请、发布端点文档、版本承诺或配额说明。因此不能仅因为端点位于 `api.juejin.cn`，就把浏览器内部接口称为“官方公开 API”。

“未发现”是截至调研日、在上述官方渠道范围内的结论，不等于证明任何合作方都不存在私下授权接口。若后续能获得掘金书面授权或正式 API 文档，应重新评审并优先迁移。

### 浏览器自动化

浏览器自动化是让已登录浏览器打开官方编辑器，通过用户可见的输入框、编辑器、图片粘贴/上传控件和发布设置控件完成操作；网络请求由官方页面自身产生。`SyncCaster` 当前就是这一路线，其代码明确标记 `kind: 'dom'`，图片通过粘贴事件交给编辑器上传，最终发布留给用户。[DOM 类型和能力声明](https://github.com/RyanYipeng/SyncCaster/blob/ddad3c27e3f6a18537a72bc81a7b7bf9075e6efe/packages/adapters/src/juejin.ts#L16-L34)、[图片粘贴上传](https://github.com/RyanYipeng/SyncCaster/blob/ddad3c27e3f6a18537a72bc81a7b7bf9075e6efe/packages/adapters/src/juejin.ts#L95-L175)

这条路线比自行构造私有 API 请求更贴近官方产品行为，但**仍不是官方授权自动化**。掘金用户协议第 2.6、5.1.1、5.1.2 和 7.1 条保留了对未经授权访问、第三方工具、反向工程及违规账号采取限制或关闭措施的权利。因此其账号风险是“中”，不能标成“低”或“官方支持”。[稀土掘金用户协议](https://juejin.cn/terms)

### 逆向私有 API

`Wechatsync` 和 `multi-publisher` 都直接构造以下登录态请求：

- 获取用户登录状态；
- 获取 CSRF token；
- 调用 `content_api/v1/article_draft/create`；
- 获取 ImageX 临时凭证并上传图片。

`Wechatsync` 的代码还显式修改 `Origin`/`Referer` 请求头，并解析 Web CSRF 响应格式；这些都是可审计的工程实现，但没有公开文档或授权证据，所以应准确分类为“逆向 Web 私有 API”。[认证与请求头](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/juejin.ts#L115-L199)、[ImageX 私有上传流程](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/juejin.ts#L288-L417)

## 当前工具盘点

| 候选 | 分类 | 当前可用性 | 草稿与回执 | 主要缺口 | 决策 |
| --- | --- | --- | --- | --- | --- |
| 掘金 Web 编辑器 | 官方产品 | 当前可访问，原生 Markdown | 人工操作可进入草稿流程 | 无公开 CLI/API | 人工兜底 |
| `xitu/vscode-juejin` | 官方一方工具 | 只读；源码自 2021 年未更新 | 无 | 不支持写作/草稿 | 排除 |
| `SyncCaster` v2.0.7 | 浏览器 DOM 自动化 | 2026-05 有发布版；支持标题、Markdown、图片 | 只返回当前页面 URL；不验证持久化 | 不填摘要/分类/标签/封面/原文链接；认证检查过于乐观 | **推荐作为 UI 方案参考实现，不能原样上线** |
| `@wechatsync/cli` 1.1.0 / Wechatsync v2 | 逆向私有 API，经 Chrome 扩展使用登录态 | 2026 年仍活跃；CLI 和本地图片链路完整 | 返回 `postId`、草稿 URL、`draftOnly` | 元数据置空；只 create 不 update；协议和账号风险较高 | 仅实验性 fallback |
| `multi-publisher` 1.1.3 | 逆向私有 API | 2026-07 有版本，但项目较新 | 返回草稿 ID/URL | 元数据同样置空；Cookie 落盘，登录代码会打印 Cookie 值前缀；带反自动化伪装 | 排除 |
| OpenCLI v1.8.6 | 当前掘金能力仅只读公开数据 | 项目活跃 | 无写入命令 | 掘金仅 `recommend`/`hot` | 排除 |

版本与能力来源：[`SyncCaster` v2.0.7](https://github.com/RyanYipeng/SyncCaster/releases/tag/v2.0.7)、[`SyncCaster` MCP 人工确认约束](https://github.com/RyanYipeng/SyncCaster/blob/ddad3c27e3f6a18537a72bc81a7b7bf9075e6efe/synccaster-skill/SKILL.md#L10-L31)、[`@wechatsync/cli` npm 元数据](https://registry.npmjs.org/%40wechatsync%2Fcli/latest)、[`Wechatsync` CLI 说明](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/README.md)、[`multi-publisher` v1.1.3](https://github.com/xwh5/multi-publisher/releases/tag/v1.1.3)、[`multi-publisher` Cookie 输出代码](https://github.com/xwh5/multi-publisher/blob/bc1acb4f641c2fab7b4c2a097ff4ac84eb913b80/src/runtime/browser-runtime.ts#L125-L147)、[OpenCLI 掘金命令清单](https://github.com/jackwener/OpenCLI/blob/b0f84c99c93037add29e1c1b361f5f7094f52f74/docs/adapters/browser/juejin.md#L1-L55)。

## 能力逐项评估

| 要求 | 官方编辑器 / 建议 UI 适配器 | `Wechatsync` 当前实现 | 判定 |
| --- | --- | --- | --- |
| Markdown | 官方编辑器原生支持 Markdown；应输入原始 Markdown | CLI 移除 front matter 后把正文作为 `mark_content` 发送 | 可满足 |
| 本地图片 | 逐张走官方粘贴或文件上传控件，取得平台 URL 后回写正文 | CLI 能识别简单 Markdown/HTML 本地图片，上传到目标平台；掘金适配器也有 ImageX 上传 | 可满足，但必须失败即停 |
| 代码块 | 保留 fenced code block 和语言标识 | Markdown 原文不经 HTML 转换，代码围栏可保留 | 可满足 |
| 标题 | 填官方标题输入框，并回读校验 | `title` 已写入创建草稿请求 | 可满足 |
| 摘要 | 需要操作发布设置中的摘要并验证保存 | `brief_content: ''`；CLI 的 Markdown front matter 只提取标题 | **不满足** |
| 分类 | 需要按名称解析官方选项并回读 ID/文本 | `category_id: '0'` | **不满足** |
| 标签 | 需要按名称选择官方候选并回读标签 chips | `tag_ids: []` | **不满足** |
| 封面 | 需要走官方上传/选择控件并验证缩略图 | CLI 接受 `--cover`，但掘金适配器仍发送 `cover_image: ''` | **不满足** |
| 原文链接 | 优先在正文末尾写明确“原文链接”，同时保存 canonical URL 到本地台账 | `link_url: ''`，CLI 也不从 Markdown front matter 传入来源 | **不满足** |
| 草稿态 | 等待“已保存”状态，取得带 `draftId` 的 URL，再重新打开核验 | 私有 create 直接返回 `draftId` 与草稿 URL | UI 方案待验证；私有 API 可满足 |
| 认证 | 复用用户可见 Chrome 会话；不得导出、记录或打印 Cookie | 扩展内 `credentials: include`，比复制 Cookie 到 CLI 更安全 | 有条件满足 |
| 回执 | `draftId`、URL、标题、内容哈希、保存时间、重新打开校验结果 | 只有 `postId`、URL、`draftOnly` | 部分满足 |
| 幂等 | 用来源键查本地台账；相同哈希 no-op，有变化打开原草稿更新 | 每次调用 create；适配器没有 `update` 实现 | **不满足** |

实现证据：[`Wechatsync` Markdown 标题解析](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L284-L359)、[`Wechatsync` 本地图片发现与读取](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L96-L229)、[`Wechatsync` CLI 只传标题、正文和封面](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L627-L755)、[掘金适配器置空元数据并只创建草稿](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/juejin.ts#L225-L285)、[适配器接口中的可选 `update`](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/types.ts#L107-L149)。

### Markdown 与图片边界

掘金编辑器手册展示了标题、链接、图片和 fenced code block 等常用 Markdown 语法。[掘金 Markdown 编辑器指南](https://juejin.cn/editor/guide)

对 Astro 文章不能只做字符串复制：

- 必须先移除 Astro front matter，但保留正文中的 Markdown 代码围栏和语言标识；
- 必须解析相对于文章文件的图片路径，而不是相对于仓库根目录；
- 必须覆盖 Markdown 图片、HTML `<img>` 和包含空格/标题的合法目的地址；`Wechatsync` 当前正则只可靠覆盖简单 `![alt](path)` 和 `<img src="path">`，不能视为完整 Markdown parser；
- 图片上传失败、响应 URL 为空、正文仍存在本地路径时应整体失败，不能创建“成功但图片破损”的草稿；
- SVG 是否能被掘金图床和最终文章稳定接受需要单独验收，失败时转换为 PNG，而不是静默保留本地 SVG。

## 推荐通道设计

### 决策

采用如下优先级：

1. **主通道：有界浏览器 UI 自动化 + 人工审核。** 使用有头浏览器和用户现有登录态，只操作官方编辑器 UI；自动化结束在“草稿已保存且可重新打开”，永不点击最终发布确认。
2. **人工降级：生成发布包并打开官方编辑器。** 当 DOM 选择器、登录、验证码、风控或元数据校验失败时，输出已解析 Markdown、待上传图片清单和元数据，交给用户手工完成。
3. **实验性 fallback：Wechatsync 私有 API。** 仅在用户单次明确选择后启用；禁止定时、批量、自动重试和 CI 使用；输出必须标记 `channel=private-web-api`。

不选择 `multi-publisher`，因为除私有 API 风险外，它会把 Cookie 保存到配置并在登录调试输出中打印 Cookie 值前缀，还通过修改 `navigator.webdriver` 等方式隐藏自动化特征，不符合凭据最小暴露和遇到风控即停的原则。[Cookie 保存入口](https://github.com/xwh5/multi-publisher/blob/bc1acb4f641c2fab7b4c2a097ff4ac84eb913b80/src/cli/login.ts#L24-L52)、[反自动化特征修改](https://github.com/xwh5/multi-publisher/blob/bc1acb4f641c2fab7b4c2a097ff4ac84eb913b80/src/runtime/browser-runtime.ts#L46-L75)

### 建议命令契约

```text
wayfinder sync juejin <article.md> \
  --mode ui-draft \
  --review-required \
  --receipt .wayfinder/receipts/juejin.json
```

命令只在以下全部成立时返回成功：

1. 标题和 Markdown 已回读一致；
2. 所有本地图片都已变成可访问的平台 URL；
3. 摘要、分类、标签、封面和原文链接已按映射填入并回读一致；
4. 页面显示草稿保存完成，URL 含稳定 `draftId`；
5. 自动重新打开该草稿，复核标题、正文和图片；
6. 本地回执原子写入成功。

任一条件不成立就返回非零状态，并保留浏览器页面供人工接管；不能把“内容已填进新建页”报告为“草稿同步成功”。

### 幂等与可验证回执

建议以 `repository + article_path` 作为稳定 `source_key`，以规范化后的标题、正文、元数据和图片内容生成 `content_sha256`。回执至少包含：

```json
{
  "channel": "ui-draft",
  "source_key": "jiangtao/blog:home/src/data/blog/example.md",
  "source_commit": "<git-sha>",
  "content_sha256": "<sha256>",
  "draft_id": "<juejin-draft-id>",
  "draft_url": "https://juejin.cn/editor/drafts/<id>",
  "saved_at": "<ISO-8601>",
  "verified_at": "<ISO-8601>",
  "verified_fields": ["title", "body", "images", "summary", "category", "tags", "canonical_url"]
}
```

执行规则：

- `source_key` 已存在且哈希相同：直接 no-op，返回原回执；
- `source_key` 已存在且哈希变化：打开原 `draft_url` 更新，禁止新建；
- 原草稿不存在或无权访问：停止并请求用户决定是否重建，不能静默产生重复草稿；
- 没有稳定 `draftId`、重新打开校验失败或字段不一致：不得落“成功”回执。

## 认证、风控与维护

### 认证

- 主通道只复用用户主动登录的 Chrome profile，不读取、导出或打印 Cookie、密码、二维码内容或 CSRF token；
- 不把浏览器 profile 复制进仓库、CI、容器或远程主机；
- 本地桥接只监听 loopback，并使用随机短期 token；`Wechatsync` 文档说明远程桥接 token 明文传输且默认可监听所有网络接口，若实验使用必须加 SSH 隧道/VPN 和防火墙限制。[远程桥接安全提示](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/README.md#L101-L142)

### 账号风控

- 所有自动化都有协议风险；私有 API 风险高于 UI 自动化，只有人工操作是明确的官方产品路径。[稀土掘金用户协议](https://juejin.cn/terms)
- 只允许单账号、单文章串行执行；不做批量发布、定时任务、并发、随机 UA、验证码破解、滑块模拟或隐藏自动化特征；
- 遇到重新登录、验证码、403、429、风控提示、页面结构不匹配或保存状态不明时立即停止，不自动重试；
- 最终发布必须由用户在浏览器中明确确认，自动化永不触发；
- 记录操作类型、时间、来源文件、草稿 ID 和错误类别，但日志必须经过凭据与正文敏感信息清洗。

### 维护策略

- 使用可访问名称、标签文字和角色定位 UI，不依赖压缩 class 名；
- 把标题、正文、图片、发布设置和保存回执拆成独立步骤，每步都可失败并由用户接管；
- 用固定测试文章覆盖中文标题、多个代码块、相对图片、HTML 图片、摘要、分类、多标签和原文链接；
- 上线前必须用专用 canary 账号完成两项破坏性集成测试：首次创建草稿、同源更新不重复；本次调研因明确限制没有执行这两项测试；
- 每次掘金编辑器或候选工具升级后重跑 canary；未通过则自动降级为人工发布包；
- 每季度重新检查官方 API/合作计划；一旦出现正式 OAuth/OpenAPI，优先迁移并删除私有 API fallback。

## 上线门槛与 TODO

当前状态：**研究完成；生产接入 `NO-GO`，UI 适配器 PoC `GO`。**

- [ ] 实现 Astro front matter 到标题、摘要、分类、标签、封面、canonical URL 的显式映射；
- [ ] 使用 Markdown AST 解析和改写图片，不使用简单正则作为唯一解析器；
- [ ] 实现有头浏览器 UI 流程，并保证最终发布按钮不可被自动化点击；
- [ ] 验证发布设置中的摘要、分类、标签和封面能否持久化在未发布草稿；若不能，调整验收定义并保留人工设置步骤；
- [ ] 实现 `source_key + content_sha256 + draft_id` 台账和更新语义；
- [ ] 实现重新打开草稿的回读校验与失败即停；
- [ ] 完成 canary 首次创建与幂等更新测试，并由用户审核账号风控结果；
- [ ] 仅在用户明确选择时提供 `private-web-api` fallback，默认关闭且禁止 CI/定时运行。

## English Summary

As of 2026-07-18, no documented public Juejin API for ordinary creators to create or update article drafts was found. Juejin provides an official Markdown web editor and theme packages, but its official VS Code extension is read-only. Endpoints such as `content_api/v1/article_draft/create` and the ImageX upload flow are undocumented web-private APIs, even when an open-source extension invokes them with the user's browser session.

The closest turnkey CLI is `@wechatsync/cli`: it can process Markdown and local images, create a Juejin draft, and return a draft ID/URL. However, its current Juejin adapter clears the summary, category, tags, cover, and source link, always creates a new draft, and has no idempotent update path. SyncCaster uses lower-risk DOM automation and keeps final publication manual, but it currently fills only the title, Markdown, and images and does not prove that a durable draft was saved.

Decision: build an approval-first, headed-browser UI adapter that reuses the user's visible logged-in session, stops after a durable draft is saved and reopened, and writes an idempotent receipt keyed by source path and content hash. Do not use private Juejin web APIs as the long-term default. Keep Wechatsync only as an explicitly enabled, non-scheduled fallback. Production remains `NO-GO` until full metadata persistence, image integrity, durable draft receipts, and no-duplicate updates pass canary tests.
