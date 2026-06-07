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
  // True only when a real ad can actually fill the given size. Used to suppress
  // involuntary ad surfaces (e.g. the interstitial) that would otherwise render
  // an empty box while slot IDs are still build-time placeholders.
  canShowBanner(size?: BannerSize): boolean;
}
