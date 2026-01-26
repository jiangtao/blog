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
    let content = fs.readFileSync(filePath, 'utf-8');
    const { links } = extractImageLinks(content, file);
    const yuqueLinks = links.filter(l => l.type === 'yuque');

    if (yuqueLinks.length === 0) continue;

    console.log(`\n📄 ${file} - ${yuqueLinks.length} 个 Yuque 链接`);

    for (const link of yuqueLinks) {
      // Find matching temp image by extracting filename from URL
      // Yuque URLs typically contain the image filename
      const urlParts = link.url.split('/');
      const urlFilename = urlParts[urlParts.length - 1].split('.')[0];

      // Try to find a matching temp image
      let matchedImage = tempImages.find(img => {
        const imgName = img.split('.')[0];
        return imgName === urlFilename || imgName.includes(urlFilename.substring(0, 8));
      });

      // If no match found, use first available image (fallback for single image scenario)
      if (!matchedImage && tempImages.length > 0) {
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

        // Replace link and update content
        content = replaceImageLink(content, link.url, newPath, '图片');

        // Write updated content to file
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`  ✅ 已迁移: ${link.url.substring(0, 40)}... → ${matchedImage}`);

        // Remove processed temp image
        fs.unlinkSync(tempImagePath);

        // Remove from tempImages array to prevent reuse
        const idx = tempImages.indexOf(matchedImage);
        if (idx > -1) {
          tempImages.splice(idx, 1);
        }

        // Only process one link per file to avoid confusion
        break;
      } catch (error) {
        console.log(`  ❌ 迁移失败: ${error.message}`);
        continue;
      }
    }
  }

  console.log('\n✅ 迁移完成！');
}

migrateFromTemp().catch(console.error);
