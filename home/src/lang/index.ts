import type { Locale } from "@/i18n";
import en from "./en";
import zhCN, { type SystemMessages, type TranslationKey } from "./zh-CN";
import zhTW from "./zh-TW";

export type { TranslationKey } from "./zh-CN";

export const SYSTEM_MESSAGES = {
  "zh-CN": zhCN,
  en,
  "zh-TW": zhTW,
} satisfies Record<Locale, SystemMessages>;

export function t(
  locale: Locale,
  key: TranslationKey,
  values: Record<string, string | number> = {}
) {
  let text = SYSTEM_MESSAGES[locale][key];
  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
