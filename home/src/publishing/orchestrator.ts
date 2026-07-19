import { chmod, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PreparedArticlePackage } from "./article-package";
import type {
  ChannelState,
  DraftReceipt,
  PublishingChannel,
} from "./contracts";

export type ChannelAdapter = {
  channel: PublishingChannel;
  inspect?: (
    article: PreparedArticlePackage,
    previous?: ChannelState
  ) => Promise<DraftReceipt>;
  sync: (
    article: PreparedArticlePackage,
    previous?: ChannelState
  ) => Promise<DraftReceipt>;
};

export type PublishingState = {
  schemaVersion: 1;
  sourcePath: string;
  channels: Partial<Record<PublishingChannel, ChannelState>>;
};

export type StateLoadResult = {
  state: PublishingState;
  warnings: string[];
};

export type StateStore = {
  load: (sourcePath: string) => Promise<StateLoadResult>;
  save: (state: PublishingState) => Promise<void>;
};

type RunChannelSyncOptions = {
  channels?: PublishingChannel[];
  adapters: ChannelAdapter[];
  stateStore: StateStore;
  notify?: (message: string) => void;
};

const DEFAULT_CHANNELS: PublishingChannel[] = ["wechat", "zhihu", "juejin"];

const CHANNEL_LABELS: Record<PublishingChannel, string> = {
  wechat: "微信",
  zhihu: "知乎",
  juejin: "掘金",
};

const STATUS_LABELS: Record<DraftReceipt["status"], string> = {
  ready: "已就绪",
  prepared: "已准备",
  "draft-created": "草稿已创建，待审核",
  "draft-updated": "草稿已更新，待审核",
  unchanged: "内容未变化，待审核",
  "manual-required": "需要人工处理",
  failed: "失败",
  skipped: "已跳过",
};

const PERSISTED_STATUSES = new Set<DraftReceipt["status"]>([
  "draft-created",
  "draft-updated",
  "unchanged",
]);
const INSPECTION_READY_STATUSES = new Set<DraftReceipt["status"]>([
  "ready",
  "prepared",
  "unchanged",
]);

function failedReceipt(
  channel: PublishingChannel,
  article: PreparedArticlePackage,
  code: string,
  message: string
): DraftReceipt {
  return {
    channel,
    status: "failed",
    contentHash: article.contentHash,
    reviewRequired: true,
    verified: false,
    nextAction: `修复问题后仅重试 ${channel} 渠道。`,
    warnings: [],
    error: { code, message, retryable: true },
  };
}

function runStatus(receipts: DraftReceipt[]) {
  const completed = receipts.filter(receipt =>
    PERSISTED_STATUSES.has(receipt.status)
  ).length;
  const failed = receipts.filter(receipt => receipt.status === "failed").length;
  if (completed === receipts.length) return "completed" as const;
  if (failed === receipts.length) return "failed" as const;
  return "partial" as const;
}

function inspectionStatus(receipts: DraftReceipt[]) {
  const ready = receipts.filter(receipt =>
    INSPECTION_READY_STATUSES.has(receipt.status)
  ).length;
  const failed = receipts.filter(receipt => receipt.status === "failed").length;
  if (ready === receipts.length) return "completed" as const;
  if (failed === receipts.length) return "failed" as const;
  return "partial" as const;
}

export async function runChannelInspection(
  article: PreparedArticlePackage,
  options: Pick<RunChannelSyncOptions, "channels" | "adapters" | "stateStore">
) {
  const channels = options.channels ?? DEFAULT_CHANNELS;
  const adapterMap = new Map(
    options.adapters.map(adapter => [adapter.channel, adapter])
  );
  const loaded = await options.stateStore.load(article.sourcePath);
  const receipts: DraftReceipt[] = [];

  for (const channel of channels) {
    const adapter = adapterMap.get(channel);
    if (!adapter?.inspect) {
      receipts.push(
        failedReceipt(
          channel,
          article,
          "CHANNEL_INSPECTOR_MISSING",
          `缺少 ${channel} 渠道预检器。`
        )
      );
      continue;
    }
    try {
      receipts.push(
        await adapter.inspect(article, loaded.state.channels[channel])
      );
    } catch {
      receipts.push(
        failedReceipt(
          channel,
          article,
          "CHANNEL_INSPECTION_FAILED",
          `${channel} 渠道预检发生未预期错误；详细输出已隐藏。`
        )
      );
    }
  }

  return {
    status: inspectionStatus(receipts),
    receipts,
    warnings: loaded.warnings,
  };
}

export async function runChannelSync(
  article: PreparedArticlePackage,
  options: RunChannelSyncOptions
) {
  const notify = options.notify ?? (() => undefined);
  const channels = options.channels ?? DEFAULT_CHANNELS;
  const adapterMap = new Map(
    options.adapters.map(adapter => [adapter.channel, adapter])
  );
  const loaded = await options.stateStore.load(article.sourcePath);
  const state: PublishingState = {
    schemaVersion: 1,
    sourcePath: article.sourcePath,
    channels: { ...loaded.state.channels },
  };
  const receipts: DraftReceipt[] = [];

  for (const warning of loaded.warnings) notify(`状态警告：${warning}`);

  for (const channel of channels) {
    const adapter = adapterMap.get(channel);
    let receipt: DraftReceipt;
    if (!adapter) {
      receipt = failedReceipt(
        channel,
        article,
        "CHANNEL_ADAPTER_MISSING",
        `缺少 ${channel} 渠道适配器。`
      );
    } else {
      try {
        receipt = await adapter.sync(article, state.channels[channel]);
      } catch {
        receipt = failedReceipt(
          channel,
          article,
          "CHANNEL_UNEXPECTED_FAILURE",
          `${channel} 渠道发生未预期错误；为避免泄漏敏感响应，详细输出未写入回执。`
        );
      }
    }

    receipts.push(receipt);
    if (PERSISTED_STATUSES.has(receipt.status)) {
      state.channels[channel] = {
        contentHash: receipt.contentHash,
        remoteId: receipt.remoteId,
        draftUrl: receipt.draftUrl,
        verified: receipt.verified,
        updatedAt: new Date().toISOString(),
      };
    }
    notify(
      `${CHANNEL_LABELS[channel]}：${STATUS_LABELS[receipt.status]}。${receipt.nextAction}`
    );
  }

  let persistenceWarning: string | undefined;
  let recoveryReceiptPath: string | undefined;
  try {
    await options.stateStore.save(state);
  } catch {
    persistenceWarning = "本地状态保存失败；远端草稿状态未知，禁止盲目重试。";
    const candidatePath = path.join(
      path.dirname(article.manifestPath),
      "sync-receipts.json"
    );
    try {
      await writeFile(
        candidatePath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            createdAt: new Date().toISOString(),
            article: {
              sourcePath: article.sourcePath,
              title: article.article.title,
              contentHash: article.contentHash,
            },
            receipts,
            warning: persistenceWarning,
          },
          null,
          2
        )}\n`,
        { mode: 0o600 }
      );
      await chmod(candidatePath, 0o600);
      recoveryReceiptPath = candidatePath;
      notify(`状态警告：${persistenceWarning} 恢复回执：${candidatePath}`);
    } catch {
      notify(`状态警告：${persistenceWarning} 请保留本次命令输出。`);
    }
  }

  const receiptStatus = runStatus(receipts);
  const status =
    persistenceWarning && receiptStatus === "completed"
      ? ("partial" as const)
      : receiptStatus;
  const summary = persistenceWarning
    ? "渠道写入已返回，但本地状态保存失败；请保留恢复回执并禁止盲目重试。"
    : status === "completed"
      ? "同步已完成，所有渠道均进入待审核状态。"
      : status === "failed"
        ? "同步失败，未生成可验证草稿。"
        : "同步部分完成，请处理失败或需人工操作的渠道。";
  notify(summary);

  return {
    status,
    article: {
      sourcePath: article.sourcePath,
      title: article.article.title,
      contentHash: article.contentHash,
    },
    receipts,
    warnings: persistenceWarning
      ? [...loaded.warnings, persistenceWarning]
      : loaded.warnings,
    recoveryReceiptPath,
    summary,
  };
}
