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

export type Locale = "en" | "ar";

const dictionaries: Record<Locale, Dict> = { en, ar };
const STORAGE_KEY = "dashboard-locale";

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dict;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  dir: "ltr",
  t: en,
  setLocale: () => {},
  toggleLocale: () => {},
});

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "en";
}

export function applyLocale(locale: Locale) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

/** Prevents a direction flash before React hydrates. Rendered inline in <head>. */
export const localeInitScript = `(function(){try{var l=localStorage.getItem("dashboard-locale")==="ar"?"ar":"en";document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr";}catch(e){}})();`;

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

  const toggleLocale = useCallback(() => {
    setLocale(readStoredLocale() === "ar" ? "en" : "ar");
  }, [setLocale]);

  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <LocaleContext.Provider
      value={{ locale, dir, t: dictionaries[locale], setLocale, toggleLocale }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
