import { useEffect, useRef, useState } from "react";
import { Chip } from "./Chip";
import { BetChipStack } from "./BetChipStack";
import { play as playSound } from "../audio/sounds";

interface Props {
  minBalance: number;
  initialBet?: number;
  onPlace: (amount: number) => void;
  play: (id: "chip_place" | "button_click") => void;
}

const PRESETS = [10, 50, 100, 500];

// Chip count for pitch shift — denser stack = higher pitch (more satisfying)
function chipCountFor(amount: number): number {
  let remaining = amount;
  let count = 0;
  for (const d of [1000, 500, 100, 50, 10]) {
    while (remaining >= d) {
      remaining -= d;
      count++;
    }
  }
  return count;
}

export function BetArea({ minBalance, initialBet, onPlace, play }: Props) {
  const [amount, setAmount] = useState(initialBet ?? 10);
  const [bumped, setBumped] = useState(false);
  const bumpTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (amount > minBalance) setAmount(Math.max(10, minBalance));
  }, [minBalance, amount]);

  // Replay bet-display bump on every amount change (initial render skipped via initial state)
  const prevAmountRef = useRef(amount);
  useEffect(() => {
    if (prevAmountRef.current !== amount) {
      setBumped(true);
      if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
      bumpTimerRef.current = window.setTimeout(() => setBumped(false), 320);
    }
    prevAmountRef.current = amount;
    return () => {
      if (bumpTimerRef.current) window.clearTimeout(bumpTimerRef.current);
    };
  }, [amount]);

  const add = (v: number) => {
    setAmount((cur) => {
      const next = Math.min(minBalance, cur + v);
      // Pitch climbs with stack density — call directly for pitch control
      // (the parent's `play` doesn't expose pitch)
      const pitchShift = Math.min(600, chipCountFor(next) * 60);
      playSound("chip_place", { pitchShift });
      return next;
    });
  };

  const setMax = () => {
    setAmount(() => {
      const next = Math.max(10, minBalance);
      const pitchShift = Math.min(700, chipCountFor(next) * 50);
      playSound("chip_place", { pitchShift });
      return next;
    });
  };

  const reset = () => {
    play("button_click");
    setAmount(10);
  };

  return (
    <div className="bet-area">
      <div className="chip-row">
        {PRESETS.map((v) => (
          <Chip key={v} value={v} onClick={() => add(v)} disabled={amount + v > minBalance} />
        ))}
        <Chip value={1000} onClick={setMax} label="MAX" />
      </div>

      <BetChipStack amount={amount} />

      <div className={`bet-display${bumped ? " bet-display-bumped" : ""}`}>
        <span>Bet</span>
        <input
          type="number"
          min={10}
          max={minBalance}
          step={10}
          value={amount}
          onChange={(e) => setAmount(Math.min(minBalance, parseInt(e.target.value) || 0))}
        />
      </div>

      <div className="bet-actions">
        <button className="btn-secondary" onClick={reset}>
          Reset
        </button>
        <button
          className="action-btn btn-deal"
          onClick={() => {
            play("button_click");
            if (amount >= 10 && amount <= minBalance) onPlace(amount);
          }}
          disabled={amount < 10 || amount > minBalance}
        >
          Place Bet
        </button>
      </div>
    </div>
  );
}
