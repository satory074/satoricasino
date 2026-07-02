import clsx from "clsx";
import { motion } from "framer-motion";
import { TurnTimer } from "../../shared/components/TurnTimer";
import { Hand } from "../../shared/components/Hand";
import type { PlayerStateData, Result } from "../../shared/types/game";
import { getCardSkinClass } from "../../shared/cosmetics";
import { useTranslation } from "../../shared/i18n/useTranslation";

interface Props {
  playerId: string;
  player: PlayerStateData;
  isMe: boolean;
  isCurrent: boolean;
  result: Result | null;
  turnTimerKey: string;
  turnTotalSec: number;
  shake: boolean;
  onCardEvent?: () => void;
}

export function PlayerBox({
  playerId,
  player,
  isMe,
  isCurrent,
  result,
  turnTimerKey,
  turnTotalSec,
  shake,
  onCardEvent,
}: Props) {
  void playerId;
  const { t } = useTranslation();
  const skinClass = getCardSkinClass(player.equipped);
  const resultLabel = result ? t(`blackjack.resultBadge.${result}`) : null;
  return (
    <motion.div
      className={clsx("player-box", isMe && "is-me", isCurrent && "is-current")}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <TurnTimer totalSec={turnTotalSec} resetKey={turnTimerKey} active={isCurrent} />
      <div className="player-name">
        {player.display_name}
        {isMe && ` ${t("leaderboard.you")}`}
      </div>
      <div className="player-bet">
        {player.bet > 0 ? `${t("betArea.bet")} ${player.bet}` : "—"}
      </div>
      <div className="player-cards">
        <Hand cards={player.cards} shake={shake} onCardEvent={onCardEvent} skinClass={skinClass} />
      </div>
      <div
        className={clsx(
          "player-value",
          player.is_busted && "busted",
          player.is_blackjack && "bj",
        )}
        aria-label={
          player.value
            ? t("blackjack.handValueLabel", { n: player.value })
            : undefined
        }
      >
        {player.is_busted
          ? t("results.bust")
          : player.is_blackjack
            ? t("blackjack.inlineBlackjack")
            : player.value || ""}
      </div>
      {result && resultLabel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`result-badge result-badge--${result}`}
        >
          {resultLabel}
        </motion.div>
      )}
    </motion.div>
  );
}
