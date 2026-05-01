export type Lang = "ja" | "en";

const LANG_KEY = "sc:lang";

export function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "ja" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  const nav =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language.toLowerCase()
      : "";
  const auto: Lang = nav.startsWith("ja") ? "ja" : "en";
  try {
    localStorage.setItem(LANG_KEY, auto);
  } catch {
    /* ignore */
  }
  return auto;
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}
