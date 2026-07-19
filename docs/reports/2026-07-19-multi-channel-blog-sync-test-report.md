# Astro 博客多渠道草稿同步测试报告

## 结论

仓库内多渠道同步实现已通过新增模块的单元/集成测试、定向 ESLint、Astro 生产构建、图片校验、CLI 冒烟和 Skill 前向测试。知乎、掘金在浏览器不可用时均按设计返回 `manual-required` 并保留可导入文章包。

微信公众号真实草稿尚未完成：本机 `md2wechat` 排版服务密钥格式无效，命令在草稿创建前安全失败，未生成可验证远端回执。全仓测试和全仓 ESLint 仍存在本次改动之外的既有失败，详见下文。

## 测试范围

- Astro Markdown 单一内容源解析、frontmatter 规范化和 canonical 出处。
- 根路径/相对图片解析、路径逃逸防护、SVG 临时 PNG 转换和源文件只读。
- 微信、知乎、掘金渠道适配器回执。
- 内容哈希幂等、状态文件权限与损坏恢复、即时通知和 best-effort 编排。
- CLI 的 `inspect`、`prepare`、`sync`、`record` 动作、JSON 输出和退出码。
- Skill 的触发说明、参数契约、浏览器边界和人工降级流程。

## 自动化结果

| 检查          | 命令                                                    | 结果                                    |
| ------------- | ------------------------------------------------------- | --------------------------------------- |
| 发布模块测试  | `npx vitest run src/publishing`                         | 7 个文件、33 项通过                     |
| 新增代码 Lint | `npx eslint scripts/publish-channels.ts src/publishing` | 通过                                    |
| 生产构建      | `npm run build`                                         | 通过；60 个页面和 Pagefind 索引生成完成 |
| Astro 检查    | 构建内 `astro check`                                    | 0 错误、0 警告、21 个既有提示           |
| 图片校验      | `npm run lint:images`                                   | 通过                                    |
| Skill 校验    | `quick_validate.py ~/.codex/skills/sync-blog-channels`  | 通过                                    |

## 全仓基线结果

`npm test` 共通过 59 项测试，另有 4 项既有失败：

- 两个 OG 图片测试无法解析 Vitest 环境中的 `astro:content` 虚拟模块。
- 两个 `validateImageUrl` 测试的既有预期与当前“跳过远端校验/本地文件校验”行为不一致。

`npm run lint` 报告 59 项既有错误，集中在 `bin/*.cjs`、Astro 组件、已有图片测试和工具测试；本次新增的 `scripts/publish-channels.ts` 与 `src/publishing/**` 定向 Lint 通过。

图片校验最终通过；一次中间运行曾因 GitHub 上的既有远程 GIF 请求超时而失败，随即重试成功，未涉及本次新增的本地文章资产。

## 真实冒烟结果

### 微信公众号

- `md2wechat inspect --draft` 可进入本机配置检查流程。
- `md2wechat convert --draft` 在写入草稿前返回 `CONVERT_FAILED`：排版服务 API Key 不符合支持的 `wme_`、`wme2_` 或 `wmt_` 前缀格式。
- 适配器只返回脱敏后的 `WECHAT_CONVERT_FAILED`，不输出访问令牌、密钥或完整响应。
- 为避免未知写入和重复草稿，未自动重试；当前没有远端草稿 ID，无法执行查回验证。

### 知乎与掘金

- `inspect --channels zhihu,juejin` 已在真实博文上返回两个 `prepared` 渠道回执和 `channelStatus=completed`，未执行远端写入。
- Chrome 扩展连接可用，但导航官方编辑器和读取页面状态持续超时。
- 按安全约束停止可见浏览器操作，没有读取 Cookie、密码、`localStorage` 或浏览器 profile，也没有调用私有写 API。
- 两个渠道均返回 `manual-required`、官方编辑器入口和同一份可导入 Markdown/资源清单。
- `record` 命令已用临时状态目录验证：只有重新打开官方草稿 URL 且显式传入 `--verified` 才写入幂等状态。
- 严格 URL 回归验证已覆盖：拒绝知乎已发布页面/通用写作页和掘金 `/editor/drafts/new`，只接受带稳定草稿标识的官方 URL。

### 真实 HTML 图片文章

对仓库现有 `compiler-in-fe` 博文执行只读 `inspect`，成功识别并打包 13 个 HTML `<img src>` WebP 资源和 1 个 SVG 封面，生成稳定内容哈希；源 Markdown 未修改。这验证了现有 Astro HTML 图片写法不会被静默遗漏。

## Skill 前向测试

个人 Skill 安装于 `~/.codex/skills/sync-blog-channels`，完成三条独立场景：

1. 只读预检真实博文，生成稳定内容哈希和 SVG 派生图片，源文件保持不变。
2. 选择掘金、公众号出处和 `prepare` 模式，只生成共享文章包，不发生远端写入。
3. 选择知乎并执行 `sync`，浏览器不可用时返回 `manual-required`，不伪报成功。

## 审查修复

Standards 与 Spec 双轴审查发现的高优先级问题均已加入回归测试并修复：HTML `<img>` 资产打包、图片 URL 定点替换、严格草稿 URL、浏览器异常人工降级、微信错误脱敏与非可信 `verified` 字段、状态权限收紧，以及状态保存失败后的恢复回执。

后续复审补充的边界也已关闭：CommonMark 多反引号/行内/缩进/转义代码示例不会被图片替换污染；新旧草稿 ID 或稳定 URL 冲突时拒绝覆盖旧状态，并返回 `DRAFT_RECEIPT_CONFLICT` 供人工核对。

## 用户审核清单

- [ ] 配置有效的 `md2wechat_api_key` 后，仅重试 `wechat` 渠道并在公众号后台查回核对正文、图片、代码块和出处。
- [ ] Chrome 控制恢复后，分别在知乎和掘金官方编辑器导入文章包，保存并重新打开草稿验证。
- [ ] 确认三个渠道均停留在草稿/编辑态，没有公开发布。
- [ ] 确认出处选择与本次输入一致：博客 canonical URL 或 Jerret Life 微信公众号。

## English Summary

The new multi-channel publishing module passes its targeted tests, lint checks, production build, image validation, CLI smoke tests, and Skill forward tests. Zhihu and Juejin correctly preserve an importable package and return `manual-required` when visible browser automation is unavailable. The live WeChat draft remains blocked by an invalid local `md2wechat` formatting API key; the command stopped before a verifiable draft receipt and did not retry blindly. Existing repository-wide Vitest and ESLint failures are outside the changed publishing paths.
