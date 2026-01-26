const matter = require('gray-matter');

/**
 * Extract latest posts from Hexo posts array
 * @param {Array} posts - Array of Hexo post objects with front-matter data
 * @param {number} limit - Maximum number of posts to extract (default: 5)
 * @returns {Array} Array of post objects with title, date, and url
 */
function extractLatestPosts(posts, limit = 5) {
  // Transform each post into the desired format
  const parsedPosts = posts.map(post => {
    // Handle both raw markdown strings and parsed post objects
    let postData;
    if (typeof post === 'string') {
      // Parse raw markdown content
      const file = matter(post);
      postData = file.data;
    } else {
      // Use already parsed post object from Hexo
      postData = post;
    }

    // Extract date and format permalink
    const date = postData.date || new Date();
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    // Build URL using Hexo permalink pattern: :year/:month/:day/:title/
    const titleSlug = postData.slug || postData.title || 'untitled';
    const url = `https://imjiangtao.com/${year}/${month}/${day}/${titleSlug}/`;

    return {
      title: postData.title,
      date: dateObj.toISOString().split('T')[0], // YYYY-MM-DD format
      url: url
    };
  });

  // Sort by date (newest first) and limit
  return parsedPosts
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

module.exports = { extractLatestPosts };
