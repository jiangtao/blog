// home/scripts/image-optimizer.js
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function downloadAndOptimize(url, outputDir, baseName) {
  try {
    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (err) {
      throw new Error(`Invalid URL format: ${url}`);
    }

    // Sanitize baseName to prevent path traversal
    const timestamp = Date.now();
    const name = baseName ? baseName.replace(/[^a-zA-Z0-9-_]/g, '_') : `${timestamp}`;
    const ext = path.extname(urlObj.pathname) || '.png';

    // Download to .original
    const originalDir = path.join(outputDir, '.original');
    await fs.mkdir(originalDir, { recursive: true });

    const originalPath = path.join(originalDir, `${name}-original${ext}`);

    // Download with status check
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: Failed to download image from ${url}`);
    }
    await fs.writeFile(originalPath, response.data);

    // Parallelize PNG and WebP generation
    const pngPath = path.join(outputDir, `${name}.png`);
    const webpPath = path.join(outputDir, `${name}.webp`);

    const [pngResult, webpResult] = await Promise.all([
      sharp(originalPath).png({ quality: 85, effort: 6 }).toFile(pngPath),
      sharp(originalPath).webp({ quality: 85 }).toFile(webpPath)
    ]);

    // Parallelize stat operations
    const [pngStat, webpStat] = await Promise.all([
      fs.stat(pngPath),
      fs.stat(webpPath)
    ]);

    return {
      original: originalPath,
      png: pngPath,
      webp: webpPath,
      originalSize: response.data.byteLength,
      pngSize: pngStat.size,
      webpSize: webpStat.size
    };
  } catch (err) {
    if (err.response) {
      throw new Error(`HTTP ${err.response.status}: Failed to download image from ${url}`);
    }
    throw err;
  }
}

async function downloadAndOptimizeFromLocal(localPath, outputDir, baseName) {
  try {
    // Validate input path exists
    const fsSync = require('fs');
    if (!fsSync.existsSync(localPath)) {
      throw new Error(`Local file does not exist: ${localPath}`);
    }

    // Sanitize baseName to prevent path traversal
    const timestamp = Date.now();
    const safeBaseName = baseName ? baseName.replace(/[^a-zA-Z0-9-_]/g, '_') : `${timestamp}`;
    const name = safeBaseName || `${timestamp}`;

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Parallelize PNG and WebP generation from local file
    const pngPath = path.join(outputDir, `${name}.png`);
    const webpPath = path.join(outputDir, `${name}.webp`);

    const [pngResult, webpResult] = await Promise.all([
      sharp(localPath).png({ quality: 85, effort: 6 }).toFile(pngPath),
      sharp(localPath).webp({ quality: 85 }).toFile(webpPath)
    ]);

    // Parallelize stat operations
    const [pngStat, webpStat] = await Promise.all([
      fs.stat(pngPath),
      fs.stat(webpPath)
    ]);

    return {
      png: pngPath,
      webp: webpPath,
      pngSize: pngStat.size,
      webpSize: webpStat.size
    };
  } catch (err) {
    throw new Error(`Failed to optimize local image: ${err.message}`);
  }
}

module.exports = { downloadAndOptimize, downloadAndOptimizeFromLocal };
