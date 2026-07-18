# 知乎可持续命令行草稿同步通道调研

> 调研日期：2026-07-18
> 决策票：[GitHub Issue #65](https://github.com/jiangtao/blog/issues/65)
> 范围：把本仓库 Astro Markdown 文章送达可人工审核的知乎文章编辑/草稿态，不自动发布
> 证据优先级：知乎官方文档与产品行为 > 知乎维护的项目/协议 > 活跃且可审计的开源实现

## 结论

**截至 2026-07-18，没有发现知乎官方支持、可直接用于“新建文章草稿”的命令行写入 API，也没有发现可同时满足合规、图片、草稿回执和幂等要求的第三方 CLI。**

推荐采用 **“本地 CLI 预处理 + 人工在知乎官方网页编辑器导入并验收”** 的 approval-first 通道：

1. CLI 只在本地解析 Astro frontmatter、生成知乎专用 Markdown、资产清单、内容哈希和验收清单，不登录或请求知乎；
2. 操作者使用正常浏览器会话进入知乎官方[文章编辑页](https://zhuanlan.zhihu.com/write)，人工执行“导入文档 MD/Doc”、补齐图片、标题和原文链接；
3. 操作者确认排版与草稿可恢复后，把编辑页链接（如页面提供稳定链接）、标题、更新时间和截图记入本地回执；
4. 发布永远保留为独立人工动作。

这不是“全自动同步”，但它是当前唯一不依赖逆向私有接口、不会把 Cookie 交给第三方工具、且能稳定保留人工审核边界的方案。

**不建议：**

- 把知乎公开开发者平台的 Bearer Token 当成创作者写入授权；公开文档目前只列出知乎搜索、全网搜索、直答和热榜等数据接口，没有文章、图片或草稿写入接口（[知乎数据开放平台](https://developer.zhihu.com/)、[鉴权文档](https://developer.zhihu.com/docs?key=authorization)）。
- 在未获得知乎书面许可前部署 Playwright/Puppeteer 等浏览器自动化。知乎协议明确限制未经授权的插件、第三方工具和自动化程序接入服务（[《知乎协议》“二、使用规则”第 9 条](https://www.zhihu.com/term/zhihu-terms)）。
- 使用 Cookie、XSRF、ZSE 签名、TLS 指纹模拟或 `/api/v4`、`/api/articles` 等未公开写接口。这些属于逆向私有 API，不是官方开放能力。

如果业务负责人明确接受协议与账号风险，当前能力最完整的现成 CLI 是 [`wechatsync`](https://github.com/wechatsync/Wechatsync/tree/a98e42865387285afcc027c61836488748f3b30f/packages/cli)，但它必须被准确标注为“浏览器扩展复用登录态 + 逆向知乎私有 Web API”，不能称作官方或合规通道；它也缺少按源文章更新已有草稿的幂等能力。本报告只把它列为风险接受后的工程参考，不把它纳入推荐基线。

## 背景与决策问题

仓库文章源是 Astro Markdown，可能包含：

- frontmatter 中的标题、描述和 canonical URL；
- 相对路径本地图片；
- fenced code block、列表、引用、表格和少量 HTML；
- 需要先进入可人工审核的编辑/草稿态，再决定是否发布。

本调研回答四个问题：

1. 知乎是否存在官方写入 API 或官方维护的命令行工具；
2. 网页编辑器、浏览器自动化、逆向私有 API 分别能做到什么；
3. 格式、图片、认证、回执、幂等、风控和维护成本是否可接受；
4. Wayfinder 应采用哪条通道，以及把自动化边界画在哪里。

## 调研方法与限制

### 方法

- 检索知乎官方开放平台、协议、创作者手册、文章编辑入口和官方 GitHub 组织；
- 审阅候选项目 README、关键源码、测试、最后提交时间和发布状态；
- 将候选能力分为“官方公开 API”“官方网页产品行为”“浏览器自动化”“逆向私有 API”，不以“域名是 zhihu.com”代替官方授权；
- 所有第三方能力只作为可审计的实现证据，不把项目自述当作知乎承诺。

### 限制

- 本次没有登录知乎，没有读取或输出任何凭据，没有创建、修改或发布任何知乎内容；
- 因此没有对账号级草稿持久化、图片上传、摘要展示和风控阈值做在线集成测试；
- “导入文档 MD/Doc”的当前 UI 行为来自 2026 年开源实现的源码交叉核对，知乎没有为它提供稳定的公开 API 契约；
- “未发现公开写接口”是截至调研日对官方公开文档目录的审计结论，不代表知乎内部不存在私有接口或商务合作能力。

## 官方能力边界

### 1. 公开开发者平台是数据读取/回答能力，不是创作者写入 API

知乎当前官方开发者平台定位为面向 AI 应用的数据产品，公开目录列出：

- 知乎搜索；
- 全网搜索；
- 直答；
- 热榜；
- Skills / API / MCP 调用方式。

官方鉴权使用 `Authorization: Bearer <access_secret>` 和时间戳，但公开示例与 FAQ 都围绕上述数据接口；文档没有文章创建、草稿创建、文章更新或图片上传项（[平台首页](https://developer.zhihu.com/)、[Bearer 鉴权说明](https://developer.zhihu.com/docs?key=authorization)）。

因此：

- Bearer Token 不能推导出内容写权限；
- “向 `zhihu.com` 私有端点发请求”不能称为使用开放平台；
- 若要自动化写入，必须向官方联系人 `openplatform@zhihu.com` 单独确认并取得书面授权，不能从搜索 API 权限外推。

知乎官方 [GitHub 组织](https://github.com/zhihu) 的公开仓库中也未发现文章发布、草稿同步或创作者 CLI。

### 2. 官方网页编辑器是当前可确认的写作入口

官方文章编辑入口是 [`https://zhuanlan.zhihu.com/write`](https://zhuanlan.zhihu.com/write)。未登录访问会进入登录流程；当前开源实现观察到编辑器提供“导入文档 MD/Doc”并接受 `.md/.markdown` 文件：

- `wan-sq/zhihu-publish-article` 记录了 Markdown 粘贴不会可靠转成富文本，而通过“导入文档 MD/Doc”可转换标题、引用和列表，并要求发布前检查重复内容（[固定版本 SKILL.md](https://github.com/wan-sq/zhihu-publish-article/blob/f3415a2da0199b239c958543c44aebc801d5a337/SKILL.md#L14-L32)、[导入步骤](https://github.com/wan-sq/zhihu-publish-article/blob/f3415a2da0199b239c958543c44aebc801d5a337/SKILL.md#L71-L99)）；
- `pbpf/zhihu-publisher-extension` 的当前流程也是进入编辑器、打开导入模态框、上传 Markdown、填写标题，然后把编辑页交给用户（[README](https://github.com/pbpf/zhihu-publisher-extension/blob/5ee78d5dc82f371a4c911c3bbcca487553a2f4f1/README.md#L11-L34)、[源码](https://github.com/pbpf/zhihu-publisher-extension/blob/5ee78d5dc82f371a4c911c3bbcca487553a2f4f1/src/zhihu/publisher.ts#L220-L230)）。

这些证据说明“人工导入 Markdown 到官方编辑器”在调研日可行，但不构成长期 API 兼容承诺。选择器、模态框和导入语义都可能变更。

### 3. 协议不支持把未授权自动化当作低风险官方通道

[《知乎协议》](https://www.zhihu.com/term/zhihu-terms)“二、使用规则”第 9(a) 条限制未经知乎授权或许可的插件、外挂、系统或第三方工具对服务施加影响，并明确提到自动化程序、软件或类似工具接入；第 11 条及“七、违约处理”说明平台可删除内容、暂停或终止账号。

这意味着：

- 即使浏览器自动化只点击可见 UI，它仍不是“官方 API”；
- “使用本人账号”“低频”“停在草稿不发布”会降低运营风险，但不会自动消除协议风险；
- 模拟浏览器 TLS 指纹、逆向签名和私有 API 的风险高于人工编辑器路径；
- 发布频率、内容重复度、网络环境、账号历史等具体风控阈值没有公开稳定数值，不能写死为工程参数。

创作者手册还要求避免标题党、营销导流、洗稿抄袭等负向行为，并说明平台会通过技术、产品功能和社区规范处理垃圾信息和恶意行为（[创作者手册](https://www.zhihu.com/knowledge-plan/manual)）。因此原文链接应作为正常署名/延伸阅读，而不是堆砌导流文案。

## 通道分类与能力矩阵

| 维度 | 官方公开 API | 人工官方编辑器（推荐） | 浏览器自动化 | 逆向私有 API |
| --- | --- | --- | --- | --- |
| 官方支持 | 未发现写接口 | 是，使用官方写作产品 | 否；只是操控官方 UI | 否 |
| 新建文章编辑态 | 不支持 | 支持 | 工具声称支持 | 私有实现不一致 |
| 持久草稿 | 不支持 | 产品 UI 中人工确认；无公开机器契约 | 可观察 UI，但无官方回执契约 | 私有 draft 端点 |
| Markdown | 无 | 优先使用“导入文档 MD/Doc” | 可自动选择文件导入 | 工具自行转 HTML |
| HTML | 无 | 不作为输入契约；可能被编辑器清洗 | 依赖 DOM/编辑器实现 | 服务端可能过滤，规则未公开 |
| 代码块 | 无 | 导入后逐块人工验收 | 当前工具声称可保留，仍需断言 | 依赖转换器与私有 schema |
| 本地图片 | 无 | 通过可见上传 UI 逐张补齐/验收 | 可以尝试操作上传 UI，但现有工具缺可靠集成测试 | 使用未公开图片端点/OSS 流程；现有 CLI 有卡死缺陷 |
| 标题 | 无 | frontmatter 映射到标题输入框 | 可填写独立标题框 | 私有 payload |
| 摘要 | 无 | 未发现独立稳定字段；用首段表达并人工检查卡片摘要 | 同左 | 候选工具缺稳定映射 |
| 原文链接 | 无 | 正文末尾普通链接 | 同左 | HTML 链接，仍受内容规则约束 |
| 认证 | Bearer，仅公开数据接口 | 正常浏览器登录与人工验证 | 持久化浏览器 profile/storage state | Cookie/XSRF/ZSE/指纹模拟 |
| 幂等 | 无写能力 | 本地哈希 + 人工复用既有草稿 | 只能自建本地幂等；UI 无公开键 | 未见官方 idempotency key |
| 可验证回执 | 无写能力 | 编辑器可见内容 + 草稿列表/截图/本地清单 | DOM 断言 + URL/截图，非官方 API 回执 | 私有 JSON，字段可变 |
| 账号风险 | 无写操作 | 最低 | 未授权时高 | 最高 |
| 维护性 | 不满足目标 | 最高 | 中低，受 UI 与风控变化影响 | 低，受签名/schema/风控变化影响 |

## 格式与资产处理决策

### Markdown 与 HTML

选择 Markdown 导入，不选择向富文本 DOM 注入 HTML：

- 当前工具对真实粘贴、合成粘贴和逐字符输入的观察均显示 Markdown 解析不稳定；官方导入入口能让编辑器自身完成转换（[Playwright 实测记录](https://github.com/wan-sq/zhihu-publish-article/blob/f3415a2da0199b239c958543c44aebc801d5a337/SKILL.md#L14-L26)）；
- 历史 `VSCode-Zhihu` 也记录了服务端会过滤大量 HTML 标签，说明“任意 HTML 原样保留”从来不是安全假设（[历史 README](https://github.com/niudai/VSCode-Zhihu/blob/6da89656e5ee47ec0283cf4a6a1db91c4e7f998c/README.md)）；
- fenced code block 必须保留语言标签，并在导入后检查块数量、语言和换行；
- 表格、脚注、数学公式、Mermaid、`<details>` 等超出基础 Markdown 的语法必须进入人工验收清单，不能默认等价。

建议生成 `article.zhihu.md` 时：

1. 移除 Astro 专用 frontmatter；
2. 把 `title` 单独写入回执，不在正文重复一级标题；
3. 把 `description` 作为正文导语候选，而不是假设存在独立摘要字段；
4. 把 canonical URL 以“原文：`URL`”置于正文末尾；
5. 保留标准标题、引用、列表和 fenced code block；
6. 把不兼容组件转换为静态图片或普通文本，并明确标记需要人工复核。

### 图片

Markdown 文件上传只能提交 Markdown 文件本身，不能让远端服务直接读取仓库里的相对路径资产。因此本地图片必须单独处理。

可选方式按可持续性排序：

1. **推荐：人工使用官方编辑器的可见图片上传交互。** CLI 生成按出现顺序编号的资产清单，操作者上传后逐张核对；
2. **可接受但需权衡：先发布到本仓库稳定、公开、可直接访问的静态资源域名，再让操作者确认编辑器是否已转存。** 不能依赖临时链接；
3. **不推荐：第三方 GitHub 镜像。** `zhihu_md` 要求图片与 Markdown 先进入公开 GitHub，并默认借助 `bgithub.xyz` 转发；项目自己也承认镜像可能失效（[固定版本 README](https://github.com/DIYer22/zhihu_md/blob/c3365df8235721ad9873c43bac9decf5f04c77b2/README.md#L11-L24)）；
4. **拒绝：未公开图片 API。** 例如 `zhihu-markdown-image-uploader` 读取完整知乎 Cookie 并调用 `/api/uploaded_images`（[源码](https://github.com/liyupi/zhihu-markdown-image-uploader/blob/54c915471575e759e43d9c78e06e84b7cdc40297/background.js#L14-L28)、[上传端点](https://github.com/liyupi/zhihu-markdown-image-uploader/blob/54c915471575e759e43d9c78e06e84b7cdc40297/background.js#L80-L98)），`zhihu-cli` 则注册图片、上传 OSS 并轮询处理状态（[源码](https://github.com/KrisTHL181/zhihu-cli/blob/c08d7b0e02200c721a0ce6265db873eb693e536d/src/zhihu_cli/content/handlers/upload_image.py#L18-L46)）；两者都是私有协议证据，不是授权文档。

图片验收至少包括：数量、顺序、alt/图注、清晰度、动图状态、远端 URL 不再指向本机、封面是否单独设置。

### 标题、摘要与原文链接

- `frontmatter.title` → 官方编辑器标题框；
- `frontmatter.description` → 默认作为导语候选，导入后检查知乎卡片/草稿预览实际生成的摘要；本次未发现官方公开的独立文章摘要写入契约；
- canonical URL → 正文末尾普通链接，并使用克制文案；
- 标题和正文首个 H1 必须去重。当前浏览器工具明确需要分别填标题和导入正文（[实现流程](https://github.com/pbpf/zhihu-publisher-extension/blob/5ee78d5dc82f371a4c911c3bbcca487553a2f4f1/src/zhihu/publisher.ts#L220-L230)）。

## 草稿、认证、幂等与回执

### 草稿/编辑态

本方案的交付目标是“操作者能看到并继续编辑”，不是“CLI 收到官方 draft API 成功码”。

导入后必须人工确认：

- 标题与正文已出现且只出现一次；
- 刷新或从创作中心重新进入后内容仍存在；
- 页面仍是未发布状态；
- 草稿列表可通过标题与更新时间定位；
- 没有误触“发布/更新”。

当前开源 Playwright 方案特别记录了编辑器内部状态与 DOM 不一致会造成重复导入，因此重试前必须先检查已有草稿，不能盲目再次导入（[重复内容说明](https://github.com/wan-sq/zhihu-publish-article/blob/f3415a2da0199b239c958543c44aebc801d5a337/SKILL.md#L28-L33)）。

### 认证

- 推荐路径只使用操作者正常浏览器会话；CLI 不读取 Cookie、localStorage、storage state 或二维码内容；
- 不把浏览器 profile 复制进 CI，不在 `.env` 中长期保存整段 Cookie；
- 遇到验证码、风险验证、异地登录或异常网络提示时立即停止，交给用户手工处理；
- 开源浏览器工具已经显式实现“检测风险页并切换可视模式”，反证登录态自动化并不稳定（[pbpf 风控流程](https://github.com/pbpf/zhihu-publisher-extension/blob/5ee78d5dc82f371a4c911c3bbcca487553a2f4f1/README.md#L28-L48)）。

### 本地幂等

知乎没有为该工作流公开 idempotency key。幂等必须在本地实现，并把“禁止重复新建草稿”设为默认：

```yaml
source_path: home/src/data/blog/example.md
source_commit: <git-sha>
content_sha256: <sha256>
asset_sha256:
  - path: ./image-1.png
    sha256: <sha256>
title: <title>
canonical_url: <url>
zhihu_editor_url: <recorded-by-operator-if-stable>
observed_title: <recorded-by-operator>
observed_updated_at: <recorded-by-operator>
status: prepared | editor-ready | reviewed | published
```

规则：

1. 同一 `content_sha256` 已是 `editor-ready` 或 `reviewed` 时，CLI 只显示已有回执，不生成“新建”指令；
2. 内容发生变化时，默认要求操作者打开既有草稿并替换，而不是创建第二份；
3. 没有稳定 editor URL 时，用标题、更新时间和截图三元组定位，并要求人工确认；
4. 本地状态只记录非敏感元数据，不记录 Cookie、Token、storage state 或完整响应头；
5. `published` 必须由人工确认，不因页面出现“导入完成”自动晋级。

### 可验证回执

推荐回执分两层：

- 本地确定性回执：源文件 Git SHA、内容 SHA-256、资产 SHA-256、转换器版本、生成文件路径；
- 知乎人工观察回执：编辑页 URL（如稳定）、草稿标题、观察时间、正文/图片/代码块计数、截图路径。

浏览器自动化可以采集 DOM 计数和截图，但这些只是观测证据，不是官方 API 收据。私有 API 返回的文章 ID/JSON 同样不应升级为正式契约。

## 当前工具审计

### A. `wechatsync/Wechatsync`：当前最完整的现成 CLI，但仍是私有 API

- 状态：GPL-3.0，约 6,000 stars / 1,000 forks；默认分支 `v2` 最后提交为 2026-05-27；CLI 源码版本为 1.1.0（[仓库](https://github.com/wechatsync/Wechatsync)、[固定提交](https://github.com/wechatsync/Wechatsync/commit/a98e42865387285afcc027c61836488748f3b30f)）。
- CLI 支持 `.md/.markdown/.html/.htm`、frontmatter 标题、dry-run、本地图片和多平台，并通过本机 WebSocket 连接浏览器扩展（[CLI 源码](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L21-L41)、[sync 命令](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L627-L700)）。
- 扩展拥有 `cookies` 权限和全部 HTTP/HTTPS host 权限；知乎适配器以 `credentials: include` 检查 `/api/v4/me`（[manifest](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/extension/manifest.json#L15-L40)、[适配器认证](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/zhihu.ts#L43-L91)）。这不是知乎公开 Bearer API。
- 每次执行都先 `POST /api/articles/drafts` 创建新草稿，再 `PATCH /api/articles/{draftId}/draft`，返回 `postId` 与 edit URL，且 `draftOnly` 默认为 true（[适配器](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/zhihu.ts#L94-L185)）。优点是能得到可人工打开的编辑 URL；缺点是不能传入已知 draft ID 更新，超时后盲目重试可能生成空草稿或重复草稿。
- Markdown 转换是正则子集；代码围栏输出 `<pre><code>` 时丢弃语言 class，而知乎适配器只转换带 `class="language-X"` 的代码块，因此 Markdown 代码高亮不可靠（[CLI 转换器](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L467-L519)、[知乎代码块转换](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/zhihu.ts#L191-L216)）。
- CLI 能从 HTML 提取 description，但发给扩展的 article payload 没有 summary；知乎适配器也只提交 title/content，因此没有独立摘要同步（[解析](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L284-L396)、[payload](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/cli/src/index.ts#L744-L755)）。
- 图片使用 `/api/uploaded_images`、`api.zhihu.com/images` 和 OSS 签名流程，均未出现在官方开放平台文档（[适配器图片实现](https://github.com/wechatsync/Wechatsync/blob/a98e42865387285afcc027c61836488748f3b30f/packages/core/src/adapters/platforms/zhihu.ts#L277-L397)）。截至调研日，公开 [Issue #208](https://github.com/wechatsync/Wechatsync/issues/208) 报告本地图上传单次可挂起到 6 分钟且无法取消，[Issue #175](https://github.com/wechatsync/Wechatsync/issues/175) 报告 LaTeX 解析/大量公式上传问题。

结论：它最接近 Issue 所描述的一键 CLI 草稿交付，但协议、凭据暴露面、图片稳定性和幂等均不满足“可持续”基线。若负责人书面接受风险，应 fork 固定版本，新增 `sourceKey/contentHash/draftId/editUrl` ledger、已有 draft PATCH、单图超时和不确定失败核验；不得原样启用自动重试或发布。

### B. `doocs/cose`：活跃的浏览器 UI 自动化参考

- 状态：Apache-2.0，约 712 stars；最后提交为 2026-06-17，v1.3.6 发布于 2026-06-02（[仓库](https://github.com/doocs/cose)、[固定提交](https://github.com/doocs/cose/commit/e70fa9e92a71cd2f10e0c883981f324a332162d4)）。
- 知乎实现打开官方 `/write`，填标题，向 Draft.js/contenteditable 派发 Markdown paste 事件，尝试点击“确认并解析”和“确认”，等待自动保存和图片请求（[源码](https://github.com/doocs/cose/blob/e70fa9e92a71cd2f10e0c883981f324a332162d4/packages/core/src/platforms/zhihu.js#L1-L17)、[填充流程](https://github.com/doocs/cose/blob/e70fa9e92a71cd2f10e0c883981f324a332162d4/packages/core/src/platforms/zhihu.js#L57-L192)）。
- 它只回传 `tabId`，没有 draft ID/edit URL；代码在粘贴异常或没找到解析弹窗时仍可能返回 success，所以不能把 success 当成草稿回执（[返回逻辑](https://github.com/doocs/cose/blob/e70fa9e92a71cd2f10e0c883981f324a332162d4/packages/core/src/platforms/zhihu.js#L144-L192)、[同步返回](https://github.com/doocs/cose/blob/e70fa9e92a71cd2f10e0c883981f324a332162d4/packages/core/src/platforms/zhihu.js#L198-L260)）。
- 它与 `wan-sq` 对“合成 paste 是否能触发解析”的观察相冲突，说明此行为随浏览器/知乎版本变化，不能当作稳定契约；文件导入流程更容易验收，但同样是 UI 自动化。

结论：可借鉴其有头浏览器、标题填充和图片等待策略，不直接作为 CLI 或合规通道。若未来取得知乎书面许可，PoC 必须强制捕获真实 edit URL、截图和 DOM 断言，并在验证码/风控出现时停机。

### C. `KrisTHL181/zhihu-cli`：活跃但明确属于逆向私有 API

- 状态：MIT，20 stars；最后提交为 2026-07-15（[仓库](https://github.com/KrisTHL181/zhihu-cli)、[固定提交](https://github.com/KrisTHL181/zhihu-cli/commit/c08d7b0e02200c721a0ce6265db873eb693e536d)）。
- 项目自己标明 unofficial；认证依赖浏览器 Cookie/User-Agent，签名使用 `x-zse-93`/`x-zse-96`，请求层模拟 Chrome TLS 指纹（[README](https://github.com/KrisTHL181/zhihu-cli/blob/c08d7b0e02200c721a0ce6265db873eb693e536d/README.md#L19-L21)、[架构说明](https://github.com/KrisTHL181/zhihu-cli/blob/c08d7b0e02200c721a0ce6265db873eb693e536d/README.md#L104-L110)）。
- 草稿代码直接调用 `/api/v4/draft-*` 和 `/api/articles/{article_id}/draft`；文章草稿上传要求已有 `article_id` 并执行 PATCH，不是一个受支持的“按 canonical URL 幂等新建草稿”接口（[源码](https://github.com/KrisTHL181/zhihu-cli/blob/c08d7b0e02200c721a0ce6265db873eb693e536d/src/zhihu_cli/content/handlers/draft.py#L13-L20)、[PATCH 实现](https://github.com/KrisTHL181/zhihu-cli/blob/c08d7b0e02200c721a0ce6265db873eb693e536d/src/zhihu_cli/content/handlers/draft.py#L173-L209)）。
- 仓库没有测试目录；活跃度不能抵消协议、认证和接口漂移风险。

结论：可作为私有协议变化的研究样本，不进入生产依赖或账号会话。

### D. `pbpf/zhihu-publisher-extension`：浏览器导入样本，不是可持续 CLI

- 状态：MIT，1 star；最后提交为 2026-01-26（[仓库](https://github.com/pbpf/zhihu-publisher-extension)、[固定提交](https://github.com/pbpf/zhihu-publisher-extension/commit/5ee78d5dc82f371a4c911c3bbcca487553a2f4f1)）。
- 采用 Puppeteer、持久化浏览器 profile、headless/可视切换、风险页检测、Markdown 导入和标题填写（[README](https://github.com/pbpf/zhihu-publisher-extension/blob/5ee78d5dc82f371a4c911c3bbcca487553a2f4f1/README.md#L11-L48)）。
- README 把图片与资源上传列为后续增强，但源码已有一次尝试，两者不一致；仓库没有自动化测试或知乎集成测试（[README](https://github.com/pbpf/zhihu-publisher-extension/blob/5ee78d5dc82f371a4c911c3bbcca487553a2f4f1/README.md#L62-L69)、[图片尝试](https://github.com/pbpf/zhihu-publisher-extension/blob/5ee78d5dc82f371a4c911c3bbcca487553a2f4f1/src/zhihu/publisher.ts#L169-L180)）。

结论：证明“自动导入后移交编辑器”的 UI 流程存在，但成熟度、协议和维护性不足。

### E. `wan-sq/zhihu-publish-article`：新鲜的 Playwright 操作笔记

- 状态：0 stars、无明确许可证、单次提交，最后提交为 2026-07-10（[仓库](https://github.com/wan-sq/zhihu-publish-article)、[固定提交](https://github.com/wan-sq/zhihu-publish-article/commit/f3415a2da0199b239c958543c44aebc801d5a337)）。
- 有价值之处是记录了当前导入 UI、编辑器重复内容陷阱和发布前 DOM 校验（[SKILL.md](https://github.com/wan-sq/zhihu-publish-article/blob/f3415a2da0199b239c958543c44aebc801d5a337/SKILL.md#L14-L33)、[校验步骤](https://github.com/wan-sq/zhihu-publish-article/blob/f3415a2da0199b239c958543c44aebc801d5a337/SKILL.md#L85-L104)）。
- 它依赖保存的 Playwright storage state，且默认最后点击发布；没有包、测试或幂等层。

结论：只借鉴“导入与验收”知识，删除发布步骤；未经授权仍不执行自动化。

### F. `DIYer22/zhihu_md`：可用的离线转换思路，图片链路不够稳

- PyPI 0.1.1 发布于 2025-09-14，可生成 `*_for_zhihu.md`（[PyPI](https://pypi.org/project/zhihu-md/)、[源码](https://github.com/DIYer22/zhihu_md/tree/c3365df8235721ad9873c43bac9decf5f04c77b2)）。
- 不接触知乎凭据，这是优点；但本地图片要求先公开到 GitHub，再经过可替换的第三方镜像，带来隐私、可用性和供应链依赖（[README](https://github.com/DIYer22/zhihu_md/blob/c3365df8235721ad9873c43bac9decf5f04c77b2/README.md#L11-L24)）。
- 它不创建草稿、不提供知乎回执。

结论：可以参考其 Markdown 兼容转换，但图片策略不作为基线。

### G. 其他候选

- `niudai/VSCode-Zhihu` 曾支持 Markdown、图片、代码块和发布，拥有 940 stars，但最后源码提交停在 2021 年；新工具作者记录其登录已失效（[仓库](https://github.com/niudai/VSCode-Zhihu)、[维护状态 Issue #193](https://github.com/niudai/VSCode-Zhihu/issues/193)）。不采用。
- `liyupi/zhihu-markdown-image-uploader` 最后提交为 2026-01-20，能审计到 Cookie 读取和私有图片端点，但没有测试，且它是浏览器扩展而非 CLI（[仓库](https://github.com/liyupi/zhihu-markdown-image-uploader)、[源码](https://github.com/liyupi/zhihu-markdown-image-uploader/blob/54c915471575e759e43d9c78e06e84b7cdc40297/background.js#L14-L28)）。不采用。
- `delankesita/zhihu-publisher` 提供 `--draft`、本地图片上传和 Cookie 认证，但核心使用未公开 `/api/articles`、`/api/images`；测试只覆盖初始化、字符串级 Markdown 转换和 retry，没有真实知乎集成（[核心源码](https://github.com/delankesita/zhihu-publisher/blob/b7f38a74ae1a78d6dce7a91ad62820479df4458b/zhihu_publisher/publisher.py#L57-L80)、[发布实现](https://github.com/delankesita/zhihu-publisher/blob/b7f38a74ae1a78d6dce7a91ad62820479df4458b/zhihu_publisher/publisher.py#L288-L355)、[测试](https://github.com/delankesita/zhihu-publisher/blob/b7f38a74ae1a78d6dce7a91ad62820479df4458b/tests/test_publisher.py)）。不采用。
- `PsChina/web-publish` 的 README 在调研日仍把知乎标为“待支持”，不能作为现成通道（[仓库](https://github.com/PsChina/web-publish)）。
- `cygnusyang/zhihupost` v0.3.1 支持 Markdown、本地图和草稿，但项目 2026-05-03 创建、2026-05-04 后即无新提交，0 stars/forks；架构文档明确使用“知乎内部 Web API”、Cookie、`x-zse-96` 和 `/api/posts`，并说明签名变化后需要重新逆向，去重/续跑索引仍是后续能力（[仓库](https://github.com/cygnusyang/zhihupost)、[固定架构文档](https://github.com/cygnusyang/zhihupost/blob/4fe5ee1dfd5a0f444fb54bd708ae267eb7f7e566/docs/ARCHITECTURE.md#L1-L8)、[签名与维护](https://github.com/cygnusyang/zhihupost/blob/4fe5ee1dfd5a0f444fb54bd708ae267eb7f7e566/docs/ARCHITECTURE.md#L539-L572)、[幂等缺口](https://github.com/cygnusyang/zhihupost/blob/4fe5ee1dfd5a0f444fb54bd708ae267eb7f7e566/docs/ARCHITECTURE.md#L461-L466)）。不采用。

## 推荐工作流

### 阶段 1：本地准备（允许自动化）

CLI 输入：Astro Markdown 文件。

CLI 输出：

- `article.zhihu.md`：去除 frontmatter、适配基础 Markdown、附原文链接；
- `assets.yaml`：图片顺序、相对路径、尺寸、哈希、alt/图注；
- `receipt.yaml`：源 Git SHA、内容哈希、标题、description、canonical URL、转换器版本；
- `review.md`：标题、摘要、图片、代码块、链接、重复内容和未发布状态检查项。

本阶段禁止：

- 读取浏览器 Cookie、Token、localStorage、storage state；
- 请求任何知乎写端点；
- 自动打开 headless 浏览器并登录；
- 把私有图片推到第三方镜像；
- 自动点击发布。

### 阶段 2：人工官方编辑器交接

1. 操作者在正常浏览器中打开[知乎写文章](https://zhuanlan.zhihu.com/write)；
2. 手工选择“导入文档 MD/Doc”并上传 `article.zhihu.md`；
3. 按 `assets.yaml` 处理图片；
4. 填写标题，检查导语/摘要表现和原文链接；
5. 逐项执行 `review.md`；
6. 确认草稿可恢复且未发布；
7. 将非敏感观察结果写回 `receipt.yaml`。

### 阶段 3：发布（始终人工）

发布不属于同步命令。操作者完成内容、版权、社区规范和 AIGC 标识检查后，另行决定是否点击发布。

## 风险分级与停止条件

| 等级 | 场景 | 决策 |
| --- | --- | --- |
| R0 | 官方公开写 API | 当前不存在；持续观察 |
| R1 | 本地准备 + 人工官方编辑器 | 推荐基线 |
| R2 | 浏览器自动化官方 UI | 未取得书面许可前阻断；取得许可后再做可视、低频、人工审批 PoC |
| R3 | Cookie/XSRF/ZSE/TLS 模拟 + 私有 API | 拒绝进入生产 |

遇到以下任一情况立即停止，不重试绕过：

- 出现验证码、异常网络、风险验证、账号限制；
- 编辑器内容重复、图片错位或刷新后丢失；
- 工具要求导出整段 Cookie、复制 cURL、关闭浏览器安全机制；
- 需要逆向新签名、伪造设备指纹或绕过限流；
- 没有稳定草稿定位方式，可能创建重复稿；
- 页面流程接近“发布”且尚未获得人工确认。

## 实施 TODO

1. 实现纯本地 `prepare-zhihu` 转换器与上述四个输出文件；
2. 为标题去重、canonical URL、代码块、表格降级和资产清单添加快照测试；
3. 由账号持有人执行一次不发布的人工验收，记录当前 UI、草稿恢复与图片结果；本次研究不代为执行；
4. 如业务仍要求自动化，先向 `openplatform@zhihu.com` 说明“个人原创文章、低频、只送草稿、人工发布”的完整场景，取得明确书面许可后再评估浏览器 PoC；
5. 每季度复核开发者平台是否新增创作者写接口、协议是否变化、官方编辑器是否仍支持 Markdown 导入；
6. 永不把第三方私有 API 项目的 Cookie/签名代码纳入生产主线。

## English Summary

As of 2026-07-18, Zhihu exposes official APIs for search, web search, Direct Answer, and hot-list data, but no documented API for creating article drafts, uploading creator images, or updating articles. Zhihu's terms also restrict unauthorized plugins, third-party tools, and automated programs from accessing the service.

The recommended sustainable path is therefore **local CLI preparation followed by a manual handoff to Zhihu's official web editor**. The CLI should generate a Zhihu-oriented Markdown file, an asset manifest, deterministic content hashes, and a review checklist. A human operator then imports the Markdown through the visible “Import MD/Doc” workflow, uploads or verifies images, confirms the title, summary behavior, code blocks, canonical link, and draft persistence, and records a non-sensitive local receipt. Publishing remains a separate human-only action.

Browser automation can technically drive the current editor UI, but it is not an official API, has selector and risk-control fragility, and should be blocked unless Zhihu grants explicit written permission. Cookie/XSRF/ZSE-based clients and TLS-fingerprint impersonation are reverse-engineered private API approaches and should not be used in production.
