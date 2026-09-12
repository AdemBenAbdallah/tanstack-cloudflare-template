import { Languages } from "lucide-react";
import { useLocale } from "@/i18n";
import { Button } from "./ui/button";

export function LocaleToggle() {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLocale}
      aria-label={t.language.toggle}
      className="gap-2"
    >
      <Languages className="size-4" />
      {locale === "ar" ? "EN" : "عربي"}
    </Button>
  );
}
