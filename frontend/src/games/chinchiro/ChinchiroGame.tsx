import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useGameSocket } from "../../shared/api/useGameSocket";
import { getUserId } from "../../shared/api/api";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { ActionButton } from "../../shared/components/ActionButton";
import { BetArea } from "../../shared/components/BetArea";
import { KeyHintBar, type KeyHint } from "../../shared/components/KeyHintBar";
import {
  ResultOverlay,
  type ResultKind,
} from "../../shared/components/ResultOverlay";
import type {
  ChinchiroGameState,
  ChinchiroPhase,
} from "../../shared/types/game";
import { ReactionBar } from "../../shared/components/ReactionBar";
import { ReactionFloat } from "../../shared/components/ReactionFloat";
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
  | "heartbeat"
  | "anticipation_jackpot"
  | "anticipation_win"
  | "anticipation_lose";

interface Props {
  tableId: string;
  onLeave: () => void;
  myCoins: number;
  onResolve: (delta: number) => void;
  play: (id: SoundId) => void;
  spectate?: boolean;
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
  spectate,
}: Props) {
  const { t } = useTranslation();
  const myId = getUserId();
  const { connected, gameState: rawState, log, send, notifications, dismissNotification } = useGameSocket(tableId, spectate);
  const state = rawState as unknown as ChinchiroGameState | null;

  const [overlay, setOverlay] = useState<
    { kind: ResultKind; amount: number | null } | null
  >(null);
  const [shaking, setShaking] = useState(false);
  const overlayRef = useRef<{ kind: ResultKind; amount: number | null } | null>(null);
  overlayRef.current = overlay;

  const prevBankerRollCountRef = useRef(0);
  const prevBankerHandRef = useRef<string | null>(null);
  const prevPlayerRollCountsRef = useRef<Record<string, number>>({});
  const bankerNearMissFiredRef = useRef(false);
  const playRef = useRef(play);
  playRef.current = play;
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  // SFX on incremental dice events
  useEffect(() => {
    if (!state) return;

    if (state.phase === "betting") {
      bankerNearMissFiredRef.current = false;
    }

    if (state.banker_rolls.length > prevBankerRollCountRef.current) {
      playRef.current("dice_land");

      // Banker near-miss reach: latest banker roll has 2 of the same value
      // but the third differs → suspense heartbeat before result resolves.
      const latest = state.banker_rolls[state.banker_rolls.length - 1];
      if (latest && !bankerNearMissFiredRef.current) {
        const [a, b, c] = latest;
        const allSame = a === b && b === c;
        const twoSame = !allSame && (a === b || b === c || a === c);
        if (twoSame) {
          bankerNearMissFiredRef.current = true;
          window.setTimeout(() => playRef.current("heartbeat"), 220);
          window.setTimeout(() => playRef.current("heartbeat"), 700);
        }
      }
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

  // Resolution → overlay + anticipation SFX
  useEffect(() => {
    if (!state || !myId) return;
    if (state.phase !== "resolution") {
      if (overlay && state.phase === "betting") {
        setOverlay(null);
        setShaking(false);
      }
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

    // Anticipation SFX
    if (kind === "pinzoro" || kind === "arashi") {
      playRef.current("anticipation_jackpot");
    } else if (kind === "win" || kind === "shigoro") {
      playRef.current("anticipation_win");
    } else if (kind !== "wakare") {
      playRef.current("anticipation_lose");
    }
  }, [state, myId]);

  // Reveal callback — result SFX + confetti + shake
  const onOverlayReveal = useCallback(() => {
    const o = overlayRef.current;
    if (!o) return;
    const { kind, amount: amt } = o;

    if (amt != null && amt > 0) {
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
      playRef.current("chip_payout");
    } else if (amt != null && amt < 0) {
      if (kind === "lose") playRef.current("lose");
    } else {
      playRef.current("push");
    }

    if (kind === "pinzoro" || kind === "arashi") {
      setShaking(true);
    }
  }, []);

  const onOverlayComplete = useCallback(() => {
    setOverlay(null);
    setShaking(false);
  }, []);

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

  const phase: ChinchiroPhase = state?.phase ?? "waiting";
  const me = state && myId ? state.players[myId] : null;
  const isMyTurn = !!state && !!myId && state.current_player_id === myId;
  const maxBet = Math.max(10, Math.floor(myCoins / 5));

  const canStart = !!state && phase === "waiting";
  const canRoll =
    !!state && phase === "player_rolls" && isMyTurn && !!me && !me.settled;
  const canNewRound = !!state && phase === "resolution";

  const rollReason: string | null = !canRoll
    ? phase !== "player_rolls"
      ? t("chinchiro.reasons.wrongPhase")
      : !isMyTurn
        ? t("chinchiro.reasons.otherRolling")
        : me?.settled
          ? t("chinchiro.reasons.fixed")
          : null
    : null;

  const hints: KeyHint[] = useMemo(() => {
    if (!state) return [];
    if (phase === "waiting") return [{ key: "Enter", label: "Start" }];
    if (phase === "player_rolls") {
      return [{ key: "R", label: "Roll", disabled: !canRoll }];
    }
    if (phase === "resolution") return [{ key: "Enter", label: "Next round" }];
    return [];
  }, [state, phase, canRoll]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;
      const k = e.key.toLowerCase();
      if (k === "r" && canRoll) {
        e.preventDefault();
        onRoll();
      } else if ((k === "enter" || k === " ") && canStart) {
        e.preventDefault();
        onStart();
      } else if ((k === "enter" || k === " ") && canNewRound) {
        e.preventDefault();
        onNewRound();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canRoll, canStart, canNewRound, onRoll, onStart, onNewRound]);

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

  return (
    <div className={`game-section${shaking ? " is-shaking" : ""}`}>
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

        <div
          className={`players-area${
            state.current_player_id ? " has-current" : ""
          }`}
        >
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
      </div>

      <div className="game-actions">
        {phase === "waiting" && (
          <ActionButton
            variant="deal"
            onClick={onStart}
            highlight
            shortcut="↵"
          >
            Start Game
          </ActionButton>
        )}
        {phase === "betting" && me && me.bet === 0 && (
          <BetArea minBalance={maxBet} onPlace={onBet} play={play} />
        )}
        {phase === "betting" && me && me.bet > 0 && (
          <p className="action-hint">
            {t("chinchiro.betDoneWaiting", { bet: me.bet })}
          </p>
        )}
        {phase === "banker_roll" && (
          <p
            style={{
              color: "var(--gold)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.2em",
            }}
          >
            {t("chinchiro.bankerRolling")}
          </p>
        )}
        {phase === "player_rolls" && (
          <ActionButton
            variant="deal"
            onClick={onRoll}
            disabled={!canRoll}
            reason={rollReason}
            highlight={canRoll}
            shortcut="R"
          >
            {canRoll && me
              ? t("chinchiro.rollNth", { n: me.rolls.length + 1 })
              : t("chinchiro.rollDice")}
          </ActionButton>
        )}
        {phase === "resolution" && (
          <ActionButton
            variant="deal"
            onClick={onNewRound}
            highlight={canNewRound}
            shortcut="↵"
          >
            New Round
          </ActionButton>
        )}
      </div>

      <ReactionBar send={send} />

      <KeyHintBar hints={hints} />

      <ReactionFloat notifications={notifications} dismissNotification={dismissNotification} />

      <ResultOverlay
        shown={overlay?.kind ?? null}
        amount={overlay?.amount ?? null}
        onReveal={onOverlayReveal}
        onComplete={onOverlayComplete}
      />
    </div>
  );
}
