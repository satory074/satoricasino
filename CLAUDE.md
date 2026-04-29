# CLAUDE.md

Guidance for working in this repo (SatoriCasino — multiplayer blackjack web app).

## Stack

- **Backend**: FastAPI (Python 3.12) + WebSocket. Firebase Admin SDK + Firestore for persistence. JWT (python-jose) for auth.
- **Frontend**: Vite + React 19 + TypeScript. Framer Motion for animation, canvas-confetti for celebrations. Audio is synthesized at runtime via Web Audio API (`src/audio/sounds.ts` — no asset files).
- **Tests**: pytest, ~27 tests covering blackjack game logic.

## Layout

```
backend/        FastAPI app, game logic, Firestore adapter
frontend/       Vite + React 19 source (active)
frontend/dist/  Vite build output — served by FastAPI in production
frontend-legacy/ Old vanilla JS frontend, kept temporarily for reference
tests/          pytest tests for backend
firebase.json   `hosting.public` is `frontend/dist` (Firebase Hosting)
Dockerfile      Builds backend only; frontend is hosted separately on Firebase
```

## Dev workflow

### Backend

```bash
uv sync
uv run uvicorn backend.main:app --reload --port 8000
uv run pytest                     # 27 tests
```

The backend needs Firebase Admin credentials via Application Default Credentials (`gcloud auth application-default login`) and Firestore enabled on the active project. `PASSPHRASE` env var gates registration (default: `satoricasino`).

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server on :5173, proxies /api and /ws to :8000
npm run build        # tsc -b && vite build → frontend/dist/
npm run preview      # serve the build
```

`npm run build` runs the TypeScript project check and produces `frontend/dist/`. FastAPI's StaticFiles mount auto-detects `frontend/dist/` (preferred) and falls back to `frontend/` if absent.

### Combined local

Either run both servers (Vite at :5173 with proxy + FastAPI at :8000), or run `npm run build` once and access everything at `http://localhost:8000`.

## Audio

All sound effects are synthesized at runtime (`frontend/src/audio/sounds.ts`) using Web Audio API oscillators. There are no `.mp3` assets — adding one means dropping it in `frontend/public/audio/` and wiring it up.

The first user gesture unlocks the AudioContext (browser autoplay policy). Mute and BGM toggles persist via `localStorage`.

## WebSocket protocol

Messages are JSON over a single endpoint `/ws/table/{table_id}?token=...`. Server pushes:

- `game_state` — full snapshot (players, dealer, phase, current_player_id, results)
- `player_joined` / `player_left`
- `bet_placed`
- `auto_stand` (turn timeout)
- `error`

Client sends `{ action: "start" | "bet" | "hit" | "stand" | "double" | "new_round", ... }`.

Game logic lives in `backend/game/blackjack.py`. The TypeScript counterpart in `frontend/src/types/game.ts` mirrors the wire format.

## Deployment

- **Backend**: Cloud Run (see Dockerfile). Mounts `frontend/dist` as static if present, but in production the Cloud Run instance only ships `backend/` — the dist is served separately via Firebase Hosting.
- **Frontend**: Firebase Hosting from `frontend/dist`. `firebase deploy --only hosting`.

## Animation principles

When touching `frontend/src/game/`:

- Cards use stable index keys so rank changes (`?` → real) animate as in-place flips, not unmount/remount.
- Use `framer-motion` for layout/entry/exit; reserve CSS keyframes for one-shot effects (shake, pulse, rim glow).
- Keep stagger delays under 200ms per card so deal sequences feel snappy.
- On `resolution` phase, the `ResultOverlay` auto-fades after 1.1–2.4s depending on outcome — don't gate user input behind it.
