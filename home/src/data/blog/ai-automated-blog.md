---
title: AI实践-搭建自动化博客
pubDatetime: 2026-02-12T19:55:00.000Z
tags:
  - ai
  - automation
  - astro
  - workflow
draft: false
description: "从 Hexo 手动到 Astro + AI 全自动化，记录博客系统的技术演进历程，探讨 AI 时代企业技术演进趋势与落地难点。"
cover: /images/blog-covers/ai-automated-blog-cover.svg
---

## 引言

作为一个技术人，写博客是知识沉淀和分享的重要方式。但长期以来，博客写作的体验并不友好：

- **手动处理图片**：需要手动设计封面、调整尺寸、优化格式
- **重复劳动**：每篇文章都要经历相同的处理流程
- **部署繁琐**：手动构建、上传、配置 CDN
- **维护困难**：链接失效、图片丢失等问题难以发现

随着 AI 工具的成熟，我开始思考：能否用 AI 实现博客的全自动化？本文将记录我的博客系统从 Hexo 手动时代到 Astro + AI 全自动化的技术演进历程，并探讨 AI 时代企业技术演进的趋势与难点。

## 阶段一：Hexo 手动时代

### 技术架构

早期博客基于 Hexo 搭建，典型的 Node.js 静态博客生成器：

```
Hexo + Next Theme
├── source/_posts/          # Markdown 文章
├── themes/next/            # 主题
├── scaffold/               # 文章模板
└── deploy.sh              # 手动部署脚本
```

> **技术图表使用 drawio-diagram skill 生成（Draw.io 默认自然风格）**
>
> **执行命令**：
> ```bash
> drawio-diagram architecture "Hexo博客系统架构" "source文章目录 -> Hexo引擎 -> Next主题 -> deploy.sh手动部署" --style default
> ```

![Hexo 架构图](/images/misc/hexo-architecture.svg)

### 工作流程

1. 在语雀或本地写 Markdown 文章
2. 手动创建封面图（PS/Canva）
3. 复制图片到对应目录
4. 手动调整图片尺寸和格式
5. `hexo generate` 生成静态文件
6. 手动上传到服务器

### 典型配置

```yaml
# _config.yml
title: Jerret's Blog
theme: next
deploy:
  type: git
  repo: https://github.com/jiangtao/blog.git
  branch: gh-pages
```

### 遇到的问题

| 问题 | 描述 | 影响 |
|:-----|------|------|
| 图片处理繁琐 | 每次手动设计封面，尺寸不一 | 耗时久 |
| 部署不稳定 | 手动上传，容易遗漏文件 | 偶发 404 错误 |
| 图片链接失效 | 语雀图片可能失效 | 需要逐个检查替换 |
| 缺少自动化检查 | 无法发现格式错误 | 上线后才发现问题 |
| 构建速度慢 | 文章增多后构建变慢 | 60秒+ 构建时间 |

### 手动封面设计的痛点

```javascript
// 典型的封面创建流程（手动时代）
1. 打开 PS/Canva
2. 选择画布 1200x630
3. 选择配色方案
4. 设计布局
5. 添加标题
6. 调整字体大小
7. 导出 PNG/JPG
8. 压缩图片
9. 上传到图床
10. 复制链接到文章
```

### 时代局限

2017 年的技术环境：
- AI 绘图未成熟
- CI/CD 概念不普及
- 静态站点工具有限
- Vercel/Netlify 等平台未兴起

## 阶段二：Astro 静态化

### 为什么要迁移

随着内容增长，Hexo 的局限性逐渐暴露：

1. **构建速度慢**：Node.js 运行时开销大，从 10s 增长到 60s+
2. **主题定制难**：Next 主题复杂，修改成本高
3. **缺乏现代化特性**：没有 TypeScript、Islands 架构等
4. **JS 体积大**：每篇文章都加载不必要的 JS

### Astro 技术栈

```typescript
// astro.config.ts
import { defineConfig } from 'astro'

export default defineConfig({
  site: 'https://blog.jerret.me',
  build: {
    format: 'directory', // 每个页面生成 index.html
  },
  markdown: {
    shiki: {
      theme: 'github-dark',
      langs: ['javascript', 'typescript', 'bash'],
    },
  },
})
```

### 项目结构重构

```
home/
├── src/
│   ├── components/       # Astro/React 组件
│   ├── layouts/          # 页面布局
│   ├── pages/            # 路由页面
│   ├── styles/           # 全局样式
│   └── data/blog/        # Markdown 文章
├── public/               # 静态资源
├── astro.config.ts
└── package.json
```

### 核心改进对比

| 特性 | Hexo | Astro |
|:-----|-------|-------|
| 构建速度 | ~60s | ~10s |
| 零 JS 开销 | 否 | 是（默认） |
| 框架无关 | 否 | 是 |
| TypeScript | 否 | 是 |
| Islands 架构 | 否 | 是 |
| 图片优化 | 手动 | 内置 |
| 开发热更新 | 慢 | 极快 |

### 迁移收益

**构建提速 6 倍**

```bash
# Hexo 构建时间
$ hexo generate
INFO  Files loaded in 2.31 s
INFO  Generated in 58.72 s  # ~60s

# Astro 构建时间
$ npm run build
astro  v4.x  building in 9.2s  # ~10s
```

**部署简化**

```yaml
# 集成 Vercel 自动部署
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev"
}
```

**开发体验提升**

- **热更新**：修改后毫秒级刷新
- **TypeScript**：类型安全
- **ESLint + Prettier**：代码规范
- **图片优化**：自动 WebP 转换

### 代码示例：组件化布局

> **技术图表使用 drawio-diagram skill 生成（Draw.io 默认自然风格）**
>
> **执行命令**：
> ```bash
> drawio-diagram architecture "Astro静态博客系统" "Pages路由页 + Components组件 + Content数据 + Build构建 + Vercel部署" --style default
> ```

![Astro 架构图](/images/misc/astro-architecture.svg)

```astro
---
// src/layouts/BlogPost.astro
const { frontmatter, headings } = Astro.props;
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
---

<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>{frontmatter.title}</title>
  </head>
  <body>
    <Header />
    <main>
      <article>
        <h1>{frontmatter.title}</h1>
        <slot />  <!-- Markdown 内容 -->
      </article>
    </main>
    <Footer />
  </body>
</html>
```

### Astro 构建速度快的原理

Astro 之所以能将构建时间从 60s 降低到 10s，核心在于其独特的架构设计：

**1. 零 JS 运行时**
- Astro 默认不向页面发送任何 JavaScript
- 只有明确启用的组件才会打包 JS
- 相比 Hexo（全站打包 React），Astro 的静态输出更轻量

**2. 编译时优化**
```astro
---
// Astro 在编译阶段就完成所有工作
const posts = await getCollection('blog')

// 编译时生成 HTML，无需客户端运行时
export async function GET() {
  return posts.map(post => ({
    ...post,
    rendered: post.render()  // 编译时渲染
  }))
}
---
```

**3. 增量构建**
- 只重新构建修改的文件
- 基于文件的哈希缓存机制
- 并行处理多个页面

**4. 静态生成优先**
- 不需要 Node.js 服务器运行时
- 直接生成纯 HTML/CSS 静态文件
- 避免了 SSR 框架的序列化开销

**性能对比**：
| 指标 | Hexo | Astro |
|:-----|------|-------|
| 构建方式 | 运行时生成 | 编译时生成 |
| JS 体积 | 每篇 200KB+ | 接近 0 |
| 首屏渲染 | 等待 JS 加载 | 立即可见 |
| 缓存策略 | 全站重新生成 | 增量更新 |

### 但封面图仍然是手动...

虽然迁移到 Astro 带来了很多改进，但封面图问题依然存在：

| 维度 | Hexo 时代 | Astro 时代 |
|:-----|-----------|------------|
| 封面创建 | 手动 PS | 手动 PS |
| 风格一致性 | 差 | 差 |
| 耗时 | 30 分钟 | 30 分钟 |
| SVG 支持 | 有限 | 支持 |

这为下一阶段的 AI 自动化埋下了伏笔。

## 阶段三：AI 封面生成

### 痛点分析

手动设计封面的痛点：

1. **设计能力不足**：程序员不是设计师
2. **风格不统一**：每篇封面风格差异大
3. **耗时严重**：从构思到完成至少 30 分钟
4. **格式错误**：SVG 语法、尺寸等问题频发

### AI 辅助方案

使用 Claude Code + SVG 生成封面， 此处灵感来自宝玉老师的 skill：

```javascript
// .skills/blog-cover-gen.md
可用风格:
  minimal     - 极简黑白
  blueprint   - 技术蓝图
  notion      - Notion 风格
  chalkboard  - 黑板粉笔
  // ... 更多风格
```

### 技术实现

```bash
# 1. AI 分析文章内容
# 2. 提取标题、标签、关键词
# 3. 生成 SVG 封面
# 4. 添加水印 "Jerret's Blog"
# 5. 保存到指定目录
```

### 质量保证

自动验证检查：

```javascript
// bin/image-lint-cli.cjs
- 检查重复 `</svg>` 标签
- 验证水印存在
- 检查属性格式错误
- xmllint 验证
- 转义特殊字符 (&, <, >)
```

### 效果对比

| 维度 | 手动 | AI 生成 |
|:-----|------|---------|
| 时间成本 | 30 分钟 | 1 分钟 |
| 风格一致性 | 差 | 优秀 |
| 格式正确性 | 需人工检查 | 自动验证 |
| 迭代成本 | 高 | 极低 |


## 阶段四：全自动化工作流

### 完整流程

![AI 封面生成流程图](/images/misc/ai-cover-flow.svg)

### 自动化脚本

```json
// package.json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build && pagefind --site dist",
    "lint:images": "node bin/image-lint-cli.cjs",
    "fix:images": "node bin/image-lint-cli.cjs --auto --include-yuque"
  }
}
```

### /dev:commit skill 工作流

强制遵循 5 步提交流程：

1. **创建分支** - `git checkout -b feat/xxx`
2. **创建 PR** - 结构化变更摘要
3. **定义测试** - 明确测试计划
4. **运行测试** - 验证所有检查
5. **用户审核** - 审核清单通过后合并

> 标准化的流程， 每次改动都有一个 PR 详细描述目标、改动、验证，以及有 preview 环境的验证路径，可快速验证和复现

### CI/CD 集成

```yaml
# .github/workflows/deploy.yml
on: push
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lint:images
      - uses: amondnet/vercel-action@v25
```

### 最终效果

![全自动化工作流图](/images/misc/full-automation-workflow.svg)

- **写作即发布**：完成后自动上线
- **零图片问题**：自动验证 + 修复
- **质量保障**：多级检查机制
- **回溯能力**：Git 版本控制

## AI 时代技术演进趋势

从博客自动化的实践，可以看到几个明显的趋势：

### 1. AI 从辅助到主导

![AI 从辅助到主导](/images/misc/ai-evolution-1.svg)


### 2. 工作流标准化

![工作流标准化](/images/misc/ai-evolution-2.svg)

### 3. 可观测性上升

![可观测性上升](/images/misc/ai-evolution-2.svg)

### 4. 知识编码化

![知识编码化](/images/misc/ai-evolution-4.svg)


### 5. 零成本迭代

![零成本迭代](/images/misc/ai-evolution-5.svg)

## 企业落地难点与对策

### 难点一：历史包袱

**问题**：企业有大量遗留代码和流程，难以全面改造

**对策**：
1. **渐进式迁移**：不搞推翻重来，而是逐步替换
2. **兼容性设计**：新旧系统并存
3. **AI 辅助迁移**：用 AI 帮助理解遗留代码

```
# 示例：图片渐进迁移
旧文章 -> 保持不动
新文章 -> AI 封面
手动触发 -> 批量迁移旧文章
```

### 难点二：质量控制

**问题**：AI 生成内容/代码的质量不稳定

**对策**：
1. **多级验证机制**：AI -> 自动检查 -> 人工审核
2. **质量标准显性化**：将质量要求写成规范，可使用 speckit、openspec 等，同时 dev skill 也可加入质量要求等
3. **反馈闭环**：人工纠正后，AI 学习改进

```javascript
// 质量标准编码化示例
const qualityChecks = [
  { name: '水印', check: hasWatermark },
  { name: '格式', check: xmllintValidate },
  { name: '尺寸', check: verifyDimensions },
]
```

### 难点三：团队接受度

**问题**：团队成员对 AI 工具的接受程度不一

**对策**：
1. **降低门槛**：工具要足够简单
2. **保留选择权**：AI 辅助但不强制
3. **价值可视化**：展示效率提升数据
4. **组织特征**: 画像好奇并实践、持续学习是最佳选择

**问题**：cicd 等自动化建设基建不全

**对策**：
1. **降低门槛**：可采用 github private 等基建
2. **升级基建**：基于 gitlab 自研 devOps生态打通，如果 actions 规范等
3. **规范化工作流**：基于 skill 等团队规范完善现有的流程和标准等


### 难点四：安全与合规

**问题**：代码、数据安全要求，AI 使用合规性

**对策**：
1. **本地优先**：敏感数据不上传云端
2. **模型选择**：使用可私有部署的模型
3. **审计机制**：记录操作日志，Review 过程操作
4. **人工Review**： 对于高敏感项目人是最终兜底，为其负责

### 难点五：成本控制

**问题**：AI API 调用成本，ROI 不清晰

**对策**：
1. **成本透明化**：记录每次 AI 调用成本
2. **缓存策略**：相似请求复用结果
3. **混合模式**：简单任务用规则，复杂任务用 AI

## 总结

博客自动化的实践，本质上是用 AI 解决"重复性高、创造性低"的任务。

### 技术演进路径

![技术演进路径](/images/misc/tech-evolution-path.svg)

### 关键认知

1. **AI 不是万能**：适合标准化、可规则化的任务
2. **流程重于工具**：先有标准化流程，再谈自动化
3. **人机协作**：AI 生成，人类审核
4. **持续迭代**：AI 能力在进化，系统也要升级
5. **质量保证**：AI 快速提效的同时，基建是准则，因此要建设可持续观测架构

### 展望

未来博客系统的进一步演进：

- **自动跨平台分发**：一篇文章，自动适配多平台
- **智能SEO优化**：AI 分析搜索趋势，优化内容

技术的终极目标是让创作者专注于"创作"，其他一切交给 AI。

## 参考资源

- [Astro Documentation](https://docs.astro.build)
- [Satori - SVG Generation](https://github.com/vercel/satori)
- [Claude Code](https://claude.ai/code)
- 本项目 GitHub: [jiangtao/blog](https://github.com/jiangtao/blog)
