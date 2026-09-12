import type { Locale as DateFnsLocale } from "date-fns";
import { format } from "date-fns";
import { ar as arLocale, fr as frLocale } from "date-fns/locale";
import { useLocale } from "@/i18n";

/**
 * date-fns locale for the active UI locale. Pass it explicitly to every
 * `format()` call that renders month or weekday names (a global default
 * would leak across SSR requests).
 */
export function useDateFnsLocale(): DateFnsLocale | undefined {
  const { locale } = useLocale();
  if (locale === "ar") return arLocale;
  if (locale === "fr") return frLocale;
  return undefined;
}

export function formatWithLocale(
  date: Date | number,
  fmt: string,
  dateFnsLocale: DateFnsLocale | undefined,
): string {
  return dateFnsLocale
    ? format(date, fmt, { locale: dateFnsLocale })
    : format(date, fmt);
}
