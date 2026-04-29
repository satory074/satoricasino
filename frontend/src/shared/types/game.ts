export type Phase =
  | "waiting"
  | "betting"
  | "dealing"
  | "player_turns"
  | "dealer_turn"
  | "resolution";

export type Result = "win" | "lose" | "push" | "blackjack";

export interface CardData {
  suit: string;
  rank: string;
}

export interface PlayerStateData {
  display_name: string;
  cards: CardData[];
  value: number;
  bet: number;
  is_busted: boolean;
  is_blackjack: boolean;
  is_standing: boolean;
}

export interface GameState {
  phase: Phase;
  dealer_cards: CardData[];
  dealer_value: number | null;
  players: Record<string, PlayerStateData>;
  current_player_id: string | null;
  results: Record<string, Result> | null;
  game_type?: string;
}

export type WSMessage =
  | ({ type: "game_state" } & GameState)
  | { type: "player_joined"; player_id: string; display_name: string }
  | { type: "player_left"; player_id: string; display_name: string }
  | { type: "bet_placed"; player_id: string; amount: number }
  | { type: "auto_stand"; player_id: string }
  | { type: "error"; message: string };

export interface UserProfile {
  user_id: string;
  display_name: string;
  coins: number;
  wins: number;
  losses: number;
  draws: number;
  last_daily_bonus?: string | null;
  last_bailout?: string | null;
}

export interface TableInfo {
  table_id: string;
  name: string;
  player_count: number;
  max_players: number;
  min_bet: number;
  status: string;
  game_type: string;
}

export interface AuthData {
  token: string;
  user_id: string;
  display_name: string;
}
