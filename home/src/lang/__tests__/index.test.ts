import { describe, expect, it } from "vitest";
import { SYSTEM_MESSAGES, t } from "@/lang";

describe("system language packs", () => {
  it("uses one complete message contract for every supported locale", () => {
    const defaultKeys = Object.keys(SYSTEM_MESSAGES["zh-CN"]).sort();

    expect(Object.keys(SYSTEM_MESSAGES.en).sort()).toEqual(defaultKeys);
    expect(Object.keys(SYSTEM_MESSAGES["zh-TW"]).sort()).toEqual(defaultKeys);
  });

  it("returns localized copy and interpolates named values", () => {
    expect(t("zh-CN", "posts")).toBe("文章");
    expect(t("en", "tagDescription", { tag: "Astro" })).toBe(
      "All articles tagged “Astro”."
    );
    expect(t("zh-TW", "traditionalChinese")).toBe("繁體中文");
  });
});
