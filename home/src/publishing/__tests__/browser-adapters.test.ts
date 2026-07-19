import { describe, expect, it } from "vitest";
import type { PreparedArticlePackage } from "../article-package";
import type { BrowserEditorTask } from "../browser-editor";
import { createJuejinAdapter } from "../adapters/juejin";
import { createZhihuAdapter } from "../adapters/zhihu";

function articlePackage(): PreparedArticlePackage {
  return {
    sourcePath: "/blog/home/src/data/blog/sample.md",
    preparedMarkdownPath: "/tmp/run/article.md",
    article: {
      slug: "sample",
      title: "示例文章",
      author: "Jerret",
      description: "用于验证可见编辑器同步。",
      tags: ["sync", "astro"],
      language: "zh-CN",
      publishedAt: "2026-07-19T00:00:00.000Z",
      canonicalUrl: "https://blog.jerret.me/posts/2026/07/19/sample/",
      cover: "/images/sample.svg",
    },
    assets: [
      {
        sourceReference: "/images/sample.svg",
        sourcePath: "/blog/home/public/images/sample.svg",
        preparedPath: "/tmp/run/assets/sample.png",
        sha256: "a".repeat(64),
        mediaType: "image/png",
      },
    ],
    preparedMarkdown: "正文。\n\n> 原文发布于博客。\n",
    contentHash: "b".repeat(64),
    manifestPath: "/tmp/run/manifest.json",
  };
}

describe("visible editor adapters", () => {
  it("returns a complete Zhihu manual handoff when browser automation is not enabled", async () => {
    const adapter = createZhihuAdapter();

    const task = adapter.createTask(articlePackage());
    const receipt = await adapter.sync(articlePackage());

    expect(task).toMatchObject({
      channel: "zhihu",
      editorUrl: "https://zhuanlan.zhihu.com/write",
      operation: "create",
      markdownPath: "/tmp/run/article.md",
      importMode: "markdown-file",
      title: "示例文章",
    });
    expect(task.visibleChecks).toEqual(
      expect.arrayContaining(["正文出处可见", "图片全部加载完成", "代码块可读"])
    );
    expect(receipt).toMatchObject({
      channel: "zhihu",
      status: "manual-required",
      reviewRequired: true,
      verified: false,
    });
    expect(JSON.stringify(task)).not.toMatch(
      /cookie|password|localstorage|authorization/i
    );
  });

  it("accepts a verified visible Zhihu editor receipt when explicitly enabled", async () => {
    const tasks: BrowserEditorTask[] = [];
    const adapter = createZhihuAdapter({
      allowVisibleAutomation: true,
      executor: async task => {
        tasks.push(task);
        return {
          status: "draft-created",
          remoteId: "zhihu-draft-1",
          draftUrl: "https://zhuanlan.zhihu.com/write?draft=1",
          verified: true,
          warnings: [],
        };
      },
    });

    const receipt = await adapter.sync(articlePackage());

    expect(tasks).toHaveLength(1);
    expect(receipt).toMatchObject({
      channel: "zhihu",
      status: "draft-created",
      remoteId: "zhihu-draft-1",
      verified: true,
      reviewRequired: true,
    });
  });

  it("updates a known Juejin draft and carries all supported metadata", async () => {
    const tasks: BrowserEditorTask[] = [];
    const adapter = createJuejinAdapter({
      allowVisibleAutomation: true,
      executor: async task => {
        tasks.push(task);
        return {
          status: "draft-updated",
          remoteId: "juejin-draft-1",
          draftUrl: "https://juejin.cn/editor/drafts/juejin-draft-1",
          verified: true,
          warnings: [],
        };
      },
    });

    const receipt = await adapter.sync(articlePackage(), {
      contentHash: "c".repeat(64),
      remoteId: "juejin-draft-1",
      draftUrl: "https://juejin.cn/editor/drafts/juejin-draft-1",
      verified: true,
      updatedAt: "2026-07-18T00:00:00.000Z",
    });

    expect(tasks[0]).toMatchObject({
      channel: "juejin",
      editorUrl: "https://juejin.cn/editor/drafts/juejin-draft-1",
      operation: "update",
      summary: "用于验证可见编辑器同步。",
      tags: ["sync", "astro"],
      coverPath: "/tmp/run/assets/sample.png",
      canonicalUrl: "https://blog.jerret.me/posts/2026/07/19/sample/",
    });
    expect(tasks[0].visibleChecks).toEqual(
      expect.arrayContaining(["分类已选择", "草稿重新打开后正文仍一致"])
    );
    expect(receipt).toMatchObject({
      channel: "juejin",
      status: "draft-updated",
      verified: true,
    });
  });

  it("turns a visible editor boundary failure into a manual handoff", async () => {
    const adapter = createJuejinAdapter({
      allowVisibleAutomation: true,
      executor: async () => {
        throw new Error("browser unavailable");
      },
    });

    const receipt = await adapter.sync(articlePackage());

    expect(receipt).toMatchObject({
      channel: "juejin",
      status: "manual-required",
      verified: false,
    });
    expect(receipt.warnings).toContain(
      "可见编辑器任务未完成；未自动重试，以免产生重复草稿。"
    );
  });

  it("downgrades an executor receipt without a stable draft URL", async () => {
    const adapter = createZhihuAdapter({
      allowVisibleAutomation: true,
      executor: async () => ({
        status: "draft-created",
        draftUrl: "https://zhuanlan.zhihu.com/p/123456",
        verified: true,
        warnings: [],
      }),
    });

    const receipt = await adapter.sync(articlePackage());

    expect(receipt).toMatchObject({
      channel: "zhihu",
      status: "manual-required",
      verified: false,
    });
    expect(receipt.warnings).toContain(
      "编辑器回执缺少稳定的官方草稿 URL，未记录为已验证。"
    );
  });
});
