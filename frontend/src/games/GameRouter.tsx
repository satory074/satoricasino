import { BlackjackGame } from "./blackjack/BlackjackGame";

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
  | "tick";

interface Props {
  gameType: string;
  tableId: string;
  onLeave: () => void;
  myCoins: number;
  onResolve: (delta: number) => void;
  play: (id: SoundId) => void;
}

export function GameRouter({ gameType, ...rest }: Props) {
  switch (gameType) {
    case "blackjack":
      return <BlackjackGame {...rest} />;
    default:
      return (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-mute)" }}>
          Unsupported game: {gameType}
        </div>
      );
  }
}
