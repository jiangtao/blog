import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { SITE } from "@/config";
import { DEFAULT_LOCALE } from "@/i18n";
import { getPostsByLocale } from "@/utils/getPostsByLocale";

export async function GET() {
  const posts = getPostsByLocale(await getCollection("blog"), DEFAULT_LOCALE);
  const sortedPosts = getSortedPosts(posts);
  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: sortedPosts.map(post => ({
      link: getPath(post.id, post.filePath, true, post),
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.modDatetime ?? post.data.pubDatetime),
    })),
  });
}
