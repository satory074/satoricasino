# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SatoriCasino — multi-game casino web app. Currently ships **Blackjack** and **Chinchiro** (Japanese 3-dice gambling). Tables, coins, daily bonus, and bailout are shared across all games. The architecture is set up so adding a third game is mostly additive (see "Adding a new game" below).

## Stack

- **Backend**: FastAPI + WebSocket (Python 3.12). Firestore (Firebase Admin SDK) for users/coins/stats. JWT auth via `python-jose`.
- **Frontend**: Vite + React 19 + TypeScript. Framer Motion + CSS keyframes for animation. Audio is synthesized at runtime with Web Audio API — there are no audio assets.
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
│   └── chinchiro.py       # ChinchiroGame class + Phase + HandName + payout helpers
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

### Frontend layout

```
frontend/src/
├── App.tsx                # top-level routing (auth | lobby | game), header, audio toggles
├── auth/Auth.tsx
├── lobby/Lobby.tsx        # 2-step lobby: clickable game cards → filtered table list per game
├── games/
│   ├── GameRouter.tsx     # switch on gameType → render BlackjackGame / ChinchiroGame
│   ├── blackjack/         # BlackjackGame, DealerArea, PlayerBox
│   └── chinchiro/         # ChinchiroGame, BankerArea, PlayerSeat, Bowl, Die, HandLabel
├── shared/
│   ├── api/api.ts, useGameSocket.ts
│   ├── audio/sounds.ts, useAudio.ts   # synthesized SFX + ambient BGM
│   ├── components/        # Card, Hand, Chip, BetArea, TurnTimer, ResultOverlay,
│   │                      # ActionButton, KeyHintBar, StreakBadge, LangToggle
│   ├── i18n/              # I18nProvider + useTranslation + locales/{ja,en}.ts
│   └── types/game.ts      # WS message types incl. ChinchiroGameState
├── styles/theme.css
```

i18n is in-house (no library). `locales/ja.ts` is the source of truth — its `Translation` type forces `en.ts` to provide a matching English entry for every key. `t("path.to.key", { name: value })` does dot-path lookup with `{name}` interpolation; missing keys fall back to ja, then to the key itself. Initial language reads `localStorage["sc:lang"]`, then `navigator.language` on first visit. Server payloads use stable enum IDs (`HandName.value`, `Result.value`) and structured table_ids (`bj-low`, `cc-high`) — translation lives entirely on the client; do not return display strings from the server.

`useGameSocket` is generic and returns `gameState: unknown`-shaped data; each game component narrows it (`as ChinchiroGameState`). `App.tsx` wires `GameRouter` with the table's `game_type` so the right component renders even before the first WS message arrives.

### UX clarity conventions

Action affordance and "whose turn" cues are normalized across games — re-use the helpers, don't reinvent:

- **`ActionButton` instead of raw `<button>` for game actions.** Always render the action even when it's not the player's turn, and pass `disabled` + a Japanese `reason` string. The button shows the reason as a `title` tooltip and grays out instead of disappearing — players don't get confused about where the buttons went.
- **`highlight` prop = CTA pulse.** Set it on the single action that's "the next thing to do" (Hit during your BJ turn, Roll during your chinchiro turn, Start/New Round at the bookends). The `is-cta` gold pulse comes for free.
- **`KeyHintBar` is the bottom dock for shortcuts.** Each game owns a `useEffect` that listens to `window.keydown` and dispatches the same callbacks the buttons use; the hint bar then mirrors which keys are live. Inputs/textareas are exempt inside the keydown handler — preserve that.
- **`has-current` class on `.players-area`.** When `current_player_id` is set, attach this class so non-current seats dim via CSS (`filter: saturate(0.6) brightness(0.88)`). This is what makes "your turn" obvious at a glance.
- **Per-game win streak.** `App.tsx` keeps `streaks: Record<string, number>` keyed by `game_type`, mutated in `onResolve` via a `tableGameTypeRef`. The header `StreakBadge` shows the active game's streak with tier-1/2/3 styling at 3/5/10. New games get this for free as long as `onResolve(delta)` is called from the game component on resolution.

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

// client → server
{"action": "start"}                            // no payload
{"action": "bet", "amount": 100}               // amount required
{"action": "hit" | "stand" | "double"}         // blackjack, no payload
{"action": "roll"}                             // chinchiro, no payload
{"action": "new_round"}                        // no payload
```

Action vocabulary is intentionally not namespaced — actions are unique per game today. Add a prefix (`{game}.{action}`) only if collisions appear.

## Adding a new game

This is the most useful contribution shape. To add e.g. roulette without touching blackjack or chinchiro:

1. **Backend logic**: write `backend/game/roulette.py` with phases, action methods, `get_state()`, `calculate_payout_for(player_id)`. Mirror the existing class shape.
2. **Backend wiring** (`backend/main.py`): add `"roulette"` to `SUPPORTED_GAMES`, extend `_make_game`, write `_broadcast_roulette`, write `_handle_roulette_action`, add a branch in `_broadcast_state` and the WS endpoint.
3. **Seed tables** (`backend/main.py`): add Low/Mid/High roulette entries (e.g. `rl-low/mid/high`) to `SEED_TABLES` so they appear in the lobby on next restart.
4. **Bot driver** (`backend/main.py`): write `_bot_step_roulette` and add a branch for `"roulette"` in `_run_bot_driver`. Without this the bot will spawn at the seeded table but never act, leaving the table stuck in WAITING.
5. **Backend tests**: `tests/test_roulette.py` following the `TestRouletteGame` class style in `test_blackjack.py` / `test_chinchiro.py`.
6. **Frontend types** (`shared/types/game.ts`): add `RouletteGameState` interface.
7. **Frontend components**: create `games/roulette/RouletteGame.tsx` and any sub-components. Use `ActionButton` (not raw `<button>`) with `disabled` + `reason` for game actions, `highlight` on the single "next thing to do" action, and add the `has-current` class to `.players-area` whenever `current_player_id` is set. See "UX clarity conventions" above. **If the game introduces bespoke result kinds** (e.g. chinchiro added `pinzoro`/`arashi`/`shigoro`/`hifumi`/`menashi`/`wakare`), extend `ResultKind` in `shared/components/ResultOverlay.tsx` and update `RIM_GLOW_KINDS` / `POSITIVE_AMOUNT_KINDS` so glow + amount-color rendering classifies the new kinds correctly.
8. **Frontend wiring**: add `case "roulette"` in `GameRouter.tsx`, add `{value:"roulette", icon:"..."}` to `SUPPORTED_GAMES` in `Lobby.tsx` (label/tagline come from i18n — see step 11). The streak counter in `App.tsx` keys on `tableGameType`, so it picks up new games automatically as long as the component calls `onResolve(delta)` on resolution.
9. **Keyboard shortcuts + hint bar**: add a `useEffect` window-keydown handler inside the game component that calls the same action callbacks the buttons use, and feed a `KeyHint[]` into `<KeyHintBar />` so the dock reflects what's live in this phase.
10. **Audio (optional)**: add SoundIds in `shared/audio/sounds.ts` and the synthesis recipes (use existing `tone()` / `noiseBurst()` / `chord()` helpers).
11. **i18n**: extend `shared/i18n/locales/ja.ts` with `games.roulette.{label,tagline}`, `tables.rl.{low,mid,high}`, plus any reasons / phase banners / button labels you introduce. The `Translation` type then forces matching English entries in `en.ts`. Use `t(key, params)` everywhere — never hardcode display strings.

Cross-game stats on `users.{wins, losses, draws}` are updated in `_broadcast_*` based on the per-game payout sign — keep that pattern.

## Sharp edges to know

- **Animations must work in hidden tabs.** Browsers pause `requestAnimationFrame` when a tab is in the background, freezing Framer Motion mid-animation. Cards and dice both use pure CSS `@keyframes` (which run on the compositor) for entry animations specifically because of this. Reserve Framer Motion for layout / hover / one-shot transitions where freezing is acceptable.
- **Chinchiro banker reserve**: server requires `coins >= bet * 5` to place a chinchiro bet (banker pinzoro can take 5x). The `BetArea` ceiling is `floor(coins/5)` accordingly. Don't loosen one without the other.
- **`firebase.json` cache headers** force `index.html` to `no-cache` while hashed asset bundles get a 1-year `immutable` cache. This was added because Firebase was serving a stale `index.html` after deploys. Don't remove without a replacement strategy.
- **Cloud Run cold starts** wipe all in-memory tables. Don't put session-critical state outside Firestore.
- **Firestore project mismatch** is the most common local-dev failure. The error looks like a Cloud-side 403 about Firestore API not enabled — actually it's that ADC points at a different GCP project.
- **Audio scheduling on a fresh `AudioContext`**: a clip whose `duration < release` schedules `setValueAtTime` at a negative absolute time when `currentTime ≈ 0`, throws `RangeError`, and (because it's synchronous inside React onClick handlers) prevents subsequent `setState` from running. `tone()` clamps `start` to `currentTime` and derives `sustainEnd / decayEnd` defensively — keep that pattern when adding helpers; don't compute envelope timestamps from raw `start + duration - release`.

## Audio

All SFX are generated at runtime in `shared/audio/sounds.ts` via a small synth (`tone`, `noiseBurst`, `chord` helpers wired to a single `AudioContext`). The first user gesture unlocks the context (browser autoplay policy). Mute and BGM toggles persist in `localStorage`.

To add a sound: extend the `SoundId` union, add a `case` in the `play()` switch, compose with the helpers. No asset files involved.

## Testing conventions

`tests/test_<game>.py` uses pytest classes grouped by unit (`TestEvaluateDice`, `TestPayout`, `TestGameFlow`). Game-flow tests use `monkeypatch.setattr(game, "_roll", ...)` to inject deterministic dice / cards. Run with `uv run pytest`.
