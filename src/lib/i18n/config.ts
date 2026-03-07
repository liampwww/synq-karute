export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ja";

export function getMessages(locale: Locale) {
  try {
    return require(`../../../public/locales/${locale}/common.json`);
  } catch {
    return require(`../../../public/locales/${defaultLocale}/common.json`);
  }
}
