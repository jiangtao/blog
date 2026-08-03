import { access, readFile } from "node:fs/promises";
import path from "node:path";

const DIST_DIRECTORY = path.resolve(process.cwd(), "dist");
const SAMPLE_SLUG = "2025/02/27/future-rd-evolution";
const LOCALIZED_VISUAL_SLUG = "2026/06/02/ai-native-delivery";

async function readBuiltPage(relativePath: string) {
  const absolutePath = path.join(DIST_DIRECTORY, relativePath);
  await access(absolutePath);
  return readFile(absolutePath, "utf8");
}

function assertIncludes(content: string, expected: string, page: string) {
  if (!content.includes(expected)) {
    throw new Error(`${page} is missing expected content: ${expected}`);
  }
}

function assertSitemapAlternates(content: string) {
  const englishArticleURL = `https://blog.jerret.me/en/posts/${SAMPLE_SLUG}/`;
  const entryStart = content.indexOf(`<url><loc>${englishArticleURL}</loc>`);
  const entryEnd = content.indexOf("</url>", entryStart);
  const articleEntry = content.slice(entryStart, entryEnd);

  if (entryStart === -1 || entryEnd === -1) {
    throw new Error("sitemap-0.xml is missing the English sample article entry");
  }

  assertIncludes(
    articleEntry,
    `hreflang="zh-CN" href="https://blog.jerret.me/posts/${SAMPLE_SLUG}/"`,
    "English sitemap article entry"
  );
  assertIncludes(
    articleEntry,
    `hreflang="en" href="${englishArticleURL}"`,
    "English sitemap article entry"
  );
  assertIncludes(
    articleEntry,
    `hreflang="zh-TW" href="https://blog.jerret.me/zh-TW/posts/${SAMPLE_SLUG}/"`,
    "English sitemap article entry"
  );
}

async function main() {
  const [
    englishHome,
    traditionalHome,
    englishArticle,
    traditionalArticle,
    englishVisualArticle,
    traditionalVisualArticle,
    robots,
    llmsIndex,
    llmsFull,
    sitemapIndex,
    sitemap,
  ] = await Promise.all([
      readBuiltPage("en/index.html"),
      readBuiltPage("zh-TW/index.html"),
      readBuiltPage(`en/posts/${SAMPLE_SLUG}/index.html`),
      readBuiltPage(`zh-TW/posts/${SAMPLE_SLUG}/index.html`),
      readBuiltPage(`en/posts/${LOCALIZED_VISUAL_SLUG}/index.html`),
      readBuiltPage(`zh-TW/posts/${LOCALIZED_VISUAL_SLUG}/index.html`),
      readBuiltPage("robots.txt"),
      readBuiltPage("llms.txt"),
      readBuiltPage("llms-full.txt"),
      readBuiltPage("sitemap-index.xml"),
      readBuiltPage("sitemap-0.xml"),
    ]);

  await Promise.all([
    access(path.join(DIST_DIRECTORY, "en/rss.xml")),
    access(path.join(DIST_DIRECTORY, "zh-TW/rss.xml")),
  ]);

  assertIncludes(englishHome, 'lang="en"', "English home");
  assertIncludes(englishHome, 'href="/en/posts"', "English home");
  assertIncludes(traditionalHome, 'lang="zh-TW"', "Traditional Chinese home");
  assertIncludes(traditionalHome, 'href="/zh-TW/posts"', "Traditional Chinese home");
  assertIncludes(englishArticle, 'hreflang="zh-TW"', "English article");
  assertIncludes(englishArticle, `href="/zh-TW/posts/${SAMPLE_SLUG}"`, "English article");
  assertIncludes(traditionalArticle, 'hreflang="en"', "Traditional Chinese article");
  assertIncludes(traditionalArticle, `href="/en/posts/${SAMPLE_SLUG}"`, "Traditional Chinese article");
  assertIncludes(
    englishVisualArticle,
    "/images/i18n/en/blog-covers/ai-native-delivery-cover.svg",
    "English localized visual article"
  );
  assertIncludes(
    englishVisualArticle,
    "/images/i18n/en/misc/ai-native-delivery-flow.svg",
    "English localized visual article"
  );
  assertIncludes(
    traditionalVisualArticle,
    "/images/i18n/zh-TW/blog-covers/ai-native-delivery-cover.svg",
    "Traditional Chinese localized visual article"
  );
  assertIncludes(
    traditionalVisualArticle,
    "/images/i18n/zh-TW/misc/ai-native-delivery-flow.svg",
    "Traditional Chinese localized visual article"
  );
  assertIncludes(robots, "User-agent: Googlebot", "robots.txt");
  assertIncludes(robots, "User-agent: Baiduspider", "robots.txt");
  assertIncludes(robots, "Allow: /posts/", "robots.txt");
  assertIncludes(robots, "Allow: /en/posts/", "robots.txt");
  assertIncludes(robots, "Allow: /zh-TW/posts/", "robots.txt");
  assertIncludes(robots, "Allow: /llms.txt", "robots.txt");
  assertIncludes(robots, "Allow: /llms-full.txt", "robots.txt");
  assertIncludes(robots, "Disallow: /", "robots.txt");
  assertIncludes(
    robots,
    "Sitemap: https://blog.jerret.me/sitemap-index.xml",
    "robots.txt"
  );
  assertIncludes(llmsIndex, "/llms-full.txt", "llms.txt");
  assertIncludes(llmsFull, "技术博客文章集合", "llms-full.txt");
  assertIncludes(sitemapIndex, "sitemap-0.xml", "sitemap-index.xml");
  assertIncludes(
    sitemap,
    `https://blog.jerret.me/posts/${SAMPLE_SLUG}/`,
    "sitemap-0.xml"
  );
  assertIncludes(
    sitemap,
    `https://blog.jerret.me/en/posts/${SAMPLE_SLUG}/`,
    "sitemap-0.xml"
  );
  assertIncludes(
    sitemap,
    `https://blog.jerret.me/zh-TW/posts/${SAMPLE_SLUG}/`,
    "sitemap-0.xml"
  );
  assertIncludes(sitemap, 'hreflang="zh-CN"', "sitemap-0.xml");
  assertIncludes(sitemap, 'hreflang="en"', "sitemap-0.xml");
  assertIncludes(sitemap, 'hreflang="zh-TW"', "sitemap-0.xml");
  assertSitemapAlternates(sitemap);

  console.log("Static i18n build verification passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
