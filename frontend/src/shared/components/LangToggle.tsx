import { useTranslation } from "../i18n/useTranslation";

export function LangToggle() {
  const { lang, setLang, t } = useTranslation();
  const next = lang === "ja" ? "en" : "ja";
  return (
    <button
      className="mute-btn"
      onClick={() => setLang(next)}
      title={t("header.lang")}
      aria-label={t("header.lang")}
    >
      {lang === "ja" ? "JA" : "EN"}
    </button>
  );
}
