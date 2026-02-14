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
