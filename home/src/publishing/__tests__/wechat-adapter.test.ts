import { describe, expect, it } from "vitest";
import type { PreparedArticlePackage } from "../article-package";
import type { CommandRequest, CommandResult } from "../process-runner";
import { createWechatAdapter } from "../adapters/wechat";

function articlePackage(): PreparedArticlePackage {
  return {
    sourcePath: "/blog/home/src/data/blog/sample.md",
    preparedMarkdownPath: "/tmp/run/article.md",
    article: {
      slug: "sample",
      title: "示例文章",
      author: "Jerret",
      description: "用于验证微信草稿同步。",
      tags: ["sync"],
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

function jsonResult(value: unknown): CommandResult {
  return {
    exitCode: 0,
    stdout: JSON.stringify(value),
    stderr: "",
  };
}

describe("WeChat adapter", () => {
  it("inspects readiness before creating a draft and returns a standard receipt", async () => {
    const calls: CommandRequest[] = [];
    const responses = [
      jsonResult({
        success: true,
        code: "INSPECT_COMPLETED",
        data: {
          readiness: { draft_ready: true, blockers: [] },
          structure: { images: { total: 1 } },
        },
      }),
      jsonResult({
        success: true,
        code: "CONVERT_COMPLETED",
        data: {
          draft: {
            media_id: "draft-media-123",
            created: true,
            verified: true,
          },
        },
      }),
    ];
    const adapter = createWechatAdapter({
      runner: async request => {
        calls.push(request);
        return responses.shift()!;
      },
    });

    const receipt = await adapter.sync(articlePackage());

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      command: "md2wechat",
      args: expect.arrayContaining([
        "inspect",
        "/tmp/run/article.md",
        "--draft",
        "--cover",
        "/tmp/run/assets/sample.png",
        "--json",
      ]),
    });
    expect(calls[1].args).toEqual(
      expect.arrayContaining(["convert", "--draft", "--cover", "--json"])
    );
    expect(receipt).toMatchObject({
      channel: "wechat",
      status: "draft-created",
      contentHash: "b".repeat(64),
      remoteId: "draft-media-123",
      reviewRequired: true,
      verified: false,
    });
    expect(receipt.warnings).toContain(
      "当前 md2wechat 回执不提供独立远端查回证明，需要人工复核。"
    );
    expect(receipt.error).toBeUndefined();
    expect(JSON.stringify(receipt)).not.toMatch(
      /authorization|cookie|access_token|secret/i
    );
  });

  it("returns unchanged without invoking md2wechat when a verified draft has the same hash", async () => {
    const calls: CommandRequest[] = [];
    const adapter = createWechatAdapter({
      runner: async request => {
        calls.push(request);
        throw new Error("runner should not be called");
      },
    });

    const receipt = await adapter.sync(articlePackage(), {
      contentHash: "b".repeat(64),
      remoteId: "draft-media-123",
      verified: true,
      updatedAt: "2026-07-19T00:00:00.000Z",
    });

    expect(calls).toHaveLength(0);
    expect(receipt).toMatchObject({
      status: "unchanged",
      remoteId: "draft-media-123",
      verified: true,
    });
  });

  it("stops before conversion when md2wechat reports draft blockers", async () => {
    const calls: CommandRequest[] = [];
    const adapter = createWechatAdapter({
      runner: async request => {
        calls.push(request);
        return jsonResult({
          success: true,
          code: "INSPECT_COMPLETED",
          data: {
            readiness: {
              draft_ready: false,
              blockers: [{ code: "COVER_REQUIRED", message: "缺少封面" }],
            },
          },
        });
      },
    });

    const receipt = await adapter.sync(articlePackage());

    expect(calls).toHaveLength(1);
    expect(receipt).toMatchObject({
      channel: "wechat",
      status: "failed",
      reviewRequired: true,
      verified: false,
      error: {
        code: "WECHAT_NOT_READY",
        retryable: true,
      },
    });
  });

  it("does not create a duplicate when a known draft needs updating", async () => {
    const calls: CommandRequest[] = [];
    const adapter = createWechatAdapter({
      runner: async request => {
        calls.push(request);
        throw new Error("runner should not be called");
      },
    });

    const receipt = await adapter.sync(articlePackage(), {
      contentHash: "c".repeat(64),
      remoteId: "known-draft",
      verified: true,
      updatedAt: "2026-07-18T00:00:00.000Z",
    });

    expect(calls).toHaveLength(0);
    expect(receipt).toMatchObject({
      status: "manual-required",
      remoteId: "known-draft",
      reviewRequired: true,
      verified: false,
    });
    expect(receipt.warnings).toContain(
      "检测到已有草稿且正文已变化，已停止自动新建。"
    );
  });

  it("surfaces a sanitized md2wechat conversion error", async () => {
    const responses = [
      jsonResult({
        success: true,
        code: "INSPECT_COMPLETED",
        data: { readiness: { draft_ready: true, blockers: [] } },
      }),
      {
        exitCode: 1,
        stdout: JSON.stringify({
          success: false,
          code: "CONVERT_FAILED",
          message:
            'API returned 401; Authorization: Bearer bearer-secret; api_key="quoted-secret"; {"secret":"json-secret"}; access_token=query-secret; wechat_app_secret=app-secret; wechat_access_token=wx-token; token=plain-token',
        }),
        stderr: "",
      },
    ];
    const adapter = createWechatAdapter({
      runner: async () => responses.shift()!,
    });

    const receipt = await adapter.sync(articlePackage());

    expect(receipt).toMatchObject({
      status: "failed",
      error: {
        code: "WECHAT_CONVERT_FAILED",
        message: expect.stringContaining("API returned 401"),
        retryable: true,
      },
    });
    expect(JSON.stringify(receipt)).not.toMatch(
      /bearer-secret|quoted-secret|json-secret|query-secret|app-secret|wx-token|plain-token/
    );
    expect(receipt.error?.message).toContain("access_token=[REDACTED]");
  });

  it("surfaces sanitized md2wechat readiness blockers", async () => {
    const adapter = createWechatAdapter({
      runner: async () =>
        jsonResult({
          success: true,
          code: "INSPECT_COMPLETED",
          data: {
            readiness: {
              draft_ready: false,
              blockers: [
                {
                  code: "AUTH_INVALID",
                  message: "配置错误 wechat_app_secret=do-not-leak",
                },
              ],
            },
          },
        }),
    });

    const receipt = await adapter.inspect(articlePackage());

    expect(receipt).toMatchObject({
      status: "failed",
      error: {
        code: "WECHAT_NOT_READY",
        message: expect.stringContaining("AUTH_INVALID"),
      },
    });
    expect(JSON.stringify(receipt)).not.toContain("do-not-leak");
  });
});
