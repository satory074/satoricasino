# Brighter-dark + simplification pass

**Why.** User feedback: the app felt "全体的に暗い" (too dark) and "何をクリックすればいいか分かりにくい"
(unclear what to click). Research confirmed the root causes against dark-UI / clickability best practice
(NN/g flat-design + clickable-elements, LogRocket dark-mode):

- The palette wasn't "dark mode" — it was *near-black*. Felt base ran `#0a1612`–`#0e5238`, and every card/panel
  sat on top as a translucent multi-gradient (white 4–5% over black 25–45%) with near-invisible gold borders
  (15–30% alpha). Surfaces didn't separate from the background.
- The biggest clickability offender was `.btn-secondary` (`rgba(255,255,255,0.06)`) — the flat-design
  "can't tell it's a button" anti-pattern. Lobby/auth used it everywhere.
- No first-time guidance, and loading states were plain text.

**Direction chosen (by user).** *Brighter dark* + *simple, but keep casino color*. Gold accents and the Cinzel
display face stay; the static chrome gets flatter and brighter.

## What changed

1. **Palette + surface system** (`styles/theme.css` `:root`). Felt lifted ~1–2 steps
   (`--felt-dark/mid/light` → `#10241c / #0f4a36 / #136146`). Added a **solid, theme-agnostic** elevation
   scale `--surface-1/2/3` (frontmost card → sunken) plus `--border-subtle` / `--border-strong`. Muted text
   brightened (`#a8b3a4` → `#bcc6b8`) for 4.5:1 body contrast. Shadows collapsed to single-layer
   (`--shadow-card` no longer has the inset emboss). Body gradient simplified to 2 stops; the SVG noise overlay
   was deleted.

2. **Cards/panels → solid fill + 1 border.** game-card, table-card, stats-card, player-box/seat, auth-card,
   modal-card, leaderboard/challenge/achievement/shop cards, game-log, inputs, mute/reaction/lb buttons all
   moved from translucent gradients to `--surface-*` + a `--border-*` hairline. **The rule: separate by fill +
   border, not by light effects.**

3. **Buttons.** `.btn-secondary` → solid `--surface-1` + `--border-strong` (the key fix). `.btn-primary` and the
   color-coded `.action-btn` variants (hit/stand/double/deal) flattened from 2-stop gradients to solid fills
   (color-coding kept — it's functional). `cta-pulse` glow toned down.

4. **Clickability / guidance.** New `Spinner` component (CSS keyframes, runs in background tabs) replaces the
   plain-text loading states (lobby table load, game connecting). Lobby gained a one-line `.lobby-guide` cue per
   step and a dismissible first-login `.onboarding-banner` (`localStorage["sc:onboarded"]`). The table card's
   redundant dead-looking Join `<button>` became a decorative `.table-join-cue` span; the card itself is now the
   single keyboard-accessible click target (`role="button"` + Enter/Space).

## Guardrails honored

- **Excitement effects untouched.** Simplification targeted *static chrome only*. `ResultOverlay` (3-phase
  reveal), confetti, screen-shake, BGM tension are the casino's core and were left as-is.
- PC sizing unchanged (only color/surface/border/whitespace touched; no `clamp()`/`min()` edits).
- Table themes (crimson/midnight/royal/veteran) still work — they override `--felt-*`; surfaces are neutral and
  stay separated under each.
- AdSense suppression and the single-scroll app-shell structure untouched.

See the umbrella `tone-and-manner.md` for the unified color/motion rules this fits under.
