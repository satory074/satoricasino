import type { AdBridge, AdResult, BannerSize } from "./adBridge";

const SLOT_MAP: Record<BannerSize, string> = {
  standard: "SLOT_ID_320x50",
  mrec: "SLOT_ID_300x250",
  leaderboard: "SLOT_ID_728x90",
  skyscraper: "SLOT_ID_160x600",
};

const SIZE_MAP: Record<BannerSize, { width: string; height: string }> = {
  standard: { width: "320", height: "50" },
  mrec: { width: "300", height: "250" },
  leaderboard: { width: "728", height: "90" },
  skyscraper: { width: "160", height: "600" },
};

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export class AdSenseBridge implements AdBridge {
  private bannerContainer: HTMLElement | null = null;

  async init(): Promise<void> {
    // adsbygoogle.js is loaded via index.html; nothing extra needed
  }

  isAvailable(): boolean {
    return typeof window !== "undefined" && Array.isArray(window.adsbygoogle);
  }

  show(container: HTMLElement): Promise<AdResult> {
    // AdSense has no rewarded ad format — show a MREC display ad
    // and resolve after 5 seconds as a pseudo-reward
    return new Promise((resolve) => {
      this.showBanner(container, "mrec");
      setTimeout(() => {
        resolve({ watched: true, durationMs: 5000 });
      }, 5000);
    });
  }

  showBanner(container: HTMLElement, size: BannerSize = "standard"): void {
    this.bannerContainer = container;
    container.innerHTML = "";

    const slot = SLOT_MAP[size];
    const dim = SIZE_MAP[size];

    // Skip when the slot ID is still a build-time placeholder. Real slot IDs
    // can only be issued after AdSense site approval; until then, mounting
    // an <ins data-ad-slot="SLOT_ID_..."> would push a fill request with an
    // invalid ID, producing a TagError in the console that reviewers can
    // see. Leaving the container empty is policy-clean (no ad-shaped
    // artifact, no failed network request).
    if (slot.startsWith("SLOT_ID_")) return;

    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "inline-block";
    ins.style.width = dim.width + "px";
    ins.style.height = dim.height + "px";
    ins.setAttribute("data-ad-client", getAdClient());
    ins.setAttribute("data-ad-slot", slot);

    container.appendChild(ins);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blocker or script not loaded — silently fail
    }
  }

  destroyBanner(): void {
    if (this.bannerContainer) {
      this.bannerContainer.innerHTML = "";
      this.bannerContainer = null;
    }
  }

  canShowBanner(size: BannerSize = "standard"): boolean {
    // Mirrors the placeholder guard in showBanner: until a real slot ID is
    // issued (post-approval), nothing can fill, so report unfillable.
    return this.isAvailable() && !SLOT_MAP[size].startsWith("SLOT_ID_");
  }
}

function getAdClient(): string {
  // Extract from the adsbygoogle script tag's client parameter
  const script = document.querySelector(
    'script[src*="adsbygoogle.js"]'
  ) as HTMLScriptElement | null;
  if (script) {
    const match = script.src.match(/client=(ca-pub-\d+)/);
    if (match) return match[1];
  }
  return "ca-pub-3484332928684454";
}
