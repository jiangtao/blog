// home/scripts/image-replacer.js
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceImageLink(markdown, oldUrl, newPath, alt) {
  // Validate newPath contains only safe characters
  if (!/^\/[a-zA-Z0-9\/_-]+$/.test(newPath)) {
    throw new Error(`Invalid path: ${newPath}`);
  }

  // WebP优先 + 懒加载 + 调用全局 fallback 方法
  // Use $1 to preserve original alt text from markdown, fallback to provided alt (escaped)
  const imgTag = `<img src="${newPath}.webp" alt="${alt ? escapeHtml(alt) : '$1'}" loading="lazy" onerror="window.imgFallback(this)">`;

  // Match markdown image, preserving alt text in group 1
  const regex = new RegExp(
    `!\\[([^\\]]*)\\]\\(${escapeRegExp(oldUrl)}(?:[^)]*)?\\)`,
    'g'
  );

  return markdown.replace(regex, imgTag);
}

module.exports = { replaceImageLink };
