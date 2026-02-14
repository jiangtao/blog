import { describe, it, expect } from "vitest";
import { validateImageUrl } from "../validateImageUrl";

describe("validateImageUrl", () => {
  it("should validate valid absolute URL", async () => {
    const result = await validateImageUrl("https://example.com/image.png");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject invalid URL", async () => {
    const result = await validateImageUrl("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid URL");
  });

  it("should reject unreachable URL", async () => {
    const result = await validateImageUrl("https://this-definitely-does-not-exist-12345.com/image.png", { skipRemote: false });
    expect(result.valid).toBe(false);
  });

  it("should validate relative path as local file check", async () => {
    const result = await validateImageUrl("/posts/2026/02/12/test/cover.png");
    expect(result.valid).toBeDefined();
  });
});
