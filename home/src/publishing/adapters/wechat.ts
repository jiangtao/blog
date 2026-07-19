import type { PreparedArticlePackage } from "../article-package";
import type { ChannelState, DraftReceipt, ReceiptError } from "../contracts";
import {
  runCommand,
  type CommandRequest,
  type CommandResult,
  type CommandRunner,
} from "../process-runner";

type JsonObject = Record<string, unknown>;
const SENSITIVE_FIELD =
  "[A-Za-z0-9_.-]*(?:secret|token|key|authorization|cookie)[A-Za-z0-9_.-]*";

type WechatAdapterDependencies = {
  runner?: CommandRunner;
  binary?: string;
};

function object(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object"
    ? (value as JsonObject)
    : undefined;
}

function string(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function boolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function parseJson(result: CommandResult) {
  try {
    return object(JSON.parse(result.stdout));
  } catch {
    return undefined;
  }
}

function sanitizeMessage(message: string) {
  return message
    .replace(
      new RegExp(
        `(["']?${SENSITIVE_FIELD}["']?\\s*[:=]\\s*)(["'])[^"'\\r\\n]*\\2`,
        "gi"
      ),
      "$1$2[REDACTED]$2"
    )
    .replace(
      new RegExp(
        `(\\b[A-Za-z0-9_.-]*cookie[A-Za-z0-9_.-]*\\b\\s*[:=]\\s*)[^}\\r\\n]+`,
        "gi"
      ),
      "$1[REDACTED]"
    )
    .replace(
      new RegExp(
        `(\\b${SENSITIVE_FIELD}\\b\\s*[:=]\\s*)(?:bearer\\s+)?[^\\s,;&}"']+`,
        "gi"
      ),
      "$1[REDACTED]"
    )
    .slice(0, 500);
}

function readinessFailureMessage(payload: JsonObject | undefined) {
  const data = object(payload?.data);
  const readiness = object(data?.readiness);
  const blockers = Array.isArray(readiness?.blockers)
    ? readiness.blockers
        .map(blocker => {
          if (typeof blocker === "string") return sanitizeMessage(blocker);
          const item = object(blocker);
          const code = string(item?.code);
          const message = string(item?.message);
          if (!code && !message) return undefined;
          return [code, message ? sanitizeMessage(message) : undefined]
            .filter(Boolean)
            .join(": ");
        })
        .filter(Boolean)
    : [];
  if (blockers.length > 0) {
    return `md2wechat 预检阻塞：${blockers.join("；")}`;
  }
  const upstreamMessage = string(payload?.message);
  return upstreamMessage
    ? sanitizeMessage(upstreamMessage)
    : "md2wechat 预检未达到微信公众号草稿就绪状态。";
}

function convertFailure(payload: JsonObject | undefined): ReceiptError {
  const upstreamCode = string(payload?.code);
  return {
    code:
      upstreamCode === "CONVERT_FAILED"
        ? "WECHAT_CONVERT_FAILED"
        : "WECHAT_DRAFT_CREATE_FAILED",
    message: sanitizeMessage(
      string(payload?.message) ?? "md2wechat 未能创建微信公众号草稿。"
    ),
    retryable: boolean(payload?.retryable) ?? true,
  };
}

function failure(
  article: PreparedArticlePackage,
  error: ReceiptError,
  warnings: string[] = []
): DraftReceipt {
  return {
    channel: "wechat",
    status: "failed",
    contentHash: article.contentHash,
    reviewRequired: true,
    verified: false,
    nextAction: "修复微信草稿准备问题后，仅重试 wechat 渠道。",
    warnings,
    error,
  };
}

function coverPath(article: PreparedArticlePackage) {
  if (!article.article.cover) return undefined;
  return article.assets.find(
    asset => asset.sourceReference === article.article.cover
  )?.preparedPath;
}

function metadataArgs(article: PreparedArticlePackage, cover: string) {
  return [
    "--draft",
    "--cover",
    cover,
    "--title",
    article.article.title,
    "--author",
    article.article.author,
    "--digest",
    article.article.description,
    "--json",
  ];
}

function inspectRequest(
  binary: string,
  article: PreparedArticlePackage,
  cover: string
): CommandRequest {
  return {
    command: binary,
    args: [
      "inspect",
      article.preparedMarkdownPath,
      ...metadataArgs(article, cover),
    ],
  };
}

function convertRequest(
  binary: string,
  article: PreparedArticlePackage,
  cover: string
): CommandRequest {
  return {
    command: binary,
    args: [
      "convert",
      article.preparedMarkdownPath,
      ...metadataArgs(article, cover),
    ],
  };
}

function inspectReadiness(payload: JsonObject | undefined) {
  const data = object(payload?.data);
  const readiness = object(data?.readiness);
  return boolean(readiness?.draft_ready) === true;
}

function draftReceiptData(payload: JsonObject | undefined) {
  const data = object(payload?.data);
  const draft = object(data?.draft);
  const remoteId =
    string(draft?.media_id) ??
    string(draft?.mediaId) ??
    string(data?.media_id) ??
    string(data?.draft_media_id);
  const draftUrl =
    string(draft?.draft_url) ?? string(draft?.url) ?? string(data?.draft_url);
  const updated = boolean(draft?.updated) ?? boolean(data?.updated) ?? false;
  return { remoteId, draftUrl, updated };
}

export function createWechatAdapter(
  dependencies: WechatAdapterDependencies = {}
) {
  const runner = dependencies.runner ?? runCommand;
  const binary = dependencies.binary ?? "md2wechat";

  async function inspect(article: PreparedArticlePackage) {
    const cover = coverPath(article);
    if (!cover) {
      return failure(article, {
        code: "WECHAT_COVER_REQUIRED",
        message: "微信公众号草稿需要可用的本地封面图。",
        retryable: true,
      });
    }

    const result = await runner(inspectRequest(binary, article, cover));
    const payload = parseJson(result);
    if (
      result.exitCode !== 0 ||
      payload?.success !== true ||
      !inspectReadiness(payload)
    ) {
      return failure(article, {
        code: "WECHAT_NOT_READY",
        message: readinessFailureMessage(payload),
        retryable: true,
      });
    }

    return {
      channel: "wechat",
      status: "ready",
      contentHash: article.contentHash,
      reviewRequired: true,
      verified: false,
      nextAction: "可创建微信公众号草稿；创建后仍需人工审核。",
      warnings: [],
    } satisfies DraftReceipt;
  }

  async function sync(
    article: PreparedArticlePackage,
    previous?: ChannelState
  ): Promise<DraftReceipt> {
    if (previous?.verified && previous.contentHash === article.contentHash) {
      return {
        channel: "wechat",
        status: "unchanged",
        contentHash: article.contentHash,
        remoteId: previous.remoteId,
        draftUrl: previous.draftUrl,
        reviewRequired: true,
        verified: true,
        nextAction: "内容未变化；继续审核已有微信公众号草稿。",
        warnings: [],
      };
    }

    if (previous?.remoteId) {
      return {
        channel: "wechat",
        status: "manual-required",
        contentHash: article.contentHash,
        remoteId: previous.remoteId,
        draftUrl: previous.draftUrl,
        reviewRequired: true,
        verified: false,
        nextAction:
          "md2wechat 2.4.0 未暴露安全的草稿更新命令；请在公众号后台更新已有草稿，避免创建重复草稿。",
        warnings: ["检测到已有草稿且正文已变化，已停止自动新建。"],
      };
    }

    const inspection = await inspect(article);
    if (inspection.status !== "ready") return inspection;

    const cover = coverPath(article)!;
    const result = await runner(convertRequest(binary, article, cover));
    const payload = parseJson(result);
    if (result.exitCode !== 0 || payload?.success !== true) {
      return failure(article, convertFailure(payload));
    }

    const draft = draftReceiptData(payload);
    if (!draft.remoteId) {
      return failure(article, {
        code: "WECHAT_DRAFT_RECEIPT_INVALID",
        message: "md2wechat 已返回成功，但缺少可验证的草稿标识。",
        retryable: true,
      });
    }

    return {
      channel: "wechat",
      status: draft.updated ? "draft-updated" : "draft-created",
      contentHash: article.contentHash,
      remoteId: draft.remoteId,
      draftUrl: draft.draftUrl,
      reviewRequired: true,
      verified: false,
      nextAction:
        "微信公众号草稿已写入；请在后台打开草稿核对正文、图片和出处。",
      warnings: ["当前 md2wechat 回执不提供独立远端查回证明，需要人工复核。"],
    };
  }

  return { channel: "wechat" as const, inspect, sync };
}
