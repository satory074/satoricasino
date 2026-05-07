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

export interface EquippedCosmetics {
  card_skin?: string;
  dice_skin?: string;
  table_theme?: string;
}

export interface CosmeticItem {
  id: string;
  category: string;
  price: number;
  css_class: string;
  achievement?: string;
}

export interface PlayerStateData {
  display_name: string;
  cards: CardData[];
  value: number;
  bet: number;
  is_busted: boolean;
  is_blackjack: boolean;
  is_standing: boolean;
  equipped?: EquippedCosmetics;
}

export interface TableHeat {
  jackpots5min: number;
  hot: boolean;
  ultra_hot: boolean;
}

export interface GameState {
  phase: Phase;
  dealer_cards: CardData[];
  dealer_value: number | null;
  players: Record<string, PlayerStateData>;
  current_player_id: string | null;
  results: Record<string, Result> | null;
  game_type?: string;
  table_heat?: TableHeat;
}

export type WSMessage =
  | ({ type: "game_state" } & GameState)
  | { type: "player_joined"; player_id: string; display_name: string }
  | { type: "player_left"; player_id: string; display_name: string }
  | { type: "bet_placed"; player_id: string; amount: number }
  | { type: "auto_stand"; player_id: string }
  | { type: "error"; message: string }
  | { type: "achievement_unlocked"; achievement_id: string }
  | { type: "level_up"; level: number; xp: number }
  | { type: "reaction"; player_id: string; display_name: string; emoji: string };

export interface GameStatsEntry {
  wins: number;
  losses: number;
  draws: number;
  total_wagered: number;
  total_won: number;
  biggest_win: number;
  hands_played: number;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  coins: number;
  wins: number;
  losses: number;
  draws: number;
  last_daily_bonus?: string | null;
  last_bailout?: string | null;
  game_stats?: Record<string, GameStatsEntry>;
  streaks?: Record<string, number>;
  best_streaks?: Record<string, number>;
  daily_streak?: number;
  xp?: number;
  level?: number;
  unlocked_achievements?: Record<string, string>;
  ad_watches_today?: number;
  last_ad_date?: string | null;
  owned_cosmetics?: Record<string, string>;
  equipped?: EquippedCosmetics;
}

export interface AchievementInfo {
  id: string;
  category: string;
  threshold: number;
  progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  coins: number;
  wins: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  my_rank: number | null;
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

// === Chinchiro types ===

export type ChinchiroPhase =
  | "waiting"
  | "betting"
  | "banker_roll"
  | "player_rolls"
  | "resolution";

export interface ChinchiroHand {
  name: string; // "pinzoro" | "arashi" | "shigoro" | "me" | "hifumi" | "menashi"
  eye: number;
}

export interface ChinchiroPlayerState {
  display_name: string;
  bet: number;
  rolls: [number, number, number][];
  settled: boolean;
  hand: ChinchiroHand | null;
  equipped?: EquippedCosmetics;
}

export interface ChinchiroGameState {
  phase: ChinchiroPhase;
  banker_rolls: [number, number, number][];
  banker_hand: ChinchiroHand | null;
  players: Record<string, ChinchiroPlayerState>;
  current_player_id: string | null;
  payouts: Record<string, number> | null;
  game_type: "chinchiro";
  table_heat?: TableHeat;
}
