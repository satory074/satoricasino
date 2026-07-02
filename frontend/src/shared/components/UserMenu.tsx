import { useState } from "react";
import { useModalA11y } from "../hooks/useModalA11y";
import { LangToggle } from "./LangToggle";
import { useTranslation } from "../i18n/useTranslation";
import type { UserProfile } from "../types/game";

interface Props {
  displayName: string;
  profile: UserProfile | null;
  muted: boolean;
  bgmOn: boolean;
  toggleMute: () => void;
  toggleBgm: () => void;
  onLogout: () => void;
  playClick: () => void;
}

/**
 * Header user menu: identity, stats, audio / language toggles, and the
 * demoted Logout. Keeps the header itself to logo + coins + one button.
 */
export function UserMenu({
  displayName,
  profile,
  muted,
  bgmOn,
  toggleMute,
  toggleBgm,
  onLogout,
  playClick,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const panelRef = useModalA11y<HTMLDivElement>({ open, onClose: close });
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="user-menu">
      <button
        type="button"
        className="user-menu-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("header.menu")}
        onClick={() => {
          playClick();
          setOpen((o) => !o);
        }}
      >
        <span className="user-menu-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="user-menu-name">{displayName}</span>
      </button>

      {open && (
        <>
          <div className="user-menu-backdrop" onClick={close} />
          <div
            className="user-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("header.menu")}
            tabIndex={-1}
            ref={panelRef}
          >
            <div className="user-menu-head">
              <div className="user-menu-who">{displayName}</div>
              {profile && (
                <div className="user-menu-meta">
                  {profile.level != null && (
                    <span
                      className="level-badge"
                      title={t("header.xpLabel", { xp: profile.xp ?? 0 })}
                    >
                      {t("xp.level", { n: profile.level })}
                    </span>
                  )}
                  <span className="user-menu-record num">
                    {profile.wins}W / {profile.losses}L / {profile.draws}D
                  </span>
                </div>
              )}
            </div>

            <div className="user-menu-row">
              <span className="user-menu-row-label">
                {t("header.soundLabel")}
              </span>
              <button
                type="button"
                className="mute-btn"
                onClick={toggleMute}
                title={muted ? t("header.unmute") : t("header.mute")}
                aria-label={muted ? t("header.unmute") : t("header.mute")}
                aria-pressed={!muted}
              >
                {muted ? "OFF" : "ON"}
              </button>
            </div>
            <div className="user-menu-row">
              <span className="user-menu-row-label">{t("header.bgmLabel")}</span>
              <button
                type="button"
                className="mute-btn"
                onClick={toggleBgm}
                title={bgmOn ? t("header.bgmOff") : t("header.bgmOn")}
                aria-label={bgmOn ? t("header.bgmOff") : t("header.bgmOn")}
                aria-pressed={bgmOn}
              >
                {bgmOn ? "ON" : "OFF"}
              </button>
            </div>
            <div className="user-menu-row">
              <span className="user-menu-row-label">{t("header.lang")}</span>
              <LangToggle />
            </div>

            <button
              type="button"
              className="btn-danger user-menu-logout"
              onClick={() => {
                playClick();
                close();
                onLogout();
              }}
            >
              {t("lobby.logout")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
