export interface AdResult {
  watched: boolean;
  durationMs: number;
}

export type BannerSize = "standard" | "mrec" | "leaderboard" | "skyscraper";

export interface AdBridge {
  init(): Promise<void>;
  show(container: HTMLElement): Promise<AdResult>;
  isAvailable(): boolean;
  showBanner(container: HTMLElement, size?: BannerSize): void;
  destroyBanner(): void;
}
