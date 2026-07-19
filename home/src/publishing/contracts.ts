export type PublishingChannel = "wechat" | "zhihu" | "juejin";

export type DraftStatus =
  | "ready"
  | "prepared"
  | "draft-created"
  | "draft-updated"
  | "unchanged"
  | "manual-required"
  | "failed"
  | "skipped";

export type ReceiptError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type DraftReceipt = {
  channel: PublishingChannel;
  status: DraftStatus;
  contentHash: string;
  remoteId?: string;
  draftUrl?: string;
  reviewRequired: boolean;
  verified: boolean;
  nextAction: string;
  warnings: string[];
  error?: ReceiptError;
};

export type ChannelState = {
  contentHash: string;
  remoteId?: string;
  draftUrl?: string;
  verified: boolean;
  updatedAt: string;
};
