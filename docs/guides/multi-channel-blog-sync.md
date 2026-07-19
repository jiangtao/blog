# Astro 博客多渠道草稿同步

## 背景

`home/src/data/blog/` 是微信、知乎和掘金的唯一文章输入源。同步流程只读取 Astro Markdown，在临时目录生成渠道兼容产物，不会回写原文。

当前交付目标是“进入可人工审核的草稿或编辑态”，不自动公开发布。三个渠道保持标题、核心正文、图片、代码块和出处一致；平台差异只允许出现在格式和平台元数据层。

## 命令

在 `home/` 目录执行：

```bash
# 只读预检：解析文章、校验图片、转换 SVG，并返回目标渠道预检回执
npm run publish:channels -- inspect ai-native-delivery --json

# 只预检指定渠道；不会执行远端写入
npm run publish:channels -- inspect ai-native-delivery \
  --channels wechat,zhihu --json

# 只生成临时文章包，不写入任何远端平台
npm run publish:channels -- prepare ai-native-delivery --json

# 显式同步；默认按微信、知乎、掘金顺序 best-effort 执行
npm run publish:channels -- sync ai-native-delivery --json

# 只处理指定渠道
npm run publish:channels -- sync ai-native-delivery \
  --channels wechat,juejin --json

# 把出处切换为 Jerret Life 微信公众号
npm run publish:channels -- prepare ai-native-delivery \
  --attribution wechat --json

# 可见浏览器重新打开并验证知乎/掘金草稿后，记录幂等回执
npm run publish:channels -- record ai-native-delivery \
  --channel juejin \
  --receipt-status draft-created \
  --remote-id draft-123 \
  --draft-url https://juejin.cn/editor/drafts/draft-123 \
  --verified --json
```

可选参数：

- `--blog-root <目录>`：Astro 博客根目录；从 `home/` 执行时无需设置。
- `--output-dir <目录>`：本次临时文章包目录；默认使用系统临时目录。
- `--state-dir <目录>`：本地同步状态目录；默认使用 `~/.local/state/sync-blog-channels/`。
- `--site-url <URL>`：canonical URL 的站点根地址。
- `--language <语言>`：规范化文章语言，默认 `zh-CN`。
- `--attribution blog|wechat`：出处策略，默认 `blog`。
- `--channels wechat,zhihu,juejin`：预检或同步的渠道子集。
- `record` 专用参数：`--channel`、`--receipt-status`、可选 `--remote-id`、`--draft-url` 和 `--verified`。
- `--json`：输出机器可读 JSON。

退出码：`0` 表示所选渠道均完成；`1` 表示部分完成或需要人工处理；`2` 表示失败。

## 渠道行为

### 微信公众号

复用本机 `md2wechat`。写入前调用 `inspect --draft`，就绪后使用 `convert --draft` 创建草稿。SVG 和本地图片来自临时文章包。

本机已验证的 `md2wechat 2.4.0` 没有公开“更新已有草稿”命令。因此：

- 已验证草稿的内容哈希未变化：返回 `unchanged`；
- 已知草稿但正文已变化：返回 `manual-required`，要求在后台更新旧草稿，避免重复创建；
- 未知草稿：允许创建新草稿；
- 当前 `md2wechat` 不提供独立远端查回证明：即使上游响应含 `verified` 字段，也始终记录为 `verified=false`，要求后台复核，不伪报“已验证”。

排版 API 与图片生成 API 使用不同密钥。`md2wechat_api_key` 必须是服务支持的 `wme_`、`wme2_` 或 `wmt_` 前缀，不能复用火山引擎等图片模型 Key。可用 `md2wechat config show --json` 查看脱敏配置；发现 `CONVERT_FAILED / Invalid API Key format` 时先修复配置，禁止盲目重试草稿创建。AI mode 只生成外部模型请求，不作为无人审核的自动 fallback。

### 知乎

默认生成官方编辑器人工交接任务，入口是 `https://zhuanlan.zhihu.com/write`。推荐通过“导入文档 MD/Doc”导入准备好的 Markdown，再人工核对标题、图片、代码块、出处和自动保存状态。

知乎没有面向普通创作者的公开文章写入 API，协议也限制未经授权的自动化工具。因此可见浏览器自动化默认关闭；即使显式启用，也只操作可见官方页面，遇到登录、风控或编辑器变化立即停止，不读取 Cookie、密码、`localStorage` 或浏览器 profile。

只有重新打开后仍带稳定草稿参数的官方 `/write?draft=<id>`（或等价稳定 ID 参数）才能记录为已验证；通用 `/write` 页面和已发布 `/p/<id>` 页面均会被拒绝。

### 掘金

默认生成官方 Markdown 编辑器人工交接任务，入口是 `https://juejin.cn/editor/drafts/new?v=2`。任务包含正文、摘要、标签、封面、原文链接和分类检查项；只有重新打开稳定草稿 URL 后内容仍一致，才可标记为已验证草稿。

掘金未提供普通创作者文章写入 OpenAPI。默认不调用私有 `content_api`、不使用 Wechatsync 桥接层，也不读取浏览器凭据。

`/editor/drafts/new` 只是新建入口，不能作为已验证回执；只有 `/editor/drafts/<stable-id>` 才能写入幂等状态。

## 状态与恢复

状态按源文章绝对路径的 SHA-256 分文件保存，不进入 Markdown 或 Git 历史。状态只记录内容哈希、远端草稿标识、入口、验证结果和更新时间。

状态文件损坏时，流程会保留一份 `.corrupt-*` 备份，从空状态继续并立即发出警告。单渠道失败不会阻止后续渠道；为避免不确定写入产生重复草稿，失败后不会盲目自动重试。

若远端渠道已返回草稿回执但本地状态保存失败，CLI 会返回 `partial`，在本次文章包中以 `0600` 权限写入 `sync-receipts.json`，并明确提示“禁止盲目重试”。

若 `record` 发现新草稿 ID 或稳定 URL 与已有状态冲突，会返回 `DRAFT_RECEIPT_CONFLICT` 并保留旧状态，不会用新值静默覆盖；核对是否重复后再决定后续动作。

## 安全边界

- 只创建或更新草稿/编辑态，不点击公开发布。
- 不读取、打印或写入 Cookie、密码、Authorization、access token 和平台密钥。
- 不默认调用知乎或掘金私有写 API。
- 不运行 Wechatsync 的未鉴权浏览器桥接服务。
- 所有图片路径必须留在博客目录内；符号链接逃逸、缺图和无效文章在远端写入前失败。
- 原始 Markdown 在整个流程中保持字节不变。

## English Summary

Astro Markdown under `home/src/data/blog/` is the single source of truth. The command prepares a read-only, channel-ready package and synchronizes to reviewable drafts only. WeChat reuses `md2wechat`; Zhihu and Juejin default to explicit handoff tasks for their visible official editors. The workflow preserves canonical attribution, never reads browser credentials, avoids private write APIs and unsafe bridges, records non-sensitive local state, and reports partial or manual outcomes immediately.
