import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runPublishingCli } from "../cli";
import type { ChannelAdapter, StateStore } from "../orchestrator";

describe("runPublishingCli", () => {
  it("returns a structured error when command-line parsing fails", async () => {
    const output: string[] = [];

    const exitCode = await runPublishingCli(
      ["inspect", "sample", "--unknown-option", "--json"],
      {
        stdout: value => output.push(value),
        stderr: value => output.push(value),
      }
    );

    expect(exitCode).toBe(2);
    expect(JSON.parse(output.join(""))).toMatchObject({
      success: false,
      action: null,
      status: "failed",
      error: {
        code: "INVALID_ARGUMENTS",
      },
    });
  });

  it("returns a machine-readable inspection result", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-cli-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog");
    const output: string[] = [];
    await mkdir(articleDir, { recursive: true });
    await writeFile(
      path.join(articleDir, "cli-sample.md"),
      `---
title: CLI 示例
pubDatetime: 2026-07-19T00:00:00.000Z
description: 验证机器可读预检。
---

正文。
`
    );
    const adapter: ChannelAdapter = {
      channel: "zhihu",
      inspect: async article => ({
        channel: "zhihu",
        status: "prepared",
        contentHash: article.contentHash,
        draftUrl: "https://zhuanlan.zhihu.com/write",
        reviewRequired: true,
        verified: false,
        nextAction: "可导入知乎官方编辑器。",
        warnings: [],
      }),
      sync: async () => {
        throw new Error("inspect must not sync");
      },
    };
    const stateStore: StateStore = {
      load: async sourcePath => ({
        state: { schemaVersion: 1, sourcePath, channels: {} },
        warnings: [],
      }),
      save: async () => undefined,
    };

    const exitCode = await runPublishingCli(
      [
        "inspect",
        "cli-sample",
        "--blog-root",
        blogRoot,
        "--output-dir",
        path.join(workspace, "output"),
        "--site-url",
        "https://blog.jerret.me/",
        "--channels",
        "zhihu",
        "--json",
      ],
      {
        stdout: value => output.push(value),
        stderr: value => output.push(value),
      },
      { adapters: [adapter], stateStore }
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join(""))).toMatchObject({
      success: true,
      action: "inspect",
      status: "ready",
      article: {
        title: "CLI 示例",
      },
      channelStatus: "completed",
      channels: [{ channel: "zhihu", status: "prepared" }],
    });
  });

  it("syncs a selected channel and includes immediate notifications in JSON output", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-cli-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog");
    const output: string[] = [];
    await mkdir(articleDir, { recursive: true });
    await writeFile(
      path.join(articleDir, "sync-sample.md"),
      `---
title: 同步示例
pubDatetime: 2026-07-19T00:00:00.000Z
description: 验证统一同步命令。
---

正文。
`
    );
    const adapter: ChannelAdapter = {
      channel: "juejin",
      sync: async article => ({
        channel: "juejin",
        status: "manual-required",
        contentHash: article.contentHash,
        draftUrl: "https://juejin.cn/editor/drafts/new?v=2",
        reviewRequired: true,
        verified: false,
        nextAction: "人工导入掘金。",
        warnings: [],
      }),
    };
    const stateStore: StateStore = {
      load: async sourcePath => ({
        state: { schemaVersion: 1, sourcePath, channels: {} },
        warnings: [],
      }),
      save: async () => undefined,
    };

    const exitCode = await runPublishingCli(
      [
        "sync",
        "sync-sample",
        "--channels",
        "juejin",
        "--blog-root",
        blogRoot,
        "--output-dir",
        path.join(workspace, "output"),
        "--json",
      ],
      {
        stdout: value => output.push(value),
        stderr: value => output.push(value),
      },
      { adapters: [adapter], stateStore }
    );

    const payload = JSON.parse(output.join(""));
    expect(exitCode).toBe(1);
    expect(payload).toMatchObject({
      success: true,
      action: "sync",
      status: "partial",
      receipts: [{ channel: "juejin", status: "manual-required" }],
      package: {
        preparedMarkdownPath: path.join(workspace, "output/article.md"),
        manifestPath: path.join(workspace, "output/manifest.json"),
      },
    });
    expect(payload.notifications).toEqual([
      expect.stringContaining("掘金：需要人工处理"),
      expect.stringContaining("同步部分完成"),
    ]);
  });

  it("records a visibly verified browser draft in local state", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "blog-publish-cli-"));
    const blogRoot = path.join(workspace, "home");
    const articleDir = path.join(blogRoot, "src/data/blog");
    const output: string[] = [];
    const savedStates: unknown[] = [];
    await mkdir(articleDir, { recursive: true });
    await writeFile(
      path.join(articleDir, "record-sample.md"),
      `---
title: 回执示例
pubDatetime: 2026-07-19T00:00:00.000Z
description: 验证浏览器草稿回执落盘。
---

正文。
`
    );
    const stateStore: StateStore = {
      load: async sourcePath => ({
        state: { schemaVersion: 1, sourcePath, channels: {} },
        warnings: [],
      }),
      save: async state => {
        savedStates.push(state);
      },
    };

    const exitCode = await runPublishingCli(
      [
        "record",
        "record-sample",
        "--channel",
        "juejin",
        "--receipt-status",
        "draft-created",
        "--remote-id",
        "draft-123",
        "--draft-url",
        "https://juejin.cn/editor/drafts/draft-123",
        "--verified",
        "--blog-root",
        blogRoot,
        "--output-dir",
        path.join(workspace, "output"),
        "--json",
      ],
      {
        stdout: value => output.push(value),
        stderr: value => output.push(value),
      },
      { stateStore }
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.join(""))).toMatchObject({
      success: true,
      action: "record",
      status: "recorded",
      receipt: {
        channel: "juejin",
        status: "draft-created",
        remoteId: "draft-123",
        verified: true,
      },
    });
    expect(savedStates).toHaveLength(1);
    expect(savedStates[0]).toMatchObject({
      channels: {
        juejin: {
          remoteId: "draft-123",
          draftUrl: "https://juejin.cn/editor/drafts/draft-123",
          verified: true,
        },
      },
    });
  });
});
