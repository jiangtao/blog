import {
  PublishingError,
  type PreparedArticlePackage,
} from "./article-package";
import type { DraftReceipt } from "./contracts";
import { assertStableVisibleDraftUrl } from "./draft-url";
import type { StateStore } from "./orchestrator";

export type RecordVisibleDraftInput = {
  channel: "zhihu" | "juejin";
  status: "draft-created" | "draft-updated";
  remoteId?: string;
  draftUrl: string;
  verified: boolean;
};

export async function recordVisibleDraft(
  article: PreparedArticlePackage,
  input: RecordVisibleDraftInput,
  stateStore: StateStore
) {
  if (!input.verified) {
    throw new PublishingError(
      "RECEIPT_NOT_VERIFIED",
      "Only a visibly reopened and verified browser draft can be recorded"
    );
  }
  assertStableVisibleDraftUrl(input.channel, input.draftUrl);

  const loaded = await stateStore.load(article.sourcePath);
  const previous = loaded.state.channels[input.channel];
  const warnings = [...loaded.warnings];
  const remoteIdConflict =
    previous?.remoteId &&
    input.remoteId &&
    previous.remoteId !== input.remoteId;
  const draftUrlConflict =
    previous?.draftUrl && previous.draftUrl !== input.draftUrl;
  if (remoteIdConflict || draftUrlConflict) {
    throw new PublishingError(
      "DRAFT_RECEIPT_CONFLICT",
      `Existing ${input.channel} draft receipt (${previous?.remoteId ?? previous?.draftUrl}) differs from the newly verified receipt (${input.remoteId ?? input.draftUrl}); existing state was preserved`
    );
  }
  loaded.state.channels[input.channel] = {
    contentHash: article.contentHash,
    remoteId: input.remoteId,
    draftUrl: input.draftUrl,
    verified: true,
    updatedAt: new Date().toISOString(),
  };
  await stateStore.save(loaded.state);

  const receipt: DraftReceipt = {
    channel: input.channel,
    status: input.status,
    contentHash: article.contentHash,
    remoteId: input.remoteId,
    draftUrl: input.draftUrl,
    reviewRequired: true,
    verified: true,
    nextAction: "浏览器草稿回执已记录；请完成最终人工审核。",
    warnings,
  };
  return receipt;
}
