import { PublishingError } from "./article-package";

export type VisibleDraftChannel = "zhihu" | "juejin";

function isStableZhihuDraft(url: URL) {
  if (url.hostname !== "zhuanlan.zhihu.com") return false;
  if (url.pathname !== "/write" && url.pathname !== "/write/") return false;
  const stableKeys = new Set(["draft", "draftid", "id"]);
  return [...url.searchParams].some(
    ([key, value]) => stableKeys.has(key.toLowerCase()) && value.trim() !== ""
  );
}

function isStableJuejinDraft(url: URL) {
  if (url.hostname !== "juejin.cn") return false;
  const match = url.pathname.match(/^\/editor\/drafts\/([^/]+)\/?$/);
  return Boolean(match?.[1] && match[1].toLowerCase() !== "new");
}

export function isStableVisibleDraftUrl(
  channel: VisibleDraftChannel,
  draftUrl: string
) {
  let url: URL;
  try {
    url = new URL(draftUrl);
  } catch {
    return false;
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== ""
  ) {
    return false;
  }
  return channel === "zhihu"
    ? isStableZhihuDraft(url)
    : isStableJuejinDraft(url);
}

export function assertStableVisibleDraftUrl(
  channel: VisibleDraftChannel,
  draftUrl: string
) {
  if (!isStableVisibleDraftUrl(channel, draftUrl)) {
    throw new PublishingError(
      "INVALID_DRAFT_URL",
      `Draft URL does not identify a stable official ${channel} draft`
    );
  }
}
