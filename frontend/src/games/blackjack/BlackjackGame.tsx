import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameSocket } from "../../shared/api/useGameSocket";
import { getUserId } from "../../shared/api/api";
import { ActionButton } from "../../shared/components/ActionButton";
import { BetArea } from "../../shared/components/BetArea";
import { KeyHintBar, type KeyHint } from "../../shared/components/KeyHintBar";
import {
  ResultOverlay,
  type ResultKind,
} from "../../shared/components/ResultOverlay";
import type { GameState, Phase, Result } from "../../shared/types/game";
import { DealerArea } from "./DealerArea";
import { PlayerBox } from "./PlayerBox";

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

export function BlackjackGame({ tableId, onLeave, myCoins, onResolve, play }: Props) {
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
      kind = isBusted ? "bust" : "lose";
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
    } else if (kind === "bust") {
      playRef.current("bust");
    } else {
      playRef.current("lose");
    }

    const dur =
      kind === "lose" || kind === "bust"
        ? 1100
        : kind === "blackjack"
          ? 2400
          : 1900;
    const t = window.setTimeout(() => setOverlay(null), dur);
    return () => clearTimeout(t);
  }, [gameState, myId, overlay]);

  const phase: Phase = gameState?.phase ?? "waiting";
  const me = myId ? gameState?.players[myId] : null;
  const isMyTurn = !!myId && gameState?.current_player_id === myId;

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

  // Action availability
  const canHit = phase === "player_turns" && !!isMyTurn && !me?.is_busted;
  const canStand = canHit;
  const canDouble =
    phase === "player_turns" &&
    !!isMyTurn &&
    !!me &&
    me.cards.length === 2 &&
    !me.is_busted &&
    myCoins >= me.bet;
  const canStart = phase === "waiting";
  const canNewRound = phase === "resolution";

  // Reason strings for disabled buttons
  const turnReason = !isMyTurn
    ? "他のプレイヤーのターンです"
    : me?.is_busted
      ? "バーストしているため操作できません"
      : phase !== "player_turns"
        ? "今は操作できないフェーズです"
        : null;
  const doubleReason = !canDouble
    ? !isMyTurn
      ? "他のプレイヤーのターンです"
      : !me || me.cards.length !== 2
        ? "ダブルダウンは初手2枚のときだけ可能"
        : me.is_busted
          ? "バーストしているため操作できません"
          : myCoins < me.bet
            ? "ダブル分のコインが足りません"
            : null
    : null;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (k === "h" && canHit) {
        e.preventDefault();
        onHit();
      } else if (k === "s" && canStand) {
        e.preventDefault();
        onStand();
      } else if (k === "d" && canDouble) {
        e.preventDefault();
        onDouble();
      } else if ((k === "enter" || k === " ") && canNewRound) {
        e.preventDefault();
        onNewRound();
      } else if ((k === "enter" || k === " ") && canStart) {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canHit, canStand, canDouble, canNewRound, canStart, onHit, onStand, onDouble, onNewRound, onStart]);

  // Hint bar rows depending on phase
  const hints: KeyHint[] = useMemo(() => {
    if (phase === "player_turns") {
      return [
        { key: "H", label: "Hit", disabled: !canHit },
        { key: "S", label: "Stand", disabled: !canStand },
        { key: "D", label: "Double", disabled: !canDouble },
      ];
    }
    if (phase === "waiting") return [{ key: "Enter", label: "Start" }];
    if (phase === "resolution") return [{ key: "Enter", label: "Next round" }];
    return [];
  }, [phase, canHit, canStand, canDouble]);

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

            <div
              className={`players-area${
                gameState.current_player_id ? " has-current" : ""
              }`}
            >
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
              phase={phase}
              hasMe={!!me}
              myBet={me?.bet ?? 0}
              myCoins={myCoins}
              isMyTurn={!!isMyTurn}
              canHit={canHit}
              canStand={canStand}
              canDouble={canDouble}
              canNewRound={canNewRound}
              turnReason={turnReason}
              doubleReason={doubleReason}
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

      <KeyHintBar hints={hints} />

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
  phase: Phase;
  hasMe: boolean;
  myBet: number;
  myCoins: number;
  isMyTurn: boolean;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  canNewRound: boolean;
  turnReason: string | null;
  doubleReason: string | null;
  onStart: () => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onNewRound: () => void;
  onBet: (n: number) => void;
  play: (id: "chip_place" | "button_click") => void;
}

function GameActions({
  phase,
  hasMe,
  myBet,
  myCoins,
  isMyTurn,
  canHit,
  canStand,
  canDouble,
  canNewRound,
  turnReason,
  doubleReason,
  onStart,
  onHit,
  onStand,
  onDouble,
  onNewRound,
  onBet,
  play,
}: ActionsProps) {
  if (phase === "waiting") {
    return (
      <div className="game-actions">
        <ActionButton variant="deal" highlight onClick={onStart} shortcut="↵">
          Start Game
        </ActionButton>
      </div>
    );
  }

  if (phase === "betting") {
    if (!hasMe || myBet > 0) {
      return (
        <div className="game-actions">
          <p className="action-hint">Waiting for other bets…</p>
        </div>
      );
    }
    return (
      <BetArea minBalance={Math.max(10, myCoins)} onPlace={onBet} play={play} />
    );
  }

  if (phase === "player_turns") {
    return (
      <div className="game-actions">
        <ActionButton
          variant="hit"
          onClick={onHit}
          disabled={!canHit}
          reason={turnReason}
          highlight={canHit}
          shortcut="H"
        >
          Hit
        </ActionButton>
        <ActionButton
          variant="stand"
          onClick={onStand}
          disabled={!canStand}
          reason={turnReason}
          shortcut="S"
        >
          Stand
        </ActionButton>
        <ActionButton
          variant="double"
          onClick={onDouble}
          disabled={!canDouble}
          reason={doubleReason}
          shortcut="D"
        >
          Double
        </ActionButton>
        {!isMyTurn && <p className="action-hint">他のプレイヤーが思考中…</p>}
      </div>
    );
  }

  if (phase === "resolution") {
    return (
      <div className="game-actions">
        <ActionButton
          variant="deal"
          onClick={onNewRound}
          highlight={canNewRound}
          shortcut="↵"
        >
          New Round
        </ActionButton>
      </div>
    );
  }

  // dealer_turn / dealing
  return (
    <div className="game-actions">
      <p className="action-hint">…</p>
    </div>
  );
}
