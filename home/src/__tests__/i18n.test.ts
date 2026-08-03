import { describe, expect, it } from "vitest";
import {
  getLocaleFromPath,
  getLocalizedPath,
  getOtherLocales,
  hasSharedStaticLocaleRoute,
} from "@/i18n";
import { t } from "@/lang";

describe("i18n routing", () => {
  it("keeps Chinese routes unprefixed and prefixes localized routes", () => {
    expect(getLocalizedPath("zh-CN", "/posts/2025/example/")).toBe(
      "/posts/2025/example/"
    );
    expect(getLocalizedPath("en", "/posts/2025/example/")).toBe(
      "/en/posts/2025/example/"
    );
    expect(getLocalizedPath("zh-TW", "/posts/2025/example/")).toBe(
      "/zh-TW/posts/2025/example/"
    );
  });

  it("detects every locale and returns all alternate locales", () => {
    expect(getLocaleFromPath("/en/about/")).toBe("en");
    expect(getLocaleFromPath("/zh-TW/about/")).toBe("zh-TW");
    expect(getLocaleFromPath("/about/")).toBe("zh-CN");
    expect(getOtherLocales("en")).toEqual(["zh-CN", "zh-TW"]);
  });

  it("limits automatic cross-locale links to routes that exist in every locale", () => {
    expect(hasSharedStaticLocaleRoute("/en/about/")).toBe(true);
    expect(hasSharedStaticLocaleRoute("/zh-TW/tags/")).toBe(true);
    expect(hasSharedStaticLocaleRoute("/en/tags/product-development/")).toBe(
      false
    );
    expect(
      hasSharedStaticLocaleRoute("/posts/2025/02/27/future-rd-evolution/")
    ).toBe(false);
  });

  it("uses the correct localized copy and interpolates values", () => {
    expect(t("zh-CN", "posts")).toBe("文章");
    expect(t("en", "tagDescription", { tag: "Astro" })).toBe(
      "All articles tagged “Astro”."
    );
    expect(t("zh-TW", "traditionalChinese")).toBe("繁體中文");
  });
});
