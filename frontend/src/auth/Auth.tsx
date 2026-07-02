import { useState, type FormEvent } from "react";
import { apiPost, ApiError, setAuth } from "../shared/api/api";
import { useTranslation } from "../shared/i18n/useTranslation";
import type { AuthData } from "../shared/types/game";
import clsx from "clsx";

type InfoView =
  | "info-privacy"
  | "info-terms"
  | "info-about"
  | "info-responsible"
  | "info-blackjack-guide"
  | "info-chinchiro-guide"
  | "info-faq"
  | "info-getting-started"
  | "info-glossary"
  | "info-contact";

interface Props {
  onAuthed: () => void;
  playClick: () => void;
  onNavigate: (view: InfoView) => void;
}

// Crawlable <a href> links from the public root page. Guides first (the
// SEO-valuable publisher content), then the legal/info pages.
const FOOTER_LINKS: { view: InfoView; path: string; navKey: string }[] = [
  {
    view: "info-getting-started",
    path: "/getting-started",
    navKey: "info.nav.gettingStarted",
  },
  {
    view: "info-blackjack-guide",
    path: "/games/blackjack",
    navKey: "info.nav.blackjackGuide",
  },
  {
    view: "info-chinchiro-guide",
    path: "/games/chinchiro",
    navKey: "info.nav.chinchiroGuide",
  },
  { view: "info-faq", path: "/faq", navKey: "info.nav.faq" },
  { view: "info-glossary", path: "/glossary", navKey: "info.nav.glossary" },
  { view: "info-about", path: "/about", navKey: "info.nav.about" },
  { view: "info-contact", path: "/contact", navKey: "info.nav.contact" },
  { view: "info-privacy", path: "/privacy", navKey: "info.nav.privacy" },
  { view: "info-terms", path: "/terms", navKey: "info.nav.terms" },
  {
    view: "info-responsible",
    path: "/responsible-gaming",
    navKey: "info.nav.responsible",
  },
];

// Featured guide links shown in the landing block above the login card.
const LANDING_LINKS: { view: InfoView; path: string; navKey: string }[] = [
  {
    view: "info-getting-started",
    path: "/getting-started",
    navKey: "info.nav.gettingStarted",
  },
  {
    view: "info-blackjack-guide",
    path: "/games/blackjack",
    navKey: "info.nav.blackjackGuide",
  },
  {
    view: "info-chinchiro-guide",
    path: "/games/chinchiro",
    navKey: "info.nav.chinchiroGuide",
  },
  { view: "info-faq", path: "/faq", navKey: "info.nav.faq" },
];

export function Auth({ onAuthed, playClick, onNavigate }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pass.trim() || busy) return;
    setBusy(true);
    setErr("");
    playClick();
    try {
      const data = await apiPost<AuthData>(
        tab === "login" ? "/api/login" : "/api/register",
        { display_name: name.trim(), passphrase: pass.trim() },
      );
      setAuth(data);
      onAuthed();
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(t(`errors.${e.code}`, e.params));
      } else {
        setErr(t("common.failed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFooterClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    view: InfoView,
  ) => {
    e.preventDefault();
    onNavigate(view);
  };

  return (
    <div className="auth-section">
      <section className="auth-landing" aria-label={t("info.nav.about")}>
        <h1 className="auth-landing-title">{t("info.common.siteName")}</h1>
        <p className="auth-landing-sub">{t("auth.landing.subheading")}</p>
        <p className="auth-landing-intro">{t("auth.landing.intro")}</p>
        <p className="auth-landing-disclaimer">{t("auth.landing.disclaimer")}</p>
        <div className="auth-landing-features">
          <div className="auth-landing-feature">
            <h2>{t("auth.landing.feature1Title")}</h2>
            <p>{t("auth.landing.feature1Body")}</p>
          </div>
          <div className="auth-landing-feature">
            <h2>{t("auth.landing.feature2Title")}</h2>
            <p>{t("auth.landing.feature2Body")}</p>
          </div>
          <div className="auth-landing-feature">
            <h2>{t("auth.landing.feature3Title")}</h2>
            <p>{t("auth.landing.feature3Body")}</p>
          </div>
        </div>
        <nav className="auth-landing-links" aria-label={t("auth.landing.learnMore")}>
          <span className="auth-landing-links-label">
            {t("auth.landing.learnMore")}
          </span>
          {LANDING_LINKS.map((link) => (
            <a
              key={link.view}
              href={link.path}
              onClick={(e) => handleFooterClick(e, link.view)}
            >
              {t(link.navKey)}
            </a>
          ))}
        </nav>
      </section>

      <div className="auth-card">
        <div className="auth-logo">SatoriCasino</div>
        <div className="auth-tagline">{t("auth.tagline")}</div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={clsx("auth-tab", tab === "login" && "active")}
            onClick={() => {
              playClick();
              setTab("login");
              setErr("");
            }}
          >
            {t("auth.login")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            className={clsx("auth-tab", tab === "register" && "active")}
            onClick={() => {
              playClick();
              setTab("register");
              setErr("");
            }}
          >
            {t("auth.register")}
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <input
            type="text"
            placeholder={t("auth.displayName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder={t("auth.passphrase")}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            {tab === "login" ? t("auth.enterLounge") : t("auth.createAccount")}
          </button>
        </form>

        <div className="error-msg">{err}</div>
      </div>

      <nav className="auth-footer" aria-label={t("info.common.footerHeading")}>
        {FOOTER_LINKS.map((link) => (
          <a
            key={link.view}
            href={link.path}
            onClick={(e) => handleFooterClick(e, link.view)}
          >
            {t(link.navKey)}
          </a>
        ))}
      </nav>
    </div>
  );
}
