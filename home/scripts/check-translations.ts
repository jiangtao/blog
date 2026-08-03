import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  DEFAULT_LOCALE,
  getLocalizedContentDirectory,
  LANGUAGE_LABELS,
  REQUIRED_TRANSLATION_LOCALES,
  SUPPORTED_LOCALES,
  type Locale,
} from "../src/i18n";

type Frontmatter = {
  draft?: boolean;
  locale?: string;
  translationKey?: string;
};

type PostFile = {
  absolutePath: string;
  relativePath: string;
  data: Frontmatter;
  mtimeMs: number;
};

export type LocaleTranslationReport = {
  locale: Locale;
  translatedCount: number;
  missing: string[];
  stale: string[];
  invalid: string[];
};

export type TranslationReport = {
  sourceCount: number;
  byLocale: Partial<Record<Locale, LocaleTranslationReport>>;
};

async function findMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findMarkdownFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
    })
  );
  return files.flat();
}

async function readPost(
  blogDirectory: string,
  absolutePath: string
): Promise<PostFile> {
  const [content, fileStats] = await Promise.all([
    readFile(absolutePath, "utf8"),
    stat(absolutePath),
  ]);

  return {
    absolutePath,
    relativePath: path
      .relative(blogDirectory, absolutePath)
      .replace(/\\/g, "/"),
    data: matter(content).data as Frontmatter,
    mtimeMs: fileStats.mtimeMs,
  };
}

function isInLocalizedDirectory(post: PostFile) {
  return SUPPORTED_LOCALES.some(locale => {
    const directory = getLocalizedContentDirectory(locale);
    return directory.length > 0 && post.relativePath.startsWith(directory);
  });
}

function getSourceKey(post: PostFile) {
  return post.relativePath.replace(/\.md$/, "");
}

function getLocaleReport(
  locale: Locale,
  posts: PostFile[],
  sources: PostFile[],
  sourceKeys: Set<string>
): LocaleTranslationReport {
  const directory = getLocalizedContentDirectory(locale);
  const translations = posts.filter(
    post =>
      !post.data.draft &&
      (post.relativePath.startsWith(directory) || post.data.locale === locale)
  );
  const translationsByKey = new Map<string, PostFile>();
  const invalid: string[] = [];

  for (const translation of translations) {
    if (translation.data.locale !== locale) {
      invalid.push(`${translation.relativePath}: locale must be "${locale}"`);
      continue;
    }
    if (!translation.relativePath.startsWith(directory)) {
      invalid.push(`${translation.relativePath}: must be stored under ${directory}`);
      continue;
    }
    if (!translation.data.translationKey) {
      invalid.push(`${translation.relativePath}: translationKey is required`);
      continue;
    }
    if (!sourceKeys.has(translation.data.translationKey)) {
      invalid.push(
        `${translation.relativePath}: translationKey "${translation.data.translationKey}" has no published Chinese source`
      );
      continue;
    }
    if (translationsByKey.has(translation.data.translationKey)) {
      invalid.push(
        `duplicate ${locale} translationKey: ${translation.data.translationKey}`
      );
      continue;
    }
    translationsByKey.set(translation.data.translationKey, translation);
  }

  const missing: string[] = [];
  const stale: string[] = [];
  for (const source of sources) {
    const sourceKey = getSourceKey(source);
    const translation = translationsByKey.get(sourceKey);
    if (!translation) {
      missing.push(source.relativePath);
      continue;
    }
    if (source.mtimeMs > translation.mtimeMs) {
      stale.push(source.relativePath);
    }
  }

  return {
    locale,
    translatedCount: translationsByKey.size,
    missing,
    stale,
    invalid,
  };
}

export async function getTranslationReport(
  blogDirectory = path.resolve(process.cwd(), "src/data/blog"),
  requiredLocales: Locale[] = REQUIRED_TRANSLATION_LOCALES
): Promise<TranslationReport> {
  const posts = await Promise.all(
    (await findMarkdownFiles(blogDirectory)).map(file =>
      readPost(blogDirectory, file)
    )
  );
  const sources = posts.filter(
    post =>
      !post.data.draft &&
      (post.data.locale === undefined || post.data.locale === DEFAULT_LOCALE) &&
      !isInLocalizedDirectory(post)
  );
  const sourceKeys = new Set(sources.map(getSourceKey));
  const byLocale = Object.fromEntries(
    requiredLocales.map(locale => [
      locale,
      getLocaleReport(locale, posts, sources, sourceKeys),
    ])
  ) as Partial<Record<Locale, LocaleTranslationReport>>;

  return {
    sourceCount: sources.length,
    byLocale,
  };
}

function printList(label: string, files: string[]) {
  if (files.length === 0) return;
  console.log(`\n${label} (${files.length})`);
  for (const file of files) console.log(`- ${file}`);
}

async function main() {
  const reportOnly = process.argv.includes("--report");
  const report = await getTranslationReport();
  let hasProblems = false;

  for (const locale of REQUIRED_TRANSLATION_LOCALES) {
    const localeReport = report.byLocale[locale];
    if (!localeReport) continue;

    const languageName = LANGUAGE_LABELS[locale];
    console.log(
      `${languageName} translations: ${localeReport.translatedCount}/${report.sourceCount} published Chinese posts.`
    );
    printList(`${languageName} missing translations`, localeReport.missing);
    printList(`${languageName} stale translations`, localeReport.stale);
    printList(`${languageName} invalid translations`, localeReport.invalid);

    hasProblems ||= Boolean(
      localeReport.missing.length ||
        localeReport.stale.length ||
        localeReport.invalid.length
    );
  }

  if (!hasProblems) {
    console.log("Translation coverage is complete.");
    return;
  }

  console.log("Run $translate-blog-en for each missing or stale target locale.");
  if (!reportOnly) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
