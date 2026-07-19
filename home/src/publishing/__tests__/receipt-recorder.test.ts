import { describe, expect, it } from "vitest";
import type { PreparedArticlePackage } from "../article-package";
import type { StateStore } from "../orchestrator";
import { recordVisibleDraft } from "../receipt-recorder";

function articlePackage(): PreparedArticlePackage {
  return {
    sourcePath: "/blog/home/src/data/blog/sample.md",
    preparedMarkdownPath: "/tmp/run/article.md",
    article: {
      slug: "sample",
      title: "示例文章",
      author: "Jerret",
      description: "验证浏览器回执安全边界。",
      tags: [],
      language: "zh-CN",
      publishedAt: "2026-07-19T00:00:00.000Z",
      canonicalUrl: "https://blog.jerret.me/posts/2026/07/19/sample/",
    },
    assets: [],
    preparedMarkdown: "正文。\n",
    contentHash: "a".repeat(64),
    manifestPath: "/tmp/run/manifest.json",
  };
}

function stateStore(): StateStore {
  return {
    load: async sourcePath => ({
      state: { schemaVersion: 1, sourcePath, channels: {} },
      warnings: [],
    }),
    save: async () => undefined,
  };
}

describe("recordVisibleDraft", () => {
  it("rejects a receipt that was not visibly verified", async () => {
    await expect(
      recordVisibleDraft(
        articlePackage(),
        {
          channel: "zhihu",
          status: "draft-created",
          draftUrl: "https://zhuanlan.zhihu.com/write?draft=1",
          verified: false,
        },
        stateStore()
      )
    ).rejects.toMatchObject({ code: "RECEIPT_NOT_VERIFIED" });
  });

  it("rejects a non-official or non-draft URL", async () => {
    await expect(
      recordVisibleDraft(
        articlePackage(),
        {
          channel: "juejin",
          status: "draft-created",
          draftUrl: "https://example.com/editor/drafts/forged",
          verified: true,
        },
        stateStore()
      )
    ).rejects.toMatchObject({ code: "INVALID_DRAFT_URL" });
  });

  it.each([
    ["zhihu" as const, "https://zhuanlan.zhihu.com/p/123456"],
    ["zhihu" as const, "https://zhuanlan.zhihu.com/write"],
    ["juejin" as const, "https://juejin.cn/editor/drafts/new?v=2"],
  ])("rejects an unstable %s editor URL", async (channel, draftUrl) => {
    await expect(
      recordVisibleDraft(
        articlePackage(),
        {
          channel,
          status: "draft-created",
          draftUrl,
          verified: true,
        },
        stateStore()
      )
    ).rejects.toMatchObject({ code: "INVALID_DRAFT_URL" });
  });

  it("preserves existing state when a verified draft receipt conflicts", async () => {
    let saved = false;
    const store: StateStore = {
      load: async sourcePath => ({
        state: {
          schemaVersion: 1,
          sourcePath,
          channels: {
            juejin: {
              contentHash: "b".repeat(64),
              remoteId: "old-draft",
              draftUrl: "https://juejin.cn/editor/drafts/old-draft",
              verified: true,
              updatedAt: "2026-07-18T00:00:00.000Z",
            },
          },
        },
        warnings: [],
      }),
      save: async () => {
        saved = true;
      },
    };

    await expect(
      recordVisibleDraft(
        articlePackage(),
        {
          channel: "juejin",
          status: "draft-created",
          remoteId: "new-draft",
          draftUrl: "https://juejin.cn/editor/drafts/new-draft",
          verified: true,
        },
        store
      )
    ).rejects.toMatchObject({ code: "DRAFT_RECEIPT_CONFLICT" });
    expect(saved).toBe(false);
  });
});
