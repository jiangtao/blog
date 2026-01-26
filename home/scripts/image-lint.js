// home/scripts/image-lint.js
const YUQUE_CDN_PATTERN = 'cdn.nlark.com/yuque';
const IMG_REGEX = /!\[(.*?)\]\((.*?)\)/g;

function extractImageLinks(markdown, filename = '<unknown>') {
  const lines = markdown.split('\n');
  const links = [];

  lines.forEach((line, index) => {
    let match;

    while ((match = IMG_REGEX.exec(line)) !== null) {
      const url = match[2].split('#')[0]; // Remove URL fragments

      if (url.startsWith('/images/')) {
        links.push({ type: 'local', url, line: index + 1 });
      } else if (url.includes(YUQUE_CDN_PATTERN)) {
        links.push({ type: 'yuque', url, line: index + 1 });
      } else if (url.startsWith('http')) {
        links.push({ type: 'external', url, line: index + 1 });
      } else {
        // Catch-all for unmatched URLs (relative paths, protocol-relative, etc.)
        links.push({ type: 'unknown', url, line: index + 1 });
      }
    }
  });

  return { filename, links };
}

module.exports = { extractImageLinks };
