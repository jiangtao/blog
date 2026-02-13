import { Resvg } from "@resvg/resvg-js";

export async function convertSvgToPng(
  input: string | Buffer,
  width = 1200,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  height = 630
): Promise<Buffer> {
  const svgString = typeof input === "string" ? input : input.toString("utf-8");

  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: "width",
      value: width,
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
