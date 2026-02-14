import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import { generateOgImageForPost } from "@/utils/generateOgImages";
import { convertSvgToPng } from "@/utils/convertSvgToPng";
import { SITE } from "@/config";
import fs from "node:fs/promises";
import path from "node:path";

export async function getStaticPaths() {
  const posts = await getCollection("blog").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false, post) },
    props: post,
  }));
}

/**
 * Get cover image buffer for a post
 * Reuses the same logic as cover.png.ts
 */
async function getCoverImage(post: CollectionEntry<"blog">): Promise<Buffer | null> {
  const cover = post.data.cover;

  if (!cover || typeof cover !== "string" || cover.trim().length === 0) {
    return null;
  }

  try {
    // Normalize cover path to start with /
    const normalizedCover = cover.startsWith("/") ? cover : `/${cover}`;

    // Try public directory first (dev mode), then dist directory (build mode)
    const publicPath = path.join(process.cwd(), "public", normalizedCover.replace(/^\//, "").replace(/^\/+/, ""));
    let fileContent: Buffer | undefined;

    try {
      fileContent = await fs.readFile(publicPath);
    } catch {
      // Try dist directory
      const distPath = path.join(process.cwd(), "dist", normalizedCover.replace(/^\//, "").replace(/^\/+/, ""));
      try {
        fileContent = await fs.readFile(distPath);
      } catch {
        // Both paths failed
        return null;
      }
    }

    // Check if it's an SVG (by extension first, then content)
    const isSvg = normalizedCover.endsWith(".svg") ||
      fileContent.toString().trimStart().startsWith("<svg");

    if (isSvg) {
      // Convert SVG to PNG
      return await convertSvgToPng(fileContent);
    }

    // Return as-is if already PNG/JPEG/etc
    return fileContent;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ props }) => {
  const post = props as CollectionEntry<"blog">;

  // If post has cover, serve it directly (prioritize cover over dynamic generation)
  if (post.data.cover && typeof post.data.cover === "string") {
    const coverBuffer = await getCoverImage(post);
    if (coverBuffer) {
      // Determine content type based on cover file extension
      const cover = post.data.cover;
      const contentType = cover.endsWith(".png")
        ? "image/png"
        : cover.endsWith(".jpg") || cover.endsWith(".jpeg")
        ? "image/jpeg"
        : cover.endsWith(".webp")
        ? "image/webp"
        : "image/png";

      return new Response(new Uint8Array(coverBuffer), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  // Fallback to dynamic OG generation if enabled
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const buffer = await generateOgImageForPost(post);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
