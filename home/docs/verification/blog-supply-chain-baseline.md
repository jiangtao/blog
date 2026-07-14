# 博客供应链基线验证报告 / Blog Supply-Chain Baseline Verification

## 中文

### 背景

`github.com/jiangtao/blog` 的 `home` 应用是 Article Content 的第一输出源。Article Content 只向本地草稿区写入候选；草稿经过人工审阅、博客质量检查和静态构建后，才能进入正式发布流程。本变更只建立供应链基线，不生成、不发布、不同步任何文章。

基线以 `master@2295cee619214d249e0aee08c1f90d0400f3737b` 为固定审阅点，在隔离分支 `fix/blog-supply-chain-baseline` 上实施。

### 决策

- 固定 Node.js `24.18.0`（Krypton LTS）和 npm `11.16.0`，以 `home/.node-version`、`packageManager` 和严格 `engines` 三处共同约束。
- 提交 npm lockfile v3，所有本地、CI 和 Vercel 安装统一使用 `npm ci`；registry 固定为 npm 官方源。
- npm lifecycle script 采用拒绝未知项策略：允许 `esbuild`、`sharp`，明确拒绝非必需的 `fsevents`。
- Astro 从存在高危公告的 5.x 升级到 `6.4.8`；按官方 v6 迁移说明移除 `preserveScriptOrder` 实验项，并将字体配置迁移到稳定字段。
- GitHub Actions 固定到不可变提交：`actions/checkout@9c091b…`（v7.0.0）和 `actions/setup-node@820762…`（v7.0.0）。
- 已有格式与测试债务不伪装成绿色，也不让 CI 永久红灯：`quality-baseline.json` 保存精确失败集，失败增加、减少或语义变化均要求显式审阅基线。
- 草稿守卫分别检查暂存区和全部已跟踪文章，并用临时 Git index / object database 证明两种模式都会拒绝 `draft: true`，不改动用户工作区或仓库对象库。
- CI 图片门禁只做确定性的本地资源与 SVG 校验；依赖实时网络的外链探测保留为人工检查，不阻断可重复构建。

### 验证结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 锁定安装 | 通过 | Node 24.18.0 + npm 11.16.0 下 `npm ci` 安装 792 个包 |
| 格式失败集 | 基线通过 | 52 个已知未格式化文件，失败集未漂移 |
| 测试失败集 | 基线通过 | 13 套件：9 通过、4 已知失败；28 测试：26 通过、2 已知失败 |
| Draft 检查 | 通过 | 已跟踪文章无草稿；隔离索引中的 `draft: true` fixture 被 staged / tracked 两种模式拒绝 |
| Astro 类型检查 | 通过 | 93 个文件，0 error、0 warning、37 hints |
| 静态构建 | 通过 | Astro 生成 60 页 |
| Pagefind | 通过 | 识别 60 个 HTML，索引 13 页、3340 词 |
| RSS / Sitemap | 通过 | `rss.xml`、`sitemap-index.xml` 均生成 |
| LLM 派生产物 | 通过 | `llms.txt`、`llms-full.txt` 均生成 |
| 生产依赖审计 | 通过阈值 | `high` / `critical` 为 0；保留 2 个 esbuild low 公告 |
| 图片门禁 | 通过 | CI 确定性检查本地图片、链接格式和 SVG；实时外链探测作为人工检查保留 |

### 已知风险与边界

1. `@4hse/astro-llms-txt@1.0.5` 本身声明兼容 Astro 6，但其内嵌 `@astrojs/mdx@4.3.14` 仍声明 Astro 5 peer 范围。当前 Astro 6.4.8 完整构建通过；保留 warning，等待上游更新。
2. npm audit 剩余两个 low 严重度 esbuild 公告，只影响 Windows 开发服务器。本博客生产路径为 macOS/Linux 静态构建；Astro 6.4.8 约束 esbuild `^0.27.3`，不做有兼容风险的 0.x 强制覆盖。
3. 52 个格式差异、4 个测试套件失败属于存量债务，已被精确锁定但尚未修复；应由独立 ticket 收敛，不能和供应链变更或文章内容混在一个提交。
4. 基线的发布结论是 `manual-required`：允许生成和验证正式候选，但禁止无人值守发布。

### 复现

```sh
cd home
npm ci --audit=false --fund=false
npm run format:baseline
npm run lint:images:local
npm run check:drafts
npm run check:drafts:tracked
npm run verify:draft-guard
npm run test:baseline
npm audit --audit-level=high --omit=dev
npm run build
npm run validate:build
```

机器可读契约见 `home/blog-repository-profile.json`。

## English Summary

The `home` application in `github.com/jiangtao/blog` is the primary output source for Article Content. This baseline pins Node.js 24.18.0 and npm 11.16.0, commits an npm v3 lockfile, enforces locked installs and lifecycle-script policy, upgrades Astro to 6.4.8, pins GitHub Actions by immutable commit, verifies the draft rejection path, and validates the static build plus RSS, sitemap, LLM, and Pagefind artifacts.

Known formatter and test debt is represented as an exact reviewed failure set. CI succeeds only while that set is unchanged; any added, removed, or semantically changed failure requires an explicit baseline review. No article was created, published, or synchronized by this work. Unattended release remains disabled, and the release disposition is `manual-required`.

Primary references: [Node.js 24.18.0 release](https://nodejs.org/en/blog/release/v24.18.0), [Node.js release status](https://nodejs.org/en/about/previous-releases), [npm ci](https://docs.npmjs.com/cli/commands/npm-ci/), and [Astro v6 upgrade guide](https://docs.astro.build/zh-cn/guides/upgrade-to/v6/).
