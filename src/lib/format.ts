import type { Locale } from "@/i18n";

/** BCP-47 tag for Intl APIs matching the UI locale. */
export function intlLocale(locale: Locale): string {
  if (locale === "ar") return "ar-TN";
  if (locale === "fr") return "fr-TN";
  return "en-US";
}

export function formatTND(millimes: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "TND",
  }).format(millimes / 1000);
}

/** Parse a TND amount typed by a human ("12.5", "12,500") into millimes. */
export function parseTND(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 1000);
}

export function formatMinutes(minutes: number, locale: Locale): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "ar") {
    if (h === 0) return `${m} د`;
    if (m === 0) return `${h} س`;
    return `${h} س ${m} د`;
  }
  if (locale === "fr") {
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
