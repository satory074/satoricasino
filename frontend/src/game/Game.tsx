import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameSocket } from "../api/useGameSocket";
import { getUserId } from "../api/api";
import { DealerArea } from "./DealerArea";
import { PlayerBox } from "./PlayerBox";
import { BetArea } from "./BetArea";
import { ResultOverlay, type ResultKind } from "./ResultOverlay";
import type { GameState, Phase, Result } from "../types/game";

const TURN_TOTAL_SEC = 30;

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
  tableId: string;
  onLeave: () => void;
  myCoins: number;
  onResolve: (delta: number) => void;
  play: (id: SoundId) => void;
}

function detectNearMiss(
  myValue: number,
  isBusted: boolean,
  dealerValue: number,
  result: Result,
): boolean {
  if (result !== "lose") return false;
  if (myValue === 20 && dealerValue === 21) return true;
  if (isBusted && myValue === 22) return true;
  if (!isBusted && dealerValue - myValue === 1) return true;
  return false;
}

export function Game({ tableId, onLeave, myCoins, onResolve, play }: Props) {
  const myId = getUserId();
  const { connected, gameState, log, send } = useGameSocket(tableId);
  const [overlay, setOverlay] = useState<{
    kind: ResultKind;
    amount: number | null;
  } | null>(null);
  const prevPhaseRef = useRef<Phase | null>(null);
  const prevBustedRef = useRef<Record<string, boolean>>({});
  const playRef = useRef(play);
  playRef.current = play;
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  // Phase transition + bust detection
  useEffect(() => {
    if (!gameState) return;
    const phase = gameState.phase;
    const prevPhase = prevPhaseRef.current;

    if (
      prevPhase === "player_turns" &&
      (phase === "dealer_turn" || phase === "resolution")
    ) {
      playRef.current("card_flip");
    }
    prevPhaseRef.current = phase;

    for (const [pid, p] of Object.entries(gameState.players)) {
      const wasBusted = prevBustedRef.current[pid] ?? false;
      if (!wasBusted && p.is_busted) {
        playRef.current("bust");
      }
      prevBustedRef.current[pid] = p.is_busted;
    }
  }, [gameState]);

  // Resolution → overlay + SFX + confetti
  useEffect(() => {
    if (!gameState || !myId) return;
    if (gameState.phase !== "resolution") {
      if (overlay && gameState.phase === "betting") setOverlay(null);
      return;
    }
    const myResult = gameState.results?.[myId];
    if (!myResult || overlay) return;

    const me = gameState.players[myId];
    const myValue = me?.value ?? 0;
    const isBusted = me?.is_busted ?? false;
    const bet = me?.bet ?? 0;
    const dealerValue = gameState.dealer_value ?? 0;

    let kind: ResultKind;
    let amount: number | null = null;
    let delta = 0;

    if (myResult === "blackjack") {
      kind = "blackjack";
      amount = Math.floor(bet * 1.5);
      delta = amount;
    } else if (myResult === "win") {
      kind = "win";
      amount = bet;
      delta = bet;
    } else if (myResult === "push") {
      kind = "push";
    } else if (detectNearMiss(myValue, isBusted, dealerValue, myResult)) {
      kind = "near_miss";
      delta = -bet;
    } else {
      kind = "lose";
      delta = -bet;
    }

    onResolveRef.current(delta);
    setOverlay({ kind, amount });

    if (kind === "blackjack") {
      playRef.current("blackjack");
      confetti({
        particleCount: 180,
        spread: 100,
        startVelocity: 50,
        origin: { y: 0.55 },
        colors: ["#f4c430", "#ffd84a", "#ffffff"],
      });
      window.setTimeout(
        () =>
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.55 },
            colors: ["#f4c430", "#ffd84a"],
          }),
        300,
      );
    } else if (kind === "win") {
      playRef.current("win");
      playRef.current("chip_payout");
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#f4c430", "#3aa9ff", "#ffffff", "#c41e3a"],
      });
    } else if (kind === "near_miss") {
      playRef.current("near_miss");
    } else if (kind === "push") {
      playRef.current("push");
    } else {
      playRef.current("lose");
    }

    const dur = kind === "lose" ? 1100 : kind === "blackjack" ? 2400 : 1900;
    const t = window.setTimeout(() => setOverlay(null), dur);
    return () => clearTimeout(t);
  }, [gameState, myId, overlay]);

  const phase: Phase = gameState?.phase ?? "waiting";
  const me = myId ? gameState?.players[myId] : null;

  const onHit = useCallback(() => {
    play("hit");
    send("hit");
  }, [send, play]);
  const onStand = useCallback(() => {
    play("stand");
    send("stand");
  }, [send, play]);
  const onDouble = useCallback(() => {
    play("chip_place");
    send("double");
  }, [send, play]);
  const onStart = useCallback(() => {
    play("button_click");
    send("start");
  }, [send, play]);
  const onNewRound = useCallback(() => {
    play("button_click");
    send("new_round");
  }, [send, play]);
  const onBet = useCallback(
    (amount: number) => {
      play("chip_place");
      send("bet", { amount });
    },
    [send, play],
  );

  const onCardEvent = useCallback(() => {
    playRef.current("card_deal");
  }, []);

  const turnTimerKey = useMemo(
    () => `${phase}-${gameState?.current_player_id ?? ""}-${me?.cards.length ?? 0}`,
    [phase, gameState?.current_player_id, me?.cards.length],
  );

  return (
    <div className="game-section">
      <div className="game-topbar">
        <button className="btn-secondary" onClick={onLeave}>
          ← Lobby
        </button>
        <div className="game-phase">{phase.replace("_", " ")}</div>
        <span
          className={`status-dot ${connected ? "connected" : "disconnected"}`}
          title={connected ? "Connected" : "Reconnecting…"}
        />
      </div>

      <div className="game-table">
        {gameState ? (
          <>
            <DealerArea
              cards={gameState.dealer_cards}
              value={gameState.dealer_value}
              phase={phase}
              onCardEvent={onCardEvent}
            />

            <div className="players-area">
              {Object.entries(gameState.players).map(([pid, p]) => (
                <PlayerBoxWithEvents
                  key={pid}
                  pid={pid}
                  player={p}
                  isMe={pid === myId}
                  isCurrent={pid === gameState.current_player_id}
                  result={gameState.results?.[pid] ?? null}
                  turnTimerKey={turnTimerKey}
                  onCardEvent={onCardEvent}
                />
              ))}
            </div>

            <GameActions
              gameState={gameState}
              myId={myId}
              myCoins={myCoins}
              onStart={onStart}
              onHit={onHit}
              onStand={onStand}
              onDouble={onDouble}
              onNewRound={onNewRound}
              onBet={onBet}
              play={play}
            />
          </>
        ) : (
          <div style={{ padding: "3rem", color: "var(--text-mute)" }}>Connecting…</div>
        )}
      </div>

      <div className="game-log-area">
        <h4>Log</h4>
        <div className="game-log">
          {log.length === 0 && <div className="log-entry">…</div>}
          {log.map((e) => (
            <div key={e.id} className="log-entry">
              {e.emoji} {e.text}
            </div>
          ))}
        </div>
      </div>

      <ResultOverlay shown={overlay?.kind ?? null} amount={overlay?.amount ?? null} />
    </div>
  );
}

interface PlayerBoxEventsProps {
  pid: string;
  player: GameState["players"][string];
  isMe: boolean;
  isCurrent: boolean;
  result: Result | null;
  turnTimerKey: string;
  onCardEvent: () => void;
}

function PlayerBoxWithEvents({
  pid,
  player,
  isMe,
  isCurrent,
  result,
  turnTimerKey,
  onCardEvent,
}: PlayerBoxEventsProps) {
  const prevBust = useRef(player.is_busted);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (player.is_busted && !prevBust.current) {
      setShake(true);
      const t = window.setTimeout(() => setShake(false), 500);
      prevBust.current = true;
      return () => clearTimeout(t);
    }
    prevBust.current = player.is_busted;
  }, [player.is_busted]);

  return (
    <PlayerBox
      playerId={pid}
      player={player}
      isMe={isMe}
      isCurrent={isCurrent}
      result={result}
      turnTimerKey={turnTimerKey}
      turnTotalSec={TURN_TOTAL_SEC}
      shake={shake}
      onCardEvent={onCardEvent}
    />
  );
}

interface ActionsProps {
  gameState: GameState;
  myId: string | null;
  myCoins: number;
  onStart: () => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onNewRound: () => void;
  onBet: (n: number) => void;
  play: (id: "chip_place" | "button_click") => void;
}

function GameActions({
  gameState,
  myId,
  myCoins,
  onStart,
  onHit,
  onStand,
  onDouble,
  onNewRound,
  onBet,
  play,
}: ActionsProps) {
  const me = myId ? gameState.players[myId] : null;
  const phase = gameState.phase;
  const isMyTurn = !!myId && gameState.current_player_id === myId;

  if (phase === "waiting") {
    return (
      <div className="game-actions">
        <button className="action-btn btn-deal" onClick={onStart}>
          Start Game
        </button>
      </div>
    );
  }

  if (phase === "betting") {
    if (!me || me.bet > 0) {
      return (
        <div className="game-actions">
          <p style={{ color: "var(--text-mute)" }}>Waiting for other bets…</p>
        </div>
      );
    }
    return (
      <BetArea minBalance={Math.max(10, myCoins)} onPlace={onBet} play={play} />
    );
  }

  if (phase === "player_turns" && isMyTurn) {
    const canDouble = me && me.cards.length === 2 && myCoins >= me.bet * 2;
    return (
      <div className="game-actions">
        <button className="action-btn btn-hit" onClick={onHit}>
          Hit
        </button>
        <button className="action-btn btn-stand" onClick={onStand}>
          Stand
        </button>
        {canDouble && (
          <button className="action-btn btn-double" onClick={onDouble}>
            Double
          </button>
        )}
      </div>
    );
  }

  if (phase === "player_turns") {
    return (
      <div className="game-actions">
        <p style={{ color: "var(--text-mute)" }}>Waiting for other players…</p>
      </div>
    );
  }

  if (phase === "resolution") {
    return (
      <div className="game-actions">
        <button className="action-btn btn-deal" onClick={onNewRound}>
          New Round
        </button>
      </div>
    );
  }

  return null;
}
