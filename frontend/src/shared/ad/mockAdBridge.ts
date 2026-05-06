import type { AdBridge, AdResult, BannerSize } from "./adBridge";

const AD_DURATION_MS = 5000;

const SIZE_MAP: Record<BannerSize, { width: string; height: string; className: string }> = {
  standard: { width: "min(320px, 100%)", height: "50px", className: "ad-banner-mock" },
  mrec: { width: "min(300px, 100%)", height: "250px", className: "ad-banner-mock ad-banner-mock--mrec" },
  leaderboard: { width: "min(728px, 100%)", height: "90px", className: "ad-banner-mock ad-banner-mock--leaderboard" },
};

export class MockAdBridge implements AdBridge {
  private bannerContainer: HTMLElement | null = null;

  async init(): Promise<void> {
    // No-op for mock
  }

  isAvailable(): boolean {
    return true;
  }

  show(container: HTMLElement): Promise<AdResult> {
    return new Promise((resolve) => {
      container.innerHTML = "";

      const placeholder = document.createElement("div");
      placeholder.className = "ad-placeholder";
      const inner = document.createElement("div");
      inner.className = "ad-placeholder-inner";
      const label = document.createElement("span");
      label.className = "ad-placeholder-label";
      label.textContent = "AD";
      inner.appendChild(label);
      placeholder.appendChild(inner);
      container.appendChild(placeholder);

      setTimeout(() => {
        resolve({ watched: true, durationMs: AD_DURATION_MS });
      }, AD_DURATION_MS);
    });
  }

  showBanner(container: HTMLElement, size: BannerSize = "standard"): void {
    this.bannerContainer = container;
    container.innerHTML = "";

    const config = SIZE_MAP[size];
    const banner = document.createElement("div");
    banner.className = config.className;
    banner.style.width = config.width;
    banner.style.height = config.height;
    const label = document.createElement("span");
    label.className = "ad-banner-mock-label";
    label.textContent = size === "mrec" ? "AD 300x250" : size === "leaderboard" ? "AD 728x90" : "AD";
    banner.appendChild(label);
    container.appendChild(banner);
  }

  destroyBanner(): void {
    if (this.bannerContainer) {
      this.bannerContainer.innerHTML = "";
      this.bannerContainer = null;
    }
  }
}
