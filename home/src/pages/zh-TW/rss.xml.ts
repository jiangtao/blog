import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { getPostsByLocale } from "@/utils/getPostsByLocale";
import { SITE } from "@/config";

export async function GET() {
  const posts = getPostsByLocale(await getCollection("blog"), "zh-TW");
  const sortedPosts = getSortedPosts(posts);

  return rss({
    title: `${SITE.title} — 繁體中文`,
    description: "繁體中文技術文章。",
    site: SITE.website,
    items: sortedPosts.map(post => ({
      link: getPath(post.id, post.filePath, true, post),
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.modDatetime ?? post.data.pubDatetime),
    })),
  });
}
