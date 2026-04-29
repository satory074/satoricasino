import clsx from "clsx";
import { motion } from "framer-motion";
import { TurnTimer } from "../../shared/components/TurnTimer";
import { Hand } from "../../shared/components/Hand";
import type { PlayerStateData, Result } from "../../shared/types/game";

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

const RESULT_LABEL: Record<Result, string> = {
  win: "WIN",
  lose: "LOSE",
  push: "PUSH",
  blackjack: "BJ",
};

const RESULT_COLOR: Record<Result, string> = {
  win: "#22c55e",
  lose: "#666",
  push: "#3aa9ff",
  blackjack: "#f4c430",
};

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
        {isMe && " (You)"}
      </div>
      <div className="player-bet">{player.bet > 0 ? `Bet ${player.bet}` : "—"}</div>
      <div className="player-cards">
        <Hand cards={player.cards} shake={shake} onCardEvent={onCardEvent} />
      </div>
      <div
        className={clsx(
          "player-value",
          player.is_busted && "busted",
          player.is_blackjack && "bj",
        )}
      >
        {player.is_busted
          ? "BUST"
          : player.is_blackjack
            ? "BLACKJACK!"
            : player.value || ""}
      </div>
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            marginTop: "0.5rem",
            display: "inline-block",
            padding: "0.25rem 0.7rem",
            borderRadius: 999,
            background: RESULT_COLOR[result],
            color: result === "lose" ? "#ddd" : "#1a1a1a",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
          }}
        >
          {RESULT_LABEL[result]}
        </motion.div>
      )}
    </motion.div>
  );
}
