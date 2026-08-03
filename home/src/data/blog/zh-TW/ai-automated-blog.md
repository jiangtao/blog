---
title: AI實踐-搭建自動化博客
pubDatetime: 2026-02-12T09:00:00.000Z
tags:
  - ai
  - automation
  - astro
  - workflow
draft: false
description: "從 Hexo 手動到 Astro + AI 全自動化，記錄博客系統的技術演進歷程，探討 AI 時代企業技術演進趨勢與落地難點。"
cover: /images/i18n/zh-TW/blog-covers/ai-automated-blog-cover.svg
locale: zh-TW
translationKey: ai-automated-blog
---

## 引言

作為一個技術人，寫博客是知識沈澱和分享的重要方式。但長期以來，博客寫作的體驗並不友好：

- **手動處理圖片**：需要手動設計封面、調整尺寸、優化格式
- **重復勞動**：每篇文章都要經歷相同的處理流程
- **部署繁瑣**：手動構建、上傳、配置 CDN
- **維護困難**：鏈接失效、圖片丟失等問題難以發現

隨著 AI 工具的成熟，我開始思考：能否用 AI 實現博客的全自動化？本文將記錄我的博客系統從 Hexo 手動時代到 Astro + AI 全自動化的技術演進歷程，並探討 AI 時代企業技術演進的趨勢與難點。

## 階段一：Hexo 手動時代

### 技術架構

早期博客基於 Hexo 搭建，典型的 Node.js 靜態博客生成器：

```
Hexo + Next Theme
├── source/_posts/          # Markdown 文章
├── themes/next/            # 主题
├── scaffold/               # 文章模板
└── deploy.sh              # 手动部署脚本
```

![Hexo 架構圖](/images/i18n/zh-TW/misc/hexo-architecture.svg)

### 工作流程

1. 在語雀或本地寫 Markdown 文章
2. 手動創建封面圖（PS/Canva）
3. 複製圖片到對應目錄
4. 手動調整圖片尺寸和格式
5. `hexo generate` 生成靜態文件
6. 手動上傳到服務器

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

### 遇到的問題

| 問題 | 描述 | 影響 |
|:-----|------|------|
| 圖片處理繁瑣 | 每次手動設計封面，尺寸不一 | 耗時久 |
| 部署不穩定 | 手動上傳，容易遺漏文件 | 偶發 404 錯誤 |
| 圖片鏈接失效 | 語雀圖片可能失效 | 需要逐個檢查替換 |
| 缺少自動化檢查 | 無法發現格式錯誤 | 上線後才發現問題 |
| 構建速度慢 | 文章增多後構建變慢 | 60秒+ 構建時間 |

### 手動封面設計的痛點

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

### 時代局限

2017 年的技術環境：
- AI 繪圖未成熟
- CI/CD 概念不普及
- 靜態站點工具有限
- Vercel/Netlify 等平台未興起

## 階段二：Astro 靜態化

### 為甚麼要遷移

隨著內容增長，Hexo 的局限性逐漸暴露：

1. **構建速度慢**：Node.js 運行時開銷大，從 10s 增長到 60s+
2. **主題定制難**：Next 主題複雜，修改成本高
3. **缺乏現代化特性**：沒有 TypeScript、Islands 架構等
4. **JS 體積大**：每篇文章都加載不必要的 JS

### Astro 技術棧

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

### 項目結構重構

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

### 核心改進對比

| 特性 | Hexo | Astro |
|:-----|-------|-------|
| 構建速度 | ~60s | ~10s |
| 零 JS 開銷 | 否 | 是（默認） |
| 框架無關 | 否 | 是 |
| TypeScript | 否 | 是 |
| Islands 架構 | 否 | 是 |
| 圖片優化 | 手動 | 內置 |
| 開發熱更新 | 慢 | 極快 |

### 遷移收益

**構建提速 6 倍**

```bash
# Hexo 构建时间
$ hexo generate
INFO  Files loaded in 2.31 s
INFO  Generated in 58.72 s  # ~60s

# Astro 构建时间
$ npm run build
astro  v4.x  building in 9.2s  # ~10s
```

**部署簡化**

```yaml
# 集成 Vercel 自动部署
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev"
}
```

**開發體驗提升**

- **熱更新**：修改後毫秒級刷新
- **TypeScript**：類型安全
- **ESLint + Prettier**：代碼規範
- **圖片優化**：自動 WebP 轉換

### 代碼示例：組件化佈局

![Astro 架構圖](/images/i18n/zh-TW/misc/astro-architecture.svg)

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

### Astro 構建速度快的原理

Astro 之所以能將構建時間從 60s 降低到 10s，核心在於其獨特的架構設計：

**1. 零 JS 運行時**
- Astro 默認不向頁面發送任何 JavaScript
- 只有明確啓用的組件才會打包 JS
- 相比 Hexo（全站打包 React），Astro 的靜態輸出更輕量

**2. 編譯時優化**
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

**3. 增量構建**
- 只重新構建修改的文件
- 基於文件的哈希緩存機制
- 並行處理多個頁面

**4. 靜態生成優先**
- 不需要 Node.js 服務器運行時
- 直接生成純 HTML/CSS 靜態文件
- 避免了 SSR 框架的序列化開銷

**性能對比**：
| 指標 | Hexo | Astro |
|:-----|------|-------|
| 構建方式 | 運行時生成 | 編譯時生成 |
| JS 體積 | 每篇 200KB+ | 接近 0 |
| 首屏渲染 | 等待 JS 加載 | 立即可見 |
| 緩存策略 | 全站重新生成 | 增量更新 |

### 但封面圖仍然是手動...

雖然遷移到 Astro 帶來了很多改進，但封面圖問題依然存在：

| 維度 | Hexo 時代 | Astro 時代 |
|:-----|-----------|------------|
| 封面創建 | 手動 PS | 手動 PS |
| 風格一致性 | 差 | 差 |
| 耗時 | 30 分鐘 | 30 分鐘 |
| SVG 支持 | 有限 | 支持 |

這為下一階段的 AI 自動化埋下了伏筆。

## 階段三：AI 封面生成

### 痛點分析

手動設計封面的痛點：

1. **設計能力不足**：程序員不是設計師
2. **風格不統一**：每篇封面風格差異大
3. **耗時嚴重**：從構思到完成至少 30 分鐘
4. **格式錯誤**：SVG 語法、尺寸等問題頻發

### AI 輔助方案

使用 Claude Code + SVG 生成封面， 此處靈感來自寶玉老師的 skill：

```javascript
// .skills/blog-cover-gen.md
可用风格:
  minimal     - 极简黑白
  blueprint   - 技术蓝图
  notion      - Notion 风格
  chalkboard  - 黑板粉笔
  // ... 更多风格
```

### 技術實現

```bash
# 1. AI 分析文章内容
# 2. 提取标题、标签、关键词
# 3. 生成 SVG 封面
# 4. 添加水印 "Jerret's Blog"
# 5. 保存到指定目录
```

### 質量保證

自動驗證檢查：

```javascript
// bin/image-lint-cli.cjs
- 检查重复 `</svg>` 标签
- 验证水印存在
- 检查属性格式错误
- xmllint 验证
- 转义特殊字符 (&, <, >)
```

### 效果對比

| 維度 | 手動 | AI 生成 |
|:-----|------|---------|
| 時間成本 | 30 分鐘 | 1 分鐘 |
| 風格一致性 | 差 | 優秀 |
| 格式正確性 | 需人工檢查 | 自動驗證 |
| 迭代成本 | 高 | 極低 |


## 階段四：全自動化工作流

### 完整流程

![AI 封面生成流程圖](/images/i18n/zh-TW/misc/ai-cover-flow.svg)

### 自動化腳本

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

強制遵循 5 步提交流程：

1. **創建分支** - `git checkout -b feat/xxx`
2. **創建 PR** - 結構化變更摘要
3. **定義測試** - 明確測試計劃
4. **運行測試** - 驗證所有檢查
5. **用戶審核** - 審核清單通過後合併

> 標準化的流程， 每次改動都有一個 PR 詳細描述目標、改動、驗證，以及有 preview 環境的驗證路徑，可快速驗證和復現

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

### 最終效果

![全自動化工作流圖](/images/i18n/zh-TW/misc/full-automation-workflow.svg)

- **寫作即發佈**：完成後自動上線
- **零圖片問題**：自動驗證 + 修復
- **質量保障**：多級檢查機制
- **回溯能力**：Git 版本控制

## AI 時代技術演進趨勢

從博客自動化的實踐，可以看到幾個明顯的趨勢：

### 1. AI 從輔助到主導

![AI 從輔助到主導](/images/i18n/zh-TW/misc/ai-evolution-1.svg)


### 2. 工作流標準化

![工作流標準化](/images/i18n/zh-TW/misc/ai-evolution-2.svg)

### 3. 可觀測性上升

![可觀測性上升](/images/i18n/zh-TW/misc/ai-evolution-3.svg)

### 4. 知識編碼化

![知識編碼化](/images/i18n/zh-TW/misc/ai-evolution-4.svg)


### 5. 零成本迭代

![零成本迭代](/images/i18n/zh-TW/misc/ai-evolution-5.svg)

## 企業落地難點與對策

### 難點一：歷史包袱

**問題**：企業有大量遺留代碼和流程，難以全面改造

**對策**：
1. **漸進式遷移**：不搞推翻重來，而是逐步替換
2. **兼容性設計**：新舊系統並存
3. **AI 輔助遷移**：用 AI 幫助理解遺留代碼

```
# 示例：图片渐进迁移
旧文章 -> 保持不动
新文章 -> AI 封面
手动触发 -> 批量迁移旧文章
```

### 難點二：質量控制

**問題**：AI 生成內容/代碼的質量不穩定

**對策**：
1. **多級驗證機制**：AI -> 自動檢查 -> 人工審核
2. **質量標準顯性化**：將質量要求寫成規範，可使用 speckit、openspec 等，同時 dev skill 也可加入質量要求等
3. **反饋閉環**：人工糾正後，AI 學習改進

```javascript
// 质量标准编码化示例
const qualityChecks = [
  { name: '水印', check: hasWatermark },
  { name: '格式', check: xmllintValidate },
  { name: '尺寸', check: verifyDimensions },
]
```

### 難點三：團隊接受度

**問題**：團隊成員對 AI 工具的接受程度不一

**對策**：
1. **降低門檻**：工具要足夠簡單
2. **保留選擇權**：AI 輔助但不強制
3. **價值可視化**：展示效率提升數據
4. **組織特徵**: 畫像好奇並實踐、持續學習是最佳選擇

**問題**：cicd 等自動化建設基建不全

**對策**：
1. **降低門檻**：可採用 github private 等基建
2. **升級基建**：基於 gitlab 自研 devOps生態打通，如果 actions 規範等
3. **規範化工作流**：基於 skill 等團隊規範完善現有的流程和標準等


### 難點四：安全與合規

**問題**：代碼、數據安全要求，AI 使用合規性

**對策**：
1. **本地優先**：敏感數據不上傳雲端
2. **模型選擇**：使用可私有部署的模型
3. **審計機制**：記錄操作日誌，Review 過程操作
4. **人工Review**： 對於高敏感項目人是最終兜底，為其負責

### 難點五：成本控制

**問題**：AI API 調用成本，ROI 不清晰

**對策**：
1. **成本透明化**：記錄每次 AI 調用成本
2. **緩存策略**：相似請求復用結果
3. **混合模式**：簡單任務用規則，複雜任務用 AI

## 總結

博客自動化的實踐，本質上是用 AI 解決"重復性高、創造性低"的任務。

### 技術演進路徑

![技術演進路徑](/images/i18n/zh-TW/misc/tech-evolution-path.svg)

### 關鍵認知

1. **AI 不是萬能**：適合標準化、可規則化的任務
2. **流程重於工具**：先有標準化流程，再談自動化
3. **人機協作**：AI 生成，人類審核
4. **持續迭代**：AI 能力在進化，系統也要升級
5. **質量保證**：AI 快速提效的同時，基建是准則，因此要建設可持續觀測架構

### 展望

未來博客系統的進一步演進：

- **自動跨平台分發**：一篇文章，自動適配多平台
- **智能SEO優化**：AI 分析搜索趨勢，優化內容

技術的終極目標是讓創作者專注於"創作"，其他一切交給 AI。

## 參考資源

- [Astro Documentation](https://docs.astro.build)
- [Satori - SVG Generation](https://github.com/vercel/satori)
- [Claude Code](https://claude.ai/code)
- 本項目 GitHub: [jiangtao/blog](https://github.com/jiangtao/blog)
