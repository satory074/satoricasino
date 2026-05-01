import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ja, type Translation } from "./locales/ja";
import { en } from "./locales/en";
import { detectInitialLang, persistLang, type Lang } from "./detect";

const RESOURCES: Record<Lang, Translation> = { ja, en };

function lookup(obj: unknown, path: string): string | undefined {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (
      cur &&
      typeof cur === "object" &&
      seg in (cur as Record<string, unknown>)
    ) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(
  tpl: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

export interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());

  const setLang = useCallback((next: Lang) => {
    persistLang(next);
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const fromLang = lookup(RESOURCES[lang], key);
      const fromJa = lang === "ja" ? undefined : lookup(RESOURCES.ja, key);
      const tpl = fromLang ?? fromJa ?? key;
      return interpolate(tpl, params);
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t }),
    [lang, setLang, t],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}
