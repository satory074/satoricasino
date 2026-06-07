import type { AdBridge } from "./adBridge";
import { AdSenseBridge } from "./adSenseBridge";
import { MockAdBridge } from "./mockAdBridge";

let bridge: AdBridge | null = null;

export function getAdBridge(): AdBridge {
  if (bridge) return bridge;

  // Use AdSense whenever the real script tag is present (loaded eagerly in
  // index.html) or we're in a production build. `Array.isArray(adsbygoogle)`
  // is the wrong probe — once adsbygoogle.js loads it replaces the array with
  // an object that has a `.push` method, so the old check returned false in
  // production and fell back to the Mock bridge (leaking gray "AD" boxes).
  const hasAdScript =
    typeof document !== "undefined" &&
    document.querySelector('script[src*="adsbygoogle.js"]') !== null;

  if (hasAdScript || import.meta.env.PROD) {
    bridge = new AdSenseBridge();
  } else {
    bridge = new MockAdBridge();
  }
  return bridge;
}

export type { AdBridge, AdResult, BannerSize } from "./adBridge";
