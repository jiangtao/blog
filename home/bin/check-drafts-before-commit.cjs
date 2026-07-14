#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const path = require("node:path");
const matter = require("gray-matter");

const homeDir = path.resolve(__dirname, "..");

function git(args) {
  return execFileSync("git", args, {
    cwd: homeDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function readIndexFile(repoRoot, file) {
  return execFileSync("git", ["-C", repoRoot, "show", `:${file}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const repoRoot = git(["rev-parse", "--show-toplevel"]);
const trackedMode = process.argv.includes("--tracked");
const candidateFiles = git(
  trackedMode
    ? ["-C", repoRoot, "ls-files", "--cached"]
    : [
        "-C",
        repoRoot,
        "diff",
        "--cached",
        "--name-only",
        "--diff-filter=ACMR",
      ]
)
  .split(/\r?\n/)
  .filter(Boolean);

const draftPosts = candidateFiles.filter(file => {
  if (!/^home\/src\/data\/blog\/.+\.md$/.test(file)) {
    return false;
  }

  const content = readIndexFile(repoRoot, file);
  const { data } = matter(content);
  return data.draft === true;
});

if (draftPosts.length > 0) {
  const scope = trackedMode ? "Tracked" : "Staged";
  console.error(`\n${scope} draft posts are local-only and cannot be committed:`);
  draftPosts.forEach(file => console.error(`  - ${file}`));
  console.error(
    "\nChange `draft: true` to `draft: false` when the article is ready to publish, then stage it again.\n"
  );
  process.exit(1);
}

console.log(`No ${trackedMode ? "tracked" : "staged"} draft posts found.`);
