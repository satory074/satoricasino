import { useCallback, useEffect, useState } from "react";
import { isMuted, play, setMuted, startBgm, stopBgm, unlockAudio } from "./sounds";

const MUTE_KEY = "sc:muted";
const BGM_KEY = "sc:bgm";

function readBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v == null) return def;
    return v === "1";
  } catch {
    return def;
  }
}

export function useAudio() {
  const [muted, setMutedState] = useState<boolean>(() => readBool(MUTE_KEY, false));
  const [bgmOn, setBgmOnState] = useState<boolean>(() => readBool(BGM_KEY, false));

  // Sync mute → audio engine
  useEffect(() => {
    setMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [muted]);

  useEffect(() => {
    try {
      localStorage.setItem(BGM_KEY, bgmOn ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (bgmOn && !muted) startBgm();
    else stopBgm();
  }, [bgmOn, muted]);

  // Unlock AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((v) => !v);
  }, []);

  const toggleBgm = useCallback(() => {
    setBgmOnState((v) => !v);
  }, []);

  return {
    muted,
    bgmOn,
    toggleMute,
    toggleBgm,
    play,
    isMuted,
  };
}
