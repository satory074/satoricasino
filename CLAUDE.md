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
uv run pytest                                  # 149 tests across blackjack, chinchiro, achievements, ads, cosmetics, table_heat, daily_bonus
uv run pytest tests/test_chinchiro.py          # one test file
uv run pytest -k "test_pinzoro"                # one test by name

# Frontend
cd frontend
npm install
npm run dev                                    # Vite at :5173, proxies /api + /ws → :8000
npm run build                                  # tsc -b && vite build → frontend/dist/ (also acts as type-check)
                                               # The "chunks larger than 500 kB" warning is expected (single bundle) — don't chase code-splitting over it.
npm run preview                                # No `lint` script — `build` is the type-check.

# Production deploy (firebase reads default project from .firebaserc; --project explicit is safer)
firebase deploy --only hosting --project satoricasino                                      # ~30s
gcloud run deploy satoricasino --source . --region asia-northeast1 \
  --project satoricasino --allow-unauthenticated --quiet                                   # ~3 min
```

The backend needs Firebase Admin credentials via Application Default Credentials. If `gcloud config get-value project` is not `satoricasino`, set `GOOGLE_CLOUD_PROJECT=satoricasino` or run `gcloud auth application-default login` against the right project — Firestore will 403 otherwise. `PASSPHRASE` env var gates registration (default `satoricasino`).

### Production hostnames

- **Frontend**: `https://satoricasino.web.app` (Firebase Hosting)
- **Backend**: `https://satoricasino-874739310695.asia-northeast1.run.app` (Cloud Run, asia-northeast1)
- The Cloud Run URL is **hard-coded** in `frontend/src/shared/api/api.ts` (`PROD_BACKEND` constant) — `isLocal` switches between empty base (uses Vite dev proxy) and the prod URL. If the Cloud Run service is ever recreated with a different number, update both `PROD_BACKEND` and the WS URL in the same file.

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
├── challenges.py      # Daily challenge pool, deterministic selection, baseline tracking
├── cosmetics.py       # Hardcoded cosmetic catalog (9 items), purchase/equip validation
├── auth.py, database.py, websocket_manager.py, models.py, config.py
```

`backend/main.py` holds:
- `SUPPORTED_GAMES` set (currently `{"blackjack", "chinchiro"}`)
- `SEED_TABLES` list + `_seed_tables()` — fixed casino-owned tables (Low/Mid/High per game) populated at module load. Players join, never create.
- `_make_game(game_type)` factory
- `_broadcast_state(table_id)` that branches into `_broadcast_blackjack` / `_broadcast_chinchiro` (each handles payout, global stats, per-game stats, streaks, XP, and achievement checks via `_post_round_xp_and_achievements`)
- WS `websocket_endpoint` dispatches to `_handle_blackjack_action` / `_handle_chinchiro_action`
- Game-specific turn timers (`_bj_turn_timeout`, `_cc_turn_timeout`) and the per-game async reveal sequences (`_blackjack_dealer_sequence`, `_chinchiro_banker_sequence`) — both broadcast one card/die at a time with sleeps so the client can animate each draw. Tracked in `dealer_tasks` / `banker_tasks` and cancelled on table teardown / disconnect / new round.

Tables are kept in an in-memory `tables: dict[str, dict]` keyed by stable IDs (e.g. `bj-low`, `cc-high`) with shape `{name, min_bet, game, game_type, recent_jackpots: deque(maxlen=20)}`. When the last human leaves, the WS cleanup rebuilds a fresh `game` instance and respawns a bot — fixed tables persist across the table being empty. Cloud Run instance restarts wipe in-memory state, but `_seed_tables()` re-creates the same six tables with the same IDs and the FastAPI `lifespan` handler reseeds bots, so links/bookmarks remain stable. Only persistent state lives in Firestore.

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
- **Reward ads** (`POST /api/ad/start`, `POST /api/ad/complete`): mock 5-second ad player for daily bonus 2x and bailout upgrade (500→1000 coins). In-memory session dict with 60s TTL. Daily cap (`AD_REWARD_DAILY_CAP=5`), min watch time (`AD_WATCH_MIN_SECONDS=5`). Firestore tracks `ad_watches_today` + `last_ad_date`. Frontend `AdPlayer` component shows countdown modal.
- **Cosmetics shop** (`GET /api/shop`, `POST /api/shop/buy`, `POST /api/shop/equip`): 9 cosmetic items across 3 categories (card_skin, dice_skin, table_theme). Purchased with game coins (no real money). `backend/cosmetics.py` holds the hardcoded catalog. Firestore: `owned_cosmetics` map + `equipped` map. Card/dice skins broadcast to other players via `equipped` field in WS state. Table themes are personal display only (applied via CSS class on `.game-section`). `player_cosmetics` in-memory cache loaded on WS connect for broadcast injection.
- **Table heat (social signal)**: each `tables[id]` carries a `recent_jackpots: deque(maxlen=20)` of jackpot timestamps. `_record_jackpot(table)` is called from `_broadcast_blackjack` / `_broadcast_chinchiro` whenever a jackpot resolves (BJ blackjack, chinchiro pinzoro on either side). `_table_heat(table)` projects this into `{jackpots5min, hot, ultra_hot}` based on a 300s rolling window and is injected as `state.table_heat` on every broadcast. Frontend `TableHeatBadge` renders 🔥 badges in `game-topbar`. Pure in-memory, wiped on Cloud Run restart — no Firestore write. Tested in `tests/test_table_heat.py`.

### Ads architecture

Two distinct ad systems run in parallel — don't confuse them:

1. **AdSense (real revenue ads)** — display banners on Lobby + Game views, served by `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` (loaded eagerly in `frontend/index.html`). Publisher ID `ca-pub-3484332928684454`, ads.txt at `frontend/public/ads.txt`. **Never render on Auth view** (see Sharp edges).
2. **Reward ads (in-game mock)** — synthesized 5-second countdown modal that grants a gameplay reward (daily bonus 2x, bailout 500→1000). Backed by `POST /api/ad/{start,complete}` with in-memory session + Firestore daily cap. See "Reward ads" in Engagement systems.

The frontend abstracts both behind one `AdBridge` interface so tests/dev can run without the real adsbygoogle.js loaded:

```
frontend/src/shared/ad/
├── adBridge.ts          # AdBridge interface + AdResult / BannerSize types
├── adSenseBridge.ts     # Production: injects <ins class="adsbygoogle"> with data-ad-slot
├── mockAdBridge.ts      # Dev/preview: renders an "AD" placeholder div
└── index.ts             # getAdBridge() — singleton, picks bridge by feature-detecting window.adsbygoogle
```

`getAdBridge()` returns `AdSenseBridge` when the `adsbygoogle.js` script tag is present in the DOM (it is, loaded eagerly in `index.html`) **or** `import.meta.env.PROD` — i.e. always in production. Otherwise (dev with no script) it returns `MockAdBridge`. The factory caches the result. **Why not `Array.isArray(window.adsbygoogle)`?** That was the old probe and it was wrong: once the script loads it replaces the array with an object, so the check returned false in prod and fell back to `MockAdBridge`, leaking gray "AD" placeholder boxes onto the live site. As a second layer, `MockAdBridge` now renders nothing outside `import.meta.env.DEV`, and empty ad slots collapse via `.ad-banner-slot:empty` so they never reserve height / overlap content.

The four `BannerSize` values map 1:1 to AdSense slot IDs (`SLOT_ID_320x50` / `SLOT_ID_300x250` / `SLOT_ID_728x90` / `SLOT_ID_160x600` in `adSenseBridge.ts`). When you create real slots in AdSense console, replace those slot ID constants — the size enum stays. `AdSenseBridge.showBanner` early-returns when the slot value still starts with `SLOT_ID_`, so no `<ins>` element is created until real IDs are filled in — this keeps the DOM clean of failing fill requests during the audit-then-create-units window. Removing those placeholder values automatically re-enables the path.

Frontend ad components (in `shared/components/`):
- **`SideAds`** — flex sandwich: `<aside class="ad-side ad-side--left">` + `{children}` + `<aside class="ad-side ad-side--right">`, each side is a 160×600 skyscraper. **Only wrap non-Auth views.** Currently wired in `App.tsx` for Lobby/Game.
- **`BannerAd size="..."`** — single ad slot for inline placements. `useEffect` calls `getAdBridge().showBanner(ref, size)` on mount and `destroyBanner()` on unmount.
- **`InterstitialAd open onClose`** — modal with countdown skip; gated by `useInterstitial` hook (3-minute global cooldown + every 5 rounds OR table-leave transition). The countdown also blocks click-to-dismiss until 0.
- **`AdPlayer`** — modal for the reward-ad flow specifically (different from `InterstitialAd`). Wraps `bridge.show(container)` and resolves with `{watched, durationMs}` for the reward grant.

### Frontend layout

```
frontend/src/
├── App.tsx                # top-level routing (auth | lobby | game | info-*), header, URL ↔ view sync
├── auth/Auth.tsx          # Landing/marketing block + login/register card + crawler-visible footer links to info pages
├── info/InfoPage.tsx      # 10 public pages (Privacy/Terms/About/Responsible/Contact + Blackjack & Chinchiro guides, FAQ, Getting Started, Glossary), data-driven from i18n
├── lobby/Lobby.tsx        # 2-step lobby: wallet strip (daily bonus / bailout-when-low / reward ad) + nav (leaderboard/achievements/shop), lamplight game tiles → table list w/ real Join buttons
│          Leaderboard.tsx # Top-10 modal (coins/wins), fetches GET /api/leaderboard
│          AchievementList.tsx # Full achievement grid with progress bars
│          Challenges.tsx  # Daily challenge cards with progress + claim buttons
│          Shop.tsx        # Cosmetics shop modal (buy/equip card/dice/table skins)
├── games/
│   ├── GameRouter.tsx     # switch on gameType → render BlackjackGame / ChinchiroGame
│   ├── blackjack/         # BlackjackGame, DealerArea, PlayerBox
│   └── chinchiro/         # ChinchiroGame, BankerArea, PlayerSeat, Bowl, Die, HandLabel
├── shared/
│   ├── ad/                # AdBridge interface + AdSense/Mock impls (see "Ads architecture")
│   ├── api/api.ts, useGameSocket.ts
│   ├── audio/sounds.ts, useAudio.ts   # synthesized SFX + ambient BGM (incl. setBgmTension dynamic layer)
│   ├── components/        # Card (SVG suit pips), Hand, Chip, BetArea, BetChipStack, TurnTimer,
│   │                      # ResultOverlay, ActionButton, PhaseStepper, KeyHintBar, StreakBadge,
│   │                      # LangToggle, UserMenu (header menu: stats/audio/lang/logout),
│   │                      # TableHeatBadge, AchievementToast, ReactionBar, ReactionFloat, AdPlayer,
│   │                      # SideAds, BannerAd, InterstitialAd, Spinner, Toast, RulesModal, ConnectionLost
│   ├── hooks/useInterstitial.ts  # 5-min cooldown + every-10-rounds gate for InterstitialAd
│   ├── hooks/useModalA11y.ts     # focus trap + Escape + focus-restore for all modals
│   ├── cosmetics.ts       # CSS class resolver for equipped cosmetics
│   ├── i18n/              # I18nProvider + useTranslation + locales/{ja,en}.ts
│   └── types/game.ts      # WS message types incl. ChinchiroGameState, CosmeticItem, EquippedCosmetics, TableHeat
├── styles/                # Token-driven layered CSS ("lamplit den" system, 2026-07 redesign).
│   ├── index.css          # @import manifest — import order IS the cascade order
│   ├── tokens.css         # ALL design tokens; with cosmetics.css the only files allowed raw hex.
│   │                      # Chrome (charcoal --bg-*/--surface-*) vs Stage (--stage-* felt/lamp/rim) split;
│   │                      # spacing --sp-1..10, fluid type --fs-xs..2xl, 3 radii, z ladder, object colors
│   ├── base.css           # reset, #root viewport lock, focus ring, .num (tabular) utility
│   ├── components.css / header.css / lobby.css / game.css / chinchiro.css / overlays.css / auth.css / info.css
│   ├── cosmetics.css      # skin classes (HARD CONTRACT with shared/cosmetics.ts + Firestore `equipped`);
│   │                      # table themes re-light the stage by overriding --stage-* on .game-section
│   ├── ads.css            # slot sizes + .ad-banner-slot:empty collapse (policy-critical)
│   └── motion.css         # prefers-reduced-motion aggregate — ALWAYS imported last; every new
│                          # decorative animation must be registered here in the same commit
```

Fonts: display **Shippori Mincho B1** (covers JA — headings finally render in a real face), body **Zen Kaku Gothic New**, Cinzel demoted to `--font-logo` (logotype only). Buttons are controls, not headings: body face, no uppercase/tracking. Design rationale in `docs/design-notes/lamplit-den-redesign.md`.

i18n is in-house (no library). `locales/ja.ts` is the source of truth — its `Translation` type forces `en.ts` to provide a matching English entry for every key. `t("path.to.key", { name: value })` does dot-path lookup with `{name}` interpolation; missing keys fall back to ja, then to the key itself. Initial language reads `localStorage["sc:lang"]`, then `navigator.language` on first visit. Server payloads use stable enum IDs (`HandName.value`, `Result.value`) and structured table_ids (`bj-low`, `cc-high`) — translation lives entirely on the client; do not return display strings from the server.

This rule extends to **errors and game-log entries**, which is non-obvious from the type signatures alone:
- HTTP errors: `HTTPException(detail={"code": "auth.wrong_passphrase"})` or with params `detail={"code": "bet.minimum", "n": 10}`. `api.ts unwrap()` parses this into a typed `ApiError(code, params)` (subclass of `Error`) that `apiPost` / `apiGet` throw. Call sites render via `t(\`errors.${e.code}\`, e.params)` — never read `e.message`.
- WS errors: `{"type": "error", "code": "...", **params}` (same shape). `useGameSocket` reduces these into both `state.error = {code, params}` and a log entry.
- `cosmetics.validate_purchase` / `validate_equip` return error code strings (e.g. `"shop.item_not_found"`), not English; `shop_buy` / `shop_equip` wrap them as `detail={"code": error}`.
- `LogEntry` is `{id, emoji, textKey, textParams?}` — store the i18n key, never the resolved string. Game components render with `t(e.textKey, e.textParams)` so language switches are reactive.

Adding a new error path: pick a dotted code (e.g. `bet.banker_reserve`), add `errors.bet.banker_reserve` to ja.ts (Translation type forces en.ts to follow), then either `raise HTTPException(detail={"code": "bet.banker_reserve"})` (HTTP) or send `{"type": "error", "code": "bet.banker_reserve"}` (WS).

`useGameSocket(tableId, spectate?)` is generic and returns `gameState`, `notifications` (achievement/level/reaction events), `dismissNotification`, and `send`. Each game component narrows `gameState` (`as ChinchiroGameState`). `App.tsx` wires `GameRouter` with the table's `game_type` and `spectate` flag so the right component renders even before the first WS message arrives.

### UX clarity conventions

Action affordance and "whose turn" cues are normalized across games — re-use the helpers, don't reinvent:

- **`ActionButton` instead of raw `<button>` for game actions.** Always render the action even when it's not the player's turn, and pass `disabled` + a Japanese `reason` string. The button shows the reason as a `title` tooltip and grays out instead of disappearing — players don't get confused about where the buttons went.
- **`highlight` prop = CTA pulse.** Set it on all available actions the player can take right now (Hit/Stand/Double during your BJ turn, Roll during your chinchiro turn, Start/New Round at the bookends). The `is-cta` gold pulse comes for free.
- **`KeyHintBar` is the bottom dock for shortcuts.** Each game owns a `useEffect` that listens to `window.keydown` and dispatches the same callbacks the buttons use; the hint bar then mirrors which keys are live. Inputs/textareas are exempt inside the keydown handler — preserve that.
- **`has-current` class on `.players-area`.** When `current_player_id` is set, attach this class so non-current seats dim via CSS (`filter: saturate(0.6) brightness(0.88)`). This is what makes "your turn" obvious at a glance.
- **Per-game win streak.** `App.tsx` keeps `streaks: Record<string, number>` keyed by `game_type`, mutated in `onResolve` via a `tableGameTypeRef`. The header `StreakBadge` shows the active game's streak with tier-1/2/3 styling at 3/5/10. New games get this for free as long as `onResolve(delta)` is called from the game component on resolution.

### Result overlay: 3-phase reveal

`ResultOverlay` drives a CSS-only phase state machine: **anticipation** (dark backdrop + pulsing color-coded orb, plus a rotating golden zone overlay for jackpot-class results) → **reveal** (explosive `scale(0.2→1.4→1)` text + rim glow) → **afterglow** (amount counts up from 0, text fades out). Timing scales by result significance via `getTiming(kind, amount)` — pinzoro gets 3.4s total, losses get 1.15s, push/wakare skip anticipation entirely. Normal `win` further scales by bet tier (`amount >= 200` → big, `>= 500` → mega) so a 1000-coin win feels noticeably more dramatic than a 50-coin one. The afterglow count-up runs an audible `count_up` SFX tick every step (mega: every 3rd) with rising pitch, and `near_miss` gets a crimson backdrop flash + "あと 1 で勝ちだった…" subtitle (passed in via `nearMissDetail` prop).

The overlay is also the BGM driver: it calls `setBgmTension(level)` on entering anticipation (level scales by `kind`) and `decayBgmTension()` after completion, so the dynamic BGM layer in `sounds.ts` swells around the reveal without the game components having to coordinate.

Game components interact via two callbacks:
- `onReveal`: fires when reveal phase starts — play result SFX, fire confetti, set `is-shaking` class on `.game-section` for jackpots (pinzoro/blackjack/arashi)
- `onComplete`: fires when all phases finish — clear overlay state, remove shake class

Anticipation SFX (`anticipation_jackpot` / `anticipation_win` / `anticipation_lose`) are played by the game component when setting the overlay, not by `ResultOverlay` itself. The `SoundId` types in `GameRouter.tsx`, `BlackjackGame.tsx`, and `ChinchiroGame.tsx` must stay in sync with `sounds.ts` — each is a local type alias.

Screen shake uses a CSS `@keyframes screen-shake` animation on `.game-section.is-shaking`, disabled by `@media (prefers-reduced-motion: reduce)`.

### Design notes

`docs/design-notes/` holds the research that drove non-trivial UX decisions (excitement effects, "next action" clarity). When making another large UX change, drop a note there — it saves the next contributor from re-doing the literature review.

`docs/design-notes/tone-and-manner.md` is the umbrella tone & manner doc — start there before adding a new game or component for the unified rules on information hierarchy, motion, audio, microcopy, and responsible-gaming guardrails. **For the current visual language (palette, typography, surfaces, CSS layers), `lamplit-den-redesign.md` supersedes its §3–§4** — the 2026-07 ground-up redesign ("lamplit den": charcoal chrome / felt stage split, JA-first Shippori Mincho + Zen Kaku Gothic, token-driven layered CSS). The narrower notes (`excitement-effects.md`, `ui-ux-clarity.md`) sit under it. `responsible-gaming-pass.md` records the 2026-06 dark-pattern correction (near-miss de-amplification, bailout copy, streak grace, ad cadence) plus the a11y/reliability fixes — **near-miss must stay de-amplified** (treated as an ordinary loss) even though win-side celebration is a first-class goal (2026-07 user directive: 射倖心を煽る演出は重視、ただし負けの偽装はしない).

### WS protocol

Endpoint: `/ws/table/{table_id}?token=...&spectate=false`. Set `spectate=true` for watch-only mode (receives broadcasts, can only react). Single message envelope:

```jsonc
// server → client
{"type": "game_state", "game_type": "blackjack" | "chinchiro", ...}
{"type": "player_joined" | "player_left", "player_id": "...", "display_name": "..."}
{"type": "bet_placed", "player_id": "...", "amount": 100}
{"type": "auto_stand", "player_id": "..."}
{"type": "error", "code": "bet.minimum", "n": 10}    // code is the i18n key under errors.*; remaining fields are template params
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
   - **Match the 3-row shell**: keep `<div className="game-section">` with this child order — `.game-topbar` (auto-height), `.game-table` (the scrollable stage; place dealer/board, `.players-area`, and `.game-log-area` inside it), then `.game-actions` as a **sibling** of `.game-table` (NOT a child — it's the bottom action dock and must sit outside the scroll container), then `<ReactionBar send={send} />`, then `<KeyHintBar />`, then `<ReactionFloat />`, then `<ResultOverlay />`. See blackjack/chinchiro for canonical structure.
   - **Bespoke result kinds** (only if needed): if the game introduces names like chinchiro's `pinzoro`/`arashi`/`shigoro`/`hifumi`/`menashi`/`wakare`, extend `ResultKind` in `shared/components/ResultOverlay.tsx` and update `RIM_GLOW_KINDS` / `POSITIVE_AMOUNT_KINDS` so glow + amount-color rendering classifies the new kinds correctly. Update `getTiming()` with appropriate anticipation/reveal/afterglow durations for new kinds.
   - **Mobile sizing**: for visual elements that scale (boards, wheels, tokens), use `clamp()` for dimensions and `min(Npx, 100%)` for box widths — see "Sharp edges" Mobile entry.
8. **Frontend wiring**: add `case "roulette"` in `GameRouter.tsx`, add `{value:"roulette", icon:"..."}` to `SUPPORTED_GAMES` in `Lobby.tsx` (label/tagline come from i18n — see step 11). The streak counter in `App.tsx` keys on `tableGameType`, so it picks up new games automatically as long as the component calls `onResolve(delta)` on resolution.
9. **Keyboard shortcuts + hint bar**: add a `useEffect` window-keydown handler inside the game component that calls the same action callbacks the buttons use, and feed a `KeyHint[]` into `<KeyHintBar />` so the dock reflects what's live in this phase.
10. **Audio (optional)**: add SoundIds in `shared/audio/sounds.ts` and the synthesis recipes (use existing `tone()` / `noiseBurst()` / `chord()` helpers).
11. **i18n**: extend `shared/i18n/locales/ja.ts` with `games.roulette.{label,tagline}`, `tables.rl.{low,mid,high}`, `phase.roulette.{...}` for each phase ID the topbar will show, plus any reasons / phase banners / button labels you introduce. The `Translation` type then forces matching English entries in `en.ts`. Use `t(key, params)` everywhere — never hardcode display strings. **Error paths follow the same rule** (see "Frontend layout" i18n note): new HTTPException sites use `detail={"code": "roulette.bad_thing", **params}` and new WS error sends use `{"type": "error", "code": "roulette.bad_thing", **params}` with a matching `errors.roulette.bad_thing` i18n entry.

Cross-game stats on `users.{wins, losses, draws}` are updated in `_broadcast_*` based on the per-game payout sign — keep that pattern. Engagement systems wire in automatically:
- `update_game_stats()` and `update_streaks()` must be called in the new `_broadcast_*` function for per-game career stats and streak tracking.
- `_post_round_xp_and_achievements(table_id, pid, payout, is_jackpot)` must be called for each human player at resolution — this handles XP, achievement checks, and WS notifications. Set `is_jackpot=True` for the game's premium outcome (e.g. blackjack, pinzoro).
- Challenges and leaderboard use aggregate fields (`wins`, `game_stats`, `coins`) so they pick up new games without code changes.
- If the game introduces new achievement-worthy events, add check functions and entries to `ACHIEVEMENTS` in `backend/achievements.py`, then add i18n keys in `achievements.*`.

**Final compliance pass**: Once the new game is functionally complete, walk through `docs/design-notes/tone-and-manner.md` §11 — that checklist (info hierarchy, action affordance / Fitts touch targets, placement consistency, motion / audio / copy unification, responsible-gaming guardrails) catches what the per-step list above does not.

## Sharp edges to know

- **Animations must work in hidden tabs.** Browsers pause `requestAnimationFrame` when a tab is in the background, freezing Framer Motion mid-animation. Cards, dice, and result overlays all use pure CSS `@keyframes` (which run on the compositor) for entry/phase animations specifically because of this. Reserve Framer Motion for layout / hover / one-shot transitions where freezing is acceptable.
- **Chinchiro banker reserve**: server requires `coins >= bet * 5` to place a chinchiro bet (banker pinzoro can take 5x). The `BetArea` ceiling is `floor(coins/5)` accordingly. Don't loosen one without the other.
- **`firebase.json` cache headers** force `index.html` to `no-cache` while hashed asset bundles get a 1-year `immutable` cache. This was added because Firebase was serving a stale `index.html` after deploys. Don't remove without a replacement strategy.
- **Cloud Run cold starts** wipe all in-memory tables. Don't put session-critical state outside Firestore.
- **Firestore project mismatch** is the most common local-dev failure. The error looks like a Cloud-side 403 about Firestore API not enabled — actually it's that ADC points at a different GCP project.
- **Audio scheduling on a fresh `AudioContext`**: a clip whose `duration < release` schedules `setValueAtTime` at a negative absolute time when `currentTime ≈ 0`, throws `RangeError`, and (because it's synchronous inside React onClick handlers) prevents subsequent `setState` from running. `tone()` clamps `start` to `currentTime` and derives `sustainEnd / decayEnd` defensively — keep that pattern when adding helpers; don't compute envelope timestamps from raw `start + duration - release`.
- **Mobile layout has three MQ tiers** (now spread across the `styles/` layer files, each view's tweaks living in its own layer), and breaking the convention is the easy way to ship horizontal scroll on iPhone SE. Sizing rules: use `clamp(min, vw, max)` for elements that should scale (bowls, dice, card-shells, paddings); use `min-width: min(Npx, 100%)` for boxes/seats so they collapse instead of forcing scroll; never introduce a raw fixed width > ~280px without a `min(...)` cap. Tier usage: `@media (max-width: 600px)` is for type/density tweaks + collapsing the PhaseStepper to its active step, `@media (max-width: 480px)` does layout reflow (`.table-card` column-stack + full-width `.table-join-btn`, `.player-box` 2-col, `.user-menu-name` hidden, `.app-logo` shrunk, `.game-log-area` capped at 6rem, mrec ad shrunk) — header identity/audio/lang controls live inside `UserMenu` so nothing needs hiding anymore — and `@media (hover: none) and (pointer: coarse)` hides `.key-hint-bar` because it documents keyboard shortcuts — don't ship new keyboard-only UI without a touch fallback.
- **AdSense must not render on any "no publisher content" screen.** Google's policy 11112688 bans ads on login/registration, info/legal pages, and any loading state where the publisher's content isn't on screen yet. There are TWO sources of ad slots, both of which must be suppressed: (1) explicit React-rendered `<BannerAd>` / `<SideAds>` — `App.tsx` early-returns the bare `<Auth>` / `<InfoPage>` components when `view === "auth"` or `view.startsWith("info-")`, never wraps them in `<SideAds>`, and `<SideAds>` itself takes a `ready` prop that suppresses its inner `<BannerAd>` until publisher content is on screen. Each in-flow `<BannerAd>` in Lobby / BlackjackGame is also conditionally rendered (`tables.length > 0 &&`, `phase === "resolution" &&`). (2) **AdSense Auto Ads, which autonomously injects `<ins class="adsbygoogle">` slots into `<body>` based on publisher-side console settings**, completely bypassing React. The defense for (2) is the same `pauseAdRequests` gate: `index.html` pushes `{pauseAdRequests: 1}` synchronously before `adsbygoogle.js` loads, and a `useEffect` in `App.tsx` toggles this based on `view === "auth" || view.startsWith("info-") || !adsReady`. `adsReady` is a state flag flipped via `onContentReady?.()` callbacks passed to `<Lobby>` (fires when `tables.length > 0`) and to `<GameRouter>` → `<BlackjackGame>` / `<ChinchiroGame>` (fires when `gameState != null`); it resets on every `view` change so each transition re-gates. When the gate is active, orphan body-level slots are removed defensively. The push is wrapped in try/catch because AdSense throws TagError on resume-walks that hit already-filled slots in StrictMode's double-invoked effects. Don't remove either layer — relying on (1) alone leaves Auto Ads free to inject during loading states and trip the policy.

- **Public info routes bypass the passphrase gate — they are the ONLY content AdSense can index.** Because crawlers cannot get past the `PASSPHRASE` env, the public pages are the only "publisher content" Google sees; thin coverage here is what triggered an AdSense "有用性の低いコンテンツ" (low-value content) rejection, so these pages were expanded from 4 to **10** to clear the minimum-content bar. They are rendered by `frontend/src/info/InfoPage.tsx` outside the auth gate: Privacy `/privacy`, Terms `/terms`, About `/about`, Responsible Gaming `/responsible-gaming`, Contact `/contact` (the About/Privacy/Contact trio AdSense expects; points to GitHub Issues), plus the content pages **Blackjack Guide `/games/blackjack`, Chinchiro Guide `/games/chinchiro`, FAQ `/faq`, Getting Started `/getting-started`, Glossary `/glossary`**. The auth landing also carries a prominent age / non-real-money disclaimer (`auth.landing.disclaimer`) to satisfy Google's simulated-casino eligibility on the crawlable root. Adding a page is fully additive: extend the duplicated `InfoView` union in **three** files (`App.tsx`, `InfoPage.tsx`, `Auth.tsx`), add a `PAGES` entry + `NAV_VIEWS` + `INFO_PATHS` in `InfoPage.tsx`, both route maps in `App.tsx`, `FOOTER_LINKS`/`LANDING_LINKS` in `Auth.tsx`, and the `info.<rootKey>` object + `info.nav.<key>` label in `locales/ja.ts` (the `Translation` type forces matching `en.ts` keys — this is the build-time completeness guarantee). Bodies are single strings with `\n\n` paragraph separators (`t()` returns strings only — no arrays). Routing is SPA-internal: `App.tsx` reads `window.location.pathname` on mount and uses `window.history.replaceState` to sync; `firebase.json` rewrites `**`→`/index.html`, so any new route works without hosting config. SEO infra backs this: `frontend/public/robots.txt` + `frontend/public/sitemap.xml` (list all 9 URLs — update sitemap when adding a page), per-route `document.title` + `<meta name="description">` set by a `useEffect` in `App.tsx` keyed on `view`+`lang` via the `SEO_KEY_FOR_VIEW` map and `seo.{titles,descriptions}.*` i18n, and a crawlable landing/marketing block on the auth root (`auth.landing.*`). The landing block is ad-safe: `App.tsx` early-returns `<Auth>` and the pause gate suppresses ads on `view === "auth"`, so adding copy there renders no ads.
- **App shell is a single-viewport flex column with one scrolling region per view.** `#root` is locked to the viewport (`min-height: 100svh; height: 100dvh; overflow: hidden`) so the page itself never scrolls — instead, exactly one child does: `.lobby-section` and `.auth-section` scroll themselves, and inside `.game-section` the `.game-table` is the scroll stage while `.game-actions` is a sibling sitting at the bottom (it never scrolls away). Don't reintroduce body-level scroll, don't put the action dock inside `.game-table` (it'll scroll out of view), and keep `overscroll-behavior: contain` on each scrolling region so iOS rubber-band doesn't bleed past it. `viewport-fit=cover, interactive-widget=resizes-content` in `index.html` is what makes `env(safe-area-inset-*)` non-zero and makes Android Chrome shrink the viewport for the keyboard.

## Audio

All SFX are generated at runtime in `shared/audio/sounds.ts` via a small synth (`tone`, `noiseBurst`, `chord` helpers wired to a single `AudioContext`). The first user gesture unlocks the context (browser autoplay policy). Mute and BGM toggles persist in `localStorage`.

`play(id, opts?)` accepts an optional `{pitchShift}` (Hz offset applied to all `tone()` calls in that SFX) — used for things like `chip_place` getting brighter as the bet stack grows. Don't push pitchShift past ~700Hz or the high frequencies start clipping.

BGM is more than ambient drone: `startBgm()` builds a small synth graph with a base 110Hz osc + two tension layers (220Hz square, 440Hz triangle) + a 3Hz tremolo, all routed through a `BiquadFilter` highpass. `setBgmTension(0|1|2|3)` ramps gains and filter cutoff to swell the mix; `decayBgmTension(delayMs)` schedules a return to 0. The tension oscillators are **always running** and gain-gated — never `start()`/`stop()` them per call, or you'll trip the same fresh-AudioContext race that `tone()` works around. `ResultOverlay` is the canonical caller (anticipation phase → up, complete → decay), but `ChinchiroGame` also drives it manually for the final-roll tension mode.

To add a sound: extend the `SoundId` union, add a `case` in the `play()` switch, compose with the helpers. No asset files involved.

## Testing conventions

`tests/test_<game>.py` uses pytest classes grouped by unit (`TestEvaluateDice`, `TestPayout`, `TestGameFlow`). Game-flow tests use `monkeypatch.setattr(game, "_roll", ...)` to inject deterministic dice / cards. `tests/test_achievements.py` covers achievement check logic and XP/level calculations (pure functions, no Firestore). `tests/test_table_heat.py` tests the in-memory deque heat helpers directly without spinning a game. Run with `uv run pytest`.
