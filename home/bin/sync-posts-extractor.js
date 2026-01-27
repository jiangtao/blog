const matter = require('gray-matter');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc.js');
dayjs.extend(utc);

/**
 * Extract latest posts from Hexo posts array
 * @param {Array} posts - Array of Hexo post objects with front-matter data
 * @param {number} limit - Maximum number of posts to extract (default: 5)
 * @returns {Array} Array of post objects with title, date, and url
 * @throws {Error} If posts is not an array or is empty
 */
function extractLatestPosts(posts, limit = 8) {
  // Input validation
  if (!Array.isArray(posts)) {
    throw new Error('posts must be an array');
  }

  if (posts.length === 0) {
    return [];
  }

  // Validate limit
  if (typeof limit !== 'number' || limit < 0) {
    throw new Error('limit must be a non-negative number');
  }

  // Transform each post into the desired format
  const parsedPosts = posts.map((post, index) => {
    try {
      // Handle both raw markdown strings and parsed post objects
      let postData;
      if (typeof post === 'string') {
        // Parse raw markdown content
        const file = matter(post);
        postData = file.data;
      } else if (post && typeof post === 'object') {
        // Use already parsed post object from Hexo
        postData = post;
      } else {
        // Skip invalid post entries
        console.warn(`Skipping invalid post at index ${index}`);
        return null;
      }

      // Extract date and format permalink using dayjs
      const date = postData.date || new Date();
      let dateObj = dayjs.utc(date);

      // Validate date
      if (!dateObj.isValid()) {
        console.warn(`Invalid date for post "${postData.title || 'unknown'}", using current date`);
        dateObj = dayjs.utc();
      }

      const year = dateObj.format('YYYY');
      const month = dateObj.format('MM');
      const day = dateObj.format('DD');

      // Build URL using Hexo permalink pattern: :year/:month/:day/:slug/
      // Priority: front-matter slug > post object slug > skip title (title may have special chars)
      const slug = postData.slug;

      if (!slug) {
        console.warn(`No slug found for post "${postData.title || 'unknown'}", skipping URL generation`);
        return null;
      }

      const url = `https://jiangtao.vercel.app/${year}/${month}/${day}/${slug}/`;

      return {
        title: postData.title || 'Untitled',
        date: dateObj.utc().format('YYYY-MM-DD'),
        url: url
      };
    } catch (error) {
      console.warn(`Error parsing post at index ${index}:`, error.message);
      return null;
    }
  }).filter(post => post !== null); // Remove any null entries from parsing errors

  // Sort by date (newest first) and limit
  return parsedPosts
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

module.exports = { extractLatestPosts };
