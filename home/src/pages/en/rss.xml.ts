import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { getPostsByLocale } from "@/utils/getPostsByLocale";
import { SITE } from "@/config";

export async function GET() {
  const posts = getPostsByLocale(await getCollection("blog"), "en");
  const sortedPosts = getSortedPosts(posts);

  return rss({
    title: `${SITE.title} — English`,
    description: "Technical articles in English.",
    site: SITE.website,
    items: sortedPosts.map(post => ({
      link: getPath(post.id, post.filePath, true, post),
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.modDatetime ?? post.data.pubDatetime),
    })),
  });
}
