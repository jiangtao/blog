# OG Image Workflow

This document describes how OG (Open Graph) images are generated for blog posts.

## Priority Order

1. **Explicit `ogImage`** - If set in frontmatter, use it directly
2. **Cover image** - If `cover` is set, generate PNG from cover.png endpoint
3. **Dynamic satori** - Fallback to satori-generated index.png

## Cover Image Processing

The `/posts/[slug]/cover.png` endpoint:
- Reads cover image from `data.cover`
- Converts SVG to PNG using @resvg/resvg-js
- Serves PNG/JPEG/WebP as-is
- Dimensions: 1200x675 (OG standard)

## Adding a Cover Image

In your blog post frontmatter:

```yaml
---
title: My Post
cover: /images/blog-covers/my-cover.svg
---
```

The cover image will automatically be used for social sharing.

## Supported Formats

- SVG (auto-converted to PNG)
- PNG (served as-is)
- JPEG (served as-is)
- WebP (served as-is)

## Troubleshooting

If OG image appears blurry:
1. Ensure you have a `cover` field in frontmatter
2. Check the cover file exists in `public/`
3. For SVG, ensure it has proper `width` and `height` or `viewBox`
4. Verify the cover.png endpoint returns 200 OK
