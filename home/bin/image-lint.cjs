// home/bin/image-lint.js
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
        links.push({ type: 'unknown', url, line: index + 1 });
      }
    }
  });

  return { filename, links };
}

async function validateLinks(links, imageDir, timeout = 5000) {
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');

  const results = [];

  for (const link of links) {
    let status = 'valid';
    let message = '';

    if (link.type === 'yuque') {
      status = 'yuque-auth';
      message = 'Yuque 防盗链（需要迁移）';
    } else if (link.type === 'external') {
      try {
        const response = await axios.head(link.url, {
          timeout,
          maxRedirects: 5
        });
        if (response.status >= 400) {
          status = 'invalid';
          message = `HTTP ${response.status}`;
        }
      } catch (error) {
        status = 'invalid';
        if (error.code) {
          message = error.code === 'ECONNABORTED' ? '超时' : error.message;
        } else {
          message = error.message || '未知错误';
        }
      }
    } else if (link.type === 'local') {
      const fullPath = path.join(imageDir, link.url.replace('/images/', ''));
      if (!fs.existsSync(fullPath)) {
        status = 'invalid';
        message = '文件不存在';
      }
    } else if (link.type === 'unknown') {
      status = 'invalid';
      message = '不支持的链接格式';
    }

    results.push({ ...link, status, message });
  }

  return results;
}

module.exports = { extractImageLinks, validateLinks };
