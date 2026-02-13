import { Resvg } from "@resvg/resvg-js";

export async function convertSvgToPng(
  input: string | Buffer,
  width = 1200
): Promise<Buffer> {
  if (!input || (typeof input === "string" && input.trim().length === 0) || (Buffer.isBuffer(input) && input.length === 0)) {
    throw new Error("Failed to convert SVG to PNG: Invalid or empty input");
  }

  const svgString = typeof input === "string" ? input : input.toString("utf-8");

  try {
    const resvg = new Resvg(svgString, {
      fitTo: {
        mode: "width",
        value: width,
      },
    });

    const pngData = resvg.render();
    return Buffer.from(pngData.asPng());
  } catch (error) {
    throw new Error(`Failed to convert SVG to PNG: ${error instanceof Error ? error.message : String(error)}`);
  }
}
