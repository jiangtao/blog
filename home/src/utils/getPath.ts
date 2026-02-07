import { BLOG_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";
import type { CollectionEntry } from "astro:content";

/**
 * Get full path of a blog post
 * @param id - id of the blog post (aka slug)
 * @param filePath - the blog post full file location
 * @param includeBase - whether to include `/posts` in return value
 * @returns blog post path
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true,
  post?: CollectionEntry<"blog">
) {
  // Use date-based URL structure: /YYYY/MM/DD/slug/
  if (post?.data.pubDatetime) {
    const date = new Date(post.data.pubDatetime);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Making sure `id` does not contain the directory
    const blogId = id.split("/");
    const slug = blogId.length > 0 ? blogId.slice(-1) : blogId;

    const basePath = includeBase ? "/posts" : "";
    return [basePath, year, month, day, slug].join("/");
  }

  // Fallback to original directory-based path
  const pathSegments = filePath
    ?.replace(BLOG_PATH, "")
    .split("/")
    .filter(path => path !== "") // remove empty string in the segments ["", "other-path"] <- empty string will be removed
    .filter(path => !path.startsWith("_")) // exclude directories start with underscore "_"
    .slice(0, -1) // remove the last segment_ file name_ since it's unnecessary
    .map(segment => slugifyStr(segment)); // slugify each segment path

  const basePath = includeBase ? "/posts" : "";

  // Making sure `id` does not contain the directory
  const blogId = id.split("/");
  const slug = blogId.length > 0 ? blogId.slice(-1) : blogId;

  // If not inside the sub-dir, simply return the file path
  if (!pathSegments || pathSegments.length < 1) {
    return [basePath, slug].join("/");
  }

  return [basePath, ...pathSegments, slug].join("/");
}
