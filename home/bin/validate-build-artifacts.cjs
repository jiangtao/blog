#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const homeDir = path.resolve(__dirname, "..");
const distDir = path.join(homeDir, "dist");
const requiredFiles = [
  "rss.xml",
  "sitemap-index.xml",
  "llms.txt",
  "llms-full.txt",
  "pagefind/pagefind.js",
  "pagefind/pagefind-entry.json",
];
const textExtensions = new Set([".css", ".html", ".js", ".json", ".txt", ".xml"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

if (!fs.existsSync(distDir)) {
  console.error("缺少 dist；请先执行 npm run build。");
  process.exit(1);
}

const missing = requiredFiles.filter(file => !fs.existsSync(path.join(distDir, file)));
if (missing.length > 0) {
  console.error(`缺少构建产物：${missing.join(", ")}`);
  process.exit(1);
}

const files = walk(distDir);
const htmlCount = files.filter(file => file.endsWith(".html")).length;
if (htmlCount === 0) {
  console.error("构建产物中没有 HTML 页面。");
  process.exit(1);
}

const leakedFiles = files.filter(file => {
  const relative = path.relative(distDir, file).split(path.sep).join("/");
  if (relative.toLowerCase().includes("local-drafts")) return true;
  if (!textExtensions.has(path.extname(file))) return false;
  return fs.readFileSync(file, "utf8").toLowerCase().includes("local-drafts");
});

if (leakedFiles.length > 0) {
  console.error("检测到 local-drafts 泄漏：");
  leakedFiles.forEach(file => console.error(`  - ${path.relative(distDir, file)}`));
  process.exit(1);
}

console.log(`构建产物有效：${htmlCount} 个 HTML 页面，RSS/Sitemap/LLM/Pagefind 齐全，无 local-drafts 泄漏。`);
