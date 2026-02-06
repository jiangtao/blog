// home/bin/image-replacer.js

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceImageLink(markdown, oldUrl, newPath, alt) {
  // Validate newPath contains only safe characters
  if (!/^\/[a-zA-Z0-9\/_.-]+$/.test(newPath) || newPath.includes('..')) {
    throw new Error(`Invalid path: ${newPath}`);
  }

  // Match markdown image, preserving alt text in group 1
  const regex = new RegExp(
    `!\\[([^\\]]*)\\]\\(${escapeRegExp(oldUrl)}(?:[^)]*)?\\)`,
    'g'
  );

  let replacementCount = 0;

  const result = markdown.replace(regex, (match, capturedAlt) => {
    replacementCount++;
    const finalAlt = capturedAlt || alt || 'image';
    return `<img src="${newPath}.webp" alt="${escapeHtml(finalAlt)}" loading="lazy" onerror="window.imgFallback(this)">`;
  });

  return {
    content: result,
    replaced: replacementCount > 0,
    count: replacementCount
  };
}

module.exports = { replaceImageLink };
