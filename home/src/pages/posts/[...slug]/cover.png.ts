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

  if (!cover) {
    return new Response(null, {
      status: 404,
      statusText: "No cover image",
    });
  }

  try {
    // Resolve the cover path relative to the public directory
    const coverPath = cover.startsWith("/")
      ? path.join(process.cwd(), "dist", cover)
      : cover;

    // During build, files are in dist/, during dev they're in public/
    let fileContent: Buffer;

    try {
      fileContent = await fs.readFile(coverPath);
    } catch {
      // Fallback to public directory for dev mode
      const publicPath = path.join(process.cwd(), "public", cover.replace(/^\//, ""));
      fileContent = await fs.readFile(publicPath);
    }

    // Check if it's an SVG (by content or extension)
    const isSvg = cover.endsWith(".svg") ||
      fileContent.toString().startsWith("<svg");

    if (isSvg) {
      // Convert SVG to PNG
      const pngBuffer = await convertSvgToPng(fileContent);
      return new Response(new Uint8Array(pngBuffer), {
        headers: { "Content-Type": "image/png" },
      });
    }

    // Return as-is if already PNG/JPEG/etc
    const contentType = cover.endsWith(".png")
      ? "image/png"
      : cover.endsWith(".jpg") || cover.endsWith(".jpeg")
      ? "image/jpeg"
      : cover.endsWith(".webp")
      ? "image/webp"
      : "image/png";

    return new Response(new Uint8Array(fileContent), {
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    return new Response(null, {
      status: 500,
      statusText: "Error processing cover image",
    });
  }
};
