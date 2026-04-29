import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameSocket } from "../../shared/api/useGameSocket";
import { getUserId } from "../../shared/api/api";
import { BetArea } from "../../shared/components/BetArea";
import {
  ResultOverlay,
  type ResultKind,
} from "../../shared/components/ResultOverlay";
import type {
  ChinchiroGameState,
  ChinchiroPhase,
} from "../../shared/types/game";
import { BankerArea } from "./BankerArea";
import { PlayerSeat } from "./PlayerSeat";

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
  | "tick"
  | "dice_shake"
  | "dice_land"
  | "pinzoro"
  | "arashi"
  | "shigoro"
  | "hifumi"
  | "menashi"
  | "heartbeat";

interface Props {
  tableId: string;
  onLeave: () => void;
  myCoins: number;
  onResolve: (delta: number) => void;
  play: (id: SoundId) => void;
}

const HAND_SOUNDS: Record<string, SoundId> = {
  pinzoro: "pinzoro",
  arashi: "arashi",
  shigoro: "shigoro",
  hifumi: "hifumi",
  menashi: "menashi",
};

export function ChinchiroGame({
  tableId,
  onLeave,
  myCoins,
  onResolve,
  play,
}: Props) {
  const myId = getUserId();
  const { connected, gameState: rawState, log, send } = useGameSocket(tableId);
  const state = rawState as unknown as ChinchiroGameState | null;

  const [overlay, setOverlay] = useState<
    { kind: ResultKind; amount: number | null } | null
  >(null);

  const prevBankerRollCountRef = useRef(0);
  const prevBankerHandRef = useRef<string | null>(null);
  const prevPlayerRollCountsRef = useRef<Record<string, number>>({});
  const playRef = useRef(play);
  playRef.current = play;
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  // SFX on incremental dice events
  useEffect(() => {
    if (!state) return;

    if (state.banker_rolls.length > prevBankerRollCountRef.current) {
      playRef.current("dice_land");
    }
    prevBankerRollCountRef.current = state.banker_rolls.length;

    if (
      state.banker_hand &&
      prevBankerHandRef.current !== state.banker_hand.name
    ) {
      const sound = HAND_SOUNDS[state.banker_hand.name];
      if (sound) playRef.current(sound);
    }
    prevBankerHandRef.current = state.banker_hand?.name ?? null;

    for (const [pid, p] of Object.entries(state.players)) {
      const prev = prevPlayerRollCountsRef.current[pid] ?? 0;
      if (p.rolls.length > prev) {
        playRef.current("dice_land");
      }
      prevPlayerRollCountsRef.current[pid] = p.rolls.length;
      if (p.settled && p.hand && pid === myId) {
        // Player's own hand SFX is implicit through the result overlay;
        // we leave the dice_land + later overlay to do the work.
      }
    }
  }, [state, myId]);

  // Resolution → overlay + confetti + payout
  useEffect(() => {
    if (!state || !myId) return;
    if (state.phase !== "resolution") {
      if (overlay && state.phase === "betting") setOverlay(null);
      return;
    }
    if (overlay) return;

    const payout = state.payouts?.[myId] ?? 0;
    const myHand = state.players[myId]?.hand ?? null;
    const bankerHand = state.banker_hand;

    let kind: ResultKind;
    if (bankerHand?.name === "pinzoro") kind = "pinzoro";
    else if (bankerHand?.name === "arashi") kind = "arashi";
    else if (bankerHand?.name === "shigoro") kind = "shigoro";
    else if (bankerHand?.name === "hifumi") kind = "hifumi";
    else if (myHand?.name === "pinzoro") kind = "pinzoro";
    else if (myHand?.name === "arashi") kind = "arashi";
    else if (myHand?.name === "shigoro") kind = "shigoro";
    else if (myHand?.name === "hifumi") kind = "hifumi";
    else if (myHand?.name === "menashi") kind = "menashi";
    else if (payout > 0) kind = "win";
    else if (payout < 0) kind = "lose";
    else kind = "wakare";

    setOverlay({ kind, amount: payout });
    onResolveRef.current(payout);

    if (payout > 0) {
      const intensity =
        kind === "pinzoro" ? 220 : kind === "arashi" ? 140 : kind === "shigoro" ? 100 : 80;
      const colors =
        kind === "pinzoro"
          ? ["#f4c430", "#ffd84a", "#ffffff"]
          : kind === "arashi"
            ? ["#c41e3a", "#f4c430", "#ffffff"]
            : kind === "shigoro"
              ? ["#3aa9ff", "#f4c430"]
              : ["#f4c430", "#ffffff"];
      confetti({
        particleCount: intensity,
        spread: 90,
        origin: { y: 0.6 },
        colors,
      });
      if (kind === "pinzoro") {
        window.setTimeout(
          () =>
            confetti({
              particleCount: 180,
              spread: 110,
              startVelocity: 55,
              origin: { y: 0.5 },
              colors,
            }),
          400,
        );
        window.setTimeout(
          () =>
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.65 },
              colors,
            }),
          900,
        );
      }
      // Player-side coin payout SFX
      playRef.current("chip_payout");
    } else if (payout < 0) {
      // For non-special losses, nudge with a "lose" sound
      if (kind === "lose") playRef.current("lose");
    } else {
      playRef.current("push");
    }

    const dur = kind === "pinzoro" ? 3200 : kind === "arashi" ? 2400 : 2000;
    const t = window.setTimeout(() => setOverlay(null), dur);
    return () => clearTimeout(t);
  }, [state, myId, overlay]);

  const onStart = useCallback(() => {
    play("button_click");
    send("start");
  }, [send, play]);
  const onBet = useCallback(
    (amount: number) => {
      play("chip_place");
      send("bet", { amount });
    },
    [send, play],
  );
  const onRoll = useCallback(() => {
    play("dice_shake");
    send("roll");
  }, [send, play]);
  const onNewRound = useCallback(() => {
    play("button_click");
    send("new_round");
  }, [send, play]);

  if (!state) {
    return (
      <div className="game-section">
        <div className="game-topbar">
          <button className="btn-secondary" onClick={onLeave}>
            ← Lobby
          </button>
          <div className="game-phase">CONNECTING</div>
          <span
            className={`status-dot ${connected ? "connected" : "disconnected"}`}
          />
        </div>
        <div className="game-table">
          <div style={{ padding: "3rem", color: "var(--text-mute)" }}>
            Connecting…
          </div>
        </div>
      </div>
    );
  }

  const phase: ChinchiroPhase = state.phase;
  const me = myId ? state.players[myId] : null;
  const isMyTurn = !!myId && state.current_player_id === myId;
  const maxBet = Math.max(10, Math.floor(myCoins / 5));

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

      <div className="game-table chinchiro-table">
        <BankerArea
          rolls={state.banker_rolls}
          hand={state.banker_hand}
          showHand={
            state.banker_hand != null &&
            (phase === "banker_roll" ||
              phase === "player_rolls" ||
              phase === "resolution")
          }
        />

        <div className="players-area">
          {Object.entries(state.players).map(([pid, p]) => (
            <PlayerSeat
              key={pid}
              displayName={p.display_name}
              isMe={pid === myId}
              isCurrent={pid === state.current_player_id}
              bet={p.bet}
              rolls={p.rolls}
              hand={p.hand}
              payout={
                phase === "resolution"
                  ? (state.payouts?.[pid] ?? null)
                  : null
              }
              showHand={p.settled || phase === "resolution"}
              turnTotalSec={TURN_TOTAL_SEC}
              turnTimerKey={`${phase}-${state.current_player_id ?? ""}-${p.rolls.length}`}
            />
          ))}
        </div>

        <div className="game-actions">
          {phase === "waiting" && (
            <button className="action-btn btn-deal" onClick={onStart}>
              Start Game
            </button>
          )}
          {phase === "betting" && me && me.bet === 0 && (
            <BetArea minBalance={maxBet} onPlace={onBet} play={play} />
          )}
          {phase === "betting" && me && me.bet > 0 && (
            <p style={{ color: "var(--text-mute)" }}>
              ベット {me.bet} 完了 — 他プレイヤー待機中…
            </p>
          )}
          {phase === "banker_roll" && (
            <p style={{ color: "var(--gold)", fontFamily: "var(--font-display)", letterSpacing: "0.2em" }}>
              親が振っている…
            </p>
          )}
          {phase === "player_rolls" && isMyTurn && me && !me.settled && (
            <button className="action-btn btn-deal" onClick={onRoll}>
              サイコロを振る ({me.rolls.length + 1}投目 / 3)
            </button>
          )}
          {phase === "player_rolls" && !isMyTurn && (
            <p style={{ color: "var(--text-mute)" }}>
              他のプレイヤーが振っています…
            </p>
          )}
          {phase === "resolution" && (
            <button className="action-btn btn-deal" onClick={onNewRound}>
              New Round
            </button>
          )}
        </div>
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

      <ResultOverlay
        shown={overlay?.kind ?? null}
        amount={overlay?.amount ?? null}
      />
    </div>
  );
}
