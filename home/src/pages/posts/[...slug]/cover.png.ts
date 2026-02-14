import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import { convertSvgToPng } from "@/utils/convertSvgToPng";
import fs from "node:fs/promises";
import path from "node:path";

export async function getStaticPaths() {
  const posts = await getCollection("blog").then(p =>
    p.filter(({ data }) => !data.draft && data.cover)
  );

  return posts.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false, post) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const post = props as CollectionEntry<"blog">;
  const cover = post.data.cover;

  if (!cover || typeof cover !== "string" || cover.trim().length === 0) {
    return new Response(null, {
      status: 404,
      statusText: "No cover image",
    });
  }

  try {
    // Normalize cover path to start with /
    const normalizedCover = cover.startsWith("/") ? cover : `/${cover}`;

    // During build, assets are in dist/, during dev they're in public/
    let fileContent: Buffer | undefined;
    let readError: Error | null = null;

    // Try public directory first (dev mode), then dist directory (build mode)
    const publicPath = path.join(process.cwd(), "public", normalizedCover.replace(/^\//, "").replace(/^\/+/, ""));
    try {
      fileContent = await fs.readFile(publicPath);
    } catch (error) {
      readError = error as Error;
    }

    // If public failed, try dist directory
    if (!fileContent) {
      const distPath = path.join(process.cwd(), "dist", normalizedCover.replace(/^\//, "").replace(/^\/+/, ""));
      try {
        fileContent = await fs.readFile(distPath);
      } catch (error) {
        readError = error as Error;
      }
    }

    // If both paths failed, return 404 with details
    if (!fileContent) {
      const attemptedPaths = [publicPath];
      if (readError) {
        attemptedPaths.push(path.join(process.cwd(), "dist", normalizedCover.replace(/^\//, "").replace(/^\/+/, "")));
      }
      return new Response(null, {
        status: 404,
        statusText: `Cover image not found. Tried: ${attemptedPaths.join(", ")}`,
      });
    }

    // Check if it's an SVG (by extension first, then content)
    const isSvg = normalizedCover.endsWith(".svg") ||
      fileContent.toString().trimStart().startsWith("<svg");

    if (isSvg) {
      // Convert SVG to PNG
      const pngBuffer = await convertSvgToPng(fileContent);
      return new Response(new Uint8Array(pngBuffer), {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }

    // Return as-is if already PNG/JPEG/etc
    const contentType = normalizedCover.endsWith(".png")
      ? "image/png"
      : normalizedCover.endsWith(".jpg") || normalizedCover.endsWith(".jpeg")
      ? "image/jpeg"
      : normalizedCover.endsWith(".webp")
      ? "image/webp"
      : "image/png";

    return new Response(new Uint8Array(fileContent), {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (error) {
    return new Response(null, {
      status: 500,
      statusText: `Error reading cover image: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
};
