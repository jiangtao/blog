# Blog to Profile README Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically sync latest blog posts from jiangtao/blog to jiangtao/jiangtao profile README when blog master branch updates.

**Architecture:**
- GitHub Actions workflow in blog repository listens for master push
- Script extracts latest 5 blog posts metadata (title, date, URL) from Hexo front matter
- Updates profile README between BLOG-POST-LIST:START and END markers
- Cross-repository commit via GitHub CLI with PAT authentication

**Tech Stack:**
- GitHub Actions (trigger on push to master)
- gray-matter (parse Hexo front matter)
- GitHub CLI (gh) for cross-repo operations
- Node.js scripting

---

## Task 1: Create Blog Posts Extractor Script

**Files:**
- Create: `scripts/sync-posts-extractor.js`

**Step 1: Write the extraction test**

```javascript
// scripts/sync-posts-extractor.test.js
const { extractLatestPosts } = require('./sync-posts-extractor.js');

const mockPosts = [
  {
    slug: 'test-post',
    title: 'Test Post',
    date: '2026-01-27',
    layout: 'post'
  }
];

const result = extractLatestPosts(mockPosts, 5);
console.log('Extracted posts:', JSON.stringify(result, null, 2));
// Expected: Array of 5 objects with title, date, url
```

**Step 2: Run test to verify it fails**

Run: `node scripts/sync-posts-extractor.test.js`
Expected: Error: extractLatestPosts is not defined

**Step 3: Implement extraction logic**

```javascript
// scripts/sync-posts-extractor.js
const matter = require('gray-matter');

function extractLatestPosts(posts, limit = 5) {
  // Parse each post and extract metadata
  const parsedPosts = posts.map(post => {
    const file = matter(post);
    return {
      title: file.data.title,
      date: file.data.date,
      url: `https://imjiangtao.com/${file.data.slug}`
    };
  });

  // Sort by date (newest first) and limit
  return parsedPosts
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

module.exports = { extractLatestPosts };
```

**Step 4: Run test to verify it passes**

Run: `node scripts/sync-posts-extractor.test.js`
Expected: Output shows 1 post with correct structure

**Step 5: Commit**

```bash
git add scripts/sync-posts-extractor.js scripts/sync-posts-extractor.test.js
git commit -m "feat: add blog posts extractor script"
```

---

## Task 2: Create Profile README Generator Script

**Files:**
- Create: `scripts/sync-profile-readme.js`

**Step 1: Write the generator test**

```javascript
// scripts/sync-profile-readme.test.js
const { generateProfileReadme } = require('./sync-profile-readme.js');

const posts = [
  {
    title: 'Test Post',
    date: '2026-01-27',
    url: 'https://imjiangtao.com/test-post'
  }
];

const result = generateProfileReadme(posts, './test-profile-readme.md');
console.log('Generated README length:', result.length);
// Expected: README content with posts list between markers
```

**Step 2: Run test to verify it fails**

Run: `node scripts/sync-profile-readme.test.js`
Expected: Error: generateProfileReadme is not defined

**Step 3: Implement README generation**

```javascript
// scripts/sync-profile-readme.js
const fs = require('fs');

function generateProfileReadme(posts, outputPath) {
  // Read existing README
  const readme = fs.readFileSync(outputPath, 'utf-8');

  // Generate posts list markdown
  const postsList = posts.map(post =>
    `- [${post.title}](${post.url})`
  ).join('\n');

  // Replace content between markers
  const markerStart = '<!-- BLOG-POST-LIST:START -->';
  const markerEnd = '<!-- BLOG-POST-LIST:END -->';

  const regex = new RegExp(
    `${escapeRegExp(markerStart)}[\\s\\S]*${escapeRegExp(markerEnd)}`,
    'g'
  );

  const newContent = `${markerStart}\n${postsList}\n${markerEnd}`;

  const updatedReadme = readme.replace(regex, newContent);

  return updatedReadme;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { generateProfileReadme };
```

**Step 4: Run test to verify it passes**

Run: `node scripts/sync-profile-readme.test.js`
Expected: Generates README with posts list

**Step 5: Commit**

```bash
git add scripts/sync-profile-readme.js scripts/sync-profile-readme.test.js
git commit -m "feat: add profile README generator"
```

---

## Task 3: Create Main Sync Script

**Files:**
- Create: `scripts/sync-to-profile.js`

**Step 1: Write the sync test**

```javascript
// scripts/sync-to-profile.test.js
const { syncToProfile } = require('./sync-to-profile.js');

// Mock the file system and API calls
const result = syncToProfile('./test-profile-readme.md');
console.log('Sync result:', result);
// Expected: Returns success message
```

**Step 2: Run test to verify it fails**

Run: `node scripts/sync-to-profile.test.js`
Expected: Error: syncToProfile is not defined

**Step 3: Implement sync logic**

```javascript
// scripts/sync-to-profile.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { extractLatestPosts } = require('./sync-posts-extractor.js');
const { generateProfileReadme } = require('./sync-profile-readme.js');

const POSTS_DIR = path.join(__dirname, '../source/_posts');
const PROFILE_README_PATH = '/tmp/jiangtao-profile/README.md';

async function syncToProfile(localReadmePath = PROFILE_README_PATH) {
  console.log('📖 Reading blog posts...');

  // Read all markdown files in posts directory
  const fs = require('fs');
  const posts = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
      return { slug: f.replace('.md', ''), content };
    });

  // Extract latest 5 posts
  const latestPosts = extractLatestPosts(posts, 5);
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

    execSync(`cd ${profileDir} && git add README.md && git commit -m "chore: sync latest blog posts from jiangtao/blog" && git push`, {
      stdio: 'ignore'
    });

    console.log('✅ Profile repo updated!');
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
```

**Step 4: Run test to verify it passes**

Run: `node scripts/sync-to-profile.test.js`
Expected: Shows sync steps and returns success object

**Step 5: Commit**

```bash
git add scripts/sync-to-profile.js scripts/sync-to-profile.test.js
git commit -m "feat: add main sync script"
```

---

## Task 4: Add Dependency

**Files:**
- Modify: `package.json`

**Step 1: Add gray-matter dependency**

Add to `devDependencies`:
```json
{
  "devDependencies": {
    "gray-matter": "^4.0.3"
  }
}
```

**Step 2: Install dependency**

Run: `npm install`
Expected: gray-matter package installed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add gray-matter for front matter parsing"
```

---

## Task 5: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/sync-to-profile.yml`

**Step 1: Create workflow file**

```yaml
name: Sync Blog Posts to Profile

on:
  push:
    branches:
      - master

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout blog repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Sync to profile
        env:
          GITHUB_TOKEN: ${{ secrets.PROFILE_SYNC_TOKEN }}
        run: node scripts/sync-to-profile.js
```

**Step 2: Commit**

```bash
git add .github/workflows/sync-to-profile.yml
git commit -m "feat: add GitHub Actions workflow for profile sync"
```

---

## Task 6: Configure GitHub Secret

**Step 1: Generate GitHub Personal Access Token**

Instructions:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control)
4. Generate and copy the token
5. Add as repository secret: `PROFILE_SYNC_TOKEN`

**Step 2: Add secret to repository**

Using GitHub CLI:
```bash
# Create secret in jiangtao/blog repo
gh secret set PROFILE_SYNC_TOKEN --body "Token for syncing blog posts to profile README"
```

Then paste the token when prompted.

**Note:** This is a manual setup step, requires user interaction.

---

## Task 7: Update Package.json Scripts

**Files:**
- Modify: `package.json`

**Step 1: Add sync script**

Add to `scripts`:
```json
{
  "scripts": {
    "sync:profile": "node scripts/sync-to-profile.js"
  }
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add sync:profile npm script"
```

---

## Task 8: Create Documentation

**Files:**
- Create: `docs/SYNC-TO-PROFILE.md`

**Step 1: Create documentation**

```markdown
# Blog Posts to Profile README Sync

## Overview

Automatically syncs the latest 5 blog posts from the Hexo blog to the GitHub profile README when the `master` branch is updated.

## How It Works

1. **Trigger**: GitHub Actions workflow runs on push to `master`
2. **Extract**: Reads all blog posts from `source/_posts/`
3. **Parse**: Extracts title, date, and URL from front matter
4. **Generate**: Updates profile README with latest posts
5. **Commit**: Pushes changes to `jiangtao/jiangtao` repository

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure GitHub Token

Generate a Personal Access Token with `repo` scope:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Add to repository secrets as `PROFILE_SYNC_TOKEN`

### 3. Manual Sync

```bash
npm run sync:profile
```

## Output Format

Profile README will contain:
```markdown
<!-- BLOG-POST-LIST:START -->
- [Latest Post Title](https://imjiangtao.com/post-slug)
- [Another Post](https://imjiangtao.com/another-post)
<!-- BLOG-POST-LIST:END -->
```

## Troubleshooting

**Sync fails:** Check `PROFILE_SYNC_TOKEN` is set correctly

**No posts extracted:** Verify blog posts have valid front matter with `title`, `date`, and `slug`

**Permission denied:** Ensure token has `repo` scope
```

**Step 2: Commit**

```bash
git add docs/SYNC-TO-PROFILE.md
git commit -m "docs: add blog to profile sync documentation"
```

---

## Task 9: Test Workflow Locally

**Step 1: Test sync script manually**

```bash
# Set GITHUB_TOKEN environment variable (use your actual token)
export GITHUB_TOKEN="your_token_here"

# Run sync
npm run sync:profile
```

**Expected Output:**
```
📖 Reading blog posts...
✅ Found X posts, extracted latest 5
📥 Cloning profile repo...
✅ Profile README updated
📤 Committing to profile repo...
✅ Profile repo updated!
```

**Step 2: Verify profile README**

Check https://github.com/jiangtao/jiangtao to confirm the posts list is updated.

---

## Task 10: Final Integration Test

**Step 1: Create test commit to trigger workflow**

```bash
# Make a trivial change to trigger workflow
echo "test" >> test-sync.txt
git add test-sync.txt
git commit -m "test: trigger profile sync"
git push origin fix/vercel-deploy
```

**Step 2: Monitor GitHub Actions**

1. Go to https://github.com/jiangtao/blog/actions
2. Watch the "Sync Blog Posts to Profile" workflow
3. Verify it completes successfully

**Step 3: Verify profile repository**

Check https://github.com/jiangtao/jiangtao to see if the blog posts list is updated.

**Step 4: Cleanup**

```bash
git reset --hard HEAD~1
git push origin fix/vercel-deploy --force
```

---

## Summary

This implementation provides:
1. ✅ Automatic blog posts extraction from Hexo front matter
2. ✅ Profile README update with latest 5 posts
3. ✅ Cross-repository commit via GitHub Actions
4. ✅ Triggered automatically on master branch updates
5. ✅ Manual sync command available for testing
