import { BlackjackGame } from "./blackjack/BlackjackGame";
import { ChinchiroGame } from "./chinchiro/ChinchiroGame";

type SoundId =
  | "card_deal"
  | "card_flip"
  | "chip_place"
  | "chip_payout"
  | "button_click"
  | "hit"
  | "stand"
  | "win"
  | "big_win"
  | "blackjack"
  | "lose"
  | "bust"
  | "push"
  | "near_miss"
  | "tick"
  | "dice_shake"
  | "dice_land"
  | "pinzoro"
  | "arashi"
  | "shigoro"
  | "hifumi"
  | "menashi"
  | "heartbeat"
  | "anticipation_jackpot"
  | "anticipation_win"
  | "anticipation_lose";

interface Props {
  gameType: string;
  tableId: string;
  onLeave: () => void;
  myCoins: number;
  onResolve: (delta: number) => void;
  play: (id: SoundId) => void;
  spectate?: boolean;
  tableThemeClass?: string;
}

export function GameRouter({ gameType, spectate, tableThemeClass, ...rest }: Props) {
  switch (gameType) {
    case "blackjack":
      return <BlackjackGame {...rest} spectate={spectate} tableThemeClass={tableThemeClass} />;
    case "chinchiro":
      return <ChinchiroGame {...rest} spectate={spectate} tableThemeClass={tableThemeClass} />;
    default:
      return (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-mute)" }}>
          Unsupported game: {gameType}
        </div>
      );
  }
}
