#!/usr/bin/env node
// home/bin/image-lint-cli.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { extractImageLinks, validateLinks } = require('./image-lint.cjs');
const { downloadAndOptimize } = require('./image-optimizer.cjs');
const { replaceImageLink } = require('./image-replacer.cjs');

const args = process.argv.slice(2);
const postsDir = path.join(__dirname, '../src/data/blog');
const imageDir = path.join(__dirname, '../public/images');
let hasErrors = false;

// SVG 验证函数
function validateSVGFiles() {
  console.log('\n🔍 检查 SVG 文件...');
  const svgDirs = [
    path.join(imageDir, 'blog-covers'),
    path.join(imageDir, 'misc')
  ];

  let svgErrors = [];

  svgDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // 检查 1: 是否有重复的标签
      const svgTagCount = (content.match(/<\/svg>/g) || []).length;
      if (svgTagCount !== 1) {
        svgErrors.push({
          file: file,
          error: `有 ${svgTagCount} 个 </svg> 标签，应该只有 1 个`
        });
      }

      // 检查 2: 是否包含 Watermark
      if (!content.includes("Jerret's Blog")) {
        svgErrors.push({
          file: file,
          error: '缺少水印 "Jerret\'s Blog"'
        });
      }

      // 检查 3: 属性是否正确闭合 (检查 "><" 或 "\"><" 模式)
      // 例如: <text ... fill="#5E4B55"IMAGE> 应该是 <text ... fill="#5E4B55">IMAGE
      const malformedAttrs = content.match(/\w+="[^"]*"\w+/g);
      if (malformedAttrs) {
        svgErrors.push({
          file: file,
          error: `属性未正确闭合: ${malformedAttrs[0].substring(0, 40)}...`
        });
      }

      // 检查 5: puppeteer 字体验证（XML 中 & 符号必须转义）
      if (content.includes('Getting Started') || content.includes('Puppeteer')) {
        const unescapedAmp = /&(?!(?:amp|lt|gt|quot|apos);)/.test(content);
        if (unescapedAmp) {
          svgErrors.push({
            file: file,
            error: 'puppeteer 封面: & 符号未转义，需要使用 &amp;'
          });
        }
      }

      // 检查 4: 基本 XML 格式验证
      const unclosedTags = content.match(/<[a-zA-Z][^>]*\w+="[^"]*"[a-zA-Z][^>]*>/g);
      if (unclosedTags) {
        svgErrors.push({
          file: file,
          error: `标签格式错误，属性后缺少 > 符号`
        });
      }

      // 检查 5: xmllint 验证（如果可用）
      try {
        execSync(`xmllint --noout "${filePath}"`, { stdio: 'pipe' });
      } catch (e) {
        // xmllint 可能不可用，跳过
      }
    });
  });

  if (svgErrors.length === 0) {
    console.log('  ✅ 所有 SVG 文件检查通过');
  } else {
    console.log('  ⚠️  发现 SVG 问题:');
    svgErrors.forEach(err => {
      console.log(`     ${err.file}: ${err.error}`);
    });
  }

  return svgErrors.length === 0;
}

async function main() {
  const auto = args.includes('--auto');
  const includeYuque = args.includes('--include-yuque');
  const localOnly = args.includes('--local-only');

  // 首先验证 SVG 文件
  const svgValid = validateSVGFiles();
  if (!svgValid) {
    hasErrors = true;
  }

  let files;
  try {
    files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  } catch (err) {
    console.error(`Error reading posts directory: ${err.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No markdown files found in posts directory');
    process.exit(0);
  }

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { links } = extractImageLinks(content, file);

    if (links.length === 0) continue;

    console.log(`\n📄 ${file}`);

    const results = await validateLinks(links, imageDir, 5000, {
      checkExternal: !localOnly
    });
    const issues = results.filter(
      r => r.status !== 'valid' && r.status !== 'skipped'
    );
    const skipped = results.filter(r => r.status === 'skipped').length;

    if (issues.length === 0) {
      console.log(
        skipped > 0
          ? `  ✅ 本地图片有效；跳过 ${skipped} 个实时外链探测`
          : '  ✅ All links valid'
      );
      continue;
    }

    hasErrors = true;
    let currentContent = content;

    for (const issue of issues) {
      if (issue.type === 'yuque') {
        console.log(`  🔴 ${issue.url.substring(0, 60)}...`);
        console.log(`     状态: ${issue.message}`);

        if (auto && includeYuque) {
          const yearMatch = file.match(/^(\d{2})/);
          const subdir = yearMatch ? `20${yearMatch[1]}` : 'misc';
          const imgDir = path.join(imageDir, subdir, file.replace('.md', ''));
          const baseName = `${Date.now()}`;

          try {
            await downloadAndOptimize(issue.url, imgDir, baseName);
            const newPath = `/images/${subdir}/${file.replace('.md', '')}/${baseName}`;

            const replaceResult = replaceImageLink(currentContent, issue.url, newPath, '图片');

            if (!replaceResult.replaced) {
              console.log(`     ❌ 替换失败: URL 在 Markdown 中未找到匹配`);
              continue;
            }

            currentContent = replaceResult.content;
            fs.writeFileSync(filePath, currentContent, 'utf-8');
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

  if (hasErrors && !auto) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
