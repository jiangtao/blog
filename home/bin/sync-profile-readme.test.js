// home/bin/sync-profile-readme.test.js
const { generateProfileReadme } = require('./sync-profile-readme.js');
const fs = require('fs');
const path = require('path');

// Create a temporary test README file
const testReadmePath = path.join(__dirname, 'test-profile-readme.md');
const testReadmeContent = `# Test Profile README

### Posts
<!-- BLOG-POST-LIST:START -->
- [Old Post 1](https://imjiangtao.com/old-post-1)
- [Old Post 2](https://imjiangtao.com/old-post-2)
<!-- BLOG-POST-LIST:END -->

### Other Content
This should remain unchanged.
`;

// Setup: Create test file
fs.writeFileSync(testReadmePath, testReadmeContent, 'utf-8');

const posts = [
  {
    title: 'Test Post 1',
    date: '2026-01-27',
    url: 'https://imjiangtao.com/test-post-1'
  },
  {
    title: 'Test Post 2',
    date: '2026-01-26',
    url: 'https://imjiangtao.com/test-post-2'
  },
  {
    title: 'Test Post 3',
    date: '2026-01-25',
    url: 'https://imjiangtao.com/test-post-3'
  }
];

try {
  const result = generateProfileReadme(posts, testReadmePath);

  console.log('Generated README length:', result.length);
  console.log('--- Generated README ---');
  console.log(result);
  console.log('--- End of README ---\n');

  // Verify the content
  const hasStartMarker = result.includes('<!-- BLOG-POST-LIST:START -->');
  const hasEndMarker = result.includes('<!-- BLOG-POST-LIST:END -->');
  const hasTestPost1 = result.includes('[Test Post 1](https://imjiangtao.com/test-post-1)');
  const hasTestPost2 = result.includes('[Test Post 2](https://imjiangtao.com/test-post-2)');
  const hasTestPost3 = result.includes('[Test Post 3](https://imjiangtao.com/test-post-3)');
  const hasOldPost1 = !result.includes('[Old Post 1](https://imjiangtao.com/old-post-1)');
  const hasOtherContent = result.includes('This should remain unchanged.');

  console.log('Test Results:');
  console.log('- Has start marker:', hasStartMarker);
  console.log('- Has end marker:', hasEndMarker);
  console.log('- Has Test Post 1:', hasTestPost1);
  console.log('- Has Test Post 2:', hasTestPost2);
  console.log('- Has Test Post 3:', hasTestPost3);
  console.log('- Old Post 1 removed:', hasOldPost1);
  console.log('- Other content preserved:', hasOtherContent);

  const allTestsPassed = hasStartMarker && hasEndMarker && hasTestPost1 &&
    hasTestPost2 && hasTestPost3 && hasOldPost1 && hasOtherContent;

  console.log('\n✓ All tests passed:', allTestsPassed);

  if (!allTestsPassed) {
    process.exit(1);
  }
} catch (error) {
  console.error('Test failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup: Remove test file
  if (fs.existsSync(testReadmePath)) {
    fs.unlinkSync(testReadmePath);
  }
}
