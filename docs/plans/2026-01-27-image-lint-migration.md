# Image Lint & Migration Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an image link validation and migration tool to replace external (Yuque) images with local optimized versions (WebP with JS fallback + lazy loading).

**Architecture:**
- Node.js script scans Markdown files for image links
- Validates external links (HEAD request) and local files
- Downloads and optimizes images using `sharp`
- Replaces links with `<img src="webp" loading="lazy" onerror="this.src='png'">`
- Integrates with Git via husky pre-commit hooks

**Tech Stack:**
- `sharp` - Image optimization and WebP conversion
- `markdown-it` - Markdown parsing and link extraction
- `husky` + `lint-staged` - Pre-commit hooks
- `axios` - HTTP link validation

---

## Task 1: Project Setup & Dependencies

**Files:**
- Create: `home/package.json` (update)
- Create: `home/scripts/.gitkeep`
- Create: `home/scripts/.gitignore`

**Step 1: Add dependencies to package.json**

Add to `devDependencies`:
```json
{
  "devDependencies": {
    "sharp": "^0.33.0",
    "markdown-it": "^14.0.0",
    "axios": "^1.6.0",
    "chalk": "^4.1.2",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "ora": "^5.4.1"
  }
}
```

**Step 2: Install dependencies**

Run: `cd home && npm install`
Expected: All packages installed successfully

**Step 3: Create scripts directory structure**

```bash
mkdir -p home/scripts/.original
mkdir -p home/source/images/.original
```

**Step 4: Create .gitignore for original images**

Create `home/source/images/.gitignore`:
```
.original/
*.original.*
```

**Step 5: Commit**

```bash
git add home/package.json home/scripts/ home/source/images/.gitignore
git commit -m "feat: setup image lint tool dependencies"
```

---

## Task 2: Image Link Scanner

**Files:**
- Create: `home/scripts/image-lint.js`
- Test: `home/scripts/image-lint.test.js`

**Step 1: Write the link extraction test**

```javascript
// home/scripts/image-lint.test.js
const { extractImageLinks } = require('./image-lint.js');

const mockMarkdown = `
# Test Post

![local](/images/test.png)
![external](https://example.com/image.jpg)
![yuque](https://cdn.nlark.com/yuque/0/2020/png/xxx.png)
`;

const links = extractImageLinks(mockMarkdown);

console.log('Extracted links:', links);
// Expected:
// [
//   { type: 'local', url: '/images/test.png', line: 4 },
//   { type: 'external', url: 'https://example.com/image.jpg', line: 5 },
//   { type: 'yuque', url: 'https://cdn.nlark.com/yuque/0/2020/png/xxx.png', line: 6 }
// ]
```

**Step 2: Run test to verify it fails**

Run: `node home/scripts/image-lint.test.js`
Expected: Error: extractImageLinks is not defined

**Step 3: Implement link extraction**

```javascript
// home/scripts/image-lint.js
const markdownIt = require('markdown-it');

function extractImageLinks(markdown, filename) {
  const md = new markdownIt();
  const lines = markdown.split('\n');
  const links = [];

  lines.forEach((line, index) => {
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;

    while ((match = imgRegex.exec(line)) !== null) {
      const url = match[2].split('#')[0]; // Remove URL fragments

      if (url.startsWith('/images/')) {
        links.push({ type: 'local', url, line: index + 1 });
      } else if (url.includes('cdn.nlark.com/yuque')) {
        links.push({ type: 'yuque', url, line: index + 1 });
      } else if (url.startsWith('http')) {
        links.push({ type: 'external', url, line: index + 1 });
      }
    }
  });

  return { filename, links };
}

module.exports = { extractImageLinks };
```

**Step 4: Run test to verify it passes**

Run: `node home/scripts/image-lint.test.js`
Expected: Output shows 3 extracted links with correct types

**Step 5: Commit**

```bash
git add home/scripts/image-lint.js home/scripts/image-lint.test.js
git commit -m "feat: add image link extraction from markdown"
```

---

## Task 3: Link Validator

**Files:**
- Modify: `home/scripts/image-lint.js`
- Modify: `home/scripts/image-lint.test.js`

**Step 1: Write validation test**

```javascript
// Add to home/scripts/image-lint.test.js
const { validateLinks } = require('./image-lint.js');

async function testValidation() {
  const mockLinks = [
    { type: 'yuque', url: 'https://cdn.nlark.com/yuque/test.png' },
    { type: 'external', url: 'https://httpstat.us/200' },
    { type: 'external', url: 'https://httpstat.us/404' },
    { type: 'local', url: '/images/missing.png' }
  ];

  const results = await validateLinks(mockLinks, '/images');
  console.log('Validation results:', JSON.stringify(results, null, 2));
}

testValidation();
```

**Step 2: Run test to verify it fails**

Run: `node home/scripts/image-lint.test.js`
Expected: Error: validateLinks is not defined

**Step 3: Implement validation**

```javascript
// Add to home/scripts/image-lint.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function validateLinks(links, imageDir) {
  const results = [];

  for (const link of links) {
    let status = 'valid';
    let message = '';

    if (link.type === 'yuque') {
      status = 'yuque-auth';
      message = 'Yuque 防盗链（需要迁移）';
    } else if (link.type === 'external') {
      try {
        const response = await axios.head(link.url, { timeout: 5000 });
        if (response.status < 200 || response.status >= 300) {
          status = 'invalid';
          message = `HTTP ${response.status}`;
        }
      } catch (error) {
        status = 'invalid';
        message = error.code === 'ECONNABORTED' ? '超时' : error.message;
      }
    } else if (link.type === 'local') {
      const fullPath = path.join(imageDir, link.url.replace('/images/', ''));
      if (!fs.existsSync(fullPath)) {
        status = 'invalid';
        message = '文件不存在';
      }
    }

    results.push({ ...link, status, message });
  }

  return results;
}

module.exports = { extractImageLinks, validateLinks };
```

**Step 4: Run test to verify it passes**

Run: `node home/scripts/image-lint.test.js`
Expected: Output shows validation results for each link

**Step 5: Commit**

```bash
git add home/scripts/image-lint.js
git commit -m "feat: add image link validation"
```

---

## Task 4: Image Downloader & Optimizer

**Files:**
- Create: `home/scripts/image-optimizer.js`
- Test: `home/scripts/image-optimizer.test.js`

**Step 1: Write optimization test**

```javascript
// home/scripts/image-optimizer.test.js
const sharp = require('sharp');
const { downloadAndOptimize } = require('./image-optimizer.js');

async function testOptimize() {
  const testUrl = 'https://via.placeholder.com/300';
  const outputPath = './test-output';

  const result = await downloadAndOptimize(testUrl, outputPath, 'test-image');
  console.log('Optimization result:', result);

  // Cleanup
  const fs = require('fs');
  fs.rmSync(outputPath, { recursive: true, force: true });
}

testOptimize();
```

**Step 2: Run test to verify it fails**

Run: `node home/scripts/image-optimizer.test.js`
Expected: Error: downloadAndOptimize is not defined

**Step 3: Implement download and optimization**

```javascript
// home/scripts/image-optimizer.js
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function downloadAndOptimize(url, outputDir, baseName) {
  const timestamp = Date.now();
  const name = baseName || `${timestamp}`;
  const ext = path.extname(new URL(url).pathname) || '.png';

  // Download to .original
  const originalDir = path.join(outputDir, '.original');
  await fs.mkdir(originalDir, { recursive: true });

  const originalPath = path.join(originalDir, `${name}-original${ext}`);
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  await fs.writeFile(originalPath, response.data);

  // Optimize PNG
  const pngPath = path.join(outputDir, `${name}.png`);
  await sharp(originalPath)
    .png({ quality: 85, effort: 6 })
    .toFile(pngPath);

  // Generate WebP
  const webpPath = path.join(outputDir, `${name}.webp`);
  await sharp(originalPath)
    .webp({ quality: 85 })
    .toFile(webpPath);

  return {
    original: originalPath,
    png: pngPath,
    webp: webpPath,
    pngSize: (await fs.stat(pngPath)).size,
    webpSize: (await fs.stat(webpPath)).size
  };
}

module.exports = { downloadAndOptimize };
```

**Step 4: Run test to verify it passes**

Run: `node home/scripts/image-optimizer.test.js`
Expected: Creates optimized PNG and WebP files, shows sizes

**Step 5: Commit**

```bash
git add home/scripts/image-optimizer.js home/scripts/image-optimizer.test.js
git commit -m "feat: add image download and optimization"
```

---

## Task 5: Markdown Link Replacer

**Files:**
- Create: `home/scripts/image-replacer.js`
- Test: `home/scripts/image-replacer.test.js`

**Step 1: Write replacement test**

```javascript
// home/scripts/image-replacer.test.js
const { replaceImageLink } = require('./image-replacer.js');

const testMarkdown = `
# Test

Some text before.
![old alt](https://cdn.nlark.com/yuque/test.png)
Some text after.
`;

const result = replaceImageLink(
  testMarkdown,
  'https://cdn.nlark.com/yuque/test.png',
  '/images/2020/test/1604027361',
  '新图片'
);

console.log('Result:', result);
// Expected: <img src="/images/2020/test/1604027361.webp" alt="新图片" loading="lazy" onerror="window.imgFallback(this)">
```

**Step 2: Run test to verify it fails**

Run: `node home/scripts/image-replacer.test.js`
Expected: Error: replaceImageLink is not defined

**Step 3: Implement replacement**

```javascript
// home/scripts/image-replacer.js
function replaceImageLink(markdown, oldUrl, newPath, alt) {
  const regex = new RegExp(
    `!\\[([^\\]]*)\\]\\(${escapeRegExp(oldUrl)}(?:[^)]*)?\\)`,
    'g'
  );

  // WebP优先 + 懒加载 + 调用全局 fallback 方法
  const imgTag = `<img src="${newPath}.webp" alt="${alt || 'image'}" loading="lazy" onerror="window.imgFallback(this)">`;

  return markdown.replace(regex, imgTag);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { replaceImageLink };
```

**Step 3.1: Create global fallback function**

Create `home/source/js/image-fallback.js`:
```javascript
// 图片 WebP 回退到 PNG
window.imgFallback = function(img) {
  img.onerror = null; // 防止重复触发
  img.src = img.src.replace(/\.webp$/, '.png');
};
```

**Step 3.2: Inject script in Hexo theme**

Add to `home/_config.yml` or theme config:
```yaml
# 自定义脚本注入
injects:
  bottom:
    - <script src="/js/image-fallback.js"></script>
```

**Step 4: Run test to verify it passes**

Run: `node home/scripts/image-replacer.test.js`
Expected: Markdown contains `<img>` tag with WebP src, lazy loading, and PNG fallback

**Step 5: Commit**

```bash
git add home/scripts/image-replacer.js home/scripts/image-replacer.test.js
git commit -m "feat: add markdown link replacement with WebP + lazy loading"
```

---

## Task 6: Main CLI Interface

**Files:**
- Create: `home/scripts/image-lint-cli.js`
- Modify: `home/package.json` (add scripts)

**Step 1: Create CLI entry point**

```javascript
#!/usr/bin/env node
// home/scripts/image-lint-cli.js

const fs = require('fs');
const path = require('path');
const { extractImageLinks, validateLinks } = require('./image-lint.js');
const { downloadAndOptimize } = require('./image-optimizer.js');
const { replaceImageLink } = require('./image-replacer.js');

const args = process.argv.slice(2);
const postsDir = path.join(__dirname, '../source/_posts');
const imageDir = path.join(__dirname, '../source/images');

async function main() {
  const auto = args.includes('--auto');
  const includeYuque = args.includes('--include-yuque');

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { links } = extractImageLinks(content, file);

    if (links.length === 0) continue;

    console.log(`\n📄 ${file}`);

    const results = await validateLinks(links, imageDir);
    const issues = results.filter(r => r.status !== 'valid');

    if (issues.length === 0) {
      console.log('  ✅ All links valid');
      continue;
    }

    for (const issue of issues) {
      if (issue.type === 'yuque') {
        console.log(`  🔴 ${issue.url.substring(0, 60)}...`);
        console.log(`     状态: ${issue.message}`);

        if (auto && includeYuque) {
          const subdir = `20${file.substring(0, 2)}`;
          const imgDir = path.join(imageDir, subdir, file.replace('.md', ''));
          const baseName = `${Date.now()}`;

          try {
            const result = await downloadAndOptimize(issue.url, imgDir, baseName);
            const newPath = `/images/${subdir}/${file.replace('.md', '')}/${baseName}`;

            content = replaceImageLink(content, issue.url, newPath, '图片');
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`     ✅ 已迁移到 ${newPath}`);
          } catch (err) {
            console.log(`     ❌ 迁移失败: ${err.message}`);
          }
        }
      } else {
        console.log(`  ⚠️  ${issue.url}`);
        console.log(`     状态: ${issue.message}`);
      }
    }
  }
}

main().catch(console.error);
```

**Step 2: Add npm scripts to package.json**

```json
{
  "scripts": {
    "lint:images": "node scripts/image-lint-cli.js",
    "fix:images": "node scripts/image-lint-cli.js --auto --include-yuque",
    "prepare": "husky install"
  }
}
```

**Step 3: Make CLI executable**

Run: `chmod +x home/scripts/image-lint-cli.js`

**Step 4: Test lint command**

Run: `cd home && npm run lint:images`
Expected: Shows report of invalid image links

**Step 5: Commit**

```bash
git add home/scripts/image-lint-cli.js home/package.json
git commit -m "feat: add image lint CLI"
```

---

## Task 7: Git Hooks Integration

**Files:**
- Create: `home/.husky/pre-commit`

**Step 1: Install husky**

Run: `cd home && npm pkg set scripts.prepare="husky install"`
Run: `cd home && npm run prepare`

**Step 2: Create pre-commit hook**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Checking image links..."
cd home && npm run lint:images
```

**Step 3: Make hook executable**

Run: `chmod +x home/.husky/pre-commit`

**Step 4: Configure lint-staged**

Add to `home/package.json`:
```json
{
  "lint-staged": {
    "*.md": ["node scripts/image-lint-cli.js --staged"]
  }
}
```

**Step 5: Test pre-commit**

Run: `git commit --allow-empty -m "test hook"`
Expected: Runs image lint before commit

**Step 6: Commit**

```bash
git add home/.husky/ home/package.json
git commit -m "feat: add pre-commit hook for image validation"
```

---

## Task 8: CI Integration

**Files:**
- Create: `.github/workflows/image-check.yml`

**Step 1: Create GitHub Actions workflow**

```yaml
name: Image Link Check

on:
  pull_request:
    paths:
      - 'home/source/_posts/**/*.md'

jobs:
  check-images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd home && npm install
      - name: Check image links
        run: cd home && npm run lint:images
```

**Step 2: Commit**

```bash
git add .github/workflows/image-check.yml
git commit -m "feat: add CI workflow for image link checking"
```

---

## Task 9: Manual Migration Helper

**Files:**
- Create: `home/scripts/migrate-manual.js`

**Step 1: Create manual migration script**

```javascript
#!/usr/bin/env node
// home/scripts/migrate-manual.js

const fs = require('fs');
const path = require('path');
const { extractImageLinks } = require('./image-lint.js');
const { downloadAndOptimize } = require('./image-optimizer.js');
const { replaceImageLink } = require('./image-replacer.js');

const postsDir = path.join(__dirname, '../source/_posts');
const imageDir = path.join(__dirname, '../source/images');
const tempDir = path.join(__dirname, '../.temp');

// Read temp directory for manually downloaded images
async function migrateFromTemp() {
  if (!fs.existsSync(tempDir)) {
    console.log('❌ .temp 目录不存在，请先手动下载图片到该目录');
    return;
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  const tempImages = fs.readdirSync(tempDir).filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f));

  if (tempImages.length === 0) {
    console.log('❌ .temp 目录中没有图片文件');
    return;
  }

  console.log(`📁 找到 ${tempImages.length} 个图片文件`);

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { links } = extractImageLinks(content, file);
    const yuqueLinks = links.filter(l => l.type === 'yuque');

    if (yuqueLinks.length === 0) continue;

    console.log(`\n📄 ${file} - ${yuqueLinks.length} 个 Yuque 链接`);

    for (const link of yuqueLinks) {
      const subdir = `20${file.substring(0, 2)}`;
      const imgDir = path.join(imageDir, subdir, file.replace('.md', ''));
      await fs.mkdir(imgDir, { recursive: true });

      const baseName = `${Date.now()}`;

      // Use manually downloaded image
      const tempImagePath = path.join(tempDir, tempImages[0]);
      const stats = fs.statSync(tempImagePath);

      // Optimize from temp file
      const { downloadAndOptimizeFromLocal } = require('./image-optimizer.js');
      const result = await downloadAndOptimizeFromLocal(tempImagePath, imgDir, baseName);

      const newPath = `/images/${subdir}/${file.replace('.md', '')}/${baseName}`;
      const newContent = replaceImageLink(content, link.url, newPath, '图片');

      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  ✅ 已迁移: ${link.url.substring(0, 40)}...`);

      // Remove processed temp image
      fs.unlinkSync(tempImagePath);
      break;
    }
  }

  console.log('\n✅ 迁移完成！');
}

migrateFromTemp().catch(console.error);
```

**Step 2: Add optimizer helper for local files**

Add to `home/scripts/image-optimizer.js`:
```javascript
async function downloadAndOptimizeFromLocal(localPath, outputDir, baseName) {
  const name = baseName || `${Date.now()}`;

  // Optimize PNG
  const pngPath = path.join(outputDir, `${name}.png`);
  await sharp(localPath)
    .png({ quality: 85, effort: 6 })
    .toFile(pngPath);

  // Generate WebP
  const webpPath = path.join(outputDir, `${name}.webp`);
  await sharp(localPath)
    .webp({ quality: 85 })
    .toFile(webpPath);

  return {
    png: pngPath,
    webp: webpPath
  };
}

module.exports = { downloadAndOptimize, downloadAndOptimizeFromLocal };
```

**Step 3: Add npm script**

```json
{
  "scripts": {
    "migrate:images": "node scripts/migrate-manual.js"
  }
}
```

**Step 4: Commit**

```bash
git add home/scripts/migrate-manual.js home/scripts/image-optimizer.js home/package.json
git commit -m "feat: add manual migration helper for downloaded images"
```

---

## Task 10: Documentation

**Files:**
- Create: `home/docs/IMAGE-MIGRATION.md`

**Step 1: Create documentation**

```markdown
# 图片链接检查与迁移工具

## 问题

博客中存在大量来自语雀 (cdn.nlark.com/yuque) 的图片链接，这些链接有防盗链限制，无法直接访问。

## 解决方案

### 检查工具

```bash
# 检查所有文章的图片链接
npm run lint:images

# 输出示例：
# 🔴 https://cdn.nlark.com/yuque/...
#    状态: Yuque 防盗链（需要迁移）
```

### 手动迁移

1. 在语雀中打开文章，右键下载图片到 `home/.temp/` 目录
2. 运行迁移命令：

```bash
npm run migrate:images
```

3. 工具会自动：
   - 优化图片（压缩 + WebP 转换）
   - 替换 Markdown 链接为 `<img>` 标签 + 懒加载
   - 删除临时文件

### 自定义脚本

在 `home/source/js/image-fallback.js` 中定义全局 fallback 方法：

```javascript
window.imgFallback = function(img) {
  img.onerror = null;
  img.src = img.src.replace(/\.webp$/, '.png');
};
```

在 Hexo 配置中注入脚本（详见实现计划）。

### 自动迁移

```bash
# 自动下载并迁移 Yuque 图片（可能失败，需要手动处理）
npm run fix:images
```

## 图片处理

- **原图**: 保存到 `images/.original/` (不提交到 Git)
- **压缩图**: PNG 格式，质量 85%
- **WebP**: 更小体积，现代浏览器优先使用

## Markdown 输出

```html
<!-- WebP 优先，懒加载，调用全局 fallback 方法 -->
<img src="/images/2020/article/123456.webp" alt="图片" loading="lazy" onerror="window.imgFallback(this)">
```

**全局 fallback 方法**（`home/source/js/image-fallback.js`）：
```javascript
window.imgFallback = function(img) {
  img.onerror = null; // 防止重复触发
  img.src = img.src.replace(/\.webp$/, '.png');
};
```

## Git Hooks

每次 commit 前自动检查图片链接，确保不会提交失效链接。
```

**Step 2: Commit**

```bash
git add home/docs/IMAGE-MIGRATION.md
git commit -m "docs: add image migration documentation"
```

---

## Summary

This implementation provides:
1. ✅ Link validation for local, external, and Yuque CDN images
2. ✅ Image optimization (PNG compression + WebP conversion)
3. ✅ `<img src="webp" loading="lazy" onerror="this.src='png'">` for browser compatibility
4. ✅ Pre-commit hook integration
5. ✅ CI workflow for PR validation
6. ✅ Manual migration workflow for downloaded images
