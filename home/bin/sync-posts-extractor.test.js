// home/bin/sync-posts-extractor.test.js
const { extractLatestPosts } = require('./sync-posts-extractor.js');

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

// Test limit functionality
console.log('\n--- Testing limit parameter ---');
const limitedResult = extractLatestPosts(mockPosts, 2);
console.log('Limited to 2 posts:', limitedResult.length);
console.log('Should be 2:', limitedResult.length === 2 ? 'PASS' : 'FAIL');

// Test sorting
console.log('\n--- Testing date sorting ---');
const isSorted = limitedResult[0].date >= limitedResult[1].date;
console.log('Is sorted (newest first)?', isSorted ? 'PASS' : 'FAIL');

// Test with raw markdown content
console.log('\n--- Testing with raw markdown ---');
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
