import { describe, expect, it } from "vitest";
import type { CollectionEntry } from "astro:content";
import {
  getLocalizedContentDirectory,
  getPostTranslation,
  validatePostLocalization,
} from "../getPostsByLocale";

type Post = CollectionEntry<"blog">;

function post(
  id: string,
  locale: "zh-CN" | "en" | "zh-TW",
  translationKey?: string
) {
  return {
    id,
    data: { locale, translationKey },
  } as Post;
}

describe("localized post contract", () => {
  it("uses the locale registry to derive target content directories", () => {
    expect(getLocalizedContentDirectory("zh-CN")).toBe("");
    expect(getLocalizedContentDirectory("en")).toBe("en/");
    expect(getLocalizedContentDirectory("zh-TW")).toBe("zh-TW/");
  });

  it("matches each localized article through its stable content key", () => {
    const source = post("future-rd-evolution", "zh-CN");
    const english = post("en/future-rd-evolution", "en", "future-rd-evolution");
    const traditionalChinese = post(
      "zh-TW/future-rd-evolution",
      "zh-TW",
      "future-rd-evolution"
    );

    expect(getPostTranslation(source, [source, english], "en")).toBe(english);
    expect(
      getPostTranslation(source, [source, traditionalChinese], "zh-TW")
    ).toBe(traditionalChinese);
  });

  it("reports a localized post whose directory or key breaks the contract", () => {
    expect(validatePostLocalization(post("en/example", "zh-TW"))).toEqual([
      "zh-TW posts must be stored under zh-TW/",
      "zh-TW posts require translationKey",
    ]);
    expect(
      validatePostLocalization(post("example", "zh-CN", "example"))
    ).toEqual(["zh-CN posts must not declare translationKey"]);
  });
});
