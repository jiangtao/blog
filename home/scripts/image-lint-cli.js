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
            await downloadAndOptimize(issue.url, imgDir, baseName);
            const newPath = `/images/${subdir}/${file.replace('.md', '')}/${baseName}`;

            const newContent = replaceImageLink(content, issue.url, newPath, '图片');
            fs.writeFileSync(filePath, newContent, 'utf-8');
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
