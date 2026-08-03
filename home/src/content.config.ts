import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "./config";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./i18n";

export const BLOG_PATH = "src/data/blog";

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z
      .object({
        author: z.string().default(SITE.author),
        pubDatetime: z.coerce.date(),
        modDatetime: z.coerce.date().optional().nullable(),
        title: z.string(),
        featured: z.boolean().optional(),
        draft: z.boolean().optional(),
        tags: z.array(z.string()).default(["others"]),
        ogImage: image().or(z.string()).optional(),
        cover: z.string().optional(),
        description: z.string(),
        canonicalURL: z.string().optional(),
        hideEditPost: z.boolean().optional(),
        timezone: z.string().optional(),
        locale: z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE),
        translationKey: z.string().trim().min(1).optional(),
      })
      .superRefine((post, context) => {
        if (post.locale !== DEFAULT_LOCALE && !post.translationKey) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "translationKey is required for localized posts",
            path: ["translationKey"],
          });
        }

        if (post.locale === DEFAULT_LOCALE && post.translationKey) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "translationKey is only allowed for localized posts",
            path: ["translationKey"],
          });
        }
      }),
});

export const collections = { blog };
