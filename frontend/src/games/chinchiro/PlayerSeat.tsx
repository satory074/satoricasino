import clsx from "clsx";
import { Bowl } from "./Bowl";
import { HandLabel } from "./HandLabel";
import { TurnTimer } from "../../shared/components/TurnTimer";
import { useTranslation } from "../../shared/i18n/useTranslation";
import type { EquippedCosmetics } from "../../shared/types/game";
import { getDiceSkinClass } from "../../shared/cosmetics";

interface Props {
  displayName: string;
  isMe: boolean;
  isCurrent: boolean;
  bet: number;
  rolls: [number, number, number][];
  hand: { name: string; eye: number } | null;
  payout: number | null;
  showHand: boolean;
  turnTotalSec: number;
  turnTimerKey: string;
  equipped?: EquippedCosmetics;
}

export function PlayerSeat({
  displayName,
  isMe,
  isCurrent,
  bet,
  rolls,
  hand,
  payout,
  showHand,
  turnTotalSec,
  turnTimerKey,
  equipped,
}: Props) {
  const { t } = useTranslation();
  const latest = rolls.length > 0 ? rolls[rolls.length - 1] : null;
  const skinClass = getDiceSkinClass(equipped);
  return (
    <div
      className={clsx(
        "player-seat",
        isMe && "is-me",
        isCurrent && "is-current",
      )}
    >
      <TurnTimer totalSec={turnTotalSec} resetKey={turnTimerKey} active={isCurrent} />
      <div className="player-name">
        {displayName}
        {isMe && " (You)"}
      </div>
      <div className="player-bet">{bet > 0 ? `Bet ${bet}` : "—"}</div>
      <Bowl dice={latest} rollKey={`${displayName}-${rolls.length}`} size="sm" skinClass={skinClass} />
      {showHand && <HandLabel hand={hand} size="md" />}
      <div className="roll-counter">
        {t("chinchiro.rollCount", { n: rolls.length })}
      </div>
      {payout != null && (
        <div className={clsx("payout-pill", payout > 0 ? "win" : payout < 0 ? "lose" : "push")}>
          {payout > 0 ? `+${payout}` : payout < 0 ? `${payout}` : "PUSH"}
        </div>
      )}
    </div>
  );
}
