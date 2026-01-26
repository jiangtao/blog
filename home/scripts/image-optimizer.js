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
