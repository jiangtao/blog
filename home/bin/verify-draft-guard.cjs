#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const homeDir = path.resolve(__dirname, "..");
const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: homeDir,
  encoding: "utf8",
}).trim();
const fixturePath = "home/src/data/blog/__draft-guard-fixture__.md";
const fixture = `---
title: Draft guard fixture
pubDatetime: 2026-01-01T00:00:00Z
description: This fixture must never be committed.
draft: true
---

Draft guard fixture.
`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-draft-guard-"));
const indexPath = path.join(tempDir, "index");
const objectDirectory = path.join(tempDir, "objects");
const commonGitDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();
fs.mkdirSync(objectDirectory);
const env = {
  ...process.env,
  GIT_INDEX_FILE: indexPath,
  GIT_OBJECT_DIRECTORY: objectDirectory,
  GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(
    path.resolve(repoRoot, commonGitDir),
    "objects"
  ),
};

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    ...options,
  }).trim();
}

try {
  git(["read-tree", "HEAD"]);
  const blob = git(["hash-object", "-w", "--stdin"], { input: fixture });
  git(["update-index", "--add", "--cacheinfo", "100644", blob, fixturePath]);

  for (const mode of [[], ["--tracked"]]) {
    const result = spawnSync(
      process.execPath,
      [path.join(homeDir, "bin", "check-drafts-before-commit.cjs"), ...mode],
      { cwd: homeDir, env, encoding: "utf8" }
    );

    if (result.status !== 1 || !result.stderr.includes(fixturePath)) {
      console.error(
        `Draft guard 未能在 ${mode.length === 0 ? "staged" : "tracked"} 模式拒绝隔离索引中的 draft: true 文章。`
      );
      console.error(result.stderr || result.stdout);
      process.exit(1);
    }
  }

  console.log(
    "Draft guard 有效：staged / tracked 模式均拒绝隔离索引中的 draft: true 文章，真实工作区和对象库未改动。"
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
