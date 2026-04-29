import { useEffect, useState } from "react";
import { Chip } from "./Chip";

interface Props {
  minBalance: number;
  initialBet?: number;
  onPlace: (amount: number) => void;
  play: (id: "chip_place" | "button_click") => void;
}

const PRESETS = [10, 50, 100, 500];

export function BetArea({ minBalance, initialBet, onPlace, play }: Props) {
  const [amount, setAmount] = useState(initialBet ?? 10);

  useEffect(() => {
    if (amount > minBalance) setAmount(Math.max(10, minBalance));
  }, [minBalance, amount]);

  const add = (v: number) => {
    play("chip_place");
    setAmount((cur) => Math.min(minBalance, cur + v));
  };

  const setMax = () => {
    play("chip_place");
    setAmount(Math.max(10, minBalance));
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

      <div className="bet-display">
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
