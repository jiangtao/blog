// home/scripts/image-lint.test.js
const { extractImageLinks } = require('./image-lint.js');

const mockMarkdown = `
# Test Post

![local](/images/test.png)
![external](https://example.com/image.jpg)
![yuque](https://cdn.nlark.com/yuque/0/2020/png/xxx.png)
`;

const links = extractImageLinks(mockMarkdown);

console.log('Extracted links:', links);
// Expected:
// [
//   { type: 'local', url: '/images/test.png', line: 4 },
//   { type: 'external', url: 'https://example.com/image.jpg', line: 5 },
//   { type: 'yuque', url: 'https://cdn.nlark.com/yuque/0/2020/png/xxx.png', line: 6 }
// ]

// Add to home/scripts/image-lint.test.js
const { validateLinks } = require('./image-lint.js');

async function testValidation() {
  const mockLinks = [
    { type: 'yuque', url: 'https://cdn.nlark.com/yuque/test.png' },
    { type: 'external', url: 'https://httpstat.us/200' },
    { type: 'external', url: 'https://httpstat.us/404' },
    { type: 'local', url: '/images/missing.png' }
  ];

  const results = await validateLinks(mockLinks, '/images');
  console.log('Validation results:', JSON.stringify(results, null, 2));
}

testValidation();
