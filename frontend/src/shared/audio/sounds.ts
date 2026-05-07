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
  | "count_up"
  | "near_miss"
  | "tick"
  | "bonus"
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

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
interface BgmNodes {
  osc: OscillatorNode;
  gain: GainNode;
  tensionOsc: OscillatorNode;
  tensionGain: GainNode;
  tensionOsc2: OscillatorNode;
  tensionGain2: GainNode;
  tremoloLfo: OscillatorNode;
  tremoloGain: GainNode;
  bgmFilter: BiquadFilterNode;
}
let bgmNodes: BgmNodes | null = null;
let currentTensionLevel: 0 | 1 | 2 | 3 = 0;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (!masterGain || !ctx) return;
  masterGain.gain.cancelScheduledValues(ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(value ? 0 : 0.4, ctx.currentTime + 0.05);
}

export function isMuted(): boolean {
  return muted;
}

export function unlockAudio(): void {
  // Browsers require a user-gesture before AudioContext can produce sound.
  ensureCtx();
}

interface ToneOptions {
  freq: number;
  type?: OscillatorType;
  duration: number;
  startTime?: number;
  attack?: number;
  release?: number;
  peakGain?: number;
  freqEnd?: number;
  pitchShift?: number;
}

function tone(opts: ToneOptions): void {
  const c = ensureCtx();
  if (!c || !masterGain) return;

  // Never schedule in the past — fresh AudioContexts return currentTime ≈ 0,
  // which combined with short clips and the default 0.1s release would push
  // the sustain-end below 0 and throw RangeError on setValueAtTime.
  const start = Math.max(c.currentTime, opts.startTime ?? c.currentTime);
  const attack = opts.attack ?? 0.005;
  const release = opts.release ?? 0.1;
  const peak = opts.peakGain ?? 0.18;
  const sustainEnd = Math.max(start + attack, start + opts.duration - release);
  const decayEnd = Math.max(sustainEnd + 0.001, start + opts.duration);
  const shift = opts.pitchShift ?? 0;

  const osc = c.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(Math.max(20, opts.freq + shift), start);
  if (opts.freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, opts.freqEnd + shift),
      decayEnd,
    );
  }

  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.setValueAtTime(peak, sustainEnd);
  g.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

  osc.connect(g);
  g.connect(masterGain);
  osc.start(start);
  osc.stop(decayEnd + 0.02);
}

function noiseBurst(duration: number, peakGain = 0.12, filterFreq = 4000): void {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = peakGain;
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  src.start();
}

function chord(freqs: number[], opts: Omit<ToneOptions, "freq">): void {
  const c = ensureCtx();
  if (!c) return;
  freqs.forEach((f) => tone({ ...opts, freq: f, peakGain: (opts.peakGain ?? 0.15) / freqs.length }));
}

export function play(id: SoundId, opts?: { pitchShift?: number }): void {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const shift = opts?.pitchShift ?? 0;

  switch (id) {
    case "card_deal":
      noiseBurst(0.07, 0.08, 5500);
      tone({ freq: 280, freqEnd: 180, duration: 0.07, type: "triangle", peakGain: 0.06 });
      break;

    case "card_flip":
      noiseBurst(0.12, 0.06, 3500);
      tone({ freq: 520, freqEnd: 320, duration: 0.12, type: "triangle", peakGain: 0.07 });
      break;

    case "chip_place":
      tone({ freq: 1100, freqEnd: 700, duration: 0.06, type: "square", peakGain: 0.08, pitchShift: shift });
      tone({ freq: 480, duration: 0.04, type: "sine", peakGain: 0.05, startTime: t + 0.04, pitchShift: shift });
      break;

    case "chip_payout":
      tone({ freq: 880, duration: 0.04, type: "sine", peakGain: 0.07 });
      tone({ freq: 1320, duration: 0.05, type: "sine", peakGain: 0.07, startTime: t + 0.05 });
      tone({ freq: 1760, duration: 0.06, type: "sine", peakGain: 0.07, startTime: t + 0.1 });
      break;

    case "button_click":
      tone({ freq: 660, freqEnd: 880, duration: 0.04, type: "square", peakGain: 0.06 });
      break;

    case "hit":
      tone({ freq: 440, freqEnd: 660, duration: 0.08, type: "triangle", peakGain: 0.1 });
      break;

    case "stand":
      tone({ freq: 330, freqEnd: 220, duration: 0.12, type: "sine", peakGain: 0.1 });
      break;

    case "win":
      // Major triad arpeggio rising
      tone({ freq: 523.25, duration: 0.12, type: "triangle", peakGain: 0.14, startTime: t });
      tone({ freq: 659.25, duration: 0.12, type: "triangle", peakGain: 0.14, startTime: t + 0.1 });
      tone({ freq: 783.99, duration: 0.18, type: "triangle", peakGain: 0.14, startTime: t + 0.2 });
      tone({ freq: 1046.5, duration: 0.3, type: "triangle", peakGain: 0.16, startTime: t + 0.32 });
      chord([523.25, 659.25, 783.99, 1046.5], {
        duration: 0.5,
        type: "sine",
        peakGain: 0.18,
        startTime: t + 0.5,
      });
      break;

    case "big_win":
    case "blackjack":
      // Triumphant fanfare: ascending chord stack
      tone({ freq: 392, duration: 0.18, type: "sawtooth", peakGain: 0.1, startTime: t });
      tone({ freq: 523.25, duration: 0.18, type: "sawtooth", peakGain: 0.1, startTime: t + 0.1 });
      tone({ freq: 659.25, duration: 0.18, type: "sawtooth", peakGain: 0.1, startTime: t + 0.2 });
      tone({ freq: 783.99, duration: 0.22, type: "sawtooth", peakGain: 0.12, startTime: t + 0.3 });
      tone({ freq: 1046.5, duration: 0.6, type: "sawtooth", peakGain: 0.14, startTime: t + 0.45 });
      chord([523.25, 659.25, 783.99, 1046.5, 1318.5], {
        duration: 0.8,
        type: "triangle",
        peakGain: 0.2,
        startTime: t + 0.55,
      });
      noiseBurst(0.4, 0.05, 6000);
      break;

    case "lose":
      tone({ freq: 220, freqEnd: 165, duration: 0.25, type: "sawtooth", peakGain: 0.1 });
      break;

    case "bust":
      tone({ freq: 180, freqEnd: 80, duration: 0.4, type: "sawtooth", peakGain: 0.16 });
      noiseBurst(0.2, 0.08, 1000);
      break;

    case "push":
      tone({ freq: 440, duration: 0.1, type: "sine", peakGain: 0.08 });
      tone({ freq: 440, duration: 0.1, type: "sine", peakGain: 0.08, startTime: t + 0.13 });
      break;

    case "count_up":
      tone({ freq: 1320, freqEnd: 1760, duration: 0.05, type: "sine", peakGain: 0.06 });
      break;

    case "near_miss":
      // Tense rising tone that doesn't resolve
      tone({ freq: 660, freqEnd: 880, duration: 0.18, type: "triangle", peakGain: 0.12 });
      tone({ freq: 880, freqEnd: 1320, duration: 0.22, type: "triangle", peakGain: 0.1, startTime: t + 0.18 });
      tone({ freq: 622, duration: 0.5, type: "sine", peakGain: 0.08, startTime: t + 0.4 });
      break;

    case "tick":
      tone({ freq: 1200, duration: 0.04, type: "square", peakGain: 0.08 });
      break;

    case "bonus":
      tone({ freq: 523.25, duration: 0.12, type: "triangle", peakGain: 0.14, startTime: t });
      tone({ freq: 783.99, duration: 0.16, type: "triangle", peakGain: 0.14, startTime: t + 0.1 });
      tone({ freq: 1046.5, duration: 0.3, type: "triangle", peakGain: 0.16, startTime: t + 0.22 });
      break;

    case "dice_shake":
      // Wooden rattle: filtered noise with quick frequency jitter
      noiseBurst(0.5, 0.07, 2000);
      tone({ freq: 320, freqEnd: 480, duration: 0.07, type: "square", peakGain: 0.05 });
      tone({ freq: 440, freqEnd: 280, duration: 0.07, type: "square", peakGain: 0.05, startTime: t + 0.08 });
      tone({ freq: 360, freqEnd: 520, duration: 0.07, type: "square", peakGain: 0.05, startTime: t + 0.16 });
      tone({ freq: 480, freqEnd: 320, duration: 0.07, type: "square", peakGain: 0.05, startTime: t + 0.24 });
      tone({ freq: 400, freqEnd: 240, duration: 0.07, type: "square", peakGain: 0.05, startTime: t + 0.32 });
      break;

    case "dice_land":
      // Wood-on-wood clack
      noiseBurst(0.06, 0.12, 1500);
      tone({ freq: 220, freqEnd: 110, duration: 0.08, type: "triangle", peakGain: 0.14 });
      tone({ freq: 90, duration: 0.12, type: "sine", peakGain: 0.1, startTime: t + 0.02 });
      break;

    case "pinzoro":
      // Taiko-style boom + chord swell + golden chime — the jackpot moment
      tone({ freq: 60, duration: 0.6, type: "sine", peakGain: 0.3, startTime: t });
      tone({ freq: 80, duration: 0.5, type: "sine", peakGain: 0.2, startTime: t + 0.05 });
      noiseBurst(0.2, 0.12, 200);
      // Rising arpeggio
      tone({ freq: 523.25, duration: 0.18, type: "triangle", peakGain: 0.16, startTime: t + 0.15 });
      tone({ freq: 659.25, duration: 0.18, type: "triangle", peakGain: 0.16, startTime: t + 0.28 });
      tone({ freq: 783.99, duration: 0.18, type: "triangle", peakGain: 0.16, startTime: t + 0.41 });
      tone({ freq: 1046.5, duration: 0.22, type: "triangle", peakGain: 0.18, startTime: t + 0.54 });
      tone({ freq: 1318.5, duration: 0.32, type: "triangle", peakGain: 0.2, startTime: t + 0.7 });
      // Sustained gold chord
      chord([523.25, 659.25, 783.99, 1046.5, 1318.5], {
        duration: 1.5,
        type: "sine",
        peakGain: 0.22,
        startTime: t + 0.85,
      });
      // Second taiko boom
      tone({ freq: 60, duration: 0.5, type: "sine", peakGain: 0.25, startTime: t + 1.4 });
      noiseBurst(0.15, 0.1, 200);
      break;

    case "arashi":
      // Triumphant fanfare for X-X-X
      tone({ freq: 392, duration: 0.18, type: "sawtooth", peakGain: 0.12, startTime: t });
      tone({ freq: 523.25, duration: 0.18, type: "sawtooth", peakGain: 0.12, startTime: t + 0.12 });
      tone({ freq: 659.25, duration: 0.22, type: "sawtooth", peakGain: 0.14, startTime: t + 0.24 });
      tone({ freq: 783.99, duration: 0.4, type: "sawtooth", peakGain: 0.16, startTime: t + 0.36 });
      chord([523.25, 659.25, 783.99], {
        duration: 0.6,
        type: "triangle",
        peakGain: 0.18,
        startTime: t + 0.5,
      });
      break;

    case "shigoro":
      // Clean ascending scale = perfect run vibe
      tone({ freq: 523.25, duration: 0.12, type: "sine", peakGain: 0.14, startTime: t });
      tone({ freq: 587.33, duration: 0.12, type: "sine", peakGain: 0.14, startTime: t + 0.1 });
      tone({ freq: 659.25, duration: 0.12, type: "sine", peakGain: 0.14, startTime: t + 0.2 });
      tone({ freq: 783.99, duration: 0.3, type: "sine", peakGain: 0.16, startTime: t + 0.3 });
      break;

    case "hifumi":
      // Sad descending minor chord — banker disaster (or player oof)
      tone({ freq: 440, freqEnd: 330, duration: 0.4, type: "sawtooth", peakGain: 0.12 });
      tone({ freq: 330, freqEnd: 247, duration: 0.45, type: "sawtooth", peakGain: 0.1, startTime: t + 0.2 });
      tone({ freq: 247, freqEnd: 165, duration: 0.5, type: "sawtooth", peakGain: 0.08, startTime: t + 0.4 });
      break;

    case "menashi":
      // Disappointed muted thud
      tone({ freq: 200, freqEnd: 100, duration: 0.4, type: "triangle", peakGain: 0.1 });
      noiseBurst(0.15, 0.05, 600);
      break;

    case "heartbeat":
      // Tense lub-dub for the suspenseful third roll moment
      tone({ freq: 60, duration: 0.08, type: "sine", peakGain: 0.18, startTime: t });
      tone({ freq: 50, duration: 0.1, type: "sine", peakGain: 0.14, startTime: t + 0.12 });
      break;

    case "anticipation_jackpot":
      // Cymbal swell: filtered noise rising in volume + rising tone
      noiseBurst(0.8, 0.08, 3000);
      tone({ freq: 200, freqEnd: 600, duration: 0.8, type: "sine", peakGain: 0.1, startTime: t });
      tone({ freq: 300, freqEnd: 900, duration: 0.6, type: "triangle", peakGain: 0.06, startTime: t + 0.2 });
      break;

    case "anticipation_win":
      // Drum roll: rapid filtered noise with rising pitch
      noiseBurst(0.4, 0.06, 2000);
      tone({ freq: 150, freqEnd: 300, duration: 0.4, type: "sine", peakGain: 0.08 });
      break;

    case "anticipation_lose":
      // Short low suspense thud
      tone({ freq: 100, freqEnd: 80, duration: 0.15, type: "sine", peakGain: 0.1 });
      break;
  }
}

export function startBgm(): void {
  if (muted || bgmNodes) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;

  // Master filter — opens up as tension level rises so the mix gets brighter.
  const bgmFilter = c.createBiquadFilter();
  bgmFilter.type = "highpass";
  bgmFilter.frequency.value = 60;
  bgmFilter.connect(masterGain);

  // Base ambient drone (110Hz with slow LFO for breathing feel)
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 110;
  const g = c.createGain();
  g.gain.value = 0.025;

  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.12;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 8;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  osc.connect(g);
  g.connect(bgmFilter);
  osc.start();
  lfo.start();

  // Tension layer 1: 220Hz square — adds urgency at L1+
  const tensionOsc = c.createOscillator();
  tensionOsc.type = "square";
  tensionOsc.frequency.value = 220;
  const tensionGain = c.createGain();
  tensionGain.gain.value = 0;
  tensionOsc.connect(tensionGain);
  tensionGain.connect(bgmFilter);
  tensionOsc.start();

  // Tension layer 2: 440Hz triangle — adds height at L2+
  const tensionOsc2 = c.createOscillator();
  tensionOsc2.type = "triangle";
  tensionOsc2.frequency.value = 440;
  const tensionGain2 = c.createGain();
  tensionGain2.gain.value = 0;
  tensionOsc2.connect(tensionGain2);
  tensionGain2.connect(bgmFilter);
  tensionOsc2.start();

  // Tremolo for L2+ — rapid amplitude wobble
  const tremoloLfo = c.createOscillator();
  tremoloLfo.type = "sine";
  tremoloLfo.frequency.value = 3;
  const tremoloGain = c.createGain();
  tremoloGain.gain.value = 0;
  tremoloLfo.connect(tremoloGain);
  tremoloGain.connect(tensionGain2.gain);
  tremoloLfo.start();

  bgmNodes = {
    osc,
    gain: g,
    tensionOsc,
    tensionGain,
    tensionOsc2,
    tensionGain2,
    tremoloLfo,
    tremoloGain,
    bgmFilter,
  };
  currentTensionLevel = 0;
}

export function stopBgm(): void {
  if (!bgmNodes || !ctx) return;
  const t = ctx.currentTime;
  bgmNodes.gain.gain.cancelScheduledValues(t);
  bgmNodes.gain.gain.linearRampToValueAtTime(0, t + 0.5);
  bgmNodes.tensionGain.gain.cancelScheduledValues(t);
  bgmNodes.tensionGain.gain.linearRampToValueAtTime(0, t + 0.5);
  bgmNodes.tensionGain2.gain.cancelScheduledValues(t);
  bgmNodes.tensionGain2.gain.linearRampToValueAtTime(0, t + 0.5);
  bgmNodes.osc.stop(t + 0.6);
  bgmNodes.tensionOsc.stop(t + 0.6);
  bgmNodes.tensionOsc2.stop(t + 0.6);
  bgmNodes.tremoloLfo.stop(t + 0.6);
  bgmNodes = null;
  currentTensionLevel = 0;
}

// Crank the BGM up/down without restarting it. Anticipation phases call this
// to make the moment feel like it's swelling toward something.
export function setBgmTension(level: 0 | 1 | 2 | 3): void {
  if (!bgmNodes || !ctx) {
    currentTensionLevel = level;
    return;
  }
  const t = ctx.currentTime;
  const ramp = level > currentTensionLevel ? 0.4 : 0.6;
  currentTensionLevel = level;

  // Filter cutoff — opens as tension rises
  const cutoff = level === 0 ? 60 : level === 1 ? 200 : level === 2 ? 400 : 800;
  bgmNodes.bgmFilter.frequency.cancelScheduledValues(t);
  bgmNodes.bgmFilter.frequency.linearRampToValueAtTime(cutoff, t + ramp);

  // Tension osc 1 (220Hz square)
  const t1Gain = level === 0 ? 0 : level === 1 ? 0.015 : level === 2 ? 0.022 : 0.035;
  bgmNodes.tensionGain.gain.cancelScheduledValues(t);
  bgmNodes.tensionGain.gain.linearRampToValueAtTime(t1Gain, t + ramp);

  // Tension osc 2 (440Hz triangle) — only at L2+
  const t2Gain = level >= 2 ? (level === 2 ? 0.018 : 0.03) : 0;
  bgmNodes.tensionGain2.gain.cancelScheduledValues(t);
  bgmNodes.tensionGain2.gain.linearRampToValueAtTime(t2Gain, t + ramp);

  // Tremolo amount — only at L2+ (modulates t2Gain)
  const tremoloAmount = level >= 2 ? 0.012 : 0;
  bgmNodes.tremoloGain.gain.cancelScheduledValues(t);
  bgmNodes.tremoloGain.gain.linearRampToValueAtTime(tremoloAmount, t + ramp);

  // Base gain — slightly louder at L3
  const baseGain = level === 3 ? 0.04 : 0.025;
  bgmNodes.gain.gain.cancelScheduledValues(t);
  bgmNodes.gain.gain.linearRampToValueAtTime(baseGain, t + ramp);
}

// Auto-decay tension back to 0 after a delay (used after reveal phase)
export function decayBgmTension(delayMs: number = 1000): void {
  window.setTimeout(() => setBgmTension(0), delayMs);
}
