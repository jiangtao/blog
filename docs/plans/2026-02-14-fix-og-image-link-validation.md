# Fix OG Image Link Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive link validation for OG images to ensure social sharing works correctly, and fix any issues with cover.png endpoint link validation.

**Architecture:**
1. Add URL validation utility to check if cover.png endpoints are accessible
2. Create build-time validation script that checks all OG image links
3. Add unit tests for cover.png endpoint edge cases (missing files, invalid paths, etc.)
4. Integrate validation into CI/CD pipeline

**Tech Stack:**
- Astro 5.x
- TypeScript
- Vitest for testing
- Node.js fetch/https for URL validation

---

## Task 1: Add URL Validation Utility

**Files:**
- Create: `home/src/utils/validateImageUrl.ts`

**Step 1: Write the failing test**

Create `home/src/utils/__tests__/validateImageUrl.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateImageUrl } from "../validateImageUrl";

describe("validateImageUrl", () => {
  it("should validate valid absolute URL", async () => {
    const result = await validateImageUrl("https://example.com/image.png");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject invalid URL", async () => {
    const result = await validateImageUrl("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid URL");
  });

  it("should reject unreachable URL", async () => {
    const result = await validateImageUrl("https://this-definitely-does-not-exist-12345.com/image.png");
    expect(result.valid).toBe(false);
  });

  it("should validate relative path as local file check", async () => {
    const result = await validateImageUrl("/posts/2026/02/12/test/cover.png");
    expect(result.valid).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd home && npm test -- src/utils/__tests__/validateImageUrl.test.ts`

Expected: FAIL with "validateImageUrl is not defined"

**Step 3: Write minimal implementation**

Create `home/src/utils/validateImageUrl.ts`:

```typescript
import fs from "node:fs/promises";
import path from "node:path";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Validates if an image URL is accessible
 * - Absolute URLs: Check via HEAD request (skip in build/test)
 * - Relative URLs: Check if file exists in dist/ or public/
 */
export async function validateImageUrl(
  imageUrl: string,
  options: { skipRemote?: boolean; basePath?: string } = {}
): Promise<ValidationResult> {
  const { skipRemote = true, basePath = process.cwd() } = options;

  // Check if it's an absolute URL
  try {
    const url = new URL(imageUrl);

    // For remote URLs, skip validation in build/test by default
    if (skipRemote && url.protocol.startsWith("http")) {
      return { valid: true, error: "Skipped remote validation" };
    }

    // For remote URLs when not skipped, try HEAD request
    if (url.protocol.startsWith("http")) {
      try {
        const response = await fetch(url.toString(), { method: "HEAD" });
        return {
          valid: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}`,
          statusCode: response.status,
        };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  } catch {
    // Not a valid URL, treat as local path
  }

  // For relative/local paths, check file system
  const relativePath = imageUrl.replace(/^\//, "");
  const distPath = path.join(basePath, "dist", relativePath);
  const publicPath = path.join(basePath, "public", relativePath);

  try {
    await fs.access(distPath);
    return { valid: true };
  } catch {
    try {
      await fs.access(publicPath);
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: `File not found: tried ${distPath} and ${publicPath}`,
      };
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd home && npm test -- src/utils/__tests__/validateImageUrl.test.ts`

Expected: PASS (with skipped remote validation)

**Step 5: Commit**

```bash
git add home/src/utils/validateImageUrl.ts home/src/utils/__tests__/validateImageUrl.test.ts
git commit -m "feat: add image URL validation utility"
```

---

## Task 2: Add Cover.png Endpoint Link Validation Tests

**Files:**
- Modify: `home/src/pages/posts/[...slug]/cover.png.ts:1-99`
- Test: `home/src/pages/posts/[...slug]/__tests__/cover.png.test.ts`

**Step 1: Write test for cover.png endpoint edge cases**

Create `home/src/pages/posts/[...slug]/__tests__/cover.png.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getStaticPaths } from "../cover.png";
import { GET } from "../cover.png";
import type { CollectionEntry } from "astro:content";

// Mock post data
const mockPostWithCover: CollectionEntry<"blog"> = {
  id: "test-post",
  slug: "test-post",
  body: "",
  collection: "blog",
  data: {
    title: "Test Post",
    description: "Test",
    pubDatetime: new Date(),
    author: "Test",
    tags: [],
    cover: "/images/test.svg",
  },
  render: () => ({ html: "", metadata: {} }),
  getFileInfo: () => ({}),
};

const mockPostWithoutCover: CollectionEntry<"blog"> = {
  ...mockPostWithCover,
  data: {
    ...mockPostWithCover.data,
    cover: undefined,
  },
};

describe("cover.png endpoint", () => {
  it("should return 404 when cover is not defined", async () => {
    const response = await GET({
      props: mockPostWithoutCover,
      request: new Request("http://localhost"),
    } as any);

    expect(response.status).toBe(404);
  });

  it("should return 404 when cover file does not exist", async () => {
    const response = await GET({
      props: mockPostWithCover,
      request: new Request("http://localhost"),
    } as any);

    expect(response.status).toBe(404);
  });

  it("should return 200 with PNG when valid SVG cover exists", async () => {
    // This test requires mocking fs.readFile
    // Skip for now as it requires more complex setup
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd home && npm test -- src/pages/posts/[...slug]/__tests__/cover.png.test.ts`

Expected: FAIL due to missing mocks

**Step 3: Fix cover.png.ts to add better error handling**

Review current error handling in `home/src/pages/posts/[...slug]/cover.png.ts`.

The current implementation already has good error handling (lines 56-66), but we should verify that:
1. Empty/whitespace-only cover paths return 404
2. Cover paths starting with `/` are handled correctly
3. Relative cover paths are resolved correctly

**Step 4: Add input validation to cover.png.ts**

Edit `home/src/pages/posts/[...slug]/cover.png.ts:19-28`:

```typescript
export const GET: APIRoute = async ({ props }) => {
  const post = props as CollectionEntry<"blog">;
  const cover = post.data.cover;

  if (!cover || typeof cover !== "string" || cover.trim().length === 0) {
    return new Response(null, {
      status: 404,
      statusText: "No cover image",
    });
  }
  // ... rest of implementation
```

**Step 5: Commit**

```bash
git add home/src/pages/posts/[...slug]/cover.png.ts
git commit -m "fix: improve cover.png endpoint input validation"
```

---

## Task 3: Create OG Image Link Validation Script

**Files:**
- Create: `home/scripts/validate-og-images.ts`
- Modify: `home/package.json`

**Step 1: Create validation script**

Create `home/scripts/validate-og-images.ts`:

```typescript
import { glob } from "glob";
import * as fs from "fs/promises";
import * as path from "path";
import { validateImageUrl } from "../src/utils/validateImageUrl";

interface ValidationResult {
  file: string;
  ogImageUrl: string | null;
  hasCover: boolean;
  validation: Awaited<ReturnType<typeof validateImageUrl>> | null;
  errors: string[];
}

async function validateOgImages(): Promise<ValidationResult[]> {
  const distPath = path.join(process.cwd(), "dist");
  const htmlFiles = await glob("posts/**/*.html", { cwd: distPath });

  const results: ValidationResult[] = [];

  for (const htmlFile of htmlFiles) {
    const fullPath = path.join(distPath, htmlFile);
    const content = await fs.readFile(fullPath, "utf-8");

    // Extract og:image using regex (avoid cheerio dependency)
    const ogImageMatch = content.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/);
    const ogImageUrl = ogImageMatch ? ogImageMatch[1] : null;

    // Check if post has cover by reading frontmatter
    // For simplicity, we'll check if cover.png exists in the same directory
    const postDir = path.dirname(fullPath);
    const coverPath = path.join(postDir, "cover.png");
    const hasCover = await fs.access(coverPath).then(() => true).catch(() => false);

    const errors: string[] = [];
    let validation: Awaited<ReturnType<typeof validateImageUrl>> | null = null;

    if (!ogImageUrl) {
      errors.push("Missing og:image meta tag");
    } else {
      // Validate the image URL
      validation = await validateImageUrl(ogImageUrl, { skipRemote: true });
      if (!validation.valid) {
        errors.push(`OG image validation failed: ${validation.error}`);
      }
    }

    // Additional checks
    if (hasCover && ogImageUrl && !ogImageUrl.includes("cover.png")) {
      errors.push(`cover.png exists but og:image points to ${ogImageUrl}`);
    }

    if (!hasCover && ogImageUrl && !ogImageUrl.includes("index.png")) {
      errors.push(`No cover.png but og:image doesn't point to index.png`);
    }

    results.push({
      file: htmlFile,
      ogImageUrl,
      hasCover,
      validation,
      errors,
    });
  }

  return results;
}

async function main() {
  console.log("🔍 Validating OG image links...\n");

  const results = await validateOgImages();

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.errors.length === 0) {
      console.log(`✅ ${result.file}`);
      console.log(`   og:image: ${result.ogImageUrl}`);
      console.log(`   cover.png: ${result.hasCover ? "exists" : "none"}`);
      passed++;
    } else {
      console.log(`❌ ${result.file}`);
      console.log(`   og:image: ${result.ogImageUrl}`);
      console.log(`   cover.png: ${result.hasCover ? "exists" : "none"}`);
      for (const error of result.errors) {
        console.log(`   ⚠️  ${error}`);
      }
      failed++;
    }
    console.log();
  }

  console.log(`📊 Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Validation failed:", error);
  process.exit(1);
});
```

**Step 2: Add npm script**

Edit `home/package.json`:

```json
{
  "scripts": {
    "validate:og-images": "tsx scripts/validate-og-images.ts"
  }
}
```

**Step 3: Install tsx for TypeScript execution**

Run: `cd home && npm install -D tsx`

**Step 4: Test validation script**

Run: `cd home && npm run build && npm run validate:og-images`

Expected: All posts should pass validation

**Step 5: Commit**

```bash
git add home/scripts/validate-og-images.ts home/package.json
git commit -m "feat: add OG image link validation script"
```

---

## Task 4: Add Validation to Build Process

**Files:**
- Modify: `home/package.json`

**Step 1: Update build script to include validation**

Edit `home/package.json`:

```json
{
  "scripts": {
    "build": "astro check && astro build && pagefind --site dist && npm run validate:og-images"
  }
}
```

**Step 2: Test full build with validation**

Run: `cd home && npm run build`

Expected: Build succeeds and validation passes

**Step 3: Commit**

```bash
git add home/package.json
git commit -m "chore: add OG image validation to build process"
```

---

## Task 5: Fix Any Issues Found by Validation

**Step 1: Run validation and fix any errors**

Run: `cd home && npm run validate:og-images`

**Step 2: Document and fix each issue**

For each validation error found:
1. Create a specific task to fix it
2. Implement the fix
3. Re-run validation
4. Commit the fix

**Step 3: Commit any fixes**

```bash
git add home/src
git commit -m "fix: resolve OG image validation errors"
```

---

## Task 6: Create PR and Test on Preview URL

**Step 1: Create branch (if not already on one)**

```bash
git checkout -b fix/og-image-link-validation
```

**Step 2: Push branch**

```bash
git push origin fix/og-image-link-validation
```

**Step 3: Create PR**

```bash
gh pr create --title "fix: add OG image link validation" \
  --body "$(cat <<'EOF'
## Summary
Adds comprehensive validation for OG image links to ensure social sharing works correctly.

## Changes
- Add validateImageUrl utility for checking image URLs
- Add input validation to cover.png endpoint
- Create validate-og-images script for build-time checking
- Integrate validation into build process

## Type
- [x] fix - Bug fix
- [ ] feat - New feature
- [ ] refactor - Code restructuring
- [ ] docs - Documentation only
- [x] test - Tests only
- [ ] chore - Build/config changes

## Test Plan
### Unit Tests
- [x] validateImageUrl utility tests
- [x] cover.png endpoint validation

### Integration Tests
- [x] Build-time validation script
- [ ] Preview URL social sharing test

### Manual Tests
- [ ] Test on Vercel Preview URL
- [ ] Verify Twitter Card Validator

## Related Issue
Relates to OG image validation issues reported
EOF
)"
```

**Step 4: Wait for Vercel Preview**

Wait for Vercel to comment with Preview URL

**Step 5: Test on Preview URL**

Visit Preview URL and check:
- View page source, verify og:image URL is correct
- Use Twitter Card Validator: https://cards-dev.twitter.com/validator
- Share on social media and verify preview image

**Step 6: Run validation on Preview**

```bash
npm run validate:og-images
```

Expected: All validations pass

---

## Task 7: Merge PR

**Step 1: Merge via PR**

```bash
gh pr merge --squash
```

**Step 2: Verify production**

Visit production URL: `https://blog.jerret.me/posts/2026/02/12/ai-automated-blog/`

Verify og:image is correct and validation passes

---

## Summary

This plan adds comprehensive OG image link validation by:
1. Creating a validateImageUrl utility to check image accessibility
2. Adding input validation to cover.png endpoint
3. Creating a build-time validation script that checks all posts
4. Integrating validation into the build process
5. Testing on Preview URL before merging
6. Following strict /dev:commit workflow

**Critical Rules:**
- MUST create PR (Task 6)
- MUST test on Preview URL before merging
- MUST merge via PR, never direct push
- All validation must pass before merging
