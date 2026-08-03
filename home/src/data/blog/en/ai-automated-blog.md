---
title: "Building an Automated Blog with AI"
pubDatetime: 2026-02-12T09:00:00.000Z
tags:
  - "ai"
  - "automation"
  - "astro"
  - "workflow"
draft: false
description: "A technical account of moving from manual Hexo publishing to an automated Astro and AI workflow, including the architectural trade-offs of AI-enabled delivery."
cover: /images/i18n/en/blog-covers/ai-automated-blog-cover.svg
locale: en
translationKey: ai-automated-blog
---
## Introduction

For engineers, a blog is a durable way to capture and share knowledge. For years, though, the publishing workflow was needlessly manual:

- **Manual image work**: design a cover, size it, and optimize its format for every post.
- **Repeated steps**: each article follows the same operational checklist.
- **Cumbersome deployment**: build, upload, and configure the CDN by hand.
- **Fragile maintenance**: broken links and missing images are hard to discover early.

As AI tooling matured, I asked a narrower question: how much of this workflow can be automated without weakening quality controls? This article traces the move from a manual Hexo setup to an Astro and AI-based publishing system, along with the engineering trade-offs involved.

## Phase 1: Hexo Manual Era

### Technical architecture

Early blogs were built based on Hexo, a typical Node.js static blog generator:

```
Hexo + Next Theme
├── source/_posts/          # Markdown 文章
├── themes/next/            # 主题
├── scaffold/               # 文章模板
└── deploy.sh              # 手动部署脚本
```

![Hexo architecture diagram](/images/i18n/en/misc/hexo-architecture.svg)

### Workflow

1. Write Markdown articles in Yuque or locally
2. Manually create cover image (PS/Canva)
3. Copy the image to the corresponding directory
4. Manually adjust image size and format
5. `hexo generate` generates static files
6. Manually upload to server

### Typical configuration

```yaml
# _config.yml
title: Jerret's Blog
theme: next
deploy:
  type: git
  repo: https://github.com/jiangtao/blog.git
  branch: gh-pages
```

### Problems encountered

| Problem | Description | Impact |
|:-----|------|------|
| Image processing is cumbersome | Manually design the cover in different sizes every time | Time-consuming |
| Unstable deployment | Manual upload, easy to miss files | Occasional 404 errors |
| Picture link is invalid | Yuque pictures may be invalid | Need to check and replace one by one |
| Lack of automated checks | Unable to find format errors | Problems discovered only after going online |
| The build speed is slow | The build becomes slower as the number of articles increases | 60 seconds + build time |

### Pain points of manual cover design

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

### Limitations of the times

Technology environment in 2017:
- AI drawing is immature
- CI/CD concept is not popular
- Limited static site tools
- Vercel/Netlify and other platforms have not yet emerged

## Phase 2: Astro staticization

### Why migrate?

As content grows, Hexo's limitations are gradually exposed:

1. **Slow build speed**: Node.js has high runtime overhead, increasing from 10s to 60s+
2. **Theme customization is difficult**: Next The theme is complex and the modification cost is high
3. **Lack of modern features**: No TypeScript, Islands architecture, etc.
4. **JS is large**: Each article loads unnecessary JS

### Astro Technology Stack

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

### Project structure reconstruction

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

### Core improvement comparison

| Features | Hexo | Astro |
|:-----|-------|-------|
| Build speed | ~60s | ~10s |
| Zero JS overhead | No | Yes (default) |
| Frame independent | No | Yes |
| TypeScript | No | Yes |
| Islands Schema | No | Yes |
| Image Optimization | Manual | Built-in |
| Development hot update | Slow | Extremely fast |

### Migration benefits

**Build 6x faster**

```bash
# Hexo 构建时间
$ hexo generate
INFO  Files loaded in 2.31 s
INFO  Generated in 58.72 s  # ~60s

# Astro 构建时间
$ npm run build
astro  v4.x  building in 9.2s  # ~10s
```

**Deployment Simplified**

```yaml
# 集成 Vercel 自动部署
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev"
}
```

**Development experience improvement**

- **Hot Update**: Refresh in milliseconds after modification
- **TypeScript**: type safety
- **ESLint + Prettier**: Code specifications
- **Image Optimization**: Automatic WebP conversion

### Code example: Component layout

![Astro Architecture Diagram](/images/i18n/en/misc/astro-architecture.svg)

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

### The principle behind Astro’s fast construction speed

The core reason why Astro can reduce the build time from 60s to 10s lies in its unique architectural design:

**1. Zero JS runtime**
- Astro does not send any JavaScript to the page by default
- Only explicitly enabled components will package JS
- Compared with Hexo (whole-site packaged React), Astro’s static output is more lightweight

**2. Compile time optimization**
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

**3. Incremental build**
- Rebuild only modified files
- File-based hash caching mechanism
- Process multiple pages in parallel

**4. Static generation is preferred**
- No Node.js server runtime required
- Directly generate pure HTML/CSS static files
- Avoids the serialization overhead of the SSR framework

**Performance comparison**:
| Indicators | Hexo | Astro |
|:-----|------|-------|
| Build method | Run-time generation | Compile-time generation |
| JS size | 200KB+ per article | Close to 0 |
| First screen rendering | Waiting for JS to load | Visible immediately |
| Caching strategy | Full site regeneration | Incremental updates |

### But the cover image is still manual...

While the move to Astro brought a lot of improvements, the cover image problem still persists:

| Dimensions | Hexo Era | Astro Era |
|:-----|-----------|------------|
| Cover Creation | Manual PS | Manual PS |
| Style Consistency | Poor | Poor |
| Time taken | 30 minutes | 30 minutes |
| SVG support | Limited | Support |

This paves the way for the next stage of AI automation.

## Stage 3: AI cover generation

### Pain point analysis

Pain points of manually designing covers:

1. **Insufficient design capabilities**: Programmers are not designers
2. **Inconsistent style**: The cover style of each article is very different.
3. **Seriously time-consuming**: at least 30 minutes from idea to completion
4. **Format Error**: SVG syntax, size and other problems frequently occur

### AI Assisted Solution

Use Claude Code + SVG to generate the cover, inspired by Teacher Baoyu’s skill:

```javascript
// .skills/blog-cover-gen.md
可用风格:
  minimal     - 极简黑白
  blueprint   - 技术蓝图
  notion      - Notion 风格
  chalkboard  - 黑板粉笔
  // ... 更多风格
```

### Technical implementation

```bash
# 1. AI 分析文章内容
# 2. 提取标题、标签、关键词
# 3. 生成 SVG 封面
# 4. 添加水印 "Jerret's Blog"
# 5. 保存到指定目录
```

### Quality Assurance

Automatic validation checks:

```javascript
// bin/image-lint-cli.cjs
- 检查重复 `</svg>` 标签
- 验证水印存在
- 检查属性格式错误
- xmllint 验证
- 转义特殊字符 (&, <, >)
```

### Effect comparison

| Dimensions | Manual | AI generated |
|:-----|------|---------|
| Time cost | 30 minutes | 1 minute |
| Style consistency | Poor | Excellent |
| Format correctness | Manual inspection required | Automatic verification |
| Iteration cost | High | Very low |


## Stage 4: Fully automated workflow

### Complete process

![AI cover generation flow chart](/images/i18n/en/misc/ai-cover-flow.svg)

### Automation script

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

### /dev:commit skill workflow

Enforce a 5-step submission process:

1. **Create branch** - `git checkout -b feat/xxx`
2. **Create PR** - Structured Change Summary
3. **Define Test** - Clear test plan
4. **Run Test** - Verify all checks
5. **User Review** - Merge after passing the review list

> Standardized process, each change has a PR that details the target, change, verification, and verification path with a preview environment, which can quickly verify and reproduce

### CI/CD integration

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

### Final effect

![Full automation workflow diagram](/images/i18n/en/misc/full-automation-workflow.svg)

- **Write and Publish**: Automatically go online after completion
- **ZERO IMAGE PROBLEMS**: Automatic verification + fix
- **Quality Assurance**: Multi-level inspection mechanism
- **Backtracking capability**: Git version control

## Technology evolution trends in the AI era

From the practice of blog automation, we can see several obvious trends:

### 1. AI from assistance to dominance

![AI from auxiliary to dominant](/images/i18n/en/misc/ai-evolution-1.svg)


### 2. Workflow standardization

![Workflow standardization](/images/i18n/en/misc/ai-evolution-2.svg)

### 3. Increased observability

![Increased observability](/images/i18n/en/misc/ai-evolution-3.svg)

### 4. Codification of knowledge

![Knowledge Codification](/images/i18n/en/misc/ai-evolution-4.svg)


### 5. Zero-cost iteration

![Zero-cost iteration](/images/i18n/en/misc/ai-evolution-5.svg)

## Difficulties and Countermeasures for Enterprise Implementation

### Difficulty 1: Historical baggage

**Problem**: The enterprise has a large amount of legacy code and processes that are difficult to fully transform

**Countermeasures**:
1. **Progressive Migration**: Don’t overthrow and start over, but gradually replace
2. **Compatibility design**: coexistence of old and new systems
3. **AI-Assisted Migration**: Use AI to help understand legacy code

```
# 示例：图片渐进迁移
旧文章 -> 保持不动
新文章 -> AI 封面
手动触发 -> 批量迁移旧文章
```

### Difficulty Two: Quality Control

**Issue**: The quality of AI-generated content/code is inconsistent

**Countermeasures**:
1. **Multi-level verification mechanism**: AI -> automatic inspection -> manual review
2. **Explicit quality standards**: Write quality requirements into specifications, you can use speckit, openspec, etc., and dev skill can also add quality requirements, etc.
3. **Feedback Closed Loop**: After manual correction, AI learns and improves

```javascript
// 质量标准编码化示例
const qualityChecks = [
  { name: '水印', check: hasWatermark },
  { name: '格式', check: xmllintValidate },
  { name: '尺寸', check: verifyDimensions },
]
```

### Difficulty Three: Team Acceptance

**Issue**: Team members have mixed receptivity to AI tools

**Countermeasures**:
1. **Lower the threshold**: Tools should be simple enough
2. **Option reserved**: AI assisted but not forced
3. **Value Visualization**: Display efficiency improvement data
4. **Organizational Characteristics**: Portrait of curiosity and practice, continuous learning is the best choice

**Problem**: Incomplete infrastructure for automated construction such as cicd

**Countermeasures**:
1. **Lower the threshold**: infrastructure such as github private can be used
2. **Upgrade infrastructure**: Based on gitlab's self-developed devOps ecosystem, if actions are standardized, etc.
3. **Standardized Workflow**: Improve existing processes and standards based on team standards such as skills, etc.


### Difficulty Four: Security and Compliance

**Question**: Code, data security requirements, AI usage compliance

**Countermeasures**:
1. **Local priority**: Sensitive data is not uploaded to the cloud
2. **Model Selection**: Use privately deployable models
3. **Audit mechanism**: record operation logs, review process operations
4. **Manual Review**: For highly sensitive projects, the person is ultimately responsible for the full details.

### Difficulty Five: Cost Control

**Problem**: AI API call cost, ROI is not clear

**Countermeasures**:
1. **Cost Transparency**: Record the cost of each AI call
2. **Caching Strategy**: Result reuse for similar requests
3. **Hybrid Mode**: Use rules for simple tasks and AI for complex tasks

## Summary

The practice of blog automation is essentially using AI to solve "highly repetitive, low-creativity" tasks.

### Technology evolution path

![Technology evolution path](/images/i18n/en/misc/tech-evolution-path.svg)

### Key understanding

1. **AI is not omnipotent**: suitable for standardized and rule-based tasks
2. **Processes are more important than tools**: Standardize processes first, then talk about automation
3. **Human-machine collaboration**: AI generation, human review
4. **Continuous iteration**: AI capabilities are evolving, and the system must also be upgraded.
5. **Quality Assurance**: While AI is rapidly improving efficiency, infrastructure is the criterion, so a sustainable observation architecture must be built.

### Outlook

Further evolution of the blog system in the future:

- **Automatic cross-platform distribution**: one article, automatically adapted to multiple platforms
- **Smart SEO Optimization**: AI analyzes search trends and optimizes content

The ultimate goal of technology is to allow creators to focus on "creation" and leave everything else to AI.

## Reference resources

- [Astro Documentation](https://docs.astro.build)
- [Satori - SVG Generation](https://github.com/vercel/satori)
- [Claude Code](https://claude.ai/code)
- GitHub for this project: [jiangtao/blog](https://github.com/jiangtao/blog)
