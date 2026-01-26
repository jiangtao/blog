// home/scripts/image-lint.js
const markdownIt = require('markdown-it');

function extractImageLinks(markdown, filename) {
  const md = new markdownIt();
  const lines = markdown.split('\n');
  const links = [];

  lines.forEach((line, index) => {
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;

    while ((match = imgRegex.exec(line)) !== null) {
      const url = match[2].split('#')[0]; // Remove URL fragments

      if (url.startsWith('/images/')) {
        links.push({ type: 'local', url, line: index + 1 });
      } else if (url.includes('cdn.nlark.com/yuque')) {
        links.push({ type: 'yuque', url, line: index + 1 });
      } else if (url.startsWith('http')) {
        links.push({ type: 'external', url, line: index + 1 });
      }
    }
  });

  return { filename, links };
}

module.exports = { extractImageLinks };
