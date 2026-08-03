import { getCollection } from "astro:content";
import { GET as baseGET } from "../../../posts/[...slug]/index.png";
import { getPath } from "@/utils/getPath";
import { getPostsByLocale } from "@/utils/getPostsByLocale";

export async function getStaticPaths() {
  const posts = getPostsByLocale(await getCollection("blog"), "zh-TW").filter(
    ({ data }) => !data.draft && !data.ogImage
  );

  return posts.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false, post) },
    props: post,
  }));
}

export const GET = baseGET;
