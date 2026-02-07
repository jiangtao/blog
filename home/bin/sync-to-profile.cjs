const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const matter = require('gray-matter');
const { extractLatestPosts } = require('./sync-posts-extractor.cjs');
const { generateProfileReadme } = require('./sync-profile-readme.cjs');

// Updated path for Astro blog posts
const POSTS_DIR = path.join(__dirname, '../src/data/blog');
const PROFILE_README_PATH = '/tmp/jiangtao-profile/README.md';

async function syncToProfile(localReadmePath = PROFILE_README_PATH) {
  console.log('📖 Reading blog posts...');

  // Read all markdown files in posts directory
  const posts = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      let content = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
      // Fix: Add missing opening --- for posts that don't have it
      // gray-matter requires --- at the start and end of front-matter
      if (!content.startsWith('---')) {
        content = '---\n' + content;
      }
      // Parse front-matter to get post metadata
      const { data, content: markdownContent } = matter(content);
      // Add id from filename if not in front-matter (for Astro slug generation)
      if (!data.id) {
        data.id = f.replace('.md', '');
      }
      // Return post object with front-matter data
      return data;
    });

  // Extract latest 8 posts
  const latestPosts = extractLatestPosts(posts, 8);
  console.log(`✅ Found ${posts.length} posts, extracted latest ${latestPosts.length}`);

  // Clone profile repo temporarily
  console.log('📥 Cloning profile repo...');
  const profileDir = '/tmp/jiangtao-profile';

  try {
    execSync(`rm -rf ${profileDir}`, { stdio: 'ignore' });
    execSync(`git clone https://${process.env.GITHUB_TOKEN}@github.com/jiangtao/jiangtao.git ${profileDir}`, {
      stdio: 'ignore',
      env: { ...process.env, GITHUB_TOKEN: process.env.GITHUB_TOKEN }
    });

    // Generate updated README
    const profileReadmePath = path.join(profileDir, 'README.md');
    const updatedReadme = generateProfileReadme(latestPosts, profileReadmePath);

    // Write updated README
    fs.writeFileSync(profileReadmePath, updatedReadme);
    console.log('✅ Profile README updated');

    // Commit and push
    console.log('📤 Committing to profile repo...');
    execSync(`cd ${profileDir} && git config user.name "github-actions[bot]" && git config user.email "github-actions[bot]@users.noreply.github.com"`, {
      stdio: 'ignore'
    });

    // Check if there are changes to commit
    try {
      execSync(`cd ${profileDir} && git add README.md && git diff --cached --quiet`, {
        stdio: 'ignore'
      });
      // No changes detected
      console.log('ℹ️ No changes to commit (README already up to date)');
    } catch (diffError) {
      // Changes exist, commit and push
      execSync(`cd ${profileDir} && git commit -m "chore: sync latest blog posts from jiangtao/blog" && git push`, {
        stdio: 'ignore'
      });
      console.log('✅ Profile repo updated!');
    }
    return { success: true, postsCount: latestPosts.length };

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    // Cleanup
    execSync(`rm -rf ${profileDir}`, { stdio: 'ignore' });
  }
}

module.exports = { syncToProfile };

// Run sync when executed directly
if (require.main === module) {
  syncToProfile()
    .then(result => {
      if (result.success) {
        console.log(`🎉 Sync completed successfully! Updated ${result.postsCount} posts.`);
        process.exit(0);
      } else {
        console.error(`❌ Sync failed: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}
