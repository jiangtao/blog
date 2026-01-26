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
