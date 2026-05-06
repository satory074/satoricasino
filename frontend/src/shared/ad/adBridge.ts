export interface AdResult {
  watched: boolean;
  durationMs: number;
}

export interface AdBridge {
  init(): Promise<void>;
  show(container: HTMLElement): Promise<AdResult>;
  isAvailable(): boolean;
  showBanner(container: HTMLElement): void;
  destroyBanner(): void;
}
