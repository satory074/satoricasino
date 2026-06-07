import { useTranslation } from "../i18n/useTranslation";
import { useModalA11y } from "../hooks/useModalA11y";

interface Props {
  open: boolean;
  onReconnect: () => void;
  onLeave: () => void;
}

/**
 * Blocking overlay shown when the WebSocket has exhausted its reconnect attempts.
 * Replaces the previous silent dead-table state with an explicit recovery path.
 */
export function ConnectionLost({ open, onReconnect, onLeave }: Props) {
  const { t } = useTranslation();
  // Escape is disabled — the player must choose reconnect or leave.
  const cardRef = useModalA11y<HTMLDivElement>({ open, onClose: () => {}, escapeDisabled: true });

  if (!open) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }}>
      <div
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-label={t("connection.lostTitle")}
        tabIndex={-1}
        ref={cardRef}
      >
        <div className="modal-title">{t("connection.lostTitle")}</div>
        <div className="modal-msg">{t("connection.lostMsg")}</div>
        <button className="btn-primary" onClick={onReconnect} style={{ marginBottom: "0.5rem" }}>
          {t("connection.reconnect")}
        </button>
        <button className="btn-secondary" onClick={onLeave}>
          {t("common.backToLobby")}
        </button>
      </div>
    </div>
  );
}
