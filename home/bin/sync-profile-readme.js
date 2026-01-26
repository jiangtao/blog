const fs = require('fs');

/**
 * Generate profile README with latest blog posts
 * @param {Array} posts - Array of post objects with title, date, and url
 * @param {string} outputPath - Path to the README file to update
 * @returns {string} Updated README content with posts list
 * @throws {Error} If posts is not an array or outputPath doesn't exist
 */
function generateProfileReadme(posts, outputPath) {
  // Input validation
  if (!Array.isArray(posts)) {
    throw new Error('posts must be an array');
  }

  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('outputPath must be a non-empty string');
  }

  // Check if file exists
  if (!fs.existsSync(outputPath)) {
    throw new Error(`README file not found: ${outputPath}`);
  }

  // Read existing README
  const readme = fs.readFileSync(outputPath, 'utf-8');

  // Generate posts list markdown
  const postsList = posts.map(post =>
    `- [${post.title}](${post.url})`
  ).join('\n');

  // Replace content between markers
  const markerStart = '<!-- BLOG-POST-LIST:START -->';
  const markerEnd = '<!-- BLOG-POST-LIST:END -->';

  const escapedStart = escapeRegExp(markerStart);
  const escapedEnd = escapeRegExp(markerEnd);

  // Create regex to match content between markers (non-greedy)
  const regex = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, 'g');

  const newContent = `${markerStart}\n${postsList}\n${markerEnd}`;

  const updatedReadme = readme.replace(regex, newContent);

  // Verify that markers were found and replaced
  if (updatedReadme === readme && posts.length > 0) {
    throw new Error('Markers not found in README. Ensure <!-- BLOG-POST-LIST:START --> and <!-- BLOG-POST-LIST:END --> markers exist.');
  }

  return updatedReadme;
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string safe for regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { generateProfileReadme };
