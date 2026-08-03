import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getTranslationReport } from "../check-translations";

const temporaryDirectories: string[] = [];

async function createBlogDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "blog-translations-"));
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, "en"));
  await mkdir(path.join(directory, "zh-TW"));
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("getTranslationReport", () => {
  it("matches an English translation to its Chinese source", async () => {
    const directory = await createBlogDirectory();
    await writeFile(
      path.join(directory, "example.md"),
      "---\ntitle: 示例\npubDatetime: 2026-01-01\ndescription: 示例\n---\n中文正文"
    );
    await writeFile(
      path.join(directory, "en", "example.md"),
      "---\ntitle: Example\npubDatetime: 2026-01-01\ndescription: Example\nlocale: en\ntranslationKey: example\n---\nEnglish body"
    );

    const report = await getTranslationReport(directory, ["en", "zh-TW"]);

    expect(report.sourceCount).toBe(1);
    expect(report.byLocale.en).toMatchObject({
      translatedCount: 1,
      missing: [],
      stale: [],
      invalid: [],
    });
    expect(report.byLocale["zh-TW"]).toMatchObject({
      translatedCount: 0,
      missing: ["example.md"],
      stale: [],
      invalid: [],
    });
  });

  it("reports a missing translation without treating drafts as published", async () => {
    const directory = await createBlogDirectory();
    await writeFile(
      path.join(directory, "published.md"),
      "---\ntitle: Published\npubDatetime: 2026-01-01\ndescription: Published\n---\n正文"
    );
    await writeFile(
      path.join(directory, "draft.md"),
      "---\ntitle: Draft\npubDatetime: 2026-01-01\ndescription: Draft\ndraft: true\n---\n草稿"
    );

    const report = await getTranslationReport(directory, ["en"]);

    expect(report.sourceCount).toBe(1);
    expect(report.byLocale.en?.missing).toEqual(["published.md"]);
  });

  it("reports a locale or directory mismatch without losing the source coverage result", async () => {
    const directory = await createBlogDirectory();
    await writeFile(
      path.join(directory, "example.md"),
      "---\ntitle: 示例\npubDatetime: 2026-01-01\ndescription: 示例\n---\n中文正文"
    );
    await writeFile(
      path.join(directory, "en", "example.md"),
      "---\ntitle: Example\npubDatetime: 2026-01-01\ndescription: Example\nlocale: zh-TW\ntranslationKey: example\n---\nWrong locale"
    );

    const report = await getTranslationReport(directory, ["en", "zh-TW"]);

    expect(report.byLocale.en?.invalid).toContain(
      'en/example.md: locale must be "en"'
    );
    expect(report.byLocale["zh-TW"]?.invalid).toContain(
      "en/example.md: must be stored under zh-TW/"
    );
    expect(report.byLocale.en?.missing).toEqual(["example.md"]);
  });

  it("reports stale and duplicate localized posts", async () => {
    const directory = await createBlogDirectory();
    const sourcePath = path.join(directory, "example.md");
    await writeFile(
      sourcePath,
      "---\ntitle: 示例\npubDatetime: 2026-01-01\ndescription: 示例\n---\n中文正文"
    );
    await writeFile(
      path.join(directory, "en", "example.md"),
      "---\ntitle: Example\npubDatetime: 2026-01-01\ndescription: Example\nlocale: en\ntranslationKey: example\n---\nEnglish body"
    );
    await writeFile(
      path.join(directory, "en", "duplicate.md"),
      "---\ntitle: Duplicate\npubDatetime: 2026-01-01\ndescription: Duplicate\nlocale: en\ntranslationKey: example\n---\nDuplicate body"
    );
    const newerThanTranslations = new Date(Date.now() + 10_000);
    await utimes(sourcePath, newerThanTranslations, newerThanTranslations);

    const report = await getTranslationReport(directory, ["en"]);

    expect(report.byLocale.en?.stale).toEqual(["example.md"]);
    expect(report.byLocale.en?.invalid).toContain(
      "duplicate en translationKey: example"
    );
  });
});
