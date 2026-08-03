export const LOCALE_CONFIG = {
  "zh-CN": {
    htmlLang: "zh-CN",
    nativeName: "简体中文",
    pathPrefix: "",
    requiredForPublish: false,
  },
  en: {
    htmlLang: "en",
    nativeName: "English",
    pathPrefix: "en",
    requiredForPublish: true,
  },
  "zh-TW": {
    htmlLang: "zh-TW",
    nativeName: "繁體中文",
    pathPrefix: "zh-TW",
    requiredForPublish: true,
  },
} as const;

export type Locale = keyof typeof LOCALE_CONFIG;

export const DEFAULT_LOCALE = "zh-CN" as const satisfies Locale;
export const SUPPORTED_LOCALES = Object.keys(LOCALE_CONFIG) as [
  Locale,
  ...Locale[],
];
export const REQUIRED_TRANSLATION_LOCALES = SUPPORTED_LOCALES.filter(
  locale => LOCALE_CONFIG[locale].requiredForPublish
);
export const LANGUAGE_LABELS = Object.fromEntries(
  SUPPORTED_LOCALES.map(locale => [locale, LOCALE_CONFIG[locale].nativeName])
) as Record<Locale, string>;

const SHARED_STATIC_LOCALE_PATHS = new Set([
  "/",
  "/about",
  "/ai",
  "/archives",
  "/posts",
  "/search",
  "/tags",
]);

export { t } from "./lang";
export type { TranslationKey } from "./lang";

export function getLocaleFromPath(pathname: string): Locale {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return (
    SUPPORTED_LOCALES.find(
      locale =>
        locale !== DEFAULT_LOCALE &&
        LOCALE_CONFIG[locale].pathPrefix === firstSegment
    ) ?? DEFAULT_LOCALE
  );
}

export function getUnlocalizedPath(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const localePrefix = SUPPORTED_LOCALES.filter(
    locale => locale !== DEFAULT_LOCALE
  )
    .map(locale =>
      LOCALE_CONFIG[locale].pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
    .join("|");
  return (
    normalizedPath.replace(new RegExp(`^/(?:${localePrefix})(?=/|$)`), "") ||
    "/"
  );
}

export function getLocalizedPath(locale: Locale, pathname: string) {
  const pathWithoutLocale = getUnlocalizedPath(pathname);
  const prefix = LOCALE_CONFIG[locale].pathPrefix;

  if (!prefix) return pathWithoutLocale;
  return pathWithoutLocale === "/"
    ? `/${prefix}/`
    : `/${prefix}${pathWithoutLocale}`;
}

export function getOtherLocales(locale: Locale) {
  return SUPPORTED_LOCALES.filter(candidate => candidate !== locale);
}

export function getLocalizedContentDirectory(locale: Locale) {
  return locale === DEFAULT_LOCALE ? "" : `${locale}/`;
}

export function hasSharedStaticLocaleRoute(pathname: string) {
  const unlocalizedPath = getUnlocalizedPath(pathname);
  const normalizedPath =
    unlocalizedPath === "/" ? "/" : unlocalizedPath.replace(/\/$/, "");

  return SHARED_STATIC_LOCALE_PATHS.has(normalizedPath);
}

export function getLocaleHtmlLang(locale: Locale) {
  return LOCALE_CONFIG[locale].htmlLang;
}
