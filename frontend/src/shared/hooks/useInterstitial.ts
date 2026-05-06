import { useCallback, useRef, useState } from "react";

const GLOBAL_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes
const ROUND_INTERVAL = 5; // every 5 rounds

interface UseInterstitialReturn {
  shouldShow: boolean;
  show: () => void;
  onDismiss: () => void;
  checkRound: () => boolean; // returns true if interstitial should show for round count
  checkTransition: () => boolean; // returns true if cooldown allows showing
}

export function useInterstitial(): UseInterstitialReturn {
  const [shouldShow, setShouldShow] = useState(false);
  const lastShownRef = useRef(0);
  const roundCountRef = useRef(0);

  const isCooldownElapsed = useCallback(() => {
    return Date.now() - lastShownRef.current >= GLOBAL_COOLDOWN_MS;
  }, []);

  const show = useCallback(() => {
    setShouldShow(true);
    lastShownRef.current = Date.now();
  }, []);

  const onDismiss = useCallback(() => {
    setShouldShow(false);
  }, []);

  const checkRound = useCallback(() => {
    roundCountRef.current += 1;
    if (roundCountRef.current % ROUND_INTERVAL === 0 && isCooldownElapsed()) {
      return true;
    }
    return false;
  }, [isCooldownElapsed]);

  const checkTransition = useCallback(() => {
    return isCooldownElapsed();
  }, [isCooldownElapsed]);

  return { shouldShow, show, onDismiss, checkRound, checkTransition };
}
