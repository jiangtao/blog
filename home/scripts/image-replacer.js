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
