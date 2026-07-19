import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PreparedArticlePackage } from "../article-package";
import type {
  ChannelAdapter,
  PublishingState,
  StateStore,
} from "../orchestrator";
import { runChannelSync } from "../orchestrator";

function articlePackage(runDir = "/tmp/run"): PreparedArticlePackage {
  return {
    sourcePath: "/blog/home/src/data/blog/sample.md",
    preparedMarkdownPath: path.join(runDir, "article.md"),
    article: {
      slug: "sample",
      title: "示例文章",
      author: "Jerret",
      description: "用于验证统一编排。",
      tags: ["sync"],
      language: "zh-CN",
      publishedAt: "2026-07-19T00:00:00.000Z",
      canonicalUrl: "https://blog.jerret.me/posts/2026/07/19/sample/",
    },
    assets: [],
    preparedMarkdown: "正文。\n",
    contentHash: "b".repeat(64),
    manifestPath: path.join(runDir, "manifest.json"),
  };
}

describe("runChannelSync", () => {
  it("continues after one channel fails, persists receipts, and notifies after every channel", async () => {
    const calls: string[] = [];
    const notifications: string[] = [];
    const saved: PublishingState[] = [];
    const adapters: ChannelAdapter[] = [
      {
        channel: "wechat",
        sync: async article => {
          calls.push("wechat");
          return {
            channel: "wechat",
            status: "failed",
            contentHash: article.contentHash,
            reviewRequired: true,
            verified: false,
            nextAction: "重试微信。",
            warnings: [],
            error: {
              code: "WECHAT_DOWN",
              message: "微信不可用。",
              retryable: true,
            },
          };
        },
      },
      {
        channel: "zhihu",
        sync: async article => {
          calls.push("zhihu");
          return {
            channel: "zhihu",
            status: "draft-created",
            contentHash: article.contentHash,
            remoteId: "zhihu-1",
            draftUrl: "https://zhuanlan.zhihu.com/write?draft=1",
            reviewRequired: true,
            verified: true,
            nextAction: "审核知乎草稿。",
            warnings: [],
          };
        },
      },
      {
        channel: "juejin",
        sync: async article => {
          calls.push("juejin");
          return {
            channel: "juejin",
            status: "manual-required",
            contentHash: article.contentHash,
            draftUrl: "https://juejin.cn/editor/drafts/new?v=2",
            reviewRequired: true,
            verified: false,
            nextAction: "人工导入掘金。",
            warnings: [],
          };
        },
      },
    ];
    const stateStore: StateStore = {
      load: async () => ({
        state: {
          schemaVersion: 1,
          sourcePath: articlePackage().sourcePath,
          channels: {},
        },
        warnings: [],
      }),
      save: async state => {
        saved.push(state);
      },
    };

    const result = await runChannelSync(articlePackage(), {
      adapters,
      stateStore,
      notify: message => notifications.push(message),
    });

    expect(calls).toEqual(["wechat", "zhihu", "juejin"]);
    expect(result.status).toBe("partial");
    expect(result.receipts.map(receipt => receipt.status)).toEqual([
      "failed",
      "draft-created",
      "manual-required",
    ]);
    expect(saved).toHaveLength(1);
    expect(saved[0].channels.zhihu).toMatchObject({
      remoteId: "zhihu-1",
      contentHash: "b".repeat(64),
      verified: true,
    });
    expect(notifications).toHaveLength(4);
    expect(notifications[0]).toContain("微信：失败");
    expect(notifications[1]).toContain("知乎：草稿已创建，待审核");
    expect(notifications[2]).toContain("掘金：需要人工处理");
    expect(notifications[3]).toContain("同步部分完成");
  });

  it("passes existing state to a selected adapter and surfaces state recovery warnings", async () => {
    const notifications: string[] = [];
    const existing = {
      contentHash: "a".repeat(64),
      remoteId: "juejin-1",
      draftUrl: "https://juejin.cn/editor/drafts/juejin-1",
      verified: true,
      updatedAt: "2026-07-18T00:00:00.000Z",
    };
    const adapter: ChannelAdapter = {
      channel: "juejin",
      sync: async (article, previous) => {
        expect(previous).toEqual(existing);
        return {
          channel: "juejin",
          status: "draft-updated",
          contentHash: article.contentHash,
          remoteId: "juejin-1",
          draftUrl: existing.draftUrl,
          reviewRequired: true,
          verified: true,
          nextAction: "审核更新后的掘金草稿。",
          warnings: [],
        };
      },
    };
    const stateStore: StateStore = {
      load: async () => ({
        state: {
          schemaVersion: 1,
          sourcePath: articlePackage().sourcePath,
          channels: { juejin: existing },
        },
        warnings: ["状态文件损坏，已从空状态安全恢复。"],
      }),
      save: async () => undefined,
    };

    const result = await runChannelSync(articlePackage(), {
      channels: ["juejin"],
      adapters: [adapter],
      stateStore,
      notify: message => notifications.push(message),
    });

    expect(result.status).toBe("completed");
    expect(result.warnings).toContain("状态文件损坏，已从空状态安全恢复。");
    expect(notifications[0]).toContain("状态文件损坏");
    expect(result.receipts).toHaveLength(1);
  });

  it("preserves remote receipts when local state persistence fails", async () => {
    const runDir = await mkdtemp(path.join(tmpdir(), "blog-sync-recovery-"));
    const article = articlePackage(runDir);
    const adapter: ChannelAdapter = {
      channel: "wechat",
      sync: async () => ({
        channel: "wechat",
        status: "draft-created",
        contentHash: article.contentHash,
        remoteId: "wechat-draft-1",
        reviewRequired: true,
        verified: false,
        nextAction: "审核微信草稿。",
        warnings: [],
      }),
    };
    const notifications: string[] = [];
    const stateStore: StateStore = {
      load: async sourcePath => ({
        state: { schemaVersion: 1, sourcePath, channels: {} },
        warnings: [],
      }),
      save: async () => {
        throw new Error("disk full: sensitive internal detail");
      },
    };

    const result = await runChannelSync(article, {
      channels: ["wechat"],
      adapters: [adapter],
      stateStore,
      notify: message => notifications.push(message),
    });

    expect(result.status).toBe("partial");
    expect(result.receipts).toEqual([
      expect.objectContaining({
        channel: "wechat",
        status: "draft-created",
        remoteId: "wechat-draft-1",
      }),
    ]);
    expect(result.warnings).toContain(
      "本地状态保存失败；远端草稿状态未知，禁止盲目重试。"
    );
    expect(result.recoveryReceiptPath).toBe(
      path.join(runDir, "sync-receipts.json")
    );
    expect(
      JSON.parse(await readFile(result.recoveryReceiptPath!, "utf8"))
    ).toMatchObject({
      article: { contentHash: article.contentHash },
      receipts: [{ remoteId: "wechat-draft-1" }],
    });
    expect(JSON.stringify(result)).not.toContain("sensitive internal detail");
    expect(notifications.at(-1)).toContain("禁止盲目重试");
  });
});
