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
import type { GameState, Phase, Result } from "../../shared/types/game";
import { ReactionBar } from "../../shared/components/ReactionBar";
import { ReactionFloat } from "../../shared/components/ReactionFloat";
import { BannerAd } from "../../shared/components/BannerAd";
import { InterstitialAd } from "../../shared/components/InterstitialAd";
import { TableHeatBadge } from "../../shared/components/TableHeatBadge";
import { Spinner } from "../../shared/components/Spinner";
import { ConnectionLost } from "../../shared/components/ConnectionLost";
import { RulesModal } from "../../shared/components/RulesModal";
import { toast } from "../../shared/components/Toast";
import { useInterstitial } from "../../shared/hooks/useInterstitial";
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
  | "tick"
  | "heartbeat"
  | "anticipation_jackpot"
  | "anticipation_win"
  | "anticipation_lose";

interface NearMissDetail {
  gap: number;
  reason: "byOne" | "byPoint" | "busted22";
}

interface Props {
  tableId: string;
  onLeave: () => void;
  myCoins: number;
  onResolve: (delta: number) => void;
  play: (id: SoundId) => void;
  spectate?: boolean;
  tableThemeClass?: string;
  onContentReady?: () => void;
}

function detectNearMiss(
  myValue: number,
  isBusted: boolean,
  dealerValue: number,
  result: Result,
): NearMissDetail | null {
  if (result !== "lose") return null;
  if (myValue === 20 && dealerValue === 21) return { gap: 1, reason: "byOne" };
  if (isBusted && myValue === 22) return { gap: 1, reason: "busted22" };
  if (!isBusted && dealerValue - myValue === 1) return { gap: 1, reason: "byOne" };
  if (!isBusted && dealerValue - myValue === 2) return { gap: 2, reason: "byPoint" };
  return null;
}

export function BlackjackGame({ tableId, onLeave, myCoins, onResolve, play, spectate, tableThemeClass, onContentReady }: Props) {
  const myId = getUserId();
  const {
    connected,
    gameState,
    log,
    send,
    notifications,
    dismissNotification,
    error,
    errorVersion,
    reconnectExhausted,
    reconnect,
  } = useGameSocket(tableId, spectate);
  const interstitial = useInterstitial();
  const [showRules, setShowRules] = useState(false);

  // Surface WS errors as toasts (they otherwise only appear in the game log).
  useEffect(() => {
    if (error) toast(`errors.${error.code}`, error.params);
  }, [errorVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const [overlay, setOverlay] = useState<{
    kind: ResultKind;
    amount: number | null;
    nearMissDetail?: NearMissDetail | null;
  } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [softShaking, setSoftShaking] = useState(false);
  const [dealerRevealing, setDealerRevealing] = useState(false);
  const overlayRef = useRef<{ kind: ResultKind; amount: number | null; nearMissDetail?: NearMissDetail | null } | null>(null);
  overlayRef.current = overlay;
  const prevPhaseRef = useRef<Phase | null>(null);
  const prevDealerCountRef = useRef<number>(0);
  const prevBustedRef = useRef<Record<string, boolean>>({});
  const playRef = useRef(play);
  playRef.current = play;
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  // Signal "publisher content present" once the WS state arrives so AdSense
  // is gated off during the connecting placeholder (policy 11112688).
  useEffect(() => {
    if (gameState) onContentReady?.();
  }, [gameState, onContentReady]);

  // Phase transition + bust detection
  useEffect(() => {
    if (!gameState) return;
    const phase = gameState.phase;
    const prevPhase = prevPhaseRef.current;
    const dealerCount = gameState.dealer_cards.length;
    const prevDealerCount = prevDealerCountRef.current;

    if (
      (prevPhase === "player_turns" || prevPhase === "betting") &&
      (phase === "dealer_turn" || phase === "resolution")
    ) {
      // Dealer hole-card reveal — build suspense before the flip lands.
      // (Also fires on the dealer-BJ short-circuit, where deal() routes
      // straight from betting → dealer_turn for the peek beat.)
      playRef.current("heartbeat");
      window.setTimeout(() => playRef.current("heartbeat"), 220);
      window.setTimeout(() => playRef.current("card_flip"), 480);
      setDealerRevealing(true);
      window.setTimeout(() => setDealerRevealing(false), 620);
    } else if (
      phase === "dealer_turn" &&
      prevPhase === "dealer_turn" &&
      dealerCount > prevDealerCount
    ) {
      // Server paced the dealer's next hit through — flip the new card.
      playRef.current("card_flip");
      setDealerRevealing(true);
      window.setTimeout(() => setDealerRevealing(false), 420);
    }
    prevPhaseRef.current = phase;
    prevDealerCountRef.current = dealerCount;

    for (const [pid, p] of Object.entries(gameState.players)) {
      const wasBusted = prevBustedRef.current[pid] ?? false;
      if (!wasBusted && p.is_busted) {
        playRef.current("bust");
      }
      prevBustedRef.current[pid] = p.is_busted;
    }
  }, [gameState]);

  // Resolution → overlay + anticipation SFX
  useEffect(() => {
    if (!gameState || !myId) return;
    if (gameState.phase !== "resolution") {
      if (overlay && gameState.phase === "betting") {
        setOverlay(null);
        setShaking(false);
      }
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
    let nearMissDetail: NearMissDetail | null = null;

    const nm = detectNearMiss(myValue, isBusted, dealerValue, myResult);

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
    } else if (nm) {
      kind = "near_miss";
      amount = -bet;
      delta = -bet;
      nearMissDetail = nm;
    } else {
      kind = isBusted ? "bust" : "lose";
      amount = -bet;
      delta = -bet;
    }

    onResolveRef.current(delta);
    setOverlay({ kind, amount, nearMissDetail });

    // Anticipation SFX. A near-miss is a loss — it gets the lose cue, not the
    // win cue (no "losses disguised as wins").
    if (kind === "blackjack") {
      playRef.current("anticipation_jackpot");
    } else if (kind === "win") {
      playRef.current("anticipation_win");
    } else if (kind !== "push") {
      playRef.current("anticipation_lose");
    }
  }, [gameState, myId]);

  // Reveal callback — result SFX + confetti + shake
  const onOverlayReveal = useCallback(() => {
    const o = overlayRef.current;
    if (!o) return;
    const { kind, amount: amt } = o;

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
      setShaking(true);
    } else if (kind === "win") {
      playRef.current("win");
      playRef.current("chip_payout");
      // Confetti scales with bet — bigger wins erupt more
      const absAmt = Math.abs(amt ?? 0);
      const tier = absAmt >= 500 ? "mega" : absAmt >= 200 ? "big" : "normal";
      const intensity = tier === "mega" ? 200 : tier === "big" ? 140 : 100;
      confetti({
        particleCount: intensity,
        spread: tier === "mega" ? 110 : 80,
        startVelocity: tier === "mega" ? 50 : 40,
        origin: { y: 0.6 },
        colors: ["#f4c430", "#3aa9ff", "#ffffff", "#c41e3a"],
      });
      if (tier === "mega") {
        window.setTimeout(
          () =>
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.6 },
              colors: ["#f4c430", "#ffffff"],
            }),
          350,
        );
      }
    } else if (kind === "near_miss") {
      // A near-miss is just a loss. No "so close" shake/amplification — play the
      // ordinary lose cue so a loss never feels like a near-win.
      playRef.current("lose");
    } else if (kind === "push") {
      playRef.current("push");
    } else if (kind === "bust") {
      playRef.current("bust");
    } else {
      playRef.current("lose");
    }
  }, []);

  const onOverlayComplete = useCallback(() => {
    setOverlay(null);
    setShaking(false);
    setSoftShaking(false);
    if (interstitial.checkRound()) {
      interstitial.show();
    }
  }, [interstitial]);

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

  const { t } = useTranslation();

  // Reason strings for disabled buttons
  const turnReason = !isMyTurn
    ? t("blackjack.reasons.otherTurn")
    : me?.is_busted
      ? t("blackjack.reasons.busted")
      : phase !== "player_turns"
        ? t("blackjack.reasons.wrongPhase")
        : null;
  const doubleReason = !canDouble
    ? !isMyTurn
      ? t("blackjack.reasons.otherTurn")
      : !me || me.cards.length !== 2
        ? t("blackjack.reasons.doubleNeedsTwoCards")
        : me.is_busted
          ? t("blackjack.reasons.busted")
          : myCoins < me.bet
            ? t("blackjack.reasons.notEnoughCoinsForDouble")
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
        { key: "H", label: t("keyHints.hit"), disabled: !canHit },
        { key: "S", label: t("keyHints.stand"), disabled: !canStand },
        { key: "D", label: t("keyHints.double"), disabled: !canDouble },
      ];
    }
    if (phase === "waiting") return [{ key: "Enter", label: t("keyHints.start") }];
    if (phase === "resolution") return [{ key: "Enter", label: t("keyHints.nextRound") }];
    return [];
  }, [phase, canHit, canStand, canDouble, t]);

  return (
    <div className={`game-section${shaking ? " is-shaking" : ""}${softShaking ? " is-shaking-soft" : ""}${tableThemeClass ? ` ${tableThemeClass}` : ""}`}>
      <div className="game-topbar">
        <button className="btn-secondary" onClick={onLeave}>
          {t("common.backToLobby")}
        </button>
        <div className="game-phase">{t(`phase.blackjack.${phase}`)}</div>
        <TableHeatBadge heat={gameState?.table_heat} />
        <button
          className="mute-btn help-btn"
          onClick={() => { play("button_click"); setShowRules(true); }}
          title={t("help.button")}
          aria-label={t("help.button")}
        >
          ?
        </button>
        <span
          className={`status-dot ${connected ? "connected" : "disconnected"}`}
          title={connected ? t("common.connected") : t("common.reconnecting")}
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
              revealing={dealerRevealing}
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

            <div className="game-log-area">
              <h4>{t("common.log")}</h4>
              <div className="game-log">
                {log.length === 0 && <div className="log-entry">…</div>}
                {log.map((e) => (
                  <div key={e.id} className="log-entry">
                    {e.emoji} {t(e.textKey, e.textParams)}
                  </div>
                ))}
              </div>
            </div>

            {phase === "resolution" && <BannerAd size="mrec" />}
          </>
        ) : (
          <Spinner label={t("common.connecting")} />
        )}
      </div>

      {gameState && (
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
      )}

      <ReactionBar send={send} />

      <KeyHintBar hints={hints} />

      {gameState && <BannerAd size="standard" className="ad-anchor-bottom" />}

      <ReactionFloat notifications={notifications} dismissNotification={dismissNotification} />

      <InterstitialAd open={interstitial.shouldShow} onClose={interstitial.onDismiss} />

      <ResultOverlay
        shown={overlay?.kind ?? null}
        amount={overlay?.amount ?? null}
        nearMissDetail={overlay?.nearMissDetail ?? null}
        onReveal={onOverlayReveal}
        onComplete={onOverlayComplete}
      />

      <RulesModal open={showRules} onClose={() => setShowRules(false)} gameType="blackjack" />

      <ConnectionLost open={reconnectExhausted} onReconnect={reconnect} onLeave={onLeave} />
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
  const { t } = useTranslation();
  const otherThinkingText = t("blackjack.otherThinking");
  if (phase === "waiting") {
    return (
      <div className="game-actions">
        <ActionButton variant="deal" highlight onClick={onStart} shortcut="↵">
          {t("common.startGame")}
        </ActionButton>
      </div>
    );
  }

  if (phase === "betting") {
    if (!hasMe || myBet > 0) {
      return (
        <div className="game-actions">
          <p className="action-hint">{t("blackjack.waitingForBets")}</p>
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
          {t("blackjack.actions.hit")}
        </ActionButton>
        <ActionButton
          variant="stand"
          onClick={onStand}
          disabled={!canStand}
          reason={turnReason}
          highlight={canStand}
          shortcut="S"
        >
          {t("blackjack.actions.stand")}
        </ActionButton>
        <ActionButton
          variant="double"
          onClick={onDouble}
          disabled={!canDouble}
          reason={doubleReason}
          highlight={canDouble}
          shortcut="D"
        >
          {t("blackjack.actions.double")}
        </ActionButton>
        {!isMyTurn && <p className="action-hint">{otherThinkingText}</p>}
        {/* Touch devices can't see the disabled-button tooltips, so surface the
            reason inline (hidden on hover-capable pointers via CSS). */}
        {isMyTurn && doubleReason && (
          <p className="action-hint action-hint--touch">{doubleReason}</p>
        )}
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
          {t("common.newRound")}
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
