import { useTranslation } from "../shared/i18n/useTranslation";

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
  view: InfoView;
  onClose: () => void;
  onNavigate: (view: InfoView) => void;
}

interface PageDef {
  rootKey:
    | "privacy"
    | "terms"
    | "about"
    | "responsible"
    | "blackjackGuide"
    | "chinchiroGuide"
    | "faq"
    | "gettingStarted"
    | "glossary"
    | "contact";
  sections: readonly string[];
  lastUpdated: string;
}

const PAGES: Record<InfoView, PageDef> = {
  "info-privacy": {
    rootKey: "privacy",
    sections: ["collection", "cookies", "thirdParty", "retention", "contact"],
    lastUpdated: "2026-05-23",
  },
  "info-terms": {
    rootKey: "terms",
    sections: [
      "eligibility",
      "virtualCoins",
      "prohibitedConduct",
      "accountTermination",
      "disclaimer",
      "liability",
      "changes",
    ],
    lastUpdated: "2026-05-23",
  },
  "info-about": {
    rootKey: "about",
    sections: ["mission", "howToPlay", "blackjack", "chinchiro", "features"],
    lastUpdated: "2026-05-23",
  },
  "info-responsible": {
    rootKey: "responsible",
    sections: [
      "noRealMoney",
      "bailout",
      "timeAwareness",
      "ageRequirement",
      "problemGambling",
    ],
    lastUpdated: "2026-05-23",
  },
  "info-blackjack-guide": {
    rootKey: "blackjackGuide",
    sections: [
      "overview",
      "cardValues",
      "gameFlow",
      "actions",
      "payouts",
      "basicStrategy",
      "oddsAndEdge",
      "terminology",
    ],
    lastUpdated: "2026-06-07",
  },
  "info-chinchiro-guide": {
    rootKey: "chinchiroGuide",
    sections: [
      "overview",
      "gameFlow",
      "hands",
      "oddsAndPayouts",
      "bankerStrategy",
      "playerStrategy",
      "terminology",
    ],
    lastUpdated: "2026-06-07",
  },
  "info-faq": {
    rootKey: "faq",
    sections: [
      "isItRealMoney",
      "howToGetCoins",
      "whatIsBailout",
      "dailyChallenges",
      "streaksAndXp",
      "cosmetics",
      "spectateMode",
      "leaderboard",
      "languageSupport",
      "accountAndPassphrase",
      "dataDeletion",
      "whoRunsIt",
    ],
    lastUpdated: "2026-06-07",
  },
  "info-getting-started": {
    rootKey: "gettingStarted",
    sections: [
      "createAccount",
      "chooseGame",
      "chooseTable",
      "placingBets",
      "controls",
      "whenCoinsRunOut",
      "progression",
    ],
    lastUpdated: "2026-06-07",
  },
  "info-glossary": {
    rootKey: "glossary",
    sections: ["general", "blackjackTerms", "chinchiroTerms", "siteTerms"],
    lastUpdated: "2026-06-07",
  },
  "info-contact": {
    rootKey: "contact",
    sections: ["howToReach", "operator", "otherInquiries"],
    lastUpdated: "2026-06-07",
  },
};

const NAV_VIEWS: { view: InfoView; navKey: string }[] = [
  { view: "info-getting-started", navKey: "info.nav.gettingStarted" },
  { view: "info-blackjack-guide", navKey: "info.nav.blackjackGuide" },
  { view: "info-chinchiro-guide", navKey: "info.nav.chinchiroGuide" },
  { view: "info-faq", navKey: "info.nav.faq" },
  { view: "info-glossary", navKey: "info.nav.glossary" },
  { view: "info-about", navKey: "info.nav.about" },
  { view: "info-contact", navKey: "info.nav.contact" },
  { view: "info-responsible", navKey: "info.nav.responsible" },
  { view: "info-privacy", navKey: "info.nav.privacy" },
  { view: "info-terms", navKey: "info.nav.terms" },
];

export function InfoPage({ view, onClose, onNavigate }: Props) {
  const { t } = useTranslation();
  const def = PAGES[view];
  const root = `info.${def.rootKey}`;

  const handleNavigate = (
    e: React.MouseEvent<HTMLAnchorElement>,
    target: InfoView,
  ) => {
    e.preventDefault();
    onNavigate(target);
  };

  const handleHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="info-section">
      <header className="info-header">
        <a className="info-home-link" href="/" onClick={handleHome}>
          {t("info.common.siteName")}
        </a>
        <button type="button" className="info-back-btn" onClick={onClose}>
          {t("info.common.back")}
        </button>
      </header>

      <main className="info-content">
        <h1>{t(`${root}.title`)}</h1>
        <p className="info-meta">
          {t("info.common.lastUpdated", { date: def.lastUpdated })}
        </p>
        <p className="info-intro">{t(`${root}.intro`)}</p>

        {def.sections.map((sectionId) => {
          const bodyKey = `${root}.sections.${sectionId}.body`;
          const titleKey = `${root}.sections.${sectionId}.title`;
          const body = t(bodyKey);
          const paragraphs = body.split("\n\n");
          return (
            <section key={sectionId} className="info-section-block">
              <h2>{t(titleKey)}</h2>
              {paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </section>
          );
        })}

        <footer className="info-footer">
          <h3>{t("info.common.footerHeading")}</h3>
          <ul className="info-nav-list">
            {NAV_VIEWS.filter((n) => n.view !== view).map((n) => {
              const path = INFO_PATHS[n.view];
              return (
                <li key={n.view}>
                  <a
                    href={path}
                    onClick={(e) => handleNavigate(e, n.view)}
                  >
                    {t(n.navKey)}
                  </a>
                </li>
              );
            })}
            <li>
              <a href="/" onClick={handleHome}>
                {t("info.common.back")}
              </a>
            </li>
          </ul>
        </footer>
      </main>
    </div>
  );
}

const INFO_PATHS: Record<InfoView, string> = {
  "info-privacy": "/privacy",
  "info-terms": "/terms",
  "info-about": "/about",
  "info-responsible": "/responsible-gaming",
  "info-blackjack-guide": "/games/blackjack",
  "info-chinchiro-guide": "/games/chinchiro",
  "info-faq": "/faq",
  "info-getting-started": "/getting-started",
  "info-glossary": "/glossary",
  "info-contact": "/contact",
};
