// home/bin/sync-posts-extractor.test.js
const { extractLatestPosts } = require('./sync-posts-extractor.js');

console.log('=== Basic functionality test ===');
// Test with mock post objects (as they would come from Hexo)
const mockPosts = [
  {
    slug: 'test-post',
    title: 'Test Post',
    date: '2026-01-27',
    layout: 'post'
  },
  {
    slug: 'another-post',
    title: 'Another Post',
    date: '2026-01-26',
    layout: 'post'
  },
  {
    slug: 'old-post',
    title: 'Old Post',
    date: '2025-01-01',
    layout: 'post'
  }
];

const result = extractLatestPosts(mockPosts, 5);
console.log('Extracted posts:', JSON.stringify(result, null, 2));
console.log('Total posts:', result.length);
console.log('First post title:', result[0]?.title);
console.log('First post date:', result[0]?.date);
console.log('First post url:', result[0]?.url);

// Expected:
// - Array of 3 objects (all posts since limit is 5)
// - Each object has: title, date, url
// - Posts sorted by date (newest first)
// - URL format: https://imjiangtao.com/PERMALINK_FORMAT

console.log('\n=== Test limit parameter ===');
const limitedResult = extractLatestPosts(mockPosts, 2);
console.log('Limited to 2 posts:', limitedResult.length);
console.log('Should be 2:', limitedResult.length === 2 ? 'PASS' : 'FAIL');

console.log('\n=== Test date sorting ===');
const isSorted = limitedResult[0].date >= limitedResult[1].date;
console.log('Is sorted (newest first)?', isSorted ? 'PASS' : 'FAIL');

console.log('\n=== Test with raw markdown (has slug in front-matter) ===');
const rawMarkdown = `---
title: Raw Post
date: 2026-01-28
slug: raw-post
layout: post
---

# Content here
`;
const rawResult = extractLatestPosts([rawMarkdown, ...mockPosts], 1);
console.log('Raw post title:', rawResult[0]?.title);
console.log('Raw post date:', rawResult[0]?.date);
console.log('Raw post url:', rawResult[0]?.url);
console.log('Raw post is newest?', rawResult[0]?.date === '2026-01-28' ? 'PASS' : 'FAIL');

console.log('\n=== Test URL uses slug, not title (Chinese title case) ===');
// This simulates the real-world case: compiler-in-fe.md with Chinese title
const chineseTitlePost = {
  slug: 'compiler-in-fe',
  title: '编译原理在前端应用',
  date: '2022-08-18'
};
const chineseResult = extractLatestPosts([chineseTitlePost], 1);
console.log('Chinese title post URL:', chineseResult[0]?.url);
const expectedUrl = 'https://imjiangtao.com/2022/08/18/compiler-in-fe/';
console.log('Expected URL:', expectedUrl);
console.log('URL uses slug (not title)?', chineseResult[0]?.url === expectedUrl ? 'PASS' : 'FAIL');

console.log('\n=== Test input validation ===');
// Test empty array
const emptyResult = extractLatestPosts([]);
console.log('Empty array returns:', emptyResult);
console.log('Empty array is empty array?', Array.isArray(emptyResult) && emptyResult.length === 0 ? 'PASS' : 'FAIL');

// Test invalid input
try {
  extractLatestPosts('not an array');
  console.log('Invalid input: FAIL (should throw)');
} catch (error) {
  console.log('Invalid input throws error:', error.message);
  console.log('Invalid input test:', error.message.includes('must be an array') ? 'PASS' : 'FAIL');
}

// Test invalid limit
try {
  extractLatestPosts(mockPosts, -1);
  console.log('Invalid limit: FAIL (should throw)');
} catch (error) {
  console.log('Invalid limit throws error:', error.message);
  console.log('Invalid limit test:', error.message.includes('non-negative') ? 'PASS' : 'FAIL');
}

console.log('\n=== Test post without slug ===');
const noSlugPost = {
  title: 'Post Without Slug',
  date: '2026-01-29'
};
const noSlugResult = extractLatestPosts([noSlugPost]);
console.log('Posts without slug:', noSlugResult);
console.log('Skips posts without slug?', noSlugResult.length === 0 ? 'PASS' : 'FAIL');
