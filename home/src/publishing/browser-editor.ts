import type { PreparedArticlePackage } from "./article-package";
import type {
  ChannelState,
  DraftReceipt,
  DraftStatus,
  PublishingChannel,
} from "./contracts";
import { isStableVisibleDraftUrl } from "./draft-url";

export type BrowserEditorTask = {
  channel: "zhihu" | "juejin";
  editorUrl: string;
  operation: "create" | "update";
  importMode: "markdown-file" | "markdown-editor";
  markdownPath: string;
  title: string;
  summary: string;
  tags: string[];
  coverPath?: string;
  assets: Array<{
    sourceReference: string;
    preparedPath: string;
    mediaType: string;
  }>;
  canonicalUrl: string;
  contentHash: string;
  visibleChecks: string[];
  instructions: string[];
};

export type BrowserEditorResult = {
  status: Extract<DraftStatus, "draft-created" | "draft-updated">;
  remoteId?: string;
  draftUrl?: string;
  verified: boolean;
  warnings: string[];
};

export type BrowserDraftExecutor = (
  task: BrowserEditorTask
) => Promise<BrowserEditorResult>;

type VisibleEditorAdapterOptions = {
  channel: BrowserEditorTask["channel"];
  newEditorUrl: string;
  importMode: BrowserEditorTask["importMode"];
  visibleChecks: string[];
  instructions: string[];
  allowVisibleAutomation?: boolean;
  executor?: BrowserDraftExecutor;
};

function coverPath(article: PreparedArticlePackage) {
  if (!article.article.cover) return undefined;
  return article.assets.find(
    asset => asset.sourceReference === article.article.cover
  )?.preparedPath;
}

function unchangedReceipt(
  channel: PublishingChannel,
  article: PreparedArticlePackage,
  previous: ChannelState
): DraftReceipt {
  return {
    channel,
    status: "unchanged",
    contentHash: article.contentHash,
    remoteId: previous.remoteId,
    draftUrl: previous.draftUrl,
    reviewRequired: true,
    verified: true,
    nextAction: `内容未变化；继续审核已有${channel === "zhihu" ? "知乎" : "掘金"}草稿。`,
    warnings: [],
  };
}

export function createVisibleEditorAdapter(
  options: VisibleEditorAdapterOptions
) {
  function createTask(
    article: PreparedArticlePackage,
    previous?: ChannelState
  ): BrowserEditorTask {
    return {
      channel: options.channel,
      editorUrl: previous?.draftUrl ?? options.newEditorUrl,
      operation: previous?.remoteId || previous?.draftUrl ? "update" : "create",
      importMode: options.importMode,
      markdownPath: article.preparedMarkdownPath,
      title: article.article.title,
      summary: article.article.description,
      tags: article.article.tags,
      coverPath: coverPath(article),
      assets: article.assets.map(asset => ({
        sourceReference: asset.sourceReference,
        preparedPath: asset.preparedPath,
        mediaType: asset.mediaType,
      })),
      canonicalUrl: article.article.canonicalUrl,
      contentHash: article.contentHash,
      visibleChecks: [...options.visibleChecks],
      instructions: [...options.instructions],
    };
  }

  async function inspect(
    article: PreparedArticlePackage,
    previous?: ChannelState
  ): Promise<DraftReceipt> {
    if (previous?.verified && previous.contentHash === article.contentHash) {
      return unchangedReceipt(options.channel, article, previous);
    }
    const task = createTask(article, previous);
    return {
      channel: options.channel,
      status: "prepared",
      contentHash: article.contentHash,
      remoteId: previous?.remoteId,
      draftUrl: task.editorUrl,
      reviewRequired: true,
      verified: false,
      nextAction: `目标渠道文章包已就绪；同步时只通过可见官方编辑器导入 ${task.markdownPath}。`,
      warnings: [
        "渠道预检未读取 Cookie、密码、localStorage 或浏览器 profile。",
      ],
    };
  }

  async function sync(
    article: PreparedArticlePackage,
    previous?: ChannelState
  ): Promise<DraftReceipt> {
    if (previous?.verified && previous.contentHash === article.contentHash) {
      return unchangedReceipt(options.channel, article, previous);
    }

    const task = createTask(article, previous);
    if (!options.allowVisibleAutomation || !options.executor) {
      return {
        channel: options.channel,
        status: "manual-required",
        contentHash: article.contentHash,
        remoteId: previous?.remoteId,
        draftUrl: previous?.draftUrl ?? options.newEditorUrl,
        reviewRequired: true,
        verified: false,
        nextAction: `在可见浏览器打开编辑器，并按任务清单导入 ${task.markdownPath}；只保存草稿，不公开发布。`,
        warnings: [
          "可见编辑器自动化默认关闭；未读取 Cookie、密码、localStorage 或浏览器 profile。",
        ],
      };
    }

    try {
      const result = await options.executor(task);
      if (!result.verified) {
        return {
          channel: options.channel,
          status: "manual-required",
          contentHash: article.contentHash,
          remoteId: result.remoteId,
          draftUrl: result.draftUrl ?? task.editorUrl,
          reviewRequired: true,
          verified: false,
          nextAction:
            "草稿已尝试保存，但可见查回未通过；请人工重新打开并核对。",
          warnings: result.warnings,
        };
      }

      if (
        !result.draftUrl ||
        !isStableVisibleDraftUrl(options.channel, result.draftUrl)
      ) {
        return {
          channel: options.channel,
          status: "manual-required",
          contentHash: article.contentHash,
          remoteId: result.remoteId,
          draftUrl: result.draftUrl ?? task.editorUrl,
          reviewRequired: true,
          verified: false,
          nextAction:
            "草稿回执没有稳定的官方草稿 URL；请重新打开草稿并核对后再记录。",
          warnings: [
            ...result.warnings,
            "编辑器回执缺少稳定的官方草稿 URL，未记录为已验证。",
          ],
        };
      }

      return {
        channel: options.channel,
        status: result.status,
        contentHash: article.contentHash,
        remoteId: result.remoteId,
        draftUrl: result.draftUrl ?? task.editorUrl,
        reviewRequired: true,
        verified: true,
        nextAction: "草稿已保存并通过可见查回；请完成最终人工审核。",
        warnings: result.warnings,
      };
    } catch {
      return {
        channel: options.channel,
        status: "manual-required",
        contentHash: article.contentHash,
        remoteId: previous?.remoteId,
        draftUrl: previous?.draftUrl ?? options.newEditorUrl,
        reviewRequired: true,
        verified: false,
        nextAction: `保留导入包 ${task.markdownPath}，恢复浏览器后仅重试 ${options.channel}。`,
        warnings: ["可见编辑器任务未完成；未自动重试，以免产生重复草稿。"],
      };
    }
  }

  return { channel: options.channel, createTask, inspect, sync };
}
