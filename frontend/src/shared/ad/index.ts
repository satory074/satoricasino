import type { AdBridge } from "./adBridge";
import { MockAdBridge } from "./mockAdBridge";

let bridge: AdBridge | null = null;

export function getAdBridge(): AdBridge {
  if (bridge) return bridge;

  // Future: check for real SDK availability
  // if ((window as any).__AD_SDK) { bridge = new RealAdBridge(); }

  bridge = new MockAdBridge();
  return bridge;
}

export type { AdBridge, AdResult, BannerSize } from "./adBridge";
