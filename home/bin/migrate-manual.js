#!/usr/bin/env node
// home/scripts/migrate-manual.js

const fs = require('fs');
const path = require('path');
const { extractImageLinks } = require('./image-lint.js');
const { downloadAndOptimizeFromLocal } = require('./image-optimizer.js');
const { replaceImageLink } = require('./image-replacer.js');

const postsDir = path.join(__dirname, '../source/_posts');
const imageDir = path.join(__dirname, '../source/images');
const tempDir = path.join(__dirname, '../.temp');

// Read temp directory for manually downloaded images
async function migrateFromTemp() {
  let failures = 0;

  // Validate directories exist
  if (!fs.existsSync(postsDir)) {
    console.error('❌ 文章目录不存在:', postsDir);
    failures++;
    process.exit(1);
  }
  if (!fs.existsSync(imageDir)) {
    console.error('❌ 图片目录不存在:', imageDir);
    failures++;
    process.exit(1);
  }
  if (!fs.existsSync(tempDir)) {
    console.log('❌ .temp 目录不存在，请先手动下载图片到该目录');
    failures++;
    process.exit(1);
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  const tempImages = fs.readdirSync(tempDir).filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f));

  if (tempImages.length === 0) {
    console.log('❌ .temp 目录中没有图片文件');
    failures++;
    process.exit(1);
  }

  console.log(`📁 找到 ${tempImages.length} 个图片文件`);

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    let currentContent = fs.readFileSync(filePath, 'utf-8');
    const { links } = extractImageLinks(currentContent, file);
    const yuqueLinks = links.filter(l => l.type === 'yuque');

    if (yuqueLinks.length === 0) continue;

    console.log(`\n📄 ${file} - ${yuqueLinks.length} 个 Yuque 链接`);

    for (const link of yuqueLinks) {
      // Find matching temp image by extracting filename from URL
      // Yuque URLs typically contain the image filename
      const urlParts = link.url.split('/').filter(part => part.length > 0);
      const urlFilename = urlParts[urlParts.length - 1].split('.')[0];

      // Try to find a matching temp image
      let matchedImage = tempImages.find(img => {
        const imgName = img.split('.')[0];
        // Only match if urlFilename is non-empty and has at least 8 characters
        if (!urlFilename || urlFilename.length < 8) {
          return imgName === urlFilename;
        }
        return imgName === urlFilename || imgName.includes(urlFilename.substring(0, 8));
      });

      // Only use fallback when there's exactly one temp image (unsafe otherwise)
      if (!matchedImage && tempImages.length === 1) {
        matchedImage = tempImages[0];
      }

      if (!matchedImage) {
        console.log(`  ⚠️  没有找到匹配的图片: ${link.url.substring(0, 40)}...`);
        continue;
      }

      const subdir = `20${file.substring(0, 2)}`;
      const imgDir = path.join(imageDir, subdir, file.replace('.md', ''));
      await fs.promises.mkdir(imgDir, { recursive: true });

      const baseName = `${Date.now()}`;

      // Use manually downloaded image
      const tempImagePath = path.join(tempDir, matchedImage);

      try {
        // Optimize from temp file
        await downloadAndOptimizeFromLocal(tempImagePath, imgDir, baseName);

        const newPath = `/images/${subdir}/${file.replace('.md', '')}/${baseName}`;

        // Replace link in current content
        const replaceResult = replaceImageLink(currentContent, link.url, newPath, '图片');

        // Check if replacement was successful
        if (!replaceResult.replaced) {
          failures++;
          console.error(`  ❌ 替换失败: URL 在 Markdown 中未找到匹配`);
          console.error(`     原始 URL: ${link.url}`);
          console.error(`     提示: 可能是 URL 编码差异导致，临时文件 ${matchedImage} 已保留`);
          continue;
        }

        currentContent = replaceResult.content;

        // Write updated content to file
        fs.writeFileSync(filePath, currentContent, 'utf-8');

        // CRITICAL: Reload content after write to prevent staleness bugs
        currentContent = fs.readFileSync(filePath, 'utf-8');

        console.log(`  ✅ 已迁移: ${link.url.substring(0, 40)}... → ${matchedImage}`);

        // Remove processed temp image ONLY after successful replacement
        fs.unlinkSync(tempImagePath);

        // Remove from tempImages array to prevent reuse
        const idx = tempImages.indexOf(matchedImage);
        if (idx > -1) {
          tempImages.splice(idx, 1);
        }

        // Only process one link per file to avoid confusion
        break;
      } catch (error) {
        failures++;
        console.error(`  ❌ 迁移失败: ${error.message}`);
        continue;
      }
    }
  }

  console.log('\n✅ 迁移完成！');
  if (failures > 0) {
    console.error(`\n⚠️  有 ${failures} 个操作失败`);
    process.exit(1);
  }
}

migrateFromTemp().catch(err => {
  console.error('❌ 迁移过程中发生错误:', err);
  process.exit(1);
});
