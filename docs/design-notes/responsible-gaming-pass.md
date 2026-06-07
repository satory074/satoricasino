# Responsible-gaming & UX-correction pass (2026-06)

A focused overhaul that brought the running app back in line with the
responsible-gaming principles already declared in
[`tone-and-manner.md`](./tone-and-manner.md) §9/§11, plus a batch of
accessibility, onboarding, and reliability fixes surfaced by a UI/UX review.

## Dark-pattern corrections (the headline)

- **Near-miss amplification removed.** A blackjack loss that landed "by one"
  was being dressed up as a near-win: crimson backdrop flash, orb + screen
  shake, `anticipation_win` SFX, 600ms anticipation, and an "あと 1 で勝ちだった…"
  subtitle. This is the textbook *losses-disguised-as-wins* pattern. `near_miss`
  is now treated as an ordinary loss everywhere:
  - `getTiming("near_miss")` → loss-like `{0, 300, 700}` (no anticipation)
  - `tensionForKind` → 0 (no BGM swell)
  - SFX → `anticipation_lose` / `lose` (was `anticipation_win` / `near_miss`)
  - shake removed; result text → `LOSS`; subtitle → factual (`1 点差で敗北`)
  - chinchiro banker two-dice "reach" reduced from a double heartbeat to one
- **Bailout copy de-shamed.** "緊急救済 / 次はバーストしないように" → neutral
  "コイン補充 / 無料でコインを受け取りました。ゆっくり遊んでください。" The free
  bailout itself is unchanged; only the manipulative framing is gone.
- **Streak-loss FOMO softened.** Login streak now has a **one-day grace**
  (`compute_daily_streak` in `backend/main.py`): missing a single day no longer
  resets progress. Covered by `tests/test_daily_bonus.py`.
- **Ad cadence relaxed.** Interstitials: cooldown 3→5 min, every 5→10 rounds,
  and the game-switch trigger was dropped entirely (browsing games is free).
- **Net-loss de-emphasis.** The lobby career stats no longer paint a negative
  net profit in danger-red (→ neutral `--text-mute`), and the whole stats block
  is collapsed by default so the lobby leads with the game picker, not lifetime
  losses.

## Accessibility

- Global `:focus-visible` ring for all controls (only cards had one before).
- Touch targets raised to ≥44px (`.mute-btn`, `.btn-secondary`, `.reaction-btn`).
- `prefers-reduced-motion` extended to coin-flash, reveal, count-up,
  streak/cta/player/notify animations and the toast.
- `ResultOverlay` announces the outcome via an `aria-live` region (`.sr-only`).
- Modal focus management via `useModalA11y` (trap + Escape + focus restore) on
  every modal; `ConnectionLost`/forced-ad modals keep Escape disabled.
- Labels for the turn timer (`role="timer"`), dealer/hand totals; stray idle "0"
  badges suppressed.

## Reliability / clarity

- **Ad placeholder leak fixed.** Production was falling back to the Mock bridge
  (gray "AD" boxes) because `Array.isArray(adsbygoogle)` was the wrong probe.
  Bridge selection now keys on the script tag / `import.meta.env.PROD`, and the
  Mock bridge renders nothing outside DEV. Empty ad slots collapse via
  `.ad-banner-slot:empty` so they never overlap content.
- **Connection-lost overlay** when WS reconnects are exhausted (was a silent
  dead table), with a working manual reconnect.
- **Shared toast** (`Toast.tsx`) replaces `alert()` and surfaces WS errors that
  previously only appeared in the game log.
- **In-game help**: a "?" button in each game topbar opens `RulesModal`, reusing
  the public guide i18n — no new copy.

## Guardrail

When touching result feedback or reward loops, re-read §9. The near-miss
regression is the cautionary tale: the amplification was added as an
"excitement effect" and quietly contradicted the doc. Keep code and doc in sync.
