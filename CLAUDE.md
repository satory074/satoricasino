# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SatoriCasino — multi-game casino web app. Currently ships **Blackjack** and **Chinchiro** (Japanese 3-dice gambling). Tables, coins, daily bonus, and bailout are shared across all games. The architecture is set up so adding a third game is mostly additive (see "Adding a new game" below).

## Stack

- **Backend**: FastAPI + WebSocket (Python 3.12). Firestore (Firebase Admin SDK) for users/coins/stats. JWT auth via `python-jose`.
- **Frontend**: Vite + React 19 + TypeScript. CSS keyframes for all gameplay animations (cards, dice, result overlays); Framer Motion only for layout/hover transitions. Audio is synthesized at runtime with Web Audio API — there are no audio assets.
- **Hosting**: Backend on Cloud Run, frontend on Firebase Hosting. Both projects use `satoricasino` as the GCP/Firebase project ID.

## Common commands

```bash
# Backend
uv sync
uv run uvicorn backend.main:app --reload --port 8000
uv run pytest                                  # 67 tests
uv run pytest tests/test_chinchiro.py          # one test file
uv run pytest -k "test_pinzoro"                # one test by name

# Frontend
cd frontend
npm install
npm run dev                                    # Vite at :5173, proxies /api + /ws → :8000
npm run build                                  # tsc -b && vite build → frontend/dist/ (also acts as type-check)
npm run preview                                # No `lint` script — `build` is the type-check.

# Production deploy
firebase deploy --only hosting                 # frontend (~30s)
gcloud run deploy satoricasino --source . --region asia-northeast1 \
  --project satoricasino --allow-unauthenticated --quiet  # backend (~3 min)
```

The backend needs Firebase Admin credentials via Application Default Credentials. If `gcloud config get-value project` is not `satoricasino`, set `GOOGLE_CLOUD_PROJECT=satoricasino` or run `gcloud auth application-default login` against the right project — Firestore will 403 otherwise. `PASSPHRASE` env var gates registration (default `satoricasino`).

## Architecture: multi-game

Both client and server route by a string `game_type` field. The protocol-level seam is small; the game-specific logic lives in dedicated modules.

### Backend layout

```
backend/
├── main.py                # FastAPI app, WS endpoint, action dispatch by game_type
├── game/
│   ├── blackjack.py       # BlackjackGame class + Phase + Result
│   ├── chinchiro.py       # ChinchiroGame class + Phase + HandName + payout helpers
│   └── deck.py            # Card / hand_value / SUITS / RANKS — shared by any card game
├── achievements.py    # 27 achievement definitions + check_achievements() + progress query
│── challenges.py      # Daily challenge pool, deterministic selection, baseline tracking
├── auth.py, database.py, websocket_manager.py, models.py, config.py
```

`backend/main.py` holds:
- `SUPPORTED_GAMES` set (currently `{"blackjack", "chinchiro"}`)
- `SEED_TABLES` list + `_seed_tables()` — fixed casino-owned tables (Low/Mid/High per game) populated at module load. Players join, never create.
- `_make_game(game_type)` factory
- `_broadcast_state(table_id)` that branches into `_broadcast_blackjack` / `_broadcast_chinchiro` (each handles its own payout + stats update)
- WS `websocket_endpoint` dispatches to `_handle_blackjack_action` / `_handle_chinchiro_action`
- Game-specific turn timers (`_bj_turn_timeout`, `_cc_turn_timeout`) and the chinchiro banker async sequence (`_chinchiro_banker_sequence` — rolls one die set at a time with sleeps for animation pacing)

Tables are kept in an in-memory `tables: dict[str, dict]` keyed by stable IDs (e.g. `bj-low`, `cc-high`) with shape `{name, min_bet, game, game_type}`. When the last human leaves, the WS cleanup rebuilds a fresh `game` instance and respawns a bot — fixed tables persist across the table being empty. Cloud Run instance restarts wipe in-memory state, but `_seed_tables()` re-creates the same six tables with the same IDs and the FastAPI `lifespan` handler reseeds bots, so links/bookmarks remain stable. Only persistent state lives in Firestore.

### AI bots

A bot fills any table that has zero humans so the floor never looks dead. One bot per table at most; bots step out the moment a real human connects (`_despawn_bots` cancels the driver task and rebuilds the game). They share the live game state and broadcast as ordinary players, but are virtual: IDs prefixed `bot-`, no Firestore record, and `_broadcast_blackjack` / `_broadcast_chinchiro` skip them when writing payouts and stats. Behaviour lives in `_run_bot_driver` → `_bot_step_blackjack` / `_bot_step_chinchiro` (Blackjack: hit < 17, stand otherwise; Chinchiro: roll until settled), bets are always `min_bet`, and each action is paced 1.5–2.5 s for human-feeling tempo.

### Engagement systems

Several systems drive retention and are wired through `_broadcast_blackjack` / `_broadcast_chinchiro`:

- **Per-game career stats** (`game_stats` map on each user doc): wins/losses/draws/total_wagered/total_won/biggest_win/hands_played per game type. Updated via `update_game_stats()` on each round resolution.
- **Win streaks** (`streaks` + `best_streaks` maps): persisted server-side, `update_streaks()` increments on win, resets on loss, draws unchanged. Frontend initializes from profile on load.
- **XP & Levels** (`xp`, `level`): XP_ROUND(10) + XP_WIN(15) + XP_JACKPOT(30) per round, XP_DAILY(5) on bonus claim, XP_ACHIEVEMENT(50) per unlock. `level = floor(sqrt(xp/100)) + 1`. WS `level_up` message sent on level change.
- **Achievements** (`backend/achievements.py`): 27 definitions checked via `check_achievements(user_data)` after each round. Newly unlocked IDs stored in `unlocked_achievements` map. WS `achievement_unlocked` sent per unlock. `GET /api/achievements` returns all definitions with progress.
- **Daily challenges** (`backend/challenges.py`): 12-challenge pool, 3 picked deterministically per user per day via `hash(user_id + date)`. Baselines snapshotted on first daily access. `GET /api/challenges`, `POST /api/challenges/{id}/claim`.
- **Login streaks** (daily bonus): Day1=100 → Day7=500 coins, resets after day 7. `daily_streak` on user doc.
- **Leaderboard** (`GET /api/leaderboard?metric=coins|wins`): queries Firestore directly, returns top 10 + user's rank.
- **Reactions**: 6 presets (gg/nice/wow/ouch/lol/gl), WS `{"action":"react","emoji":"gg"}` → broadcast to table, 3s cooldown, no persistence. `ReactionBar` + `ReactionFloat` components.
- **Spectator mode**: `?spectate=true` on WS connection — receives broadcasts, no game participation, can only react. `Watch` button in lobby on occupied tables.
- **Player profile** (`GET /api/profile/{user_id}`): public stats (no coins), level, achievements, game stats.

### Frontend layout

```
frontend/src/
├── App.tsx                # top-level routing (auth | lobby | game), header, audio toggles
├── auth/Auth.tsx
├── lobby/Lobby.tsx        # 2-step lobby: clickable game cards → filtered table list per game
│          Leaderboard.tsx # Top-10 modal (coins/wins), fetches GET /api/leaderboard
│          AchievementList.tsx # Full achievement grid with progress bars
│          Challenges.tsx  # Daily challenge cards with progress + claim buttons
├── games/
│   ├── GameRouter.tsx     # switch on gameType → render BlackjackGame / ChinchiroGame
│   ├── blackjack/         # BlackjackGame, DealerArea, PlayerBox
│   └── chinchiro/         # ChinchiroGame, BankerArea, PlayerSeat, Bowl, Die, HandLabel
├── shared/
│   ├── api/api.ts, useGameSocket.ts
│   ├── audio/sounds.ts, useAudio.ts   # synthesized SFX + ambient BGM
│   ├── components/        # Card, Hand, Chip, BetArea, TurnTimer, ResultOverlay,
│   │                      # ActionButton, KeyHintBar, StreakBadge, LangToggle,
│   │                      # AchievementToast, ReactionBar, ReactionFloat
│   ├── i18n/              # I18nProvider + useTranslation + locales/{ja,en}.ts
│   └── types/game.ts      # WS message types incl. ChinchiroGameState
├── styles/theme.css
```

i18n is in-house (no library). `locales/ja.ts` is the source of truth — its `Translation` type forces `en.ts` to provide a matching English entry for every key. `t("path.to.key", { name: value })` does dot-path lookup with `{name}` interpolation; missing keys fall back to ja, then to the key itself. Initial language reads `localStorage["sc:lang"]`, then `navigator.language` on first visit. Server payloads use stable enum IDs (`HandName.value`, `Result.value`) and structured table_ids (`bj-low`, `cc-high`) — translation lives entirely on the client; do not return display strings from the server.

`useGameSocket` is generic and returns `gameState: unknown`-shaped data; each game component narrows it (`as ChinchiroGameState`). `App.tsx` wires `GameRouter` with the table's `game_type` so the right component renders even before the first WS message arrives.

### UX clarity conventions

Action affordance and "whose turn" cues are normalized across games — re-use the helpers, don't reinvent:

- **`ActionButton` instead of raw `<button>` for game actions.** Always render the action even when it's not the player's turn, and pass `disabled` + a Japanese `reason` string. The button shows the reason as a `title` tooltip and grays out instead of disappearing — players don't get confused about where the buttons went.
- **`highlight` prop = CTA pulse.** Set it on all available actions the player can take right now (Hit/Stand/Double during your BJ turn, Roll during your chinchiro turn, Start/New Round at the bookends). The `is-cta` gold pulse comes for free.
- **`KeyHintBar` is the bottom dock for shortcuts.** Each game owns a `useEffect` that listens to `window.keydown` and dispatches the same callbacks the buttons use; the hint bar then mirrors which keys are live. Inputs/textareas are exempt inside the keydown handler — preserve that.
- **`has-current` class on `.players-area`.** When `current_player_id` is set, attach this class so non-current seats dim via CSS (`filter: saturate(0.6) brightness(0.88)`). This is what makes "your turn" obvious at a glance.
- **Per-game win streak.** `App.tsx` keeps `streaks: Record<string, number>` keyed by `game_type`, mutated in `onResolve` via a `tableGameTypeRef`. The header `StreakBadge` shows the active game's streak with tier-1/2/3 styling at 3/5/10. New games get this for free as long as `onResolve(delta)` is called from the game component on resolution.

### Result overlay: 3-phase reveal

`ResultOverlay` drives a CSS-only phase state machine: **anticipation** (dark backdrop + pulsing color-coded orb) → **reveal** (explosive `scale(0.2→1.4→1)` text + rim glow) → **afterglow** (amount counts up from 0, text fades out). Timing scales by result significance via `getTiming(kind)` — pinzoro gets 3.4s total, losses get 1.15s, push/wakare skip anticipation entirely.

Game components interact via two callbacks:
- `onReveal`: fires when reveal phase starts — play result SFX, fire confetti, set `is-shaking` class on `.game-section` for jackpots (pinzoro/blackjack/arashi)
- `onComplete`: fires when all phases finish — clear overlay state, remove shake class

Anticipation SFX (`anticipation_jackpot` / `anticipation_win` / `anticipation_lose`) are played by the game component when setting the overlay, not by `ResultOverlay` itself. The `SoundId` types in `GameRouter.tsx`, `BlackjackGame.tsx`, and `ChinchiroGame.tsx` must stay in sync with `sounds.ts` — each is a local type alias.

Screen shake uses a CSS `@keyframes screen-shake` animation on `.game-section.is-shaking`, disabled by `@media (prefers-reduced-motion: reduce)`.

### Design notes

`docs/design-notes/` holds the research that drove non-trivial UX decisions (excitement effects, "next action" clarity). When making another large UX change, drop a note there — it saves the next contributor from re-doing the literature review.

### WS protocol

Endpoint: `/ws/table/{table_id}?token=...`. Single message envelope:

```jsonc
// server → client
{"type": "game_state", "game_type": "blackjack" | "chinchiro", ...}
{"type": "player_joined" | "player_left", "player_id": "...", "display_name": "..."}
{"type": "bet_placed", "player_id": "...", "amount": 100}
{"type": "auto_stand", "player_id": "..."}
{"type": "error", "message": "..."}
{"type": "achievement_unlocked", "achievement_id": "first_win"}
{"type": "level_up", "level": 5, "xp": 1600}
{"type": "reaction", "player_id": "...", "display_name": "...", "emoji": "gg"}

// client → server
{"action": "start"}                            // no payload
{"action": "bet", "amount": 100}               // amount required
{"action": "hit" | "stand" | "double"}         // blackjack, no payload
{"action": "roll"}                             // chinchiro, no payload
{"action": "new_round"}                        // no payload
{"action": "react", "emoji": "gg"}             // broadcast to table, 3s cooldown
```

Action vocabulary is intentionally not namespaced — actions are unique per game today. Add a prefix (`{game}.{action}`) only if collisions appear.

## Adding a new game

This is the most useful contribution shape. To add e.g. roulette without touching blackjack or chinchiro:

1. **Backend logic**: write `backend/game/roulette.py` with phases, action methods, `get_state()`, `calculate_payout_for(player_id)`. Mirror the existing class shape. For card-based games, reuse `backend/game/deck.py` (`Card`, `hand_value`, `SUITS`, `RANKS`) instead of redefining.
2. **Backend wiring** (`backend/main.py`): add `"roulette"` to `SUPPORTED_GAMES`, extend `_make_game`, write `_broadcast_roulette`, write `_handle_roulette_action`, add a branch in `_broadcast_state` and the WS endpoint.
3. **Seed tables** (`backend/main.py`): add Low/Mid/High roulette entries (e.g. `rl-low/mid/high`) to `SEED_TABLES` so they appear in the lobby on next restart.
4. **Bot driver** (`backend/main.py`): write `_bot_step_roulette` and add a branch for `"roulette"` in `_run_bot_driver`. Without this the bot will spawn at the seeded table but never act, leaving the table stuck in WAITING.
5. **Backend tests**: `tests/test_roulette.py` following the `TestRouletteGame` class style in `test_blackjack.py` / `test_chinchiro.py`.
6. **Frontend types** (`shared/types/game.ts`): add `RouletteGameState` interface.
7. **Frontend components**: create `games/roulette/RouletteGame.tsx` and any sub-components.
   - **Use shared helpers**: `ActionButton` (not raw `<button>`) with `disabled` + `reason` for game actions, `highlight` on all available actions the player can take now, and the `has-current` class on `.players-area` whenever `current_player_id` is set. See "UX clarity conventions" above.
   - **Match the 3-row shell**: keep `<div className="game-section">` with this child order — `.game-topbar` (auto-height), `.game-table` (the scrollable stage; place dealer/board, `.players-area`, and `.game-log-area` inside it), then `.game-actions` as a **sibling** of `.game-table` (NOT a child — it's the bottom action dock and must sit outside the scroll container), then `<KeyHintBar />`, then `<ResultOverlay />`. See blackjack/chinchiro for canonical structure.
   - **Bespoke result kinds** (only if needed): if the game introduces names like chinchiro's `pinzoro`/`arashi`/`shigoro`/`hifumi`/`menashi`/`wakare`, extend `ResultKind` in `shared/components/ResultOverlay.tsx` and update `RIM_GLOW_KINDS` / `POSITIVE_AMOUNT_KINDS` so glow + amount-color rendering classifies the new kinds correctly. Update `getTiming()` with appropriate anticipation/reveal/afterglow durations for new kinds.
   - **Mobile sizing**: for visual elements that scale (boards, wheels, tokens), use `clamp()` for dimensions and `min(Npx, 100%)` for box widths — see "Sharp edges" Mobile entry.
8. **Frontend wiring**: add `case "roulette"` in `GameRouter.tsx`, add `{value:"roulette", icon:"..."}` to `SUPPORTED_GAMES` in `Lobby.tsx` (label/tagline come from i18n — see step 11). The streak counter in `App.tsx` keys on `tableGameType`, so it picks up new games automatically as long as the component calls `onResolve(delta)` on resolution.
9. **Keyboard shortcuts + hint bar**: add a `useEffect` window-keydown handler inside the game component that calls the same action callbacks the buttons use, and feed a `KeyHint[]` into `<KeyHintBar />` so the dock reflects what's live in this phase.
10. **Audio (optional)**: add SoundIds in `shared/audio/sounds.ts` and the synthesis recipes (use existing `tone()` / `noiseBurst()` / `chord()` helpers).
11. **i18n**: extend `shared/i18n/locales/ja.ts` with `games.roulette.{label,tagline}`, `tables.rl.{low,mid,high}`, plus any reasons / phase banners / button labels you introduce. The `Translation` type then forces matching English entries in `en.ts`. Use `t(key, params)` everywhere — never hardcode display strings.

Cross-game stats on `users.{wins, losses, draws}` are updated in `_broadcast_*` based on the per-game payout sign — keep that pattern.

## Sharp edges to know

- **Animations must work in hidden tabs.** Browsers pause `requestAnimationFrame` when a tab is in the background, freezing Framer Motion mid-animation. Cards, dice, and result overlays all use pure CSS `@keyframes` (which run on the compositor) for entry/phase animations specifically because of this. Reserve Framer Motion for layout / hover / one-shot transitions where freezing is acceptable.
- **Chinchiro banker reserve**: server requires `coins >= bet * 5` to place a chinchiro bet (banker pinzoro can take 5x). The `BetArea` ceiling is `floor(coins/5)` accordingly. Don't loosen one without the other.
- **`firebase.json` cache headers** force `index.html` to `no-cache` while hashed asset bundles get a 1-year `immutable` cache. This was added because Firebase was serving a stale `index.html` after deploys. Don't remove without a replacement strategy.
- **Cloud Run cold starts** wipe all in-memory tables. Don't put session-critical state outside Firestore.
- **Firestore project mismatch** is the most common local-dev failure. The error looks like a Cloud-side 403 about Firestore API not enabled — actually it's that ADC points at a different GCP project.
- **Audio scheduling on a fresh `AudioContext`**: a clip whose `duration < release` schedules `setValueAtTime` at a negative absolute time when `currentTime ≈ 0`, throws `RangeError`, and (because it's synchronous inside React onClick handlers) prevents subsequent `setState` from running. `tone()` clamps `start` to `currentTime` and derives `sustainEnd / decayEnd` defensively — keep that pattern when adding helpers; don't compute envelope timestamps from raw `start + duration - release`.
- **Mobile layout has three MQ tiers** in `theme.css`, and breaking the convention is the easy way to ship horizontal scroll on iPhone SE. Sizing rules: use `clamp(min, vw, max)` for elements that should scale (bowls, dice, card-shells, paddings) and keep the upper bound equal to the previous fixed value so PC stays pixel-identical; use `min-width: min(Npx, 100%)` for boxes/seats so they collapse instead of forcing scroll; never introduce a raw fixed width > ~280px without a `min(...)` cap. Tier usage: `@media (max-width: 600px)` is for type-size tweaks only, `@media (max-width: 480px)` does layout reflow (`.table-card` column-stack, `.player-box` 2-col, `.user-stats`/`.user-name`/`.audio-bgm`/`.lang-toggle` hidden in header, `.app-logo` shrunk, `.chip` 48px, `.game-log-area` capped at 6rem), and `@media (hover: none) and (pointer: coarse)` hides `.key-hint-bar` because it documents keyboard shortcuts — don't ship new keyboard-only UI without a touch fallback.
- **App shell is a single-viewport flex column with one scrolling region per view.** `#root` is locked to the viewport (`min-height: 100svh; height: 100dvh; overflow: hidden`) so the page itself never scrolls — instead, exactly one child does: `.lobby-section` and `.auth-section` scroll themselves, and inside `.game-section` the `.game-table` is the scroll stage while `.game-actions` is a sibling sitting at the bottom (it never scrolls away). Don't reintroduce body-level scroll, don't put the action dock inside `.game-table` (it'll scroll out of view), and keep `overscroll-behavior: contain` on each scrolling region so iOS rubber-band doesn't bleed past it. `viewport-fit=cover, interactive-widget=resizes-content` in `index.html` is what makes `env(safe-area-inset-*)` non-zero and makes Android Chrome shrink the viewport for the keyboard.

## Audio

All SFX are generated at runtime in `shared/audio/sounds.ts` via a small synth (`tone`, `noiseBurst`, `chord` helpers wired to a single `AudioContext`). The first user gesture unlocks the context (browser autoplay policy). Mute and BGM toggles persist in `localStorage`.

To add a sound: extend the `SoundId` union, add a `case` in the `play()` switch, compose with the helpers. No asset files involved.

## Testing conventions

`tests/test_<game>.py` uses pytest classes grouped by unit (`TestEvaluateDice`, `TestPayout`, `TestGameFlow`). Game-flow tests use `monkeypatch.setattr(game, "_roll", ...)` to inject deterministic dice / cards. Run with `uv run pytest`.
