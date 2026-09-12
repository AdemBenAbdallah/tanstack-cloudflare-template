import type { Locale as DateFnsLocale } from "date-fns";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { useLocale } from "@/i18n";

/**
 * date-fns locale for the active UI locale. Pass it explicitly to every
 * `format()` call that renders month or weekday names so Arabic users see
 * Arabic names (a global default would leak across SSR requests).
 */
export function useDateFnsLocale(): DateFnsLocale | undefined {
  const { locale } = useLocale();
  return locale === "ar" ? arLocale : undefined;
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
