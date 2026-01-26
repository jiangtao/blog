// home/scripts/image-replacer.test.js
const { replaceImageLink } = require('./image-replacer.js');

const testMarkdown = `
# Test

Some text before.
![old alt](https://cdn.nlark.com/yuque/test.png)
Some text after.
`;

const result = replaceImageLink(
  testMarkdown,
  'https://cdn.nlark.com/yuque/test.png',
  '/images/2020/test/1604027361',
  '新图片'
);

console.log('Result:', result);
// Expected: <img src="/images/2020/test/1604027361.webp" alt="新图片" loading="lazy" onerror="window.imgFallback(this)">
