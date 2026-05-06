import type { AdBridge, AdResult } from "./adBridge";

const AD_DURATION_MS = 5000;

export class MockAdBridge implements AdBridge {
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
}
