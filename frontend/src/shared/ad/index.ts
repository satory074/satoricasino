import type { AdBridge } from "./adBridge";
import { AdSenseBridge } from "./adSenseBridge";
import { MockAdBridge } from "./mockAdBridge";

let bridge: AdBridge | null = null;

export function getAdBridge(): AdBridge {
  if (bridge) return bridge;

  if (
    typeof window !== "undefined" &&
    Array.isArray((window as unknown as Record<string, unknown>).adsbygoogle)
  ) {
    bridge = new AdSenseBridge();
  } else {
    bridge = new MockAdBridge();
  }
  return bridge;
}

export type { AdBridge, AdResult, BannerSize } from "./adBridge";
