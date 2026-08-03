import type { CollectionEntry } from "astro:content";
import {
  DEFAULT_LOCALE,
  getLocalizedContentDirectory,
  type Locale,
} from "@/i18n";

export { getLocalizedContentDirectory } from "@/i18n";

type Post = CollectionEntry<"blog">;

export function getPostLocale(post: Post): Locale {
  return post.data.locale;
}

export function getPostsByLocale(posts: Post[], locale: Locale) {
  return posts.filter(post => getPostLocale(post) === locale);
}

export function getTranslationKey(post: Post) {
  return post.data.locale === DEFAULT_LOCALE
    ? post.id
    : (post.data.translationKey ?? post.id);
}

export function validatePostLocalization(post: Post) {
  const { locale, translationKey } = post.data;
  const expectedDirectory = getLocalizedContentDirectory(locale);
  const issues: string[] = [];

  if (expectedDirectory && !post.id.startsWith(expectedDirectory)) {
    issues.push(`${locale} posts must be stored under ${expectedDirectory}`);
  }

  if (locale === DEFAULT_LOCALE && translationKey) {
    issues.push(`${locale} posts must not declare translationKey`);
  }

  if (locale !== DEFAULT_LOCALE && !translationKey) {
    issues.push(`${locale} posts require translationKey`);
  }

  return issues;
}

export function getPostTranslation(post: Post, posts: Post[], locale: Locale) {
  const translationKey = getTranslationKey(post);
  return posts.find(
    candidate =>
      candidate.data.locale === locale &&
      getTranslationKey(candidate) === translationKey
  );
}
