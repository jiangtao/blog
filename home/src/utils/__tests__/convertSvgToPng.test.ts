import { describe, it, expect } from "vitest";
import { convertSvgToPng } from "../convertSvgToPng";

describe("convertSvgToPng", () => {
  it("should convert SVG buffer to PNG buffer", async () => {
    const svgBuffer = Buffer.from(
      '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>'
    );
    const pngBuffer = await convertSvgToPng(svgBuffer, 1200, 630);

    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(0);
    // PNG files start with magic bytes
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50); // 'P'
    expect(pngBuffer[2]).toBe(0x4e); // 'N'
    expect(pngBuffer[3]).toBe(0x47); // 'G'
  });

  it("should handle SVG string input", async () => {
    const svgString =
      '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="blue"/></svg>';
    const pngBuffer = await convertSvgToPng(svgString);

    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer[0]).toBe(0x89); // PNG magic byte
  });
});
