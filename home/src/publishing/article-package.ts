import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import matter from "gray-matter";
import sharp from "sharp";

export type Attribution = "blog" | "wechat";

export class PublishingError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "PublishingError";
    this.code = code;
    this.retryable = retryable;
  }
}

export type PrepareArticleOptions = {
  blogRoot: string;
  outputDir: string;
  siteUrl: string;
  siteLanguage: string;
  attribution: Attribution;
};

export type PreparedAsset = {
  sourceReference: string;
  sourcePath: string;
  preparedPath: string;
  sha256: string;
  mediaType: string;
};

export type PreparedArticlePackage = {
  sourcePath: string;
  preparedMarkdownPath: string;
  article: {
    slug: string;
    title: string;
    author: string;
    description: string;
    tags: string[];
    language: string;
    publishedAt: string;
    canonicalUrl: string;
    cover?: string;
  };
  assets: PreparedAsset[];
  preparedMarkdown: string;
  contentHash: string;
  manifestPath: string;
};

const MARKDOWN_IMAGE_PATTERN =
  /(!\[[^\]]*\]\()([^)\s]+)((?:\s+["'][^"']*["'])?\))/g;
const HTML_IMAGE_PATTERN =
  /(<img\b[^>]*\bsrc\s*=\s*)(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))([^>]*>)/gi;

type TextRange = { start: number; end: number };
type ImageOccurrence = TextRange & { reference: string };

function fencedCodeRanges(content: string): TextRange[] {
  const ranges: TextRange[] = [];
  const lines = content.matchAll(/.*(?:\n|$)/g);
  let open: { marker: "`" | "~"; length: number; start: number } | undefined;

  for (const match of lines) {
    const line = match[0].replace(/\n$/, "");
    const fence = line.match(/^[ \t]{0,3}(`{3,}|~{3,})(.*)$/);
    if (!fence) continue;
    const marker = fence[1][0] as "`" | "~";
    if (!open) {
      open = { marker, length: fence[1].length, start: match.index };
      continue;
    }
    if (
      marker === open.marker &&
      fence[1].length >= open.length &&
      fence[2].trim() === ""
    ) {
      ranges.push({ start: open.start, end: match.index + match[0].length });
      open = undefined;
    }
  }

  if (open) ranges.push({ start: open.start, end: content.length });
  return ranges;
}

function isInRanges(offset: number, ranges: TextRange[]) {
  return ranges.some(range => offset >= range.start && offset < range.end);
}

function markdownCodeRanges(content: string) {
  const ranges = fencedCodeRanges(content);
  for (const match of content.matchAll(/.*(?:\n|$)/g)) {
    if (!isInRanges(match.index, ranges) && /^(?: {4}|\t)/.test(match[0])) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  ranges.push(...inlineCodeRanges(content, ranges));
  return ranges;
}

function isEscaped(content: string, offset: number) {
  let backslashes = 0;
  for (let index = offset - 1; index >= 0 && content[index] === "\\"; index--) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function backtickRunLength(content: string, offset: number) {
  let end = offset;
  while (content[end] === "`") end += 1;
  return end - offset;
}

function inlineCodeRanges(content: string, protectedRanges: TextRange[]) {
  const ranges: TextRange[] = [];
  let offset = 0;
  while (offset < content.length) {
    const protectedRange = protectedRanges.find(
      range => offset >= range.start && offset < range.end
    );
    if (protectedRange) {
      offset = protectedRange.end;
      continue;
    }
    if (content[offset] !== "`" || isEscaped(content, offset)) {
      offset += 1;
      continue;
    }

    const openingLength = backtickRunLength(content, offset);
    let candidate = offset + openingLength;
    let closed = false;
    while (candidate < content.length) {
      candidate = content.indexOf("`", candidate);
      if (candidate === -1) break;
      const candidateProtectedRange = protectedRanges.find(
        range => candidate >= range.start && candidate < range.end
      );
      if (candidateProtectedRange) {
        candidate = candidateProtectedRange.end;
        continue;
      }
      const closingLength = backtickRunLength(content, candidate);
      if (closingLength === openingLength && !isEscaped(content, candidate)) {
        const end = candidate + closingLength;
        ranges.push({ start: offset, end });
        offset = end;
        closed = true;
        break;
      }
      candidate += closingLength;
    }
    if (!closed) offset += openingLength;
  }
  return ranges;
}

function imageOccurrences(content: string): ImageOccurrence[] {
  const ranges = markdownCodeRanges(content);
  const occurrences: ImageOccurrence[] = [];

  for (const match of content.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    if (isInRanges(match.index, ranges) || isEscaped(content, match.index)) {
      continue;
    }
    const start = match.index + match[1].length;
    occurrences.push({
      start,
      end: start + match[2].length,
      reference: match[2],
    });
  }

  for (const match of content.matchAll(HTML_IMAGE_PATTERN)) {
    if (isInRanges(match.index, ranges)) continue;
    const reference = match[2] ?? match[3] ?? match[4];
    const quoteLength = match[2] || match[3] ? 1 : 0;
    const start = match.index + match[1].length + quoteLength;
    occurrences.push({ start, end: start + reference.length, reference });
  }

  return occurrences.sort((left, right) => left.start - right.start);
}

function replaceImageOccurrences(
  content: string,
  occurrences: ImageOccurrence[],
  replacements: Map<string, string>
) {
  let result = content;
  for (const occurrence of [...occurrences].reverse()) {
    const replacement = replacements.get(occurrence.reference);
    if (!replacement) continue;
    result = `${result.slice(0, occurrence.start)}${replacement}${result.slice(occurrence.end)}`;
  }
  return result;
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function isInside(parent: string, candidate: string) {
  const relative = path.relative(parent, candidate);
  return (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function canonicalUrl(siteUrl: string, slug: string, pubDatetime: unknown) {
  const date = new Date(String(pubDatetime));
  if (Number.isNaN(date.getTime())) {
    throw new PublishingError(
      "ARTICLE_INVALID",
      "Article pubDatetime must be a valid date"
    );
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return new URL(`/posts/${year}/${month}/${day}/${slug}/`, siteUrl).toString();
}

function resolveAssetPath(
  reference: string,
  sourcePath: string,
  blogRoot: string
) {
  if (reference.startsWith("/images/")) {
    const publicRoot = path.resolve(blogRoot, "public");
    const resolved = path.resolve(publicRoot, `.${reference}`);
    if (!isInside(publicRoot, resolved)) {
      throw new PublishingError(
        "IMAGE_PATH_ESCAPE",
        `Image path escapes public directory: ${reference}`
      );
    }
    return resolved;
  }

  const resolved = path.resolve(path.dirname(sourcePath), reference);
  if (!isInside(path.resolve(blogRoot), resolved)) {
    throw new PublishingError(
      "IMAGE_PATH_ESCAPE",
      `Image path escapes blog root: ${reference}`
    );
  }
  return resolved;
}

function attributionLine(kind: Attribution, url: string) {
  if (kind === "wechat") {
    return "> 文章来源：Jerret Life 微信公众号。";
  }
  return `> 原文发布于 [Jerret's Blog](${url})。`;
}

async function resolveArticleSource(input: string, contentRoot: string) {
  if (path.isAbsolute(input)) return path.resolve(input);

  if (!input.includes(path.sep) && !input.endsWith(".md")) {
    const matches = await glob(`**/${input}.md`, {
      cwd: contentRoot,
      absolute: true,
      nodir: true,
    });
    if (matches.length === 1) return path.resolve(matches[0]);
    if (matches.length === 0) {
      throw new PublishingError(
        "ARTICLE_NOT_FOUND",
        `Article slug not found: ${input}`
      );
    }
    throw new PublishingError(
      "ARTICLE_AMBIGUOUS",
      `Article slug is ambiguous: ${input}`
    );
  }

  const candidate = path.resolve(contentRoot, input);
  if (path.extname(candidate)) return candidate;
  return `${candidate}.md`;
}

export async function prepareArticlePackage(
  input: string,
  options: PrepareArticleOptions
): Promise<PreparedArticlePackage> {
  const blogRoot = path.resolve(options.blogRoot);
  const contentRoot = path.resolve(blogRoot, "src/data/blog");
  const unresolvedSourcePath = await resolveArticleSource(input, contentRoot);

  if (!isInside(contentRoot, unresolvedSourcePath)) {
    throw new PublishingError(
      "ARTICLE_PATH_ESCAPE",
      `Article path escapes content directory: ${input}`
    );
  }

  let sourcePath: string;
  try {
    const [realContentRoot, realSourcePath] = await Promise.all([
      realpath(contentRoot),
      realpath(unresolvedSourcePath),
    ]);
    if (!isInside(realContentRoot, realSourcePath)) {
      throw new PublishingError(
        "ARTICLE_PATH_ESCAPE",
        `Article path escapes content directory: ${input}`
      );
    }
    sourcePath = realSourcePath;
  } catch (error) {
    if (error instanceof PublishingError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new PublishingError(
        "ARTICLE_NOT_FOUND",
        `Article not found: ${input}`
      );
    }
    throw error;
  }

  const source = await readFile(sourcePath, "utf8");
  const parsed = matter(source);
  const slug = path.basename(sourcePath, path.extname(sourcePath));
  const title = String(parsed.data.title ?? "").trim();
  const author = String(parsed.data.author ?? "Jerret").trim();
  const description = String(parsed.data.description ?? "").trim();
  if (!title || !author || !description || !parsed.content.trim()) {
    throw new PublishingError(
      "ARTICLE_INVALID",
      "Article requires a title, author, description, published date, and body"
    );
  }
  const publishedDate = new Date(String(parsed.data.pubDatetime));
  if (Number.isNaN(publishedDate.getTime())) {
    throw new PublishingError(
      "ARTICLE_INVALID",
      "Article pubDatetime must be a valid date"
    );
  }
  const tags = Array.isArray(parsed.data.tags)
    ? parsed.data.tags.map((tag: unknown) => String(tag))
    : [];
  const resolvedCanonicalUrl = parsed.data.canonicalURL
    ? String(parsed.data.canonicalURL)
    : canonicalUrl(options.siteUrl, slug, publishedDate);
  try {
    new URL(resolvedCanonicalUrl);
  } catch {
    throw new PublishingError(
      "ARTICLE_INVALID",
      "Article canonicalURL must be an absolute URL"
    );
  }

  const assetsDir = path.join(options.outputDir, "assets");
  await mkdir(assetsDir, { recursive: true });
  const assets: PreparedAsset[] = [];
  let preparedBody = parsed.content.replace(/<!--\s*more\s*-->/g, "").trim();
  const occurrences = imageOccurrences(preparedBody);
  const references = new Set(
    occurrences.map(occurrence => occurrence.reference)
  );
  if (typeof parsed.data.cover === "string") {
    references.add(parsed.data.cover);
  }
  const replacements = new Map<string, string>();

  for (const reference of references) {
    if (/^https?:\/\//.test(reference)) continue;

    const unresolvedAssetPath = resolveAssetPath(
      reference,
      sourcePath,
      blogRoot
    );
    let sourceAssetPath: string;
    try {
      sourceAssetPath = await realpath(unresolvedAssetPath);
      const realBlogRoot = await realpath(blogRoot);
      if (!isInside(realBlogRoot, sourceAssetPath)) {
        throw new PublishingError(
          "IMAGE_PATH_ESCAPE",
          `Image path escapes blog root: ${reference}`
        );
      }
      await stat(sourceAssetPath);
    } catch (error) {
      if (error instanceof PublishingError) throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new PublishingError(
          "IMAGE_MISSING",
          `Local image not found: ${reference}`
        );
      }
      throw error;
    }
    const sourceAsset = await readFile(sourceAssetPath);
    const assetHash = sha256(sourceAsset);
    const extension = path.extname(sourceAssetPath).toLowerCase();
    const baseName = path.basename(sourceAssetPath, extension);
    const preparedPath = path.join(
      assetsDir,
      `${baseName}-${assetHash.slice(0, 12)}${extension === ".svg" ? ".png" : extension}`
    );

    if (extension === ".svg") {
      await sharp(sourceAsset).png().toFile(preparedPath);
    } else {
      await writeFile(preparedPath, sourceAsset);
    }

    replacements.set(reference, preparedPath);
    assets.push({
      sourceReference: reference,
      sourcePath: sourceAssetPath,
      preparedPath,
      sha256: assetHash,
      mediaType:
        extension === ".svg" ? "image/png" : `image/${extension.slice(1)}`,
    });
  }

  preparedBody = replaceImageOccurrences(
    preparedBody,
    occurrences,
    replacements
  );

  const preparedMarkdown = `${preparedBody}\n\n${attributionLine(
    options.attribution,
    resolvedCanonicalUrl
  )}\n`;
  const contentHash = sha256(
    JSON.stringify({
      title,
      author,
      description,
      tags,
      language: options.siteLanguage,
      publishedAt: publishedDate.toISOString(),
      canonicalUrl: resolvedCanonicalUrl,
      body: parsed.content.replace(/<!--\s*more\s*-->/g, "").trim(),
      attribution: options.attribution,
      assets: assets.map(asset => ({
        sourceReference: asset.sourceReference,
        sha256: asset.sha256,
      })),
    })
  );
  const manifestPath = path.join(options.outputDir, "manifest.json");
  const preparedMarkdownPath = path.join(options.outputDir, "article.md");
  const result: PreparedArticlePackage = {
    sourcePath,
    preparedMarkdownPath,
    article: {
      slug,
      title,
      author,
      description,
      tags,
      language: options.siteLanguage,
      publishedAt: publishedDate.toISOString(),
      canonicalUrl: resolvedCanonicalUrl,
      cover:
        typeof parsed.data.cover === "string" ? parsed.data.cover : undefined,
    },
    assets,
    preparedMarkdown,
    contentHash,
    manifestPath,
  };

  await writeFile(preparedMarkdownPath, preparedMarkdown);
  await writeFile(manifestPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
