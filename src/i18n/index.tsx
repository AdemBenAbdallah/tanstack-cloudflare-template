import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ar } from "./ar";
import { type Dict, en } from "./en";
import { fr } from "./fr";

export type Locale = "en" | "ar" | "fr";

const dictionaries: Record<Locale, Dict> = { en, ar, fr };
const STORAGE_KEY = "dashboard-locale";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dict;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  dir: "ltr",
  t: en,
  setLocale: () => {},
});

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "ar" || stored === "fr" ? stored : "en";
}

export function applyLocale(locale: Locale) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

/** Prevents a direction flash before React hydrates. Rendered inline in <head>. */
export const localeInitScript = `(function(){try{var l=localStorage.getItem("dashboard-locale");l=(l==="ar"||l==="fr")?l:"en";document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr";}catch(e){}})();`;

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    applyLocale(stored);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
    applyLocale(next);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <LocaleContext.Provider
      value={{ locale, dir, t: dictionaries[locale], setLocale }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
