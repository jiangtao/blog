import { getCollection } from "astro:content";
import { GET as baseGET } from "../../../posts/[...slug]/cover.png";
import { getPath } from "@/utils/getPath";
import { getPostsByLocale } from "@/utils/getPostsByLocale";

export async function getStaticPaths() {
  const posts = getPostsByLocale(await getCollection("blog"), "en").filter(
    ({ data }) => !data.draft && data.cover
  );

  return posts.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false, post) },
    props: post,
  }));
}

export const GET = baseGET;
